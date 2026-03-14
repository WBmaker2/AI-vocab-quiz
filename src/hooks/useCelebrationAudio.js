import { useEffect, useRef } from "react";

function getAudioContextConstructor() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.AudioContext || window.webkitAudioContext || null;
}

function createTone(context, destination, {
  startTime,
  duration,
  frequency,
  type = "sine",
  gain = 0.1,
}) {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(gain, startTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

function schedulePattern(context, pattern) {
  const masterGain = context.createGain();
  masterGain.gain.value = 0.8;
  masterGain.connect(context.destination);

  const startTime = context.currentTime + 0.01;

  pattern.forEach((note) => {
    createTone(context, masterGain, {
      ...note,
      startTime: startTime + note.offset,
    });
  });
}

async function ensureRunningContext(audioContextRef) {
  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) {
    return null;
  }

  if (!audioContextRef.current) {
    audioContextRef.current = new AudioContextConstructor();
  }

  if (audioContextRef.current.state === "suspended") {
    try {
      await audioContextRef.current.resume();
    } catch {
      return null;
    }
  }

  return audioContextRef.current;
}

const SHORT_SUCCESS_PATTERN = [
  { offset: 0, duration: 0.12, frequency: 659.25, type: "triangle", gain: 0.08 },
  { offset: 0.1, duration: 0.16, frequency: 783.99, type: "triangle", gain: 0.09 },
  { offset: 0.22, duration: 0.2, frequency: 987.77, type: "triangle", gain: 0.1 },
];

const LONG_COMPLETION_PATTERN = [
  { offset: 0, duration: 0.18, frequency: 523.25, type: "triangle", gain: 0.08 },
  { offset: 0.14, duration: 0.2, frequency: 659.25, type: "triangle", gain: 0.09 },
  { offset: 0.3, duration: 0.22, frequency: 783.99, type: "triangle", gain: 0.1 },
  { offset: 0.5, duration: 0.28, frequency: 1046.5, type: "triangle", gain: 0.11 },
  { offset: 0.84, duration: 0.24, frequency: 783.99, type: "sine", gain: 0.08 },
  { offset: 1.02, duration: 0.26, frequency: 1046.5, type: "sine", gain: 0.09 },
  { offset: 1.22, duration: 0.4, frequency: 1318.51, type: "sine", gain: 0.1 },
];

export function useCelebrationAudio() {
  const audioContextRef = useRef(null);

  useEffect(() => {
    return () => {
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    };
  }, []);

  async function playPattern(pattern) {
    const context = await ensureRunningContext(audioContextRef);
    if (!context) {
      return false;
    }

    schedulePattern(context, pattern);
    return true;
  }

  function playSuccess() {
    return playPattern(SHORT_SUCCESS_PATTERN);
  }

  function playCompletion() {
    return playPattern(LONG_COMPLETION_PATTERN);
  }

  return {
    supported: Boolean(getAudioContextConstructor()),
    playSuccess,
    playCompletion,
  };
}
