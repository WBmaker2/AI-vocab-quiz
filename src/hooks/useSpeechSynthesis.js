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

  const ensureVoicesReady = useCallback((timeoutMs = 2500) => {
    const synthesis = synthesisRef.current;

    if (!synthesis || typeof synthesis.getVoices !== "function") {
      setVoicesReady(true);
      return Promise.resolve([]);
    }

    const current = synthesis.getVoices();

    if (current.length > 0) {
      voicesRef.current = current;
      setVoices(current);
      setVoicesReady(true);
      const resolved = resolvePreferredSpeechVoice(current);

      if (resolved) {
        preferredVoiceURIRef.current = resolved.voiceURI;
        setPreferredVoiceURI(resolved.voiceURI);
        saveStoredVoiceURI(resolved.voiceURI);
      }

      return Promise.resolve(current);
    }

    return new Promise((resolve) => {
      let settled = false;

      const finish = (voices) => {
        if (settled) {
          return;
        }

        settled = true;
        const list = Array.isArray(voices) ? voices : [];

        if (list.length > 0) {
          voicesRef.current = list;
          setVoices(list);
          const resolved = resolvePreferredSpeechVoice(list);

          if (resolved) {
            preferredVoiceURIRef.current = resolved.voiceURI;
            setPreferredVoiceURI(resolved.voiceURI);
            saveStoredVoiceURI(resolved.voiceURI);
          }
        }

        setVoicesReady(true);
        resolve(list);
      };

      const previousHandler = synthesis.onvoiceschanged;

      synthesis.onvoiceschanged = () => {
        try {
          previousHandler?.();
        } catch {
          // 기존 핸들러 실패 무시
        }

        finish(synthesis.getVoices());
      };

      window.setTimeout(() => {
        try {
          finish(synthesis.getVoices());
        } catch {
          finish([]);
        }
      }, timeoutMs);
    });
  }, []);

  const warmup = useCallback(() => {
    const synthesis = synthesisRef.current;

    if (!synthesis) {
      return false;
    }

    try {
      synthesis.resume?.();
    } catch {
      // resume 실패 무시
    }

    try {
      const loaded = synthesis.getVoices?.() ?? [];

      if (loaded.length > 0) {
        voicesRef.current = loaded;
        setVoices(loaded);
        setVoicesReady(true);
      }
    } catch {
      // 목록 조회 실패 무시
    }

    return true;
  }, []);

  const speakAsync = useCallback((text, options = {}) => {
    const synthesis = synthesisRef.current;

    if (!synthesis || !text) {
      return Promise.reject(new Error("tts-unsupported"));
    }

    setSpeakError("");

    return new Promise((resolve, reject) => {
      const startPlayback = () => {
        if (synthesis.paused) {
          try {
            synthesis.resume();
          } catch {
            // resume 실패 무시
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
          preferredVoice =
            availableVoices.find((voice) => voice.voiceURI === options.voiceURI) ?? null;
        } else {
          preferredVoice =
            availableVoices.find(
              (voice) => voice.voiceURI === preferredVoiceURIRef.current,
            ) ?? resolvePreferredSpeechVoice(availableVoices);
        }

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        let settled = false;

        utterance.onstart = () => {
          setSpeaking(true);
        };

        utterance.onend = () => {
          if (settled) {
            return;
          }

          settled = true;
          setSpeaking(false);
          options.onEnd?.();
          resolve("ended");
        };

        utterance.onerror = (event) => {
          if (settled) {
            return;
          }

          settled = true;
          setSpeaking(false);
          const code = event?.error ?? "error";
          setSpeakError(String(code));
          options.onError?.(event);
          reject(new Error(`tts-${String(code)}`));
        };

        try {
          synthesis.speak(utterance);
        } catch (error) {
          if (settled) {
            return;
          }

          settled = true;
          setSpeaking(false);
          setSpeakError("speak-failed");
          reject(error instanceof Error ? error : new Error("speak-failed"));
          return;
        }

        window.setTimeout(() => {
          if (!settled) {
            settled = true;
            setSpeaking(false);
            setSpeakError("speak-timeout");
            options.onError?.(new Error("speak-timeout"));
            reject(new Error("tts-speak-timeout"));
          }
        }, options.timeoutMs ?? 12000);
      };

      try {
        synthesis.cancel();
      } catch {
        // cancel 실패 무시
      }

      // Chrome 잘림 버그 방지: cancel 직후 즉시 speak하면 잘리므로 100ms 대기
      window.setTimeout(() => {
        try {
          startPlayback();
        } catch (error) {
          setSpeaking(false);
          reject(error instanceof Error ? error : new Error("speak-failed"));
        }
      }, 100);
    });
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
      speakAsync,
      ensureVoicesReady,
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
    [cancel, ensureVoicesReady, hasEnglishVoiceValue, hasStoredRatePreset, ratePreset, setRatePreset, speak, speakAsync, speakError, speaking, voiceLabel, voices, voicesReady, warmup],
  );
}
