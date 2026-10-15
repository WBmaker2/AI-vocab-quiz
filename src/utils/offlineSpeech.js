export const OFFLINE_STT_MODEL_ID = "Xenova/whisper-tiny.en";
export const OFFLINE_STT_MAX_RECORD_MS = 8000;
export const OFFLINE_STT_LIBRARY_URL = "https://esm.sh/@xenova/transformers@2.17.2";

const RECORD_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

export function resolveRecordingMimeType(recorderClass) {
  const Recorder = recorderClass ?? (typeof MediaRecorder !== "undefined" ? MediaRecorder : null);

  if (!Recorder) {
    return "";
  }

  if (typeof Recorder.isTypeSupported !== "function") {
    return "";
  }

  return RECORD_MIME_CANDIDATES.find((mimeType) => {
    try {
      return Recorder.isTypeSupported(mimeType);
    } catch {
      return false;
    }
  }) ?? "";
}

export function isOfflineRecordingSupported() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }

  if (typeof MediaRecorder === "undefined") {
    return false;
  }

  return resolveRecordingMimeType(MediaRecorder) !== "";
}

let cachedTranscriberPromise = null;

export function loadOfflineTranscriber(onProgress) {
  if (!cachedTranscriberPromise) {
    cachedTranscriberPromise = import(/* @vite-ignore */ OFFLINE_STT_LIBRARY_URL).then(({ pipeline }) => {
      return pipeline("automatic-speech-recognition", OFFLINE_STT_MODEL_ID, {
        progress_callback: (progress) => {
          onProgress?.(progress);
        },
      });
    }).catch((error) => {
      cachedTranscriberPromise = null;
      throw error;
    });
  }

  return cachedTranscriberPromise;
}

export async function decodeRecordingToMono(blob) {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextConstructor();

  try {
    const buffer = await blob.arrayBuffer();
    const decoded = await context.decodeAudioData(buffer);
    const channel = decoded.getChannelData(0);
    return { samples: channel.slice(), sampleRate: decoded.sampleRate };
  } finally {
    context.close().catch(() => {});
  }
}

export async function transcribeRecording(transcriber, audio) {
  const output = await transcriber(audio.samples, {
    sampling_rate: audio.sampleRate,
    return_timestamps: false,
  });
  const text = Array.isArray(output) ? output[0]?.text : output?.text;
  return String(text ?? "").trim();
}
