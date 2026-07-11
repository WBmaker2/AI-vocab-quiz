import {
  formatTeacherCopySourceGradeUnits,
  getTeacherBulkImportFileLabel,
  isTeacherBulkCopyDisabled,
} from "./teacherBulkView.js";

export function TeacherBulkTab({
  importing,
  saving,
  importFile,
  importInputRef,
  publisher,
  publisherOptions,
  selection,
  copyLoading,
  copying,
  copyError,
  copyStatus,
  copySources,
  selectedCopySourceId,
  onPublisherChange,
  onImportFileChange,
  onResetGradeSets,
  onImportWorkbook,
  onSearchCopySources,
  onSelectCopySource,
  onCopySource,
}) {
  const importFileLabel = getTeacherBulkImportFileLabel(importFile);

  return (
    <>
      <article className="form-card">
        <div className="section-heading compact">
          <div>
            <p className="mode-label">Excel Upload</p>
            <h3>엑셀로 단원 일괄 등록</h3>
          </div>
          <div className="toolbar-row">
            <button
              type="button"
              className="ghost-button danger-button"
              onClick={onResetGradeSets}
              disabled={importing || saving}
            >
              현재 학년 초기화
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onImportWorkbook}
              disabled={!importFile || importing || saving}
            >
              {importing ? "파일 검증 및 저장 중..." : "엑셀 가져오기"}
            </button>
          </div>
        </div>
        <p className="inline-hint">
          최신 `.xlsx` 파일만 업로드할 수 있습니다. `Lesson / English / Korean`
          열을 가진 파일을 업로드하면, 현재 선생님의 선택 학년의 모든 Lesson
          단원이 한꺼번에 저장됩니다. 다른 형식의 파일은 Excel에서 다시 열어
          `.xlsx` 형식으로 저장한 뒤 업로드하세요. 기존 단원이 있으면 새 단어만
          안전하게 추가하고, 중복 단어는 건너뜁니다. 위의 `학생 공개` 체크 상태도
          모든 반영 단원에 함께 적용됩니다.
        </p>
        <div className="form-grid compact-grid">
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
          <label className="field field-wide">
            <span>업로드 파일</span>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx"
              disabled={importing || saving}
              onChange={(event) => onImportFileChange(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        {importFileLabel ? <p className="inline-hint">{importFileLabel}</p> : null}
      </article>

      <article className="form-card">
        <div className="section-heading compact">
          <div>
            <p className="mode-label">Publisher Copy</p>
            <h3>다른 학교 단어카드 복사</h3>
          </div>
        </div>
        <p className="inline-hint">
          현재 선택한 {selection.grade}학년을 기준으로, 같은 출판사의 공개
          단어카드를 검색해 우리 학교 카드와 비교하고 필요하면 우리 학교
          카드로 병합 복사할 수 있습니다.
        </p>

        <div className="form-grid compact-grid">
          <label className="field">
            <span>검색 출판사</span>
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

          <div className="field">
            <span>현재 학년</span>
            <div className="copy-grade-pill">{selection.grade}학년</div>
          </div>
        </div>

        <div className="toolbar-row">
          <button
            type="button"
            className="secondary-button"
            onClick={onSearchCopySources}
            disabled={copyLoading || !publisher}
          >
            {copyLoading ? "검색 중..." : "출판사 카드 검색"}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={onCopySource}
            disabled={isTeacherBulkCopyDisabled(selectedCopySourceId, copying)}
          >
            {copying ? "복사 중..." : "우리 학교 카드로 복사"}
          </button>
        </div>

        {copyError ? <p className="inline-hint warning-hint">{copyError}</p> : null}
        {copyStatus ? <p className="inline-hint success-hint">{copyStatus}</p> : null}

        {copySources.length > 0 ? (
          <div className="copy-source-list" aria-label="복사 가능한 단어카드">
            {copySources.map((source) => (
              <button
                key={source.id}
                type="button"
                className={`copy-source-card ${
                  selectedCopySourceId === source.id ? "copy-source-card-selected" : ""
                }`}
                onClick={() => onSelectCopySource(source.id)}
              >
                <strong>
                  {source.schoolName} · {source.teacherName}
                </strong>
                {source.isCurrentSchool ? (
                  <span className="copy-source-badge">우리 학교</span>
                ) : null}
                <span>{source.publisher}</span>
                <span>{formatTeacherCopySourceGradeUnits(source)}</span>
                <span>공개 단어 {source.itemCount}개</span>
              </button>
            ))}
          </div>
        ) : null}
      </article>
    </>
  );
}
