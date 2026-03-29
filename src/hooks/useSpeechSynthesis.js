import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function getSpeechSynthesisApi() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  return window.speechSynthesis;
}

export function useSpeechSynthesis() {
  const synthesisRef = useRef(getSpeechSynthesisApi());
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    synthesisRef.current = getSpeechSynthesisApi();

    return () => {
      synthesisRef.current?.cancel();
    };
  }, []);

  const cancel = useCallback(() => {
    synthesisRef.current?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text, options = {}) => {
    const synthesis = synthesisRef.current;
    if (!synthesis || !text) {
      return false;
    }

    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang ?? "en-US";
    utterance.rate = options.rate ?? 0.9;
    utterance.pitch = options.pitch ?? 1;

    utterance.onstart = () => {
      setSpeaking(true);
    };

    utterance.onend = () => {
      setSpeaking(false);
      options.onEnd?.();
    };

    utterance.onerror = () => {
      setSpeaking(false);
      options.onError?.();
    };

    synthesis.speak(utterance);
    return true;
  }, []);

  return useMemo(
    () => ({
      supported: Boolean(synthesisRef.current),
      speaking,
      speak,
      cancel,
    }),
    [cancel, speak, speaking],
  );
}
