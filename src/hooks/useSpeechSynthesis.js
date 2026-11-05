import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  hasEnglishVoice,
  loadStoredRatePreset,
  loadStoredVoiceURI,
  resolvePreferredSpeechVoice,
  resolveSpeechRate,
  saveStoredRatePreset,
  saveStoredVoiceURI,
} from "../utils/speechVoice.js";

function getSpeechSynthesisApi() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  return window.speechSynthesis;
}

export function useSpeechSynthesis() {
  const synthesisRef = useRef(getSpeechSynthesisApi());
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState(() => {
    const synthesis = getSpeechSynthesisApi();
    return typeof synthesis?.getVoices === "function" ? synthesis.getVoices() : [];
  });
  const [ratePreset, setRatePresetState] = useState(() => loadStoredRatePreset() || "standard");
  const [preferredVoiceURI, setPreferredVoiceURI] = useState(() => loadStoredVoiceURI());
  const [hasStoredRatePreset, setHasStoredRatePreset] = useState(() => loadStoredRatePreset() !== "");
  const [voicesReady, setVoicesReady] = useState(() => voices.length > 0);
  const [speakError, setSpeakError] = useState("");
  const ratePresetRef = useRef(ratePreset);
  const voicesRef = useRef(voices);
  const preferredVoiceURIRef = useRef(preferredVoiceURI);

  useEffect(() => {
    const synthesis = getSpeechSynthesisApi();
    synthesisRef.current = synthesis;

    if (!synthesis || typeof synthesis.getVoices !== "function") {
      return () => {
        synthesisRef.current?.cancel();
      };
    }

    const loadVoices = () => {
      const nextVoices = synthesis.getVoices();

      if (nextVoices.length === 0) {
        return;
      }

      voicesRef.current = nextVoices;
      setVoices(nextVoices);
      setVoicesReady(true);
      const resolved = resolvePreferredSpeechVoice(nextVoices);

      if (resolved) {
        preferredVoiceURIRef.current = resolved.voiceURI;
        setPreferredVoiceURI(resolved.voiceURI);
        saveStoredVoiceURI(resolved.voiceURI);
      }
    };

    loadVoices();
    synthesis.onvoiceschanged = loadVoices;
    const fallbackTimer = window.setTimeout(() => {
      setVoicesReady(true);
    }, 1500);

    return () => {
      window.clearTimeout(fallbackTimer);
      synthesis.onvoiceschanged = null;
      synthesisRef.current?.cancel();
    };
  }, []);

  const cancel = useCallback(() => {
    synthesisRef.current?.cancel();
    setSpeaking(false);
  }, []);

  const setRatePreset = useCallback((preset) => {
    if (preset !== "standard" && preset !== "slow") {
      return;
    }

    ratePresetRef.current = preset;
    setRatePresetState(preset);
    setHasStoredRatePreset(true);
    saveStoredRatePreset(preset);
  }, []);

  const warmup = useCallback(() => {
    const synthesis = synthesisRef.current;

    if (!synthesis) {
      return false;
    }

    try {
      const utterance = new SpeechSynthesisUtterance("hello");
      utterance.lang = "en-US";
      utterance.volume = 0;
      utterance.rate = 1;
      synthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  }, []);

  const speak = useCallback((text, options = {}) => {
    const synthesis = synthesisRef.current;
    if (!synthesis || !text) {
      return false;
    }

    setSpeakError("");

    try {
      synthesis.cancel();
    } catch {
      // cancel 실패는 무시하고 재생을 시도한다.
    }

    if (synthesis.paused) {
      try {
        synthesis.resume();
      } catch {
        // resume 실패는 무시한다.
      }
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang ?? "en-US";
    utterance.volume = options.volume ?? 1;
    utterance.rate = options.rate ?? resolveSpeechRate(ratePresetRef.current);
    utterance.pitch = options.pitch ?? 1;

    const availableVoices = voicesRef.current;
    let preferredVoice = null;

    if (options.voiceURI) {
      preferredVoice = availableVoices.find((voice) => voice.voiceURI === options.voiceURI) ?? null;
    } else {
      preferredVoice = availableVoices.find(
        (voice) => voice.voiceURI === preferredVoiceURIRef.current,
      ) ?? resolvePreferredSpeechVoice(availableVoices);
    }

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setSpeaking(true);
    };

    utterance.onend = () => {
      setSpeaking(false);
      options.onEnd?.();
    };

    utterance.onerror = (event) => {
      setSpeaking(false);
      setSpeakError(event?.error ?? "error");
      options.onError?.(event);
    };

    try {
      synthesis.speak(utterance);
    } catch {
      setSpeaking(false);
      setSpeakError("speak-failed");
      return false;
    }

    return true;
  }, []);

  const voiceLabel = useMemo(() => {
    const current = voices.find((voice) => voice.voiceURI === preferredVoiceURI);
    return current ? String(current.name ?? "").trim() : "";
  }, [preferredVoiceURI, voices]);

  const hasEnglishVoiceValue = useMemo(() => hasEnglishVoice(voices), [voices]);

  return useMemo(
    () => ({
      supported: Boolean(synthesisRef.current),
      speaking,
      speak,
      cancel,
      voices,
      voicesReady,
      hasEnglishVoice: hasEnglishVoiceValue,
      speakError,
      voiceLabel,
      rate: resolveSpeechRate(ratePreset),
      ratePreset,
      setRatePreset,
      hasStoredRatePreset,
      warmup,
    }),
    [cancel, hasEnglishVoiceValue, hasStoredRatePreset, ratePreset, setRatePreset, speak, speakError, speaking, voiceLabel, voices, voicesReady, warmup],
  );
}
