export function SoundGateCard({
  title = "원어민 발음 듣기 준비",
  description = "시작 버튼을 한 번 누르면 원어민 음원을 미리 받아와 1번 문제부터 끊김 없이 들려줍니다.",
  itemCount = 0,
  preparing = false,
  error = "",
  onStart,
  onBack,
}) {
  return (
    <section className="workspace-panel">
      <div className="section-heading">
        <div>
          <p className="mode-label">Sound Check</p>
          <h2>{title}</h2>
        </div>
        {onBack ? (
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        ) : null}
      </div>

      <article className="form-card">
        <p className="mode-label">Native Pronunciation</p>
        <h3>소리를 켜고 시작하면 1번부터 잘 들려요</h3>
        <p className="question-copy">{description}</p>

        <div className="word-typing-rule-grid">
          <article className="word-typing-rule-card">
            <span>이번 단어 수</span>
            <strong>{itemCount}개</strong>
          </article>
          <article className="word-typing-rule-card">
            <span>발음 음원</span>
            <strong>원어민 MP3 우선</strong>
          </article>
          <article className="word-typing-rule-card">
            <span>예상 동작</span>
            <strong>1번 자동 재생</strong>
          </article>
          <article className="word-typing-rule-card">
            <span>실패 대비</span>
            <strong>TTS 자동 전환</strong>
          </article>
        </div>

        {error ? (
          <p className="inline-hint warning-hint" role="alert">
            {error} 그래도 시작할 수 있어요. 시작 후 다시 듣기 버튼을 눌러주세요.
          </p>
        ) : (
          <p className="inline-hint">
            조용한 곳에서 볼륨을 중간 이상으로 맞춰주세요.
          </p>
        )}

        <div className="toolbar-row">
          <button
            className={`primary-button${preparing ? "" : " gi-pulse"}`}
            onClick={onStart}
            disabled={preparing}
          >
            {preparing ? "음원 준비 중..." : "소리 켜고 시작하기"}
          </button>
          {onBack ? (
            <button className="ghost-button" onClick={onBack}>
              홈으로
            </button>
          ) : null}
        </div>
      </article>
    </section>
  );
}
