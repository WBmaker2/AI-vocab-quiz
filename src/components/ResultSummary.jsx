export function ResultSummary({
  title,
  score,
  total,
  extraContent = null,
  onRetry,
  onBack,
  onOpenTeacher,
}) {
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <article className="result-card">
      <p className="mode-label">Result Summary</p>
      <h3>{title}</h3>
      <p className="result-score">
        {score} / {total}
      </p>
      <p className="result-copy">정답률 {percentage}%로 활동을 마쳤습니다.</p>
      {extraContent}
      <div className="toolbar-row">
        <button className="primary-button" onClick={onRetry}>
          다시 하기
        </button>
        <button className="secondary-button" onClick={onOpenTeacher}>
          단어 세트 수정
        </button>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>
    </article>
  );
}
