export const DICTIONARY_API_BASE =
  "https://api.dictionaryapi.dev/api/v2/entries/en";

export const PRONUNCIATION_FETCH_TIMEOUT_MS = 6000;
export const PRONUNCIATION_PLAY_TIMEOUT_MS = 9000;

const sharedPronunciationCache = new Map();

export function getSharedPronunciationCache() {
  return sharedPronunciationCache;
}

export function normalizePronunciationWord(word) {
  return String(word ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function buildDictionaryLookupUrl(word) {
  const normalized = normalizePronunciationWord(word);
  return `${DICTIONARY_API_BASE}/${encodeURIComponent(normalized)}`;
}

export function extractPronunciationAudioUrls(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const urls = [];

  for (const entry of entries) {
    const phonetics = Array.isArray(entry?.phonetics) ? entry.phonetics : [];

    for (const phonetic of phonetics) {
      const audio = String(phonetic?.audio ?? "").trim();

      if (audio && !urls.includes(audio)) {
        urls.push(audio);
      }
    }
  }

  return urls;
}

export function pickPronunciationAudioUrl(entries) {
  const urls = extractPronunciationAudioUrls(entries);

  if (urls.length === 0) {
    return "";
  }

  const usMatch = urls.find((url) => /([._-]us[._-]|us\.mp3|en-us)/i.test(url));

  return usMatch ?? urls[0];
}

function resolveFetchFunction(fetchFn) {
  if (typeof fetchFn === "function") {
    return fetchFn;
  }

  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }

  return null;
}

export async function fetchPronunciationUrl(word, options = {}) {
  const normalized = normalizePronunciationWord(word);

  if (!normalized) {
    return "";
  }

  // 다중 철자 변형(복수형 등)은 첫 토큰 기준으로 조회한다.
  const lookupWord = normalized.split(" ")[0];
  const cache = options.cache ?? sharedPronunciationCache;

  if (cache?.has?.(lookupWord)) {
    return String(cache.get(lookupWord) ?? "");
  }

  const fetchFn = resolveFetchFunction(options.fetchFn);

  if (!fetchFn) {
    return "";
  }

  const timeoutMs = options.timeoutMs ?? PRONUNCIATION_FETCH_TIMEOUT_MS;
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const response = await fetchFn(
      `${DICTIONARY_API_BASE}/${encodeURIComponent(lookupWord)}`,
      controller ? { signal: controller.signal } : undefined,
    );

    if (!response || response.ok === false) {
      cache?.set?.(lookupWord, "");
      return "";
    }

    let entries = [];

    try {
      entries = await response.json();
    } catch {
      cache?.set?.(lookupWord, "");
      return "";
    }

    const url = pickPronunciationAudioUrl(entries);
    cache?.set?.(lookupWord, url);
    return url;
  } catch {
    // 네트워크 차단·타임아웃·CORS 실패는 조용히 TTS 폴백으로 넘긴다.
    return "";
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function preloadPronunciationUrls(words, options = {}) {
  const cache = options.cache ?? sharedPronunciationCache;
  const fetchFn = options.fetchFn;
  const limit = options.limit ?? 12;
  const concurrency = Math.max(1, options.concurrency ?? 3);
  const onProgress = options.onProgress;
  const result = new Map();
  const queue = [...new Set((Array.isArray(words) ? words : []).map(normalizePronunciationWord).filter(Boolean))].slice(
    0,
    limit,
  );

  let cursor = 0;

  async function worker() {
    while (cursor < queue.length) {
      const current = queue[cursor];
      cursor += 1;

      try {
        const url = await fetchPronunciationUrl(current, { fetchFn, cache });

        if (url) {
          result.set(current, url);
        }
      } catch {
        // 개별 단어 실패는 전체 예열을 막지 않는다.
      }

      try {
        onProgress?.({ done: cursor, total: queue.length, word: current });
      } catch {
        // 진행 콜백 실패 무시
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()),
  );

  return result;
}

export function playPronunciationUrl(url, options = {}) {
  const source = String(url ?? "").trim();

  if (!source) {
    return Promise.reject(new Error("empty-audio-url"));
  }

  const AudioClass =
    options.AudioClass ??
    (typeof globalThis.Audio !== "undefined" ? globalThis.Audio : null);

  if (!AudioClass) {
    return Promise.reject(new Error("audio-unsupported"));
  }

  const timeoutMs = options.timeoutMs ?? PRONUNCIATION_PLAY_TIMEOUT_MS;
  const volume = options.volume ?? 1;

  return new Promise((resolve, reject) => {
    let settled = false;
    let audio = null;

    const cleanup = (timer) => {
      if (timer) {
        clearTimeout(timer);
      }
    };

    let timeoutId = null;

    const settleResolve = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup(timeoutId);
      resolve();
    };

    const settleReject = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup(timeoutId);

      try {
        audio?.pause?.();
      } catch {
        // 정리는 실패해도 무시
      }

      reject(error instanceof Error ? error : new Error("audio-play-failed"));
    };

    try {
      audio = new AudioClass(source);
    } catch (error) {
      settleReject(error);
      return;
    }

    try {
      audio.preload = "auto";
      audio.volume = volume;

      if ("crossOrigin" in audio) {
        audio.crossOrigin = "anonymous";
      }
    } catch {
      // 속성 설정 실패는 재생에 치명적이지 않다.
    }

    timeoutId = setTimeout(() => {
      settleReject(new Error("audio-play-timeout"));
    }, timeoutMs);

    audio.onended = settleResolve;
    audio.onerror = () => settleReject(new Error("audio-play-error"));

    let playResult = null;

    try {
      playResult = audio.play();
    } catch (error) {
      settleReject(error);
      return;
    }

    if (playResult && typeof playResult.catch === "function") {
      playResult.catch((error) => {
        settleReject(error);
      });
    } else if (!playResult) {
      // play()가 Promise를 반환하지 않는 구형 브라우저에서는 ended 이벤트로 판정한다.
      setTimeout(() => {
        if (!settled && audio && (audio.ended || audio.paused === false)) {
          settleResolve();
        }
      }, 500);
    }
  });
}

export async function unlockBrowserAudio() {
  let unlocked = false;

  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.resume?.();
      unlocked = true;
    }
  } catch {
    // resume 실패 무시
  }

  try {
    const AudioContextConstructor =
      typeof window !== "undefined"
        ? window.AudioContext || window.webkitAudioContext
        : null;

    if (AudioContextConstructor) {
      const context = new AudioContextConstructor();

      if (typeof context.resume === "function") {
        await context.resume().catch(() => {});
      }

      // 잠금 해제용 극히 짧은 무음 버퍼 (소리 없음)
      try {
        const buffer = context.createBuffer(1, 1, 22050);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);
      } catch {
        // 무음 버퍼 실패는 무시
      }

      unlocked = true;

      // 예열용 컨텍스트는 바로 닫지 않고 resume 상태만 유지한다.
      // (닫으면 다음 재생이 다시 막힐 수 있어 close하지 않음)
    }
  } catch {
    // AudioContext 실패 무시
  }

  return unlocked;
}
