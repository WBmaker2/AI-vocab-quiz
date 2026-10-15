export const SPEECH_RATE_PRESETS = {
  standard: 0.9,
  slow: 0.7,
};

export const SPEECH_RATE_STORAGE_KEY = "ttsRatePreset.v1";
export const SPEECH_VOICE_STORAGE_KEY = "ttsPreferredVoice.v1";

export function resolveSpeechRate(preset) {
  return SPEECH_RATE_PRESETS[preset] ?? SPEECH_RATE_PRESETS.standard;
}

export function isSpeechRatePreset(value) {
  return Object.hasOwn(SPEECH_RATE_PRESETS, value);
}

function readStorage(key) {
  try {
    if (typeof localStorage === "undefined") {
      return "";
    }

    return String(localStorage.getItem(key) ?? "");
  } catch {
    return "";
  }
}

function writeStorage(key, value) {
  try {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(key, value);
  } catch {
    // 저장 실패는 무시하고 기본값으로 동작한다.
  }
}

export function loadStoredRatePreset() {
  const stored = readStorage(SPEECH_RATE_STORAGE_KEY);
  return isSpeechRatePreset(stored) ? stored : "";
}

export function saveStoredRatePreset(preset) {
  if (!isSpeechRatePreset(preset)) {
    return;
  }

  writeStorage(SPEECH_RATE_STORAGE_KEY, preset);
}

export function loadStoredVoiceURI() {
  return readStorage(SPEECH_VOICE_STORAGE_KEY);
}

export function saveStoredVoiceURI(voiceURI) {
  if (!voiceURI) {
    return;
  }

  writeStorage(SPEECH_VOICE_STORAGE_KEY, String(voiceURI));
}

function scoreSpeechVoice(voice) {
  const lang = String(voice?.lang ?? "");
  const name = String(voice?.name ?? "");
  let score = 0;

  if (/^en-US/i.test(lang)) {
    score += 3;
  } else if (/^en-GB/i.test(lang)) {
    score += 2;
  } else if (/^en/i.test(lang)) {
    score += 1;
  } else {
    return -1;
  }

  if (/google\s+us\s+english/i.test(name)) {
    score += 4;
  } else if (/google/i.test(name)) {
    score += 2;
  }

  if (/natural|neural/i.test(name)) {
    score += 1;
  }

  if (voice?.default) {
    score += 0.5;
  }

  return score;
}

export function pickPreferredSpeechVoice(voices) {
  const list = Array.isArray(voices) ? voices : [];
  let best = null;
  let bestScore = -1;

  for (const voice of list) {
    const score = scoreSpeechVoice(voice);

    if (score > bestScore) {
      bestScore = score;
      best = voice;
    }
  }

  return bestScore < 0 ? null : best;
}

export function resolvePreferredSpeechVoice(voices) {
  const list = Array.isArray(voices) ? voices : [];

  if (list.length === 0) {
    return null;
  }

  const storedURI = loadStoredVoiceURI();

  if (storedURI) {
    const stored = list.find((voice) => voice?.voiceURI === storedURI);

    if (stored && scoreSpeechVoice(stored) >= 0) {
      return stored;
    }
  }

  return pickPreferredSpeechVoice(list);
}
