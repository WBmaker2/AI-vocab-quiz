import { useEffect, useRef, useState } from "react";
import { getSpeechRecognitionEndFallbackError } from "../utils/speakingAttempts.js";
import { extractSpeechCandidates } from "../utils/speakingAcceptance.js";

function getRecognitionConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function detectBrowserName() {
  if (typeof navigator === "undefined") {
    return "unknown";
  }

  const userAgent = navigator.userAgent;

  if (/Edg\//.test(userAgent)) {
    return "edge";
  }

  if (/Chrome\//.test(userAgent) || /CriOS\//.test(userAgent)) {
    return "chrome";
  }

  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent) && !/CriOS\//.test(userAgent)) {
    return "safari";
  }

  if (/Firefox\//.test(userAgent)) {
    return "firefox";
  }

  return "unknown";
}

async function probeMicrophoneState() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { status: "unknown" };
  }

  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    if (navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasAudioInput = devices.some((device) => device.kind === "audioinput");

      if (!hasAudioInput) {
        return {
          status: "missing",
          error: "microphone-device-missing",
        };
      }
    }

    return { status: "granted" };
  } catch (error) {
    if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
      return {
        status: "denied",
        error: "microphone-permission-denied",
      };
    }

    if (
      error?.name === "NotFoundError"
      || error?.name === "DevicesNotFoundError"
      || error?.name === "OverconstrainedError"
    ) {
      return {
        status: "missing",
        error: "microphone-device-missing",
      };
    }

    if (error?.name === "NotReadableError" || error?.name === "TrackStartError") {
      return {
        status: "busy",
        error: "microphone-device-busy",
      };
    }

    return {
      status: "error",
      error: "microphone-access-failed",
    };
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
  }
}

export function isSpeechRecognitionSupported() {
  return Boolean(getRecognitionConstructor());
}

export function useSpeechRecognition(config = {}) {
  const recognitionRef = useRef(null);
  const browserNameRef = useRef(detectBrowserName());
  const microphoneStateRef = useRef("unknown");
  const stopRequestedRef = useRef(false);
  const resultReceivedRef = useRef(false);
  const errorReceivedRef = useRef(false);
  const [supported, setSupported] = useState(isSpeechRecognitionSupported());
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState("");
  const [browserName, setBrowserName] = useState(browserNameRef.current);
  const [microphoneState, setMicrophoneState] = useState("unknown");

  async function resolveRecognitionError(rawError) {
    if (rawError === "not-allowed" || rawError === "service-not-allowed") {
      const probe = await probeMicrophoneState();
      microphoneStateRef.current = probe.status;
      setMicrophoneState(probe.status);

      if (probe.error) {
        setError(probe.error);
        return;
      }

      if (browserNameRef.current === "safari") {
        setError("speech-recognition-safari-limited");
        return;
      }

      setError("speech-recognition-service-unavailable");
      return;
    }

    if (rawError === "audio-capture" || rawError === "not-found") {
      microphoneStateRef.current = "missing";
      setMicrophoneState("missing");
      setError("microphone-device-missing");
      return;
    }

    if (rawError === "network") {
      setError(
        browserNameRef.current === "safari"
          ? "speech-recognition-safari-limited"
          : "speech-recognition-network-error",
      );
      return;
    }

    setError(rawError ?? "speech-recognition-error");
  }

  useEffect(() => {
    const Recognition = getRecognitionConstructor();
    const nextBrowserName = detectBrowserName();

    setSupported(Boolean(Recognition));
    browserNameRef.current = nextBrowserName;
    setBrowserName(nextBrowserName);

    if (!Recognition) {
      recognitionRef.current = null;
      return;
    }

    const recognition = new Recognition();
    recognition.lang = config.lang ?? "en-US";
    recognition.interimResults = config.interimResults ?? false;
    recognition.maxAlternatives = config.maxAlternatives ?? 1;
    recognition.continuous = config.continuous ?? false;

    recognition.onstart = () => {
      stopRequestedRef.current = false;
      resultReceivedRef.current = false;
      errorReceivedRef.current = false;
      setListening(true);
      setError("");
    };

    recognition.onend = () => {
      setListening(false);
      const fallbackError = getSpeechRecognitionEndFallbackError({
        stopRequested: stopRequestedRef.current,
        resultReceived: resultReceivedRef.current,
        errorReceived: errorReceivedRef.current,
      });

      if (fallbackError) {
        errorReceivedRef.current = true;
        setError(fallbackError);
      }
    };

    recognition.onerror = (event) => {
      errorReceivedRef.current = true;
      setListening(false);
      void resolveRecognitionError(event.error);
    };

    recognition.onnomatch = () => {
      errorReceivedRef.current = true;
      setListening(false);
      setError("no-match");
    };

    recognition.onresult = (event) => {
      const nextCandidates = extractSpeechCandidates(event);
      const value = nextCandidates[0] ?? "";

      resultReceivedRef.current = Boolean(value);
      setTranscript(value);
      setCandidates(nextCandidates);
      config.onResult?.(value, event);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onnomatch = null;
      recognition.onresult = null;
      stopRequestedRef.current = true;
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [
    config.continuous,
    config.interimResults,
    config.lang,
    config.maxAlternatives,
    config.onResult,
  ]);

  function start() {
    if (!recognitionRef.current) {
      setError("speech-recognition-unsupported");
      return false;
    }

    try {
      microphoneStateRef.current = "unknown";
      stopRequestedRef.current = false;
      resultReceivedRef.current = false;
      errorReceivedRef.current = false;
      setMicrophoneState("unknown");
      setTranscript("");
      setCandidates([]);
      setError("");
      recognitionRef.current.start();
      return true;
    } catch {
      setError("speech-recognition-start-failed");
      return false;
    }
  }

  function stop() {
    try {
      stopRequestedRef.current = true;
      recognitionRef.current?.stop();
    } catch {
      setError("speech-recognition-stop-failed");
    }
  }

  function reset() {
    microphoneStateRef.current = "unknown";
    setMicrophoneState("unknown");
    setTranscript("");
    setCandidates([]);
    setError("");
  }

  return {
    browserName,
    microphoneState,
    supported,
    listening,
    transcript,
    candidates,
    error,
    start,
    stop,
    reset,
  };
}
