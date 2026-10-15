import { WordImage } from "./WordImage.jsx";

export function VocabularyList({
  items,
  onEdit,
  onDelete,
  onPreview,
  canPreview,
}) {
  if (items.length === 0) {
    return (
      <section className="empty-card">
        <h3>아직 저장된 단어가 없습니다</h3>
        <p>
          오늘 수업에 사용할 단어를 추가하거나 예시 단어를 불러와서 시작하세요.
        </p>
      </section>
    );
  }

  return (
    <section className="list-grid" aria-label="저장된 단어 목록">
      {items.map((item) => (
        <article className="vocab-card" key={item.id}>
          <div className="vocab-card-head">
            <WordImage item={item} variant="thumb" />
            <div>
              <p className="vocab-word">{item.word}</p>
              <p className="vocab-meaning">{item.meaning}</p>
            </div>
            <div className="chip">#{item.order}</div>
          </div>

          {item.imageHint ? (
            <p className="vocab-meta">
              <strong>힌트</strong> {item.imageHint}
            </p>
          ) : null}
          {item.exampleSentence ? (
            <p className="vocab-meta">
              <strong>예문</strong> {item.exampleSentence}
            </p>
          ) : null}

          <div className="toolbar-row">
            <button
              className="ghost-button"
              onClick={() => onPreview(item.word)}
              disabled={!canPreview}
            >
              발음
            </button>
            <button className="ghost-button" onClick={() => onEdit(item)}>
              수정
            </button>
            <button
              className="ghost-button danger-button"
              onClick={() => onDelete(item.id)}
            >
              삭제
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
