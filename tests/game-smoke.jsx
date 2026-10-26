import { useState } from "react";
import { createRoot } from "react-dom/client";
import { AppErrorBoundary } from "../src/components/AppErrorBoundary.jsx";
import { ListeningQuiz } from "../src/components/ListeningQuiz.jsx";
import { SpeakingQuiz } from "../src/components/SpeakingQuiz.jsx";
import { StudentBingoJoin } from "../src/components/StudentBingoJoin.jsx";
import { TeacherWorkspace } from "../src/components/TeacherWorkspace.jsx";
import { WordDictationGame } from "../src/components/WordDictationGame.jsx";
import { WordFishingGame } from "../src/components/WordFishingGame.jsx";
import { WordMatchingGame } from "../src/components/WordMatchingGame.jsx";
import { WordSpellingGame } from "../src/components/WordSpellingGame.jsx";
import { WordTypingGame } from "../src/components/WordTypingGame.jsx";
import { GRADE_OPTIONS, PUBLISHER_OPTIONS } from "../src/constants/vocabulary.js";

const fishingItems = [
  { id: "item-1", word: "apple", meaning: "사과" },
  { id: "item-2", word: "banana", meaning: "바나나" },
  { id: "item-3", word: "book", meaning: "책" },
  { id: "item-4", word: "cat", meaning: "고양이" },
  { id: "item-5", word: "dog", meaning: "강아지" },
  { id: "item-6", word: "egg", meaning: "달걀" },
];

const speech = {
  supported: true,
  speaking: false,
  cancel() {},
  speak() {},
  warmup() {},
  voices: [],
  voiceLabel: "",
  rate: 0.9,
  ratePreset: "standard",
  hasStoredRatePreset: true,
  setRatePreset() {},
};

const celebration = {
  playSuccess() {},
  playCompletion() {},
};

const leaderboardContext = {
  schoolId: "school-1",
  schoolName: "테스트초",
  grade: "3",
};

const progressionContext = {
  ...leaderboardContext,
  unit: "1",
  teacherUserId: "teacher-1",
  teacherName: "김선생",
};

const commonProps = {
  items: fishingItems,
  speech,
  celebration,
  leaderboardContext,
  progressionContext,
  remoteConfigured: false,
  studentNameDraft: "",
  onStudentNameDraftChange: () => {},
  onBack: () => {},
};

class FakeSpeechRecognition {
  constructor() {
    this.lang = "";
    this.interimResults = false;
    this.maxAlternatives = 1;
    this.continuous = false;
  }

  start() {
    this.onstart?.();
  }

  stop() {
    this.onend?.();
  }

  abort() {
    this.onend?.();
  }
}

if (typeof window !== "undefined" && !window.SpeechRecognition) {
  window.SpeechRecognition = FakeSpeechRecognition;
}

const teacherProps = {
  gradeOptions: GRADE_OPTIONS,
  publisherOptions: PUBLISHER_OPTIONS,
  remoteConfigured: true,
  auth: {
    loading: false,
    signedIn: true,
    error: "",
    signOut() {},
    signInWithGoogle() {},
  },
  profile: {
    userId: "teacher-1",
    schoolId: "",
    schoolName: "테스트초",
    teacherName: "김선생",
    isActive: true,
    gradePublishers: {},
  },
  profileLoading: false,
  profileError: "",
  requiresOnboarding: false,
  onboarding: {
    schoolName: "",
    teacherName: "",
    suggestions: [],
    searching: false,
    saving: false,
    status: "",
    error: "",
    resetToProfile() {},
    save: async () => true,
    deleteTeacher: async () => true,
    deleteSchool: async () => true,
    updateField() {},
    chooseSchool() {},
  },
  selection: { grade: "3", unit: "1" },
  publisher: "",
  units: ["1", "2"],
  published: false,
  catalogEntry: null,
  status: "",
  autoSaveStatus: "",
  error: "",
  loading: false,
  saving: false,
  importing: false,
  copyLoading: false,
  copying: false,
  dirty: false,
  items: [],
  speech,
  copySources: [],
  selectedCopySourceId: "",
  copyStatus: "",
  copyError: "",
  leaderboard: {
    activityType: "matching",
    tab: "week",
    boards: {},
    loading: false,
    error: "",
    status: "",
    editingName: "",
    draftName: "",
    saving: false,
    leaderboardGrade: "3",
    refresh() {},
    startEdit() {},
    cancelEdit() {},
    setDraftName() {},
    renameStudent: async () => true,
    deleteStudent: async () => true,
    setActivityType() {},
    setTab() {},
    setLeaderboardGrade() {},
  },
  bingo: {
    availableUnits: ["1"],
    selectedUnits: [],
    selectedUnitLabels: [],
    items: [],
    boardSize: 0,
    canStart: false,
    toggleUnit() {},
  },
  canStartBingo: false,
  onSelectionChange() {},
  onPublisherChange() {},
  onPublishedChange() {},
  onLoadSet() {},
  onSaveSet() {},
  onDeleteSet() {},
  onResetGradeSets() {},
  onImportWorkbook() {},
  onSearchCopySources() {},
  onSelectCopySource() {},
  onCopySource() {},
  onAddItem() {},
  onUpdateItem() {},
  onRemoveItem() {},
  onClearItems() {},
  onOpenBingoHost() {},
  onBack() {},
};

function BrokenActivity() {
  throw new Error("smoke boundary failure");
}

function ErrorBoundarySmoke() {
  const [returnedHome, setReturnedHome] = useState(false);

  if (returnedHome) {
    return <h2>홈 복귀 성공</h2>;
  }

  return (
    <AppErrorBoundary
      eyebrow="Smoke Error"
      title="테스트 활동 오류"
      onHome={() => setReturnedHome(true)}
    >
      <BrokenActivity />
    </AppErrorBoundary>
  );
}

function renderActivity(activity) {
  switch (activity) {
    case "error-boundary":
      return <ErrorBoundarySmoke />;
    case "listening":
      return <ListeningQuiz {...commonProps} studentGrade="3" />;
    case "speaking":
      return <SpeakingQuiz {...commonProps} studentGrade="3" />;
    case "matching":
      return (
        <WordMatchingGame
          {...commonProps}
          selectedUnits={["1"]}
          onChooseUnits={() => {}}
        />
      );
    case "spelling":
      return <WordSpellingGame {...commonProps} />;
    case "dictation":
      return <WordDictationGame {...commonProps} studentGrade="3" />;
    case "typing":
      return (
        <WordTypingGame
          {...commonProps}
          items={[{ id: "item-1", word: "apple", meaning: "사과" }]}
        />
      );
    case "bingo":
      return (
        <StudentBingoJoin
          sessionCode="BINGO42"
          sessionTitle="빙고 참여"
          teacherName="김선생"
          playerName=""
          joinCode=""
          statusMessage=""
          errorMessage=""
          joining={false}
          onSessionCodeChange={() => {}}
          onPlayerNameChange={() => {}}
          onJoin={() => {}}
          onBack={() => {}}
        />
      );
    case "teacher":
      return <TeacherWorkspace {...teacherProps} />;
    case "fishing":
    default:
      return <WordFishingGame {...commonProps} />;
  }
}

const activity =
  new URLSearchParams(window.location.search).get("activity") ??
  new URLSearchParams(window.location.search).get("game") ??
  "fishing";

createRoot(document.getElementById("root")).render(renderActivity(activity));
