export function ResultSummary({
  title,
  score,
  total,
  summaryCopy = "",
  extraContent = null,
  footerContent = null,
  onRetry,
  onBack,
}) {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const resolvedSummaryCopy = summaryCopy || `정답률 ${percentage}%로 활동을 마쳤습니다.`;

  return (
    <article className="result-card">
      <p className="mode-label">Result Summary</p>
      <h3>{title}</h3>
      <p className="result-score">
        {score} / {total}
      </p>
      <p className="result-copy">{resolvedSummaryCopy}</p>
      {extraContent}
      {footerContent ?? (
        <div className="toolbar-row">
          <button className="primary-button" onClick={onRetry}>
            다시 하기
          </button>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>
      )}
    </article>
  );
}
