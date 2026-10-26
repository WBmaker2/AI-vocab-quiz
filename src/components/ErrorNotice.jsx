export function ErrorNotice({
  title = "문제가 발생했습니다",
  message,
  onRetry,
  retryLabel = "다시 시도",
  onHome,
  homeLabel = "홈으로",
  className = "",
}) {
  return (
    <div className={`error-notice ${className}`.trim()} role="alert">
      <div className="error-notice-copy">
        <strong>{title}</strong>
        {message ? <p>{message}</p> : null}
      </div>
      {onRetry || onHome ? (
        <div className="error-notice-actions">
          {onRetry ? (
            <button className="primary-button" type="button" onClick={onRetry}>
              {retryLabel}
            </button>
          ) : null}
          {onHome ? (
            <button className="ghost-button" type="button" onClick={onHome}>
              {homeLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
