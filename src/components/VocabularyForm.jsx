export function VocabularyForm({
  values,
  isEditing,
  onChange,
  onSubmit,
  onCancel,
  onPreview,
  canPreview,
}) {
  return (
    <form className="form-card" onSubmit={onSubmit}>
      <div className="section-heading compact">
        <div>
          <p className="mode-label">Vocabulary Input</p>
          <h3>{isEditing ? "단어 수정" : "새 단어 추가"}</h3>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={onPreview}
          disabled={!canPreview}
        >
          발음 미리듣기
        </button>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>영어 단어</span>
          <input
            name="word"
            value={values.word}
            onChange={onChange}
            placeholder="apple"
            required
          />
        </label>

        <label className="field">
          <span>뜻</span>
          <input
            name="meaning"
            value={values.meaning}
            onChange={onChange}
            placeholder="사과"
            required
          />
        </label>

        <label className="field">
          <span>그림 힌트</span>
          <input
            name="imageHint"
            value={values.imageHint}
            onChange={onChange}
            placeholder="red fruit"
          />
        </label>

        <label className="field">
          <span>그림 주소(URL)</span>
          <input
            name="imageUrl"
            value={values.imageUrl ?? ""}
            onChange={onChange}
            placeholder="https://..."
            inputMode="url"
          />
        </label>

        <label className="field field-wide">
          <span>예문</span>
          <input
            name="exampleSentence"
            value={values.exampleSentence}
            onChange={onChange}
            placeholder="I eat an apple."
          />
        </label>
      </div>

      <div className="toolbar-row">
        <button className="primary-button" type="submit">
          {isEditing ? "수정 저장" : "단어 추가"}
        </button>
        {isEditing ? (
          <button type="button" className="ghost-button" onClick={onCancel}>
            수정 취소
          </button>
        ) : null}
      </div>
    </form>
  );
}
