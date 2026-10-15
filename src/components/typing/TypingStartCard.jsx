export function TypingStartCard({ canStart, ttsSupported, itemCount, onStart, onBack }) {
  return (
    <section className="workspace-panel word-typing-shell">
      <div className="section-heading">
        <div>
          <p className="mode-label">Word Typing</p>
          <h2>영어 단어 타자 게임</h2>
        </div>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <article className="form-card word-typing-start-card">
        <p className="mode-label">Meaning + TTS Typing Mode</p>
        <h3>뜻을 보고 발음을 들은 뒤 영어 단어를 직접 입력해 보세요</h3>
        <p className="question-copy">
          빠른 타자보다 정확하게 써 보는 것이 더 중요합니다. 문제마다 한국어 뜻을 보고,
          영어 발음을 들은 뒤 단어를 직접 입력하면 됩니다.
        </p>

        <div className="word-typing-rule-grid">
          <article className="word-typing-rule-card">
            <span>현재 단어 수</span>
            <strong>{itemCount}개</strong>
          </article>
          <article className="word-typing-rule-card">
            <span>입력 기회</span>
            <strong>문제당 3번</strong>
          </article>
          <article className="word-typing-rule-card">
            <span>발음 지원</span>
            <strong>TTS 1회 자동 재생</strong>
          </article>
          <article className="word-typing-rule-card">
            <span>보상</span>
            <strong>콤보 + 축하음</strong>
          </article>
        </div>

        {!ttsSupported ? (
          <p className="inline-hint warning-hint">
            이 브라우저는 TTS를 지원하지 않아 영어 발음을 들려줄 수 없습니다.
          </p>
        ) : null}
        {!canStart ? (
          <p className="inline-hint warning-hint">
            타자 게임을 시작하려면 먼저 공개 단어 세트를 불러오세요.
          </p>
        ) : null}

        <div className="toolbar-row">
          <button
            className={`primary-button${canStart && ttsSupported ? " gi-pulse" : ""}`}
            onClick={onStart}
            disabled={!canStart || !ttsSupported}
          >
            게임 시작
          </button>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>
      </article>
    </section>
  );
}
