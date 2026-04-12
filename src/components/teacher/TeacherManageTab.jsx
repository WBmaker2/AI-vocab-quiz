import { VocabularyForm } from "../VocabularyForm.jsx";
import { VocabularyList } from "../VocabularyList.jsx";
import {
  formatTeacherCatalogEntrySummary,
  getTeacherManageAutoSaveToneClass,
  getTeacherManageStatusToneClass,
} from "./teacherManageView.js";

export function TeacherManageTab({
  gradeOptions,
  publisherOptions,
  selection,
  units,
  createUnitValue,
  unitChoice,
  newUnitDraft,
  publisher,
  published,
  catalogEntry,
  error,
  status,
  autoSaveStatus,
  dirty,
  saving,
  loading,
  items,
  speech,
  formValues,
  editingId,
  onSelectionChange,
  onUnitChoiceChange,
  onUnitDraftChange,
  onPublisherChange,
  onPublishedChange,
  onLoadSet,
  onSaveSet,
  onDeleteSet,
  onFormChange,
  onFormSubmit,
  onResetForm,
  onPreviewWord,
  onEditItem,
  onDeleteItem,
  onClearItems,
}) {
  const isEditing = Boolean(editingId);
  const hasItems = items.length > 0;
  const statusToneClass = getTeacherManageStatusToneClass(status);
  const autoSaveToneClass = getTeacherManageAutoSaveToneClass(autoSaveStatus);
  const catalogEntrySummary = formatTeacherCatalogEntrySummary(catalogEntry);

  return (
    <>
      <article className="form-card">
        <div className="section-heading compact">
          <div>
            <p className="mode-label">My Set</p>
            <h3>학년과 단원 선택</h3>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={onLoadSet}
            disabled={!selection.unit || loading}
          >
            {loading ? "불러오는 중..." : "내 단어 세트 불러오기"}
          </button>
        </div>

        <div className="form-grid compact-grid">
          <label className="field">
            <span>학년</span>
            <select
              value={selection.grade}
              onChange={(event) => onSelectionChange("grade", event.target.value)}
            >
              {gradeOptions.map((grade) => (
                <option key={grade.value} value={grade.value}>
                  {grade.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>단원</span>
            <select
              value={unitChoice}
              onChange={(event) => onUnitChoiceChange(event.target.value)}
            >
              <option value="">단원 선택</option>
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}단원
                </option>
              ))}
              <option value={createUnitValue}>+ 새 단원 만들기</option>
            </select>
            {unitChoice === createUnitValue ? (
              <input
                value={newUnitDraft}
                onChange={(event) => onUnitDraftChange(event.target.value)}
                placeholder="새 단원 번호를 입력하세요"
              />
            ) : null}
          </label>

          <label className="field field-wide">
            <span>출판사</span>
            <select
              value={publisher}
              onChange={(event) => onPublisherChange(event.target.value)}
            >
              <option value="">출판사 선택</option>
              {publisherOptions.map((publisherOption) => (
                <option key={publisherOption} value={publisherOption}>
                  {publisherOption}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="toggle-field">
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => onPublishedChange(event.target.checked)}
          />
          <span>학생 공개</span>
        </label>
        <p className="inline-hint">
          공개를 켜고 저장하면 현재 단원 저장과 엑셀 일괄 저장 모두 같은 공개
          상태가 적용됩니다.
        </p>
        <p className="inline-hint">
          출판사는 학년별 기준값으로 저장되며, 현재 단원 저장과 엑셀 일괄 저장,
          다른 학교 카드 복사에도 함께 반영됩니다.
        </p>

        {catalogEntrySummary ? (
          <p className="inline-hint">{catalogEntrySummary}</p>
        ) : null}
        {error ? <p className="inline-hint warning-hint">{error}</p> : null}
        {status ? (
          <p className={`inline-hint ${statusToneClass}`}>{status}</p>
        ) : null}
        {!status && autoSaveStatus ? (
          <p className={`inline-hint ${autoSaveToneClass}`}>{autoSaveStatus}</p>
        ) : null}
        {dirty ? (
          <p className="inline-hint warning-hint">
            저장되지 않은 변경사항이 있습니다.
          </p>
        ) : null}

        <div className="toolbar-row">
          <button
            className="primary-button"
            type="button"
            onClick={onSaveSet}
            disabled={saving || !selection.unit}
          >
            {saving ? "저장 중..." : "현재 단원 저장"}
          </button>
          <button
            className="ghost-button danger-button"
            type="button"
            onClick={onDeleteSet}
            disabled={saving || !selection.unit}
          >
            현재 단원 삭제
          </button>
        </div>
      </article>

      <VocabularyForm
        values={formValues}
        isEditing={isEditing}
        onChange={onFormChange}
        onSubmit={onFormSubmit}
        onCancel={onResetForm}
        onPreview={() => onPreviewWord(formValues.word)}
        canPreview={speech.supported && Boolean(formValues.word.trim())}
      />

      <div className="toolbar-row">
        <button
          className="ghost-button danger-button"
          onClick={onClearItems}
          disabled={!hasItems}
        >
          전체 삭제
        </button>
      </div>

      <VocabularyList
        items={items}
        onEdit={onEditItem}
        onDelete={onDeleteItem}
        onPreview={onPreviewWord}
        canPreview={speech.supported}
      />
    </>
  );
}
