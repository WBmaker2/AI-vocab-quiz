import { describeMicrophoneLevel } from "../../utils/microphoneLevel.js";
import { useMicrophoneLevel } from "../../hooks/useMicrophoneLevel.js";

const LEVEL_COPY = {
  quiet: "목소리가 작게 들려요. 마이크에 가까이 대고 말해보세요.",
  good: "잘 들리고 있어요. 그대로 말해보세요.",
  loud: "소리가 너무 커요. 마이크에서 조금 떨어져서 말해보세요.",
};

export function MicLevelMeter({ active }) {
  const { level } = useMicrophoneLevel(active);

  if (!active) {
    return null;
  }

  const percent = Math.round(Math.min(1, Math.max(0, level)) * 100);
  const label = LEVEL_COPY[describeMicrophoneLevel(level)];

  return (
    <div
      className="mic-level-meter"
      role="status"
      aria-live="polite"
      aria-label={`마이크 입력 크기 ${percent}퍼센트`}
    >
      <div className="mic-level-track" aria-hidden="true">
        <div className="mic-level-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="mic-level-label">{label}</p>
    </div>
  );
}
