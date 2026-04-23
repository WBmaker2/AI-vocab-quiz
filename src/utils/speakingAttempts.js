export const SPEAKING_ADVANCE_FAILURE_LIMIT = 3;

const CONFIGURATION_ERROR_VALUES = new Set([
  "microphone-permission-denied",
  "microphone-device-missing",
  "microphone-device-busy",
  "microphone-access-failed",
  "speech-recognition-safari-limited",
  "speech-recognition-service-unavailable",
  "speech-recognition-network-error",
  "speech-recognition-start-failed",
  "speech-recognition-stop-failed",
]);

export function normalizeSpeechRecognitionError(error) {
  return String(error ?? "").trim();
}

export function isSpeakingConfigurationError(error) {
  return CONFIGURATION_ERROR_VALUES.has(normalizeSpeechRecognitionError(error));
}

export function shouldCountSpeechRecognitionErrorAsAttempt(error) {
  const cleanError = normalizeSpeechRecognitionError(error);
  return Boolean(cleanError) && !isSpeakingConfigurationError(cleanError);
}

export function canAdvanceSpeakingQuestion({
  status,
  failedAttempts,
  blockingError,
}) {
  return (
    status === "correct" ||
    Math.max(0, Math.floor(Number(failedAttempts) || 0)) >= SPEAKING_ADVANCE_FAILURE_LIMIT ||
    Boolean(normalizeSpeechRecognitionError(blockingError))
  );
}

export function getSpeechRecognitionEndFallbackError({
  stopRequested,
  resultReceived,
  errorReceived,
}) {
  if (stopRequested || resultReceived || errorReceived) {
    return "";
  }

  return "no-speech";
}
