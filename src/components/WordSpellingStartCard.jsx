export function WordSpellingStartCard({ canStart, itemCount, onStart, onBack }) {
  return (
    <section className="workspace-panel word-typing-shell">
      <div className="section-heading">
        <div>
          <p className="mode-label">Spelling Completion</p>
          <h2>철자 완성 게임</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <article className="form-card word-typing-start-card">
        <p className="mode-label">Spelling Completion Mode</p>
        <h3>가려진 철자를 보고 영어 단어 전체를 입력해 보세요</h3>
        <p className="question-copy">
          일부 철자만 보이는 단서를 살펴보고 영어 단어를 완성해 보세요. 문제마다
          세 번까지 입력할 수 있고, 정확하게 맞힐수록 더 높은 점수를 얻습니다.
        </p>

        <div className="word-typing-rule-grid">
          <article className="word-typing-rule-card">
            <span>현재 문제 수</span>
            <strong>{itemCount}개</strong>
          </article>
          <article className="word-typing-rule-card">
            <span>입력 기회</span>
            <strong>문제당 3번</strong>
          </article>
          <article className="word-typing-rule-card">
            <span>힌트 방식</span>
            <strong>일부 철자 공개</strong>
          </article>
          <article className="word-typing-rule-card">
            <span>점수</span>
            <strong>정확할수록 높게</strong>
          </article>
        </div>

        {!canStart ? (
          <p className="inline-hint warning-hint">
            철자 완성 게임을 시작하려면 먼저 단어 세트를 불러오세요.
          </p>
        ) : null}

        <div className="toolbar-row">
          <button
            className="primary-button gi-pulse"
            type="button"
            onClick={onStart}
            disabled={!canStart}
          >
            게임 시작
          </button>
          <button className="ghost-button" type="button" onClick={onBack}>
            홈으로
          </button>
        </div>
      </article>
    </section>
  );
}
