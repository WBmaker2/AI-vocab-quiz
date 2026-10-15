export function FishingStartCard({ canStart, ttsSupported, itemCount, onStart, onBack }) {
  return (
    <section className="workspace-panel word-fishing-shell">
      <div className="section-heading">
        <div>
          <p className="mode-label">Word Fishing</p>
          <h2>단어 낚시</h2>
        </div>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <article className="form-card word-fishing-start-card">
        <p className="mode-label">TTS Fishing Mode</p>
        <h3>TTS로 읽어주는 영어를 듣고 뜻 카드를 낚아채 보세요</h3>
        <p className="question-copy">
          한 라운드마다 카드 6장이 물고기처럼 떠다닙니다. 영어 단어를 듣고,
          맞는 뜻 카드 하나를 빠르게 누를수록 더 높은 점수를 얻을 수 있어요.
          총 10문제, 문제당 {ROUND_DURATION_SECONDS}초입니다.
        </p>

        <div className="word-fishing-rule-grid">
          <article className="word-fishing-rule-card">
            <span>현재 단어 수</span>
            <strong>{itemCount}개</strong>
          </article>
          <article className="word-fishing-rule-card">
            <span>진행 방식</span>
            <strong>TTS 자동 읽기</strong>
          </article>
          <article className="word-fishing-rule-card">
            <span>문제 수</span>
            <strong>{Math.min(MAX_ROUNDS, itemCount)}문제</strong>
          </article>
          <article className="word-fishing-rule-card">
            <span>제한 시간</span>
            <strong>{ROUND_DURATION_SECONDS}초</strong>
          </article>
        </div>

        {!ttsSupported ? (
          <p className="inline-hint warning-hint">
            이 브라우저는 TTS를 지원하지 않아 단어 낚시를 시작할 수 없습니다.
          </p>
        ) : null}
        {!canStart ? (
          <p className="inline-hint warning-hint">
            단어 낚시는 최소 2개 이상의 단어가 필요합니다.
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
