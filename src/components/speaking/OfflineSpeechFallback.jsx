import { useEffect, useRef, useState } from "react";
import { isSpeakingAnswerAccepted } from "../../utils/speakingAcceptance.js";
import {
  OFFLINE_STT_MAX_RECORD_MS,
  decodeRecordingToMono,
  isOfflineRecordingSupported,
  loadOfflineTranscriber,
  resolveRecordingMimeType,
  transcribeRecording,
} from "../../utils/offlineSpeech.js";

export function OfflineSpeechFallback({ expectedWord }) {
  const [phase, setPhase] = useState("idle");
  const [status, setStatus] = useState("");
  const [transcript, setTranscript] = useState("");
  const [accepted, setAccepted] = useState(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(0);
  const supported = isOfflineRecordingSupported();

  useEffect(() => {
    return () => {
      window.clearTimeout(timerRef.current);
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function handleEnable() {
    setPhase("loading");
    setStatus("기기 안에 작은 인식 모델을 준비하고 있습니다. 처음 한 번은 내려받기가 필요합니다.");

    try {
      await loadOfflineTranscriber();
      setPhase("ready");
      setStatus("준비가 끝났습니다. 녹음 버튼을 눌러 단어를 말해 보세요.");
    } catch {
      setPhase("error");
      setStatus("모델을 불러오지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도하세요.");
    }
  }

  async function handleRecord() {
    setTranscript("");
    setAccepted(null);
    setPhase("recording");
    setStatus("녹음 중입니다. 단어를 또박또박 말해 보세요. 끝나면 중단 버튼을 누르세요.");

    let stream = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPhase("ready");
      setStatus("마이크를 사용할 수 없습니다. 브라우저 권한을 확인하세요.");
      return;
    }

    streamRef.current = stream;
    const mimeType = resolveRecordingMimeType() || undefined;
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    const chunks = [];
    const stopped = new Promise((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.ondataavailable = (event) => {
      if (event.data?.size) {
        chunks.push(event.data);
      }
    };
    recorder.start();
    timerRef.current = window.setTimeout(() => {
      try {
        recorder.stop();
      } catch {
        // 이미 끝난 녹음은 무시한다.
      }
    }, OFFLINE_STT_MAX_RECORD_MS);
    await stopped;
    window.clearTimeout(timerRef.current);
    stream.getTracks().forEach((track) => track.stop());
    setPhase("transcribing");
    setStatus("말을 기기 안에서 확인하고 있습니다...");

    try {
      const transcriber = await loadOfflineTranscriber();
      const audio = await decodeRecordingToMono(new Blob(chunks, { type: recorder.mimeType }));
      const text = await transcribeRecording(transcriber, audio);
      setTranscript(text || "(인식된 말이 없습니다)");
      setAccepted(text ? isSpeakingAnswerAccepted([text], expectedWord) : false);
      setPhase("ready");
      setStatus("");
    } catch {
      setPhase("ready");
      setStatus("인식하지 못했습니다. 다시 시도하세요.");
    }
  }

  function handleStop() {
    window.clearTimeout(timerRef.current);

    try {
      recorderRef.current?.stop();
    } catch {
      // 이미 끝난 녹음은 무시한다.
    }
  }

  if (!supported) {
    return null;
  }

  return (
    <article className="session-review-card">
      <p className="mode-label">Experimental</p>
      <h4>기기 내 인식으로 연습하기(실험적, 점수 미반영)</h4>
      <p className="result-copy">
        이 브라우저는 실시간 음성 인식을 지원하지 않습니다. 녹음해서 기기 안에서 직접 확인하는 연습만 할 수 있고 점수에는 들어가지 않습니다.
      </p>
      {phase === "idle" ? (
        <div className="toolbar-row">
          <button className="primary-button gi-pulse" onClick={handleEnable}>
            실험적 인식 켜기
          </button>
        </div>
      ) : null}
      {phase === "loading" ? <p className="result-copy">{status}</p> : null}
      {phase === "ready" || phase === "recording" ? (
        <div className="toolbar-row">
          <button
            className="primary-button gi-pulse"
            onClick={handleRecord}
            disabled={phase === "recording"}
          >
            녹음해서 확인하기
          </button>
          {phase === "recording" ? (
            <button className="secondary-button" onClick={handleStop}>
              녹음 중단하기
            </button>
          ) : null}
        </div>
      ) : null}
      {phase === "recording" || phase === "transcribing" ? (
        <p className="result-copy">{status}</p>
      ) : null}
      {phase === "error" ? <p className="matching-leaderboard-error">{status}</p> : null}
      {phase === "ready" && status ? <p className="result-copy">{status}</p> : null}
      {transcript ? (
        <div className="feedback-card" aria-live="polite">
          <p>인식 결과: {transcript}</p>
          {accepted === true ? <p>잘했습니다. {expectedWord}가 맞게 인식되었습니다.</p> : null}
          {accepted === false ? <p>조금 다르게 들렸습니다. 발음을 다시 듣고 한 번 더 해보세요.</p> : null}
        </div>
      ) : null}
    </article>
  );
}
