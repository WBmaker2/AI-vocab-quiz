import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchPronunciationUrl,
  getSharedPronunciationCache,
  normalizePronunciationWord,
  playPronunciationUrl,
  preloadPronunciationUrls,
  unlockBrowserAudio,
} from "../utils/pronunciationAudio.js";
import { resolveSpeechRate } from "../utils/speechVoice.js";

const PRELOAD_LIMIT = 12;

export function usePronunciation(speech) {
  const cacheRef = useRef(null);

  if (!cacheRef.current) {
    cacheRef.current = getSharedPronunciationCache();
  }

  const [preparing, setPreparing] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [lastSource, setLastSource] = useState("");
  const [lastError, setLastError] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const speechRef = useRef(speech);
  speechRef.current = speech;

  const unlock = useCallback(async () => {
    setPreparing(true);
    setLastError("");

    try {
      await unlockBrowserAudio();
    } catch {
      // 잠금 해제 실패해도 TTS 시도는 계속한다.
    }

    try {
      await speechRef.current?.ensureVoicesReady?.();
    } catch {
      // 음성 목록 실패해도 MP3가 있으면 진행 가능하다.
    }

    // 제스처 안에서 1회 짧게 TTS를 깨운다. 실패해도 MP3 경로가 있다.
    try {
      await speechRef.current?.speakAsync?.("hello", { volume: 0.01 });
    } catch {
      try {
        speechRef.current?.warmup?.();
      } catch {
        // 무시
      }
    }

    setUnlocked(true);
    setReady(true);
    setPreparing(false);
    return true;
  }, []);

  const preloadWords = useCallback(async (words) => {
    const list = (Array.isArray(words) ? words : [])
      .map((word) =>
        typeof word === "string" ? word : String(word?.word ?? ""),
      )
      .map(normalizePronunciationWord)
      .filter(Boolean);

    if (list.length === 0) {
      return new Map();
    }

    try {
      const result = await preloadPronunciationUrls(list, {
        cache: cacheRef.current,
        limit: PRELOAD_LIMIT,
        concurrency: 3,
      });
      setReady(true);
      return result;
    } catch {
      return new Map();
    }
  }, []);

  useEffect(() => {
    // 마운트 시 백그라운드 예열은 하지 않는다.
    // 게이트 클릭(사용자 제스처) 이후에만 preloadWords를 호출해
    // 자동재생 정책과 네트워크 낭비를 방지한다.
  }, []);

  const playTtsFallback = useCallback(async (word, options = {}) => {
    const currentSpeech = speechRef.current;

    if (!currentSpeech?.supported) {
      throw new Error("tts-unsupported");
    }

    if (typeof currentSpeech.speakAsync === "function") {
      await currentSpeech.speakAsync(word, {
        lang: "en-US",
        volume: options.volume ?? 1,
        rate: options.rate ?? currentSpeech.rate,
      });
      return;
    }

    const ok = currentSpeech.speak?.(word, {
      lang: "en-US",
      volume: options.volume ?? 1,
      rate: options.rate ?? resolveSpeechRate(currentSpeech.ratePreset),
    });

    if (!ok) {
      throw new Error("tts-speak-failed");
    }

    // 구형 speak()은 Promise가 없으므로 짧게 대기 후 성공으로 간주한다.
    await new Promise((resolve) => setTimeout(resolve, 350));
  }, []);

  const playWord = useCallback(
    async (word, options = {}) => {
      const text = String(word ?? "").trim();

      if (!text) {
        return false;
      }

      setLastError("");
      setPlaying(true);

      const volume = options.volume ?? 1;
      const rate = options.rate;
      const allowTts = options.allowTtsFallback ?? true;

      // 1순위: MP3 원어민 음원
      try {
        let url = "";

        const normalized = normalizePronunciationWord(text);
        const cached = cacheRef.current.get(normalized.split(" ")[0]);

        if (cached) {
          url = String(cached);
        } else {
          url = await fetchPronunciationUrl(text, {
            cache: cacheRef.current,
          });
        }

        if (url) {
          await playPronunciationUrl(url, { volume });
          setLastSource("mp3");
          setPlaying(false);
          return true;
        }
      } catch {
        // MP3 실패는 TTS 폴백으로 이어진다.
      }

      // 2순위: 브라우저 TTS
      if (allowTts) {
        const attempts = Math.max(1, options.retries ?? 2);

        for (let attempt = 0; attempt < attempts; attempt += 1) {
          try {
            await playTtsFallback(text, { volume, rate });
            setLastSource("tts");
            setPlaying(false);
            return true;
          } catch (error) {
            if (attempt === attempts - 1) {
              setLastError(error instanceof Error ? error.message : "tts-failed");
            } else {
              await new Promise((resolve) => setTimeout(resolve, 350));
            }
          }
        }
      }

      setPlaying(false);
      if (!allowTts) {
        setLastError("mp3-failed");
      }
      return false;
    },
    [playTtsFallback],
  );

  const state = useMemo(
    () => ({
      preparing,
      ready: ready || unlocked,
      playing,
      lastSource,
      lastError,
      unlocked,
      unlock,
      preloadWords,
      playWord,
    }),
    [lastError, lastSource, playing, preloadWords, preparing, playWord, ready, unlock, unlocked],
  );

  return state;
}
