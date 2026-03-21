import { useMemo, useRef, useState } from "react";
import { VocabularyForm } from "./VocabularyForm.jsx";
import { VocabularyList } from "./VocabularyList.jsx";

const EMPTY_FORM = {
  word: "",
  meaning: "",
  imageHint: "",
  exampleSentence: "",
};

export function TeacherWorkspace({
  gradeOptions,
  remoteConfigured,
  auth,
  profile,
  profileLoading,
  profileError,
  requiresOnboarding,
  onboarding,
  selection,
  units,
  published,
  catalogEntry,
  status,
  error,
  loading,
  saving,
  importing,
  dirty,
  items,
  speech,
  onSelectionChange,
  onPublishedChange,
  onLoadSet,
  onSaveSet,
  onDeleteSet,
  onResetGradeSets,
  onImportWorkbook,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onClearItems,
  onBack,
}) {
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const importInputRef = useRef(null);

  const isEditing = Boolean(editingId);
  const hasItems = items.length > 0;

  const stats = useMemo(
    () => ({
      total: items.length,
      withExamples: items.filter((item) => item.exampleSentence).length,
    }),
    [items],
  );

  function resetForm() {
    setFormValues(EMPTY_FORM);
    setEditingId("");
  }

  function clearImportSelection() {
    setImportFile(null);
    if (importInputRef.current) {
      importInputRef.current.value = "";
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const normalizedItem = {
      word: formValues.word.trim(),
      meaning: formValues.meaning.trim(),
      imageHint: formValues.imageHint.trim(),
      exampleSentence: formValues.exampleSentence.trim(),
    };

    if (!normalizedItem.word || !normalizedItem.meaning) {
      return;
    }

    if (editingId) {
      onUpdateItem(editingId, normalizedItem);
    } else {
      onAddItem(normalizedItem);
    }

    resetForm();
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setFormValues({
      word: item.word,
      meaning: item.meaning,
      imageHint: item.imageHint,
      exampleSentence: item.exampleSentence,
    });
  }

  function previewWord(word) {
    if (!speech.supported || !word) {
      return;
    }

    speech.speak(word, {
      lang: "en-US",
      rate: 0.9,
    });
  }

  async function handleImportWorkbook() {
    const shouldForcePublic = window.confirm(
      "이 학년의 모든 단원을 '학생 공개'로 저장하겠습니까?\n'확인'을 누르면 모든 단원이 학생 공개로 저장되고, '취소'를 누르면 현재 체크 상태대로 저장됩니다.",
    );

    await onImportWorkbook(
      importFile,
      selection.grade,
      shouldForcePublic ? true : null,
    );
    clearImportSelection();
  }

  function handleResetGradeSets() {
    const shouldReset = window.confirm(
      `${selection.grade}학년의 기존 저장 단어카드를 모두 초기화하시겠습니까?\n이 작업은 현재 학년에 저장된 모든 단원을 삭제하며 되돌릴 수 없습니다.`,
    );

    if (!shouldReset) {
      return;
    }

    onResetGradeSets();
    clearImportSelection();
  }

  function handleOpenProfileEditor() {
    onboarding.resetToProfile();
    setProfileEditorOpen(true);
  }

  function handleCancelProfileEditor() {
    onboarding.resetToProfile();
    setProfileEditorOpen(false);
  }

  async function handleSaveProfileEditor() {
    const saved = await onboarding.save();
    if (saved) {
      setProfileEditorOpen(false);
    }
  }

  async function handleDeleteTeacherProfile() {
    const confirmed = window.confirm(
      "선생님 정보와 현재 선생님의 모든 단어 세트를 정말 삭제할까요?\n삭제 후에는 다시 등록해야 하며 되돌릴 수 없습니다.",
    );

    if (!confirmed) {
      return;
    }

    const deleted = await onboarding.deleteTeacher();
    if (deleted) {
      setProfileEditorOpen(false);
      resetForm();
    }
  }

  async function handleDeleteSchoolProfile() {
    const confirmed = window.confirm(
      "학교 정보와 현재 선생님의 모든 단어 세트를 정말 삭제할까요?\n삭제 후에는 학교 이름을 다시 등록해야 하며 되돌릴 수 없습니다.",
    );

    if (!confirmed) {
      return;
    }

    const deleted = await onboarding.deleteSchool();
    if (deleted) {
      setProfileEditorOpen(false);
      resetForm();
    }
  }

  if (!remoteConfigured) {
    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Teacher Mode</p>
            <h2>선생님 모드 설정 필요</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <article className="empty-card">
          <h3>Firebase 환경 변수가 필요합니다</h3>
          <p>
            Google 로그인과 교사별 단어 저장을 사용하려면 Firebase 웹 앱 설정값을
            먼저 입력하세요.
          </p>
        </article>
      </section>
    );
  }

  if (auth.loading || profileLoading) {
    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Teacher Mode</p>
            <h2>선생님 정보를 확인하는 중입니다</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <article className="empty-card">
          <h3>잠시만 기다리세요</h3>
          <p>로그인 상태와 선생님 프로필을 확인하고 있습니다.</p>
        </article>
      </section>
    );
  }

  if (!auth.signedIn) {
    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Teacher Mode</p>
            <h2>Google 로그인 후 시작</h2>
          </div>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>

        <article className="form-card">
          <p className="inline-hint">
            선생님 모드는 Google 로그인 후 사용할 수 있습니다. 로그인하면 내
            학교와 단어 세트만 관리할 수 있습니다.
          </p>
          {auth.error ? (
            <p className="inline-hint warning-hint">{auth.error}</p>
          ) : null}
          <div className="toolbar-row">
            <button className="primary-button" onClick={auth.signInWithGoogle}>
              Google로 로그인
            </button>
          </div>
        </article>
      </section>
    );
  }

  if (profileError) {
    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Teacher Mode</p>
            <h2>선생님 정보를 불러오지 못했습니다</h2>
          </div>
          <button className="ghost-button" onClick={auth.signOut}>
            로그아웃
          </button>
        </div>

        <article className="empty-card">
          <h3>프로필 오류</h3>
          <p>{profileError}</p>
        </article>
      </section>
    );
  }

  if (requiresOnboarding) {
    return (
      <section className="workspace-panel">
        <div className="section-heading">
          <div>
            <p className="mode-label">Teacher Onboarding</p>
            <h2>선생님 정보 등록</h2>
          </div>
          <div className="toolbar-row">
            <button className="ghost-button" onClick={onBack}>
              홈으로
            </button>
            <button className="ghost-button" onClick={auth.signOut}>
              로그아웃
            </button>
          </div>
        </div>

        <article className="form-card">
          <p className="inline-hint">
            처음 한 번만 학교 이름과 선생님 이름을 등록하면, 이후에는 내 단어
            세트만 관리할 수 있습니다.
          </p>

          <div className="form-grid compact-grid">
            <label className="field field-wide">
              <span>학교 이름</span>
              <input
                value={onboarding.schoolName}
                onChange={(event) =>
                  onboarding.updateField("schoolName", event.target.value)
                }
                placeholder="예: 서울초등학교"
              />
            </label>

            <label className="field field-wide">
              <span>선생님 이름</span>
              <input
                value={onboarding.teacherName}
                onChange={(event) =>
                  onboarding.updateField("teacherName", event.target.value)
                }
                placeholder="예: 김영어"
              />
            </label>
          </div>

          {onboarding.searching ? (
            <p className="inline-hint">비슷한 학교를 찾는 중입니다...</p>
          ) : null}

          {onboarding.suggestions.length > 0 ? (
            <div className="selection-chip-group" aria-label="학교 추천">
              {onboarding.suggestions.map((school) => (
                <button
                  key={school.id}
                  className="choice-chip"
                  onClick={() => onboarding.chooseSchool(school)}
                >
                  {school.name}
                </button>
              ))}
            </div>
          ) : null}

          {onboarding.error ? (
            <p className="inline-hint warning-hint">{onboarding.error}</p>
          ) : null}
          {onboarding.status ? (
            <p className="inline-hint success-hint">{onboarding.status}</p>
          ) : null}

          <div className="toolbar-row">
            <button
              className="primary-button"
              onClick={onboarding.save}
              disabled={onboarding.saving}
            >
              {onboarding.saving ? "저장 중..." : "선생님 정보 저장"}
            </button>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="workspace-panel">
      <div className="section-heading">
        <div>
          <p className="mode-label">Teacher Mode</p>
          <h2>내 단어 세트 관리</h2>
          <p className="inline-hint">
            {profile.schoolName} · {profile.teacherName}
          </p>
        </div>
        <div className="toolbar-row">
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
          <button className="ghost-button" onClick={auth.signOut}>
            로그아웃
          </button>
        </div>
      </div>

      <article className="form-card">
        <div className="section-heading compact">
          <div>
            <p className="mode-label">Teacher Profile</p>
            <h3>학교와 선생님 정보</h3>
          </div>
          <button
            className="ghost-button"
            type="button"
            onClick={
              profileEditorOpen ? handleCancelProfileEditor : handleOpenProfileEditor
            }
          >
            {profileEditorOpen ? "수정 닫기" : "정보 수정"}
          </button>
        </div>

        <p className="inline-hint">
          현재 등록 정보: {profile.schoolName} · {profile.teacherName}
        </p>

        {profileEditorOpen ? (
          <>
            <div className="form-grid compact-grid">
              <label className="field field-wide">
                <span>학교 이름</span>
                <input
                  value={onboarding.schoolName}
                  onChange={(event) =>
                    onboarding.updateField("schoolName", event.target.value)
                  }
                  placeholder="예: 서울초등학교"
                />
              </label>

              <label className="field field-wide">
                <span>선생님 이름</span>
                <input
                  value={onboarding.teacherName}
                  onChange={(event) =>
                    onboarding.updateField("teacherName", event.target.value)
                  }
                  placeholder="예: 김영어"
                />
              </label>
            </div>

            {onboarding.searching ? (
              <p className="inline-hint">비슷한 학교를 찾는 중입니다...</p>
            ) : null}

            {onboarding.suggestions.length > 0 ? (
              <div className="selection-chip-group" aria-label="학교 추천">
                {onboarding.suggestions.map((school) => (
                  <button
                    key={school.id}
                    className="choice-chip"
                    onClick={() => onboarding.chooseSchool(school)}
                  >
                    {school.name}
                  </button>
                ))}
              </div>
            ) : null}

            {onboarding.error ? (
              <p className="inline-hint warning-hint">{onboarding.error}</p>
            ) : null}
            {onboarding.status ? (
              <p className="inline-hint success-hint">{onboarding.status}</p>
            ) : null}

            <div className="toolbar-row">
              <button
                className="primary-button"
                type="button"
                onClick={handleSaveProfileEditor}
                disabled={onboarding.saving}
              >
                {onboarding.saving ? "저장 중..." : "정보 저장"}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={handleCancelProfileEditor}
                disabled={onboarding.saving}
              >
                취소
              </button>
            </div>

            <div className="toolbar-row">
              <button
                className="ghost-button danger-button"
                type="button"
                onClick={handleDeleteTeacherProfile}
                disabled={onboarding.saving}
              >
                선생님 정보 삭제
              </button>
              <button
                className="ghost-button danger-button"
                type="button"
                onClick={handleDeleteSchoolProfile}
                disabled={onboarding.saving}
              >
                학교 정보 삭제
              </button>
            </div>
          </>
        ) : null}
      </article>

      <div className="teacher-summary">
        <div className="summary-card">
          <span>등록 단어</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="summary-card">
          <span>예문 포함</span>
          <strong>{stats.withExamples}</strong>
        </div>
        <div className="summary-card">
          <span>공개 상태</span>
          <strong>{published ? "ON" : "OFF"}</strong>
        </div>
      </div>

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
              onChange={(event) =>
                onSelectionChange("grade", event.target.value)
              }
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
            <input
              list="teacher-unit-options"
              value={selection.unit}
              onChange={(event) => onSelectionChange("unit", event.target.value)}
              placeholder="예: 1"
            />
            <datalist id="teacher-unit-options">
              {units.map((unit) => (
                <option key={unit} value={unit} />
              ))}
            </datalist>
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

        {catalogEntry ? (
          <p className="inline-hint">
            현재 저장본: {catalogEntry.published ? "공개됨" : "비공개"} 상태
          </p>
        ) : null}
        {error ? <p className="inline-hint warning-hint">{error}</p> : null}
        {status ? <p className="inline-hint success-hint">{status}</p> : null}
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
              onClick={handleResetGradeSets}
              disabled={importing || saving}
            >
              현재 학년 초기화
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleImportWorkbook}
              disabled={!importFile || importing}
            >
              {importing ? "업로드 중..." : "엑셀 가져오기"}
            </button>
          </div>
        </div>
        <p className="inline-hint">
          `Lesson / English / Korean` 열을 가진 파일을 업로드하면, 현재 선생님의
          선택 학년의 모든 Lesson 단원이 한꺼번에 저장됩니다. 기존 단원이
          있으면 새 단어만 안전하게 추가하고, 중복 단어는 건너뜁니다. 위의
          `학생 공개` 체크 상태도 모든 반영 단원에 함께 적용됩니다.
        </p>
        <div className="form-grid compact-grid">
          <label className="field field-wide">
            <span>업로드 파일</span>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        {importFile ? (
          <p className="inline-hint">선택한 파일: {importFile.name}</p>
        ) : null}
      </article>

      <VocabularyForm
        values={formValues}
        isEditing={isEditing}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onCancel={resetForm}
        onPreview={() => previewWord(formValues.word)}
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
        onEdit={handleEdit}
        onDelete={onRemoveItem}
        onPreview={previewWord}
        canPreview={speech.supported}
      />

      <div className="launch-card">
        <div>
          <p className="mode-label">Student Access</p>
          <h3>학생 공개 확인</h3>
          <p>
            학생은 홈 화면에서 학교, 선생님, 학년, 단원을 순서대로 선택한 뒤
            공개된 단어 세트를 불러와 활동을 시작합니다.
          </p>
        </div>
        <div className="stack-actions">
          <button className="primary-button" onClick={onBack}>
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </section>
  );
}
