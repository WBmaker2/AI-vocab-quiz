import { BADGE_DEFINITIONS } from "../constants/badges.js";

function normalizeBadge(badge) {
  if (typeof badge === "string") {
    const badgeMeta = BADGE_DEFINITIONS[badge] ?? {};
    return {
      id: badge,
      label: badgeMeta.label ?? badge,
      description: badgeMeta.description ?? "",
    };
  }

  if (!badge || typeof badge !== "object") {
    return {
      id: "",
      label: "",
      description: "",
    };
  }

  const id = String(badge.id ?? badge.key ?? badge.value ?? "").trim();
  const label = String(badge.label ?? badge.name ?? id).trim();
  const description = String(badge.description ?? "").trim();

  return {
    id,
    label: label || id,
    description,
  };
}

function normalizeLines(lines) {
  if (!Array.isArray(lines)) {
    return [];
  }

  return lines
    .map((line) => String(line ?? "").trim())
    .filter(Boolean);
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return [minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function formatTypingAccuracy(value) {
  const safeAccuracy = Math.max(0, Number(value) || 0);

  return Number.isInteger(safeAccuracy)
    ? `${safeAccuracy}%`
    : `${safeAccuracy.toFixed(1)}%`;
}

function formatMetricValue(value, activityType) {
  if (value == null) {
    return "";
  }

  if (typeof value === "object") {
    if (activityType === "matching") {
      const score = Number(value.score ?? 0);
      const elapsedSeconds = Number(value.elapsedSeconds ?? 0);
      return `${score}점 · ${formatDuration(elapsedSeconds)}`;
    }

    if (activityType === "typing") {
      const parts = [];
      const score = value.score != null ? `${Number(value.score ?? 0)}점` : "";
      const questionCount = value.questionCount != null ? Number(value.questionCount ?? 0) : 0;
      const correctCount = value.correctCount != null ? Number(value.correctCount ?? 0) : 0;
      const accuracy = value.accuracy != null ? `정확도 ${formatTypingAccuracy(value.accuracy)}` : "";
      const elapsedSeconds = value.elapsedSeconds != null ? formatDuration(value.elapsedSeconds) : "";
      const hintUsedCount = value.hintUsedCount != null ? `힌트 ${Number(value.hintUsedCount ?? 0)}회` : "";
      const bestCombo = value.bestCombo != null ? `최고 ${Number(value.bestCombo ?? 0)}콤보` : "";

      if (score) {
        parts.push(score);
      }
      if (questionCount) {
        parts.push(`${correctCount}/${questionCount}문항`);
      } else if (correctCount) {
        parts.push(`${correctCount}개`);
      }
      if (accuracy) {
        parts.push(accuracy);
      }
      if (elapsedSeconds) {
        parts.push(elapsedSeconds);
      }
      if (hintUsedCount) {
        parts.push(hintUsedCount);
      }
      if (bestCombo) {
        parts.push(bestCombo);
      }

      return parts.join(" · ");
    }

    const score = Number(value.score ?? 0);
    const correctCount = Number(value.correctCount ?? 0);
    return `${score}점 · ${correctCount}개`;
  }

  return String(value);
}

export function StudentProgressPanel({
  comparison,
  newlyEarnedBadges = [],
  disabledReason = "",
  loading = false,
  title = "내 성장 기록",
}) {
  const cleanDisabledReason = String(disabledReason ?? "").trim();
  const badges = newlyEarnedBadges.map(normalizeBadge).filter((badge) => badge.label);
  const summaryLines = normalizeLines(comparison?.summaryLines);
  const hasComparison = Boolean(comparison);
  const hasNewBest = comparison?.isNewBest === true;
  const bestValueLabel = formatMetricValue(
    comparison?.bestValue,
    comparison?.activityType,
  );
  const currentValueLabel = formatMetricValue(
    comparison?.currentValue,
    comparison?.activityType,
  );
  const badgeEmptyCopy = cleanDisabledReason
    ? "배지는 학생 정보가 준비되면 자동으로 표시됩니다."
    : hasComparison
      ? "이번 활동에서는 새 배지를 얻지 못했어요. 다음 도전을 기대해 보세요."
      : "아직 새 배지가 없어요. 활동을 완료하면 여기에서 확인할 수 있어요.";
  const summaryEmptyCopy = cleanDisabledReason
    ? "학생 정보를 확인하면 개인 최고 기록이 여기에 표시됩니다."
    : "활동을 완료하면 개인 최고 기록과 변화 요약이 여기에 쌓입니다.";
  const stateLabel = loading
    ? "불러오는 중"
    : cleanDisabledReason
      ? "비활성"
      : hasNewBest
        ? "새 기록"
        : hasComparison
          ? "기록 확인"
          : "기록 없음";

  return (
    <article
      className={`progression-panel${cleanDisabledReason ? " progression-panel-disabled" : ""}`}
      aria-live="polite"
    >
      <div className="progression-head">
        <div>
          <p className="mode-label">Student Progress</p>
          <h3>{title}</h3>
        </div>
        <span className="progression-state">{stateLabel}</span>
      </div>

      {cleanDisabledReason ? (
        <p className="progression-banner">{cleanDisabledReason}</p>
      ) : null}

      <div className="progression-grid">
        <section className="progression-section">
          <h4>개인 최고 기록</h4>
          {loading ? (
            <p className="progression-copy">기록을 확인하는 중이에요.</p>
          ) : summaryLines.length > 0 ? (
            <ul className="progression-summary-list">
              {summaryLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="progression-copy">{summaryEmptyCopy}</p>
          )}

          {bestValueLabel || currentValueLabel || comparison?.nextHint ? (
            <div className="progression-metrics">
              {bestValueLabel ? (
                <div className="progression-metric">
                  <span>개인 최고</span>
                  <strong>{bestValueLabel}</strong>
                </div>
              ) : null}
              {currentValueLabel ? (
                <div className="progression-metric">
                  <span>이번 기록</span>
                  <strong>{currentValueLabel}</strong>
                </div>
              ) : null}
              {comparison?.nextHint ? (
                <div className="progression-hint">
                  <span>다음 목표</span>
                  <p>{comparison.nextHint}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="progression-section progression-section-badges">
          <div className="progression-section-head">
            <h4>이번에 얻은 배지</h4>
            {badges.length > 0 ? (
              <span className="progression-section-count">{badges.length}개</span>
            ) : null}
          </div>

          {loading ? (
            <p className="progression-copy">배지를 확인하는 중이에요.</p>
          ) : badges.length > 0 ? (
            <div className="progression-badge-list">
              {badges.map((badge) => (
                <span
                  key={badge.id || badge.label}
                  className="progression-badge-chip"
                  title={badge.description || badge.label}
                >
                  <strong>{badge.label}</strong>
                  {badge.description ? <small>{badge.description}</small> : null}
                </span>
              ))}
            </div>
          ) : (
            <p className="progression-copy">{badgeEmptyCopy}</p>
          )}
        </section>
      </div>
    </article>
  );
}
