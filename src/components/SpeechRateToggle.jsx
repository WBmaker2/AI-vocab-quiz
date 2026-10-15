import { useEffect } from "react";

export function SpeechRateToggle({ speech, studentGrade }) {
  useEffect(() => {
    if (!speech?.setRatePreset || speech.hasStoredRatePreset) {
      return;
    }

    if (studentGrade === "3" || studentGrade === "4") {
      speech.setRatePreset("slow");
    }
  }, [speech, studentGrade]);

  if (!speech || !speech.ratePreset || !speech.setRatePreset) {
    return null;
  }

  return (
    <div className="speech-rate-toggle" role="group" aria-label="영어 읽기 속도">
      <span className="speech-rate-label">읽기 속도</span>
      <button
        type="button"
        className="chip-button"
        aria-pressed={speech.ratePreset === "standard"}
        onClick={() => speech.setRatePreset("standard")}
      >
        보통
      </button>
      <button
        type="button"
        className="chip-button"
        aria-pressed={speech.ratePreset === "slow"}
        onClick={() => speech.setRatePreset("slow")}
      >
        천천히
      </button>
      {speech.voiceLabel ? (
        <span className="speech-voice-label">음성: {speech.voiceLabel}</span>
      ) : null}
    </div>
  );
}
