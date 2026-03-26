export function StudentPlaceholder({
  mode,
  title,
  description,
  items,
  onBack,
}) {
  return (
    <section className="workspace-panel">
      <div className="section-heading">
        <div>
          <p className="mode-label">{mode}</p>
          <h2>{title}</h2>
        </div>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <article className="placeholder-card">
        <p>{description}</p>
        <div className="placeholder-stats">
          <span>현재 저장된 단어 수</span>
          <strong>{items.length}</strong>
        </div>
        <div className="toolbar-row">
          <button className="ghost-button" onClick={onBack}>
            모드 선택으로
          </button>
        </div>
      </article>

      <section className="list-grid">
        {items.map((item) => (
          <article className="vocab-card" key={item.id}>
            <p className="vocab-word">{item.word}</p>
            <p className="vocab-meaning">{item.meaning}</p>
          </article>
        ))}
      </section>
    </section>
  );
}
