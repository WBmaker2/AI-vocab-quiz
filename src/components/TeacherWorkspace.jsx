import { useEffect, useMemo, useRef, useState } from "react";
import { TeacherBingoTab } from "./teacher/TeacherBingoTab.jsx";
import { TeacherProfileSection } from "./teacher/TeacherProfileSection.jsx";
import {
  ApprovalPendingGate,
  LoadingGate,
  OnboardingGate,
  ProfileErrorGate,
  RemoteConfigGate,
  SignInGate,
} from "./teacher/TeacherWorkspaceGates.jsx";
import { TeacherBulkTab } from "./teacher/TeacherBulkTab.jsx";
import { TeacherLeaderboardTab } from "./teacher/TeacherLeaderboardTab.jsx";
import { TeacherManageTab } from "./teacher/TeacherManageTab.jsx";
import {
  buildTeacherWorkspaceSummaryChips,
  getTeacherProfilePanelMode,
} from "./teacher/teacherWorkspaceView.js";

const EMPTY_FORM = {
  word: "",
  meaning: "",
  imageHint: "",
  imageUrl: "",
  exampleSentence: "",
};

const CREATE_UNIT_VALUE = "__create_new_unit__";
const DEFAULT_TEACHER_TAB = "manage";
const TEACHER_WORKSPACE_TABS = [
  {
    id: "manage",
    label: "기본 관리",
    description:
      "단원 선택, 새 단어 추가, 등록된 단어 조회까지 기본 단어 세트 관리 작업을 한곳에 모았습니다.",
  },
  {
    id: "bulk",
    label: "일괄 등록",
    description:
      "엑셀 업로드와 다른 학교 단어카드 복사 기능을 한 탭에서 이어서 사용할 수 있습니다.",
  },
  {
    id: "bingo",
    label: "학급 빙고",
    description:
      "학생 공개 상태를 확인하고, 여러 단원을 묶어 학급 빙고 수업을 바로 준비할 수 있습니다.",
  },
  {
    id: "leaderboard",
    label: "리더보드",
    description:
      "활동별 리더보드 기록을 불러와 이름 수정과 기록 삭제를 전용 화면에서 관리합니다.",
  },
];

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
  const [activeTab, setActiveTab] = useState(DEFAULT_TEACHER_TAB);
  const [unitChoice, setUnitChoice] = useState(
    units.includes(selection.unit) ? selection.unit : CREATE_UNIT_VALUE,
  );
  const [newUnitDraft, setNewUnitDraft] = useState(
    units.includes(selection.unit) ? "" : selection.unit,
  );
  const importInputRef = useRef(null);

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
    const didStart = await onImportWorkbook(importFile, selection.grade);
    if (didStart) {
      clearImportSelection();
    }
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

  const activeTeacherTab =
    TEACHER_WORKSPACE_TABS.find((tab) => tab.id === activeTab) ??
    TEACHER_WORKSPACE_TABS[0];
  const profilePanelMode = getTeacherProfilePanelMode(profileEditorOpen, profile);
  const summaryChips = buildTeacherWorkspaceSummaryChips({
    total: stats.total,
    withExamples: stats.withExamples,
    published,
  });

  if (!remoteConfigured) {
    return <RemoteConfigGate onBack={onBack} />;
  }

  if (auth.loading || profileLoading) {
    return <LoadingGate onBack={onBack} />;
  }

  if (!auth.signedIn) {
    return <SignInGate onBack={onBack} auth={auth} />;
  }

  if (profileError) {
    return <ProfileErrorGate auth={auth} profileError={profileError} />;
  }

  if (requiresOnboarding) {
    return <OnboardingGate onBack={onBack} auth={auth} onboarding={onboarding} />;
  }

  if (profilePanelMode === "approval-pending") {
    return <ApprovalPendingGate onBack={onBack} auth={auth} profile={profile} />;
  }

  return (
    <section className="workspace-panel workspace-panel-compact">
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

      <TeacherProfileSection expanded={profilePanelMode === "expanded"} profile={profile} onboarding={onboarding} onCancelProfileEditor={handleCancelProfileEditor} onSaveProfileEditor={handleSaveProfileEditor} onDeleteTeacherProfile={handleDeleteTeacherProfile} onDeleteSchoolProfile={handleDeleteSchoolProfile} onOpenProfileEditor={handleOpenProfileEditor} />

      <div className="teacher-workspace-tabs-wrap">
        <div className="teacher-summary-chips" aria-label="현재 단어 세트 요약">
          {summaryChips.map((chip) => (
            <span key={chip.id} className="teacher-summary-chip">
              {chip.label}
            </span>
          ))}
        </div>
        <div
          className="teacher-workspace-tabs"
          role="tablist"
          aria-label="교사 관리 기능 탭"
        >
          {TEACHER_WORKSPACE_TABS.map((tab) => (
            <button
              key={tab.id}
              id={`teacher-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`teacher-panel-${tab.id}`}
              className={
                activeTab === tab.id
                  ? "teacher-workspace-tab teacher-workspace-tab-active"
                  : "teacher-workspace-tab"
              }
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div
        id={`teacher-panel-${activeTeacherTab.id}`}
        role="tabpanel"
        aria-labelledby={`teacher-tab-${activeTeacherTab.id}`}
        className="teacher-workspace-tab-panel"
      >
        {activeTab === "leaderboard" ? (
          <TeacherLeaderboardTab
            profile={profile}
            gradeOptions={gradeOptions}
            leaderboard={leaderboard}
          />
        ) : null}

        {activeTab === "bulk" ? (
          <TeacherBulkTab
            importing={importing}
            saving={saving}
            importFile={importFile}
            importInputRef={importInputRef}
            publisher={publisher}
            publisherOptions={publisherOptions}
            selection={selection}
            copyLoading={copyLoading}
            copying={copying}
            copyError={copyError}
            copyStatus={copyStatus}
            copySources={copySources}
            selectedCopySourceId={selectedCopySourceId}
            onPublisherChange={onPublisherChange}
            onImportFileChange={setImportFile}
            onResetGradeSets={handleResetGradeSets}
            onImportWorkbook={handleImportWorkbook}
            onSearchCopySources={onSearchCopySources}
            onSelectCopySource={onSelectCopySource}
            onCopySource={onCopySource}
          />
        ) : null}

        {activeTab === "manage" ? (
          <TeacherManageTab
            gradeOptions={gradeOptions}
            publisherOptions={publisherOptions}
            selection={selection}
            units={units}
            createUnitValue={CREATE_UNIT_VALUE}
            unitChoice={unitChoice}
            newUnitDraft={newUnitDraft}
            publisher={publisher}
            published={published}
            catalogEntry={catalogEntry}
            error={error}
            status={status}
            autoSaveStatus={autoSaveStatus}
            dirty={dirty}
            saving={saving}
            loading={loading}
            items={items}
            speech={speech}
            formValues={formValues}
            editingId={editingId}
            onSelectionChange={onSelectionChange}
            onUnitChoiceChange={handleUnitChoiceChange}
            onUnitDraftChange={handleUnitDraftChange}
            onPublisherChange={onPublisherChange}
            onPublishedChange={onPublishedChange}
            onLoadSet={onLoadSet}
            onSaveSet={onSaveSet}
            onDeleteSet={onDeleteSet}
            onFormChange={handleChange}
            onFormSubmit={handleSubmit}
            onResetForm={resetForm}
            onPreviewWord={previewWord}
            onEditItem={handleEdit}
            onDeleteItem={onRemoveItem}
            onClearItems={onClearItems}
          />
        ) : null}

        {activeTab === "bingo" ? (
          <TeacherBingoTab
            bingo={bingo}
            units={units}
            canStartBingo={canStartBingo}
            onOpenBingoHost={onOpenBingoHost}
            onBack={onBack}
          />
        ) : null}
      </div>
    </section>
  );
}
