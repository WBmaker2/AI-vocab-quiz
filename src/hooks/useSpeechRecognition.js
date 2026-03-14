import { useEffect, useRef, useState } from "react";

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
  const [supported, setSupported] = useState(isSpeechRecognitionSupported());
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
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
      setListening(true);
      setError("");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (event) => {
      setListening(false);
      void resolveRecognitionError(event.error);
    };

    recognition.onresult = (event) => {
      const value = Array.from(event.results)
        .flatMap((result) => Array.from(result))
        .map((result) => result.transcript)
        .join(" ")
        .trim();

      setTranscript(value);
      config.onResult?.(value, event);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;
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
      setMicrophoneState("unknown");
      setTranscript("");
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
      recognitionRef.current?.stop();
    } catch {
      setError("speech-recognition-stop-failed");
    }
  }

  function reset() {
    microphoneStateRef.current = "unknown";
    setMicrophoneState("unknown");
    setTranscript("");
    setError("");
  }

  return {
    browserName,
    microphoneState,
    supported,
    listening,
    transcript,
    error,
    start,
    stop,
    reset,
  };
}
