import { useEffect, useState } from "react";
import { ProgressBar } from "./ProgressBar.jsx";
import { ResultSummary } from "./ResultSummary.jsx";
import { ScoreBoard } from "./ScoreBoard.jsx";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { createSpeakingSequence } from "../utils/quiz.js";
import { isSpeechMatch } from "../utils/normalize.js";

const CONFIGURATION_ERRORS = new Set([
  "microphone-permission-denied",
  "microphone-device-missing",
  "microphone-device-busy",
  "microphone-access-failed",
  "speech-recognition-safari-limited",
  "speech-recognition-service-unavailable",
  "speech-recognition-network-error",
  "speech-recognition-start-failed",
]);

function getGuidance(error) {
  if (error === "microphone-permission-denied") {
    return {
      title: "마이크 권한이 필요합니다",
      body: "브라우저 주소창의 사이트 권한에서 마이크를 허용한 뒤 다시 시도하세요.",
    };
  }

  if (error === "microphone-device-missing") {
    return {
      title: "마이크를 찾을 수 없습니다",
      body: "기기에 연결된 입력 마이크가 있는지 확인하고 다른 앱이 마이크를 사용 중인지 점검하세요.",
    };
  }

  if (error === "microphone-device-busy") {
    return {
      title: "마이크가 다른 앱에서 사용 중입니다",
      body: "다른 앱의 녹음이나 화상회의를 종료한 뒤 다시 시도하세요.",
    };
  }

  if (error === "speech-recognition-safari-limited") {
    return {
      title: "Safari 말하기 인식이 제한되었습니다",
      body: "마이크 권한이 허용되어 있어도 Safari에서는 브라우저 음성 인식이 시작되지 않을 수 있습니다. 새로고침 후 다시 시도하거나 Chrome 또는 Edge에서 여는 것이 더 안정적입니다.",
    };
  }

  if (error === "speech-recognition-service-unavailable" || error === "speech-recognition-network-error") {
    return {
      title: "브라우저 음성 인식을 시작하지 못했습니다",
      body: "마이크 권한과 입력 장치는 정상일 수 있지만, 현재 브라우저의 STT 서비스가 시작되지 않았습니다. 새로고침 후 다시 시도하거나 Chrome 또는 Edge에서 확인하세요.",
    };
  }

  if (error === "microphone-access-failed" || error === "speech-recognition-start-failed") {
    return {
      title: "말하기 인식을 시작하지 못했습니다",
      body: "브라우저를 새로고침하고 다시 시도하거나 Chrome 또는 Edge에서 확인하세요.",
    };
  }

  return null;
}

function getStatusMessage({
  supported,
  listening,
  transcript,
  question,
  status,
}) {
  if (!supported) {
    return "이 브라우저에서는 말하기 평가를 지원하지 않습니다. Chrome 또는 Edge에서 다시 시도하세요.";
  }

  if (listening) {
    return "듣는 중입니다. 화면의 단어를 또박또박 말해보세요.";
  }

  if (status === "correct") {
    return `좋아요. "${question.word}" 발음이 맞게 인식되었습니다.`;
  }

  if (status === "incorrect" && transcript) {
    return `인식 결과는 "${transcript}"입니다. 다시 말해보거나 다음 단어로 넘어갈 수 있습니다.`;
  }

  if (status === "empty") {
    return "음성이 인식되지 않았습니다. 마이크 버튼을 눌러 다시 시도하세요.";
  }

  return "단어를 보고 마이크 버튼을 눌러 말해보세요.";
}

export function SpeakingQuiz({
  items,
  speech,
  onBack,
  onOpenTeacher,
}) {
  const recognition = useSpeechRecognition({ lang: "en-US" });
  const [questions, setQuestions] = useState(() =>
    createSpeakingSequence(items),
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState("idle");
  const [attemptTranscript, setAttemptTranscript] = useState("");

  useEffect(() => {
    setQuestions(createSpeakingSequence(items));
    setQuestionIndex(0);
    setScore(0);
    setStatus("idle");
    setAttemptTranscript("");
    recognition.reset();
  }, [items]);

  const totalQuestions = questions.length;
  const question = questions[questionIndex];
  const isComplete = status === "complete";
  const canAdvance = status === "correct" || status === "incorrect" || status === "empty";
  const isLockedAfterCorrect = status === "correct";
  const guidance = getGuidance(recognition.error);

  useEffect(() => {
    if (!question || recognition.listening) {
      return;
    }

    if (!recognition.transcript) {
      return;
    }

    const transcript = recognition.transcript.trim();
    setAttemptTranscript(transcript);

    if (isSpeechMatch(transcript, question.word)) {
      setStatus((current) => {
        if (current !== "correct") {
          setScore((scoreValue) => scoreValue + 1);
        }

        return "correct";
      });
      return;
    }

    setStatus("incorrect");
  }, [question?.id, question?.word, recognition.listening, recognition.transcript]);

  useEffect(() => {
    if (!question || !recognition.error) {
      return;
    }

    if (recognition.error === "no-speech") {
      setStatus("empty");
      return;
    }

    if (CONFIGURATION_ERRORS.has(recognition.error)) {
      setStatus("idle");
      return;
    }

    setStatus("incorrect");
  }, [question?.id, recognition.error]);

  function handleStartListening() {
    if (!recognition.supported || isLockedAfterCorrect) {
      return;
    }

    setStatus("idle");
    setAttemptTranscript("");
    recognition.reset();
    recognition.start();
  }

  function handleReplayWord() {
    speech.speak(question.word, {
      lang: "en-US",
      rate: 0.9,
    });
  }

  function handleNext() {
    recognition.stop();
    recognition.reset();

    if (questionIndex === totalQuestions - 1) {
      setStatus("complete");
      return;
    }

    setQuestionIndex((current) => current + 1);
    setStatus("idle");
    setAttemptTranscript("");
  }

  function handleRetry() {
    setQuestions(createSpeakingSequence(items));
    setQuestionIndex(0);
    setScore(0);
    setStatus("idle");
    setAttemptTranscript("");
    recognition.stop();
    recognition.reset();
  }

  function handleTryAgain() {
    setStatus("idle");
    setAttemptTranscript("");
    recognition.reset();
  }

  if (items.length === 0) {
    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Speaking Quiz</p>
            <h2>말하기 연습</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <article className="empty-card">
          <h3>먼저 단어 세트를 불러오세요</h3>
          <p>
            말하기 연습을 시작하려면 홈 화면에서 학년과 단원을 선택한 뒤
            학생용 단어 세트를 먼저 불러와야 합니다.
          </p>
          <div className="toolbar-row">
            <button className="ghost-button" onClick={onBack}>
              홈으로
            </button>
            <button className="secondary-button" onClick={onOpenTeacher}>
              Teacher Mode 열기
            </button>
          </div>
        </article>
      </section>
    );
  }

  if (!recognition.supported) {
    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Speaking Quiz</p>
            <h2>말하기 연습</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <article className="empty-card">
          <h3>브라우저 지원이 필요합니다</h3>
          <p>
            현재 브라우저에서는 말하기 평가를 사용할 수 없습니다. Chrome 또는
            Edge에서 다시 열면 마이크 기반 STT 평가가 동작합니다.
          </p>
          <div className="toolbar-row">
            <button className="primary-button" onClick={onOpenTeacher}>
              단어 세트 수정
            </button>
            <button className="ghost-button" onClick={onBack}>
              홈으로
            </button>
          </div>
        </article>
      </section>
    );
  }

  if (isComplete) {
    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Speaking Quiz</p>
            <h2>말하기 연습 완료</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <ResultSummary
          title="보고 말하기 완료"
          score={score}
          total={totalQuestions}
          onRetry={handleRetry}
          onBack={onBack}
          onOpenTeacher={onOpenTeacher}
        />
      </section>
    );
  }

  return (
    <section className="workspace-panel">
      <div className="section-heading">
        <div>
          <p className="mode-label">Speaking Quiz</p>
          <h2>보고 말하기</h2>
        </div>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <div className="quiz-grid">
        <div className="quiz-main">
          <ScoreBoard
            questionIndex={questionIndex}
            totalQuestions={totalQuestions}
            score={score}
          />
          <ProgressBar
            value={questionIndex + (status === "correct" ? 1 : 0)}
            max={totalQuestions}
          />

          <article className="question-card">
            <div className="question-head">
              <div>
                <p className="mode-label">Question {questionIndex + 1}</p>
                <h3>화면의 단어를 보고 영어로 말해보세요</h3>
              </div>
              <button
                className="secondary-button"
                onClick={handleReplayWord}
                disabled={!speech.supported}
              >
                {speech.speaking ? "읽는 중..." : "원어민 발음 듣기"}
              </button>
            </div>

            <div className="speaking-word-card">
              <p className="speaking-word">{question.word}</p>
              <p className="speaking-meaning">{question.meaning}</p>
            </div>

            <div className="toolbar-row">
              <button
                className="primary-button"
                onClick={handleStartListening}
                disabled={recognition.listening || isLockedAfterCorrect}
              >
                {recognition.listening ? "듣는 중..." : "마이크로 말하기"}
              </button>
              <button
                className="ghost-button"
                onClick={handleTryAgain}
                disabled={recognition.listening || isLockedAfterCorrect}
              >
                다시 시도 준비
              </button>
            </div>

            <div className="feedback-card" aria-live="polite">
              <p>
                {getStatusMessage({
                  supported: recognition.supported,
                  listening: recognition.listening,
                  transcript: attemptTranscript,
                  question,
                  status,
                })}
              </p>
              <div className="feedback-meta">
                <span>
                  인식 결과: {attemptTranscript || recognition.transcript || "아직 없음"}
                </span>
                {question.exampleSentence ? (
                  <span>예문: {question.exampleSentence}</span>
                ) : null}
                {recognition.error ? (
                  <span>인식 상태: {recognition.error}</span>
                ) : null}
                {recognition.microphoneState !== "unknown" ? (
                  <span>마이크 상태: {recognition.microphoneState}</span>
                ) : null}
              </div>
            </div>

            {guidance ? (
              <article className="guidance-card" aria-live="polite">
                <strong>{guidance.title}</strong>
                <p>{guidance.body}</p>
              </article>
            ) : null}

            <div className="toolbar-row">
              <button
                className="primary-button"
                onClick={handleNext}
                disabled={!canAdvance}
              >
                {questionIndex === totalQuestions - 1
                  ? "결과 보기"
                  : "다음 단어"}
              </button>
              <button className="ghost-button" onClick={onOpenTeacher}>
                단어 세트 수정
              </button>
            </div>
          </article>
        </div>

        <aside className="quiz-side">
          <article className="hint-card">
            <p className="mode-label">Speaking Tip</p>
            <h3>진행 팁</h3>
            <p>
              학생에게 단어를 또박또박 읽게 하고, 오답일 때는 원어민 발음 듣기
              후 다시 따라 읽게 하면 좋습니다.
            </p>
          </article>

          <article className="hint-card">
            <p className="mode-label">Current Set</p>
            <h3>이번 활동 단어 수</h3>
            <p className="result-score">{totalQuestions}</p>
            <p className="result-copy">
              맞게 말한 단어만 점수에 반영됩니다.
            </p>
          </article>
        </aside>
      </div>
    </section>
  );
}
