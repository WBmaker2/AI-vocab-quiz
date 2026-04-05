import { useEffect, useMemo, useRef, useState } from "react";
import { VocabularyForm } from "./VocabularyForm.jsx";
import { VocabularyList } from "./VocabularyList.jsx";
import {
  ACTIVITY_LEADERBOARD_DEFINITIONS,
  getActivityLeaderboardDefinition,
} from "../utils/activityLeaderboard.js";
import { LEADERBOARD_PERIOD_DEFINITIONS } from "../utils/leaderboard.js";
import { formatElapsedSeconds } from "../utils/quiz.js";

const EMPTY_FORM = {
  word: "",
  meaning: "",
  imageHint: "",
  exampleSentence: "",
};

const CREATE_UNIT_VALUE = "__create_new_unit__";

const TEACHER_ACTIVITY_LEADERBOARD_DEFINITIONS = ACTIVITY_LEADERBOARD_DEFINITIONS.some(
  (definition) => definition.type === "typing",
)
  ? ACTIVITY_LEADERBOARD_DEFINITIONS
  : [
      ...ACTIVITY_LEADERBOARD_DEFINITIONS,
      {
        type: "typing",
        label: "영어 타자",
        collectionName: "typingLeaderboards",
      },
    ];

function getTeacherActivityLeaderboardDefinition(activityType) {
  return activityType === "typing"
    ? {
        type: "typing",
        label: "영어 타자",
        collectionName: "typingLeaderboards",
      }
    : getActivityLeaderboardDefinition(activityType);
}

function formatTeacherLeaderboardAccuracy(value) {
  const numericValue = Number(value ?? 0);

  return Number.isInteger(numericValue)
    ? `${numericValue}%`
    : `${numericValue.toFixed(1)}%`;
}

function formatTeacherLeaderboardEntryDetail(entry, activityType, periodType) {
  const detailParts = [];

  if (periodType === "school_all" && entry.grade && entry.grade !== "all") {
    detailParts.push(`${entry.grade}학년`);
  }

  detailParts.push(formatElapsedSeconds(entry.elapsedSeconds));

  if (activityType === "fishing") {
    detailParts.push(`정답 ${entry.correctCount ?? 0}`);
    detailParts.push(`오답 ${entry.wrongCount ?? 0}`);
    detailParts.push(`놓침 ${entry.missCount ?? 0}`);
  } else if (activityType === "typing") {
    detailParts.push(`정답 ${entry.correctCount ?? 0}/${entry.questionCount ?? 0}`);
    detailParts.push(`정확도 ${formatTeacherLeaderboardAccuracy(entry.accuracy)}`);
    detailParts.push(`힌트 ${entry.hintUsedCount ?? 0}회`);
    detailParts.push(`최고 ${entry.bestCombo ?? 0}콤보`);
  } else {
    detailParts.push(`짝 ${entry.solvedPairs ?? 0}개`);
  }

  return detailParts.join(" · ");
}

export function TeacherWorkspace({
  gradeOptions,
  publisherOptions,
  remoteConfigured,
  auth,
  profile,
  profileLoading,
  profileError,
  requiresOnboarding,
  onboarding,
  selection,
  publisher,
  units,
  published,
  catalogEntry,
  status,
  autoSaveStatus,
  error,
  loading,
  saving,
  importing,
  copyLoading,
  copying,
  dirty,
  items,
  speech,
  copySources,
  selectedCopySourceId,
  copyStatus,
  copyError,
  leaderboard,
  onSelectionChange,
  onPublisherChange,
  onPublishedChange,
  onLoadSet,
  onSaveSet,
  onDeleteSet,
  onResetGradeSets,
  onImportWorkbook,
  onSearchCopySources,
  onSelectCopySource,
  onCopySource,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onClearItems,
  onOpenBingoHost,
  canStartBingo = false,
  bingo,
  onBack,
}) {
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [unitChoice, setUnitChoice] = useState(
    units.includes(selection.unit) ? selection.unit : CREATE_UNIT_VALUE,
  );
  const [newUnitDraft, setNewUnitDraft] = useState(
    units.includes(selection.unit) ? "" : selection.unit,
  );
  const importInputRef = useRef(null);

  const isEditing = Boolean(editingId);
  const hasItems = items.length > 0;
  const statusToneClass =
    typeof status === "string" && status.includes("실패")
      ? "warning-hint"
      : "success-hint";

  const stats = useMemo(
    () => ({
      total: items.length,
      withExamples: items.filter((item) => item.exampleSentence).length,
    }),
    [items],
  );

  useEffect(() => {
    if (selection.unit && units.includes(selection.unit)) {
      setUnitChoice(selection.unit);
      setNewUnitDraft("");
      return;
    }

    if (selection.unit) {
      setUnitChoice(CREATE_UNIT_VALUE);
      setNewUnitDraft(selection.unit);
      return;
    }

    if (unitChoice === CREATE_UNIT_VALUE) {
      setNewUnitDraft("");
      return;
    }

    if (units.length === 0) {
      setUnitChoice("");
      setNewUnitDraft("");
    }
  }, [selection.unit, units, unitChoice]);

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

  function handleUnitChoiceChange(nextChoice) {
    setUnitChoice(nextChoice);

    if (nextChoice === CREATE_UNIT_VALUE) {
      setNewUnitDraft("");
      onSelectionChange("unit", "");
      return;
    }

    setNewUnitDraft("");
    onSelectionChange("unit", nextChoice);
  }

  function handleUnitDraftChange(value) {
    setNewUnitDraft(value);
    onSelectionChange("unit", value);
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

  const activeLeaderboardDefinition = getTeacherActivityLeaderboardDefinition(
    leaderboard?.activityType,
  );
  const activeLeaderboard = leaderboard?.boards?.[leaderboard?.tab] ?? null;
  const activeLeaderboardEntries = activeLeaderboard?.entries ?? [];
  const bingoAvailableUnits = bingo?.availableUnits ?? units;
  const bingoSelectedUnits = bingo?.selectedUnits ?? [];
  const bingoCanStart = bingo?.canStart ?? canStartBingo;

  function handleStartLeaderboardEdit(studentName) {
    leaderboard?.startEdit?.(studentName);
  }

  function handleCancelLeaderboardEdit() {
    leaderboard?.cancelEdit?.();
  }

  async function handleRenameLeaderboardStudent() {
    if (!leaderboard?.editingName || !leaderboard?.draftName) {
      return;
    }

    const saved = await leaderboard.renameStudent(
      leaderboard.editingName,
      leaderboard.draftName,
    );

    if (saved) {
      handleCancelLeaderboardEdit();
    }
  }

  async function handleDeleteLeaderboardStudent(studentName) {
    const saved = await leaderboard.deleteStudent(studentName);
    if (saved && leaderboard.editingName === studentName) {
      handleCancelLeaderboardEdit();
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

      <article className="form-card teacher-leaderboard-card">
        <div className="section-heading compact">
          <div>
            <p className="mode-label">Leaderboard Admin</p>
            <h3>리더보드 관리</h3>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={leaderboard?.refresh}
            disabled={leaderboard?.loading}
          >
            {leaderboard?.loading ? "불러오는 중..." : "새로고침"}
          </button>
        </div>

        <p className="inline-hint">
          현재 학교의 같은 학년 기준으로 {activeLeaderboardDefinition.label} 리더보드를 관리하고,
          우리학교 전체 순위 탭까지 함께 확인할 수 있습니다.
        </p>

        {!profile?.schoolId ? (
          <p className="inline-hint warning-hint">
            학교 정보가 없어 리더보드 관리 기능을 사용할 수 없습니다. 먼저 학교와
            선생님 정보를 확인해 주세요.
          </p>
        ) : (
          <>
            {leaderboard?.error ? (
              <p className="inline-hint warning-hint">{leaderboard.error}</p>
            ) : null}

            {leaderboard?.status ? (
              <p className="inline-hint success-hint">{leaderboard.status}</p>
            ) : null}

            <div
              className="matching-leaderboard-tabs"
              role="tablist"
              aria-label="교사 리더보드 활동"
            >
              {TEACHER_ACTIVITY_LEADERBOARD_DEFINITIONS.map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  className={
                    leaderboard?.activityType === type
                      ? "matching-leaderboard-tab matching-leaderboard-tab-active"
                      : "matching-leaderboard-tab"
                  }
                  onClick={() => leaderboard?.setActivityType?.(type)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div
              className="matching-leaderboard-tabs"
              role="tablist"
              aria-label="교사 리더보드 기간"
            >
              {LEADERBOARD_PERIOD_DEFINITIONS.map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  className={
                    leaderboard?.tab === type
                      ? "matching-leaderboard-tab matching-leaderboard-tab-active"
                      : "matching-leaderboard-tab"
                  }
                  onClick={() => leaderboard?.setTab?.(type)}
                >
                  {label}
                </button>
              ))}
            </div>

            {leaderboard?.loading ? (
              <p className="inline-hint">리더보드를 불러오는 중입니다...</p>
            ) : activeLeaderboardEntries.length > 0 ? (
              <ol className="teacher-leaderboard-list">
                {activeLeaderboardEntries.map((entry) => (
                  <li key={entry.id} className="teacher-leaderboard-item">
                    <div className="teacher-leaderboard-meta">
                      <strong>{entry.rank}위</strong>
                      <span>{entry.studentName}</span>
                      <small>
                        {entry.score}점 · {formatTeacherLeaderboardEntryDetail(
                          entry,
                          leaderboard?.activityType,
                          leaderboard?.tab,
                        )}
                      </small>
                    </div>

                    <div className="teacher-leaderboard-actions">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => handleStartLeaderboardEdit(entry.studentName)}
                        disabled={leaderboard?.saving}
                      >
                        이름 수정
                      </button>
                      <button
                        type="button"
                        className="ghost-button danger-button"
                        onClick={() => handleDeleteLeaderboardStudent(entry.studentName)}
                        disabled={leaderboard?.saving}
                      >
                        기록 삭제
                      </button>
                    </div>

                    {leaderboard?.editingName === entry.studentName ? (
                      <div className="teacher-leaderboard-edit-row">
                        <input
                          value={leaderboard?.draftName ?? ""}
                          onChange={(event) =>
                            leaderboard?.setDraftName?.(event.target.value)
                          }
                          placeholder="새 학생 이름"
                        />
                        <button
                          type="button"
                          className="primary-button"
                          onClick={handleRenameLeaderboardStudent}
                          disabled={leaderboard?.saving}
                        >
                          {leaderboard?.saving ? "저장 중..." : "수정 저장"}
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={handleCancelLeaderboardEdit}
                          disabled={leaderboard?.saving}
                        >
                          취소
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="inline-hint">아직 관리할 리더보드 기록이 없습니다.</p>
            )}
          </>
        )}
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
              accept=".xlsx,.xls"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        {importFile ? (
          <p className="inline-hint">선택한 파일: {importFile.name}</p>
        ) : null}
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
            disabled={!selectedCopySourceId || copying}
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
                <span>
                  {source.grade}학년 · {source.units.join(", ")}단원
                </span>
                <span>공개 단어 {source.itemCount}개</span>
              </button>
            ))}
          </div>
        ) : null}
      </article>

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
            <select
              value={unitChoice}
              onChange={(event) => handleUnitChoiceChange(event.target.value)}
            >
              <option value="">단원 선택</option>
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}단원
                </option>
              ))}
              <option value={CREATE_UNIT_VALUE}>+ 새 단원 만들기</option>
            </select>
            {unitChoice === CREATE_UNIT_VALUE ? (
              <input
                value={newUnitDraft}
                onChange={(event) => handleUnitDraftChange(event.target.value)}
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
              {publisherOptions.map((publisher) => (
                <option key={publisher} value={publisher}>
                  {publisher}
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
          출판사는 학년별 기준값으로 저장되며, 현재 단원 저장과 엑셀 일괄
          저장, 다른 학교 카드 복사에도 함께 반영됩니다.
        </p>

        {catalogEntry ? (
          <p className="inline-hint">
            현재 저장본: {catalogEntry.published ? "공개됨" : "비공개"} 상태
            {catalogEntry.publisher ? ` · ${catalogEntry.publisher}` : ""}
          </p>
        ) : null}
        {error ? <p className="inline-hint warning-hint">{error}</p> : null}
        {status ? (
          <p className={`inline-hint ${statusToneClass}`}>{status}</p>
        ) : null}
        {!status && autoSaveStatus ? (
          <p
            className={`inline-hint ${
              autoSaveStatus.includes("실패")
                ? "warning-hint"
                : autoSaveStatus.includes("저장")
                  ? "success-hint"
                  : ""
            }`}
          >
            {autoSaveStatus}
          </p>
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
          <h3>학생 공개와 학급 빙고</h3>
          <p>
            학생은 홈 화면에서 학교, 선생님, 학년, 단원을 순서대로 선택한 뒤
            공개된 단어 세트를 불러와 활동을 시작합니다. 학급 빙고는 현재
            선택한 단원들에 9개 이상 단어가 있어야 시작할 수 있습니다.
          </p>
        </div>

        <div className="bingo-launch-section">
          <p className="mode-label">Bingo Setup</p>
          <h4>학급 빙고 단원 선택</h4>
          <p className="inline-hint">
            짝 맞추기처럼 여러 단원을 함께 선택해 빙고 단어 풀을 만듭니다.
            선택한 단원의 공개 단어를 합쳐 학생 배치 화면으로 넘어갑니다.
          </p>
          <div className="matching-unit-grid bingo-unit-grid">
            {bingoAvailableUnits.length > 0 ? (
              bingoAvailableUnits.map((unit) => {
                const cleanUnit = String(unit ?? "").trim();
                const selected = bingoSelectedUnits.includes(cleanUnit);
                return (
                  <label
                    key={cleanUnit}
                    className={
                      selected
                        ? "matching-unit-option matching-unit-option-selected"
                        : "matching-unit-option"
                    }
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => bingo?.toggleUnit?.(cleanUnit)}
                    />
                    <span>{cleanUnit}단원</span>
                  </label>
                );
              })
            ) : (
              <p className="inline-hint warning-hint">
                현재 학년에서 선택할 수 있는 단원이 없습니다.
              </p>
            )}
          </div>
          <div className="teacher-bingo-preview">
            <span>
              선택 단원:{" "}
              {bingo?.selectedUnitLabels?.length
                ? bingo.selectedUnitLabels.join(", ")
                : "없음"}
            </span>
            <span>사용 단어: {bingo?.items?.length ?? 0}개</span>
            <span>
              빙고판: {bingo?.boardSize ? `${bingo.boardSize}x${bingo.boardSize}` : "단어 부족"}
            </span>
          </div>
        </div>

        <div className="stack-actions">
          <button
            className="secondary-button"
            onClick={onOpenBingoHost}
            disabled={!bingoCanStart}
          >
            학급 빙고 수업 시작
          </button>
          <button className="primary-button" onClick={onBack}>
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </section>
  );
}
