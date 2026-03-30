import { useState } from "react";
import { BrowserSupportNotice } from "./components/BrowserSupportNotice.jsx";
import { ListeningQuiz } from "./components/ListeningQuiz.jsx";
import { ModeSelector } from "./components/ModeSelector.jsx";
import { StudentBingoBoard } from "./components/StudentBingoBoard.jsx";
import { StudentBingoJoin } from "./components/StudentBingoJoin.jsx";
import { TeacherBingoHost } from "./components/TeacherBingoHost.jsx";
import { UpdateHistoryModal } from "./components/UpdateHistoryModal.jsx";
import { SpeakingQuiz } from "./components/SpeakingQuiz.jsx";
import { TeacherWorkspace } from "./components/TeacherWorkspace.jsx";
import { WordFishingGame } from "./components/WordFishingGame.jsx";
import { WordMatchingGame } from "./components/WordMatchingGame.jsx";
import { APP_UPDATES, APP_VERSION } from "./constants/app.js";
import { GRADE_OPTIONS, PUBLISHER_OPTIONS } from "./constants/vocabulary.js";
import { useBingoSession } from "./hooks/useBingoSession.js";
import { useCelebrationAudio } from "./hooks/useCelebrationAudio.js";
import { isSpeechRecognitionSupported } from "./hooks/useSpeechRecognition.js";
import { useSpeechSynthesis } from "./hooks/useSpeechSynthesis.js";
import { useVocabularyLibrary } from "./hooks/useVocabularyLibrary.js";

const APP_VIEWS = {
  HOME: "home",
  TEACHER: "teacher",
  LISTENING: "listening",
  SPEAKING: "speaking",
  MATCHING: "matching",
  FISHING: "fishing",
  BINGO_HOST: "bingo-host",
  BINGO_JOIN: "bingo-join",
  BINGO_BOARD: "bingo-board",
};

function formatBingoCallSource(entry) {
  if (!entry) {
    return "";
  }

  if (entry.isRandomDraw) {
    return entry.mode === "tts" ? "랜덤 TTS" : "랜덤";
  }

  if (entry.mode === "tts") {
    return "선생님 TTS";
  }

  return "선생님 직접 읽기";
}

function App() {
  const [view, setView] = useState(APP_VIEWS.HOME);
  const [homeMatchingPanelOpen, setHomeMatchingPanelOpen] = useState(false);
  const [updateHistoryOpen, setUpdateHistoryOpen] = useState(false);
  const [bingoTeacherMode, setBingoTeacherMode] = useState("manual");
  const [bingoJoinCode, setBingoJoinCode] = useState("");
  const speechSynthesis = useSpeechSynthesis();
  const celebrationAudio = useCelebrationAudio();
  const library = useVocabularyLibrary();
  const teacherBingo = useBingoSession();
  const studentBingo = useBingoSession();

  const support = {
    tts: speechSynthesis.supported,
    stt: isSpeechRecognitionSupported(),
  };

  const hasStudentVocabulary = library.student.items.length > 0;
  const canStartTeacherBingo = library.teacher.bingo.canStart;
  const teacherBingoSelectedUnitLabels =
    library.teacher.bingo.selectedUnitLabels ?? [];
  const teacherBingoSessionTitle =
    (teacherBingo.session?.grade || library.teacher.selection.grade) &&
    (teacherBingo.session?.selectedUnitLabels?.length ?? teacherBingoSelectedUnitLabels.length) > 0
      ? `${teacherBingo.session?.selectedUnitLabels?.join(", ") ?? teacherBingoSelectedUnitLabels.join(", ")} 학급 빙고`
      : "학급 빙고 수업";
  const studentBingoCall =
    studentBingo.session?.callSequence?.[studentBingo.session.callSequence.length - 1] ??
    null;

  function speakBingoWord(word) {
    if (!word) {
      return;
    }

    speechSynthesis.speak(word, {
      lang: "en-US",
      rate: 0.88,
    });
  }

  function navigateTo(nextView, options = {}) {
    speechSynthesis.cancel();
    if (nextView === APP_VIEWS.HOME) {
      setHomeMatchingPanelOpen(Boolean(options.openMatchingPanel));
    } else {
      setHomeMatchingPanelOpen(false);
    }
    setView(nextView);
  }

  async function handleOpenTeacherBingoHost() {
    if (!canStartTeacherBingo) {
      return;
    }

    try {
      const sessionPayload = await library.teacher.bingo.prepareSession();
      const result = await teacherBingo.startSession({
        ...sessionPayload,
        mode: bingoTeacherMode === "tts" ? "tts" : "manual",
      });

      setBingoTeacherMode(
        result.session?.mode === "tts" ? "tts" : "manual",
      );
      navigateTo(APP_VIEWS.BINGO_HOST);
    } catch {
      // Hook error state already captures the message for the host.
    }
  }

  async function handleJoinBingoSession() {
    if (!bingoJoinCode.trim() || !library.student.nameDraft.trim()) {
      return;
    }

    try {
      await studentBingo.joinSession({
        sessionCode: bingoJoinCode,
        studentName: library.student.nameDraft,
      });
      navigateTo(APP_VIEWS.BINGO_BOARD);
    } catch {
      // Hook error state already captures the message for the board.
    }
  }

  return (
    <div className="app-shell">
      <div className="app-backdrop app-backdrop-left" />
      <div className="app-backdrop app-backdrop-right" />

      <main className="app-frame">
        <header className="hero-card">
          <div className="hero-meta">
            <p className="eyebrow">Elementary English Classroom App</p>
            <span className="app-version">{APP_VERSION}</span>
            <button
              type="button"
              className="update-info-button"
              onClick={() => setUpdateHistoryOpen(true)}
            >
              update info
            </button>
          </div>
          <h1 className="hero-title">AI 원어민 단어 퀴즈 쇼</h1>
          <p className="hero-subtitle">
            선생님이 오늘의 단어만 입력하면, 듣기와 말하기 활동으로
            이어지는 수업용 단어 게임입니다.
          </p>
          <div className="hero-badges" aria-label="핵심 기능">
            <span>TTS 듣기 퀴즈</span>
            <span>STT 말하기 연습</span>
            <span>Firebase 공유 저장</span>
          </div>
        </header>

        <BrowserSupportNotice support={support} />

        {view === APP_VIEWS.HOME ? (
          <ModeSelector
            gradeOptions={GRADE_OPTIONS}
            remoteConfigured={library.remoteConfigured}
            auth={library.auth}
            schoolQuery={library.student.schoolQuery}
            schoolBrowseMode={library.student.schoolBrowseMode}
            featuredSchools={library.student.featuredSchools}
            featuredSchoolsLoading={library.student.featuredSchoolsLoading}
            schoolResults={library.student.schoolResults}
            schoolSearchLoading={library.student.schoolSearchLoading}
            selectedSchool={library.student.selectedSchool}
            teachers={library.student.teachers}
            teachersLoading={library.student.teachersLoading}
            selectedTeacher={library.student.selectedTeacher}
            selection={library.student.selection}
            units={library.student.units}
            matchingUnits={library.student.matchingUnits}
            matchingLoading={library.student.loading}
            initialMatchingPanelOpen={homeMatchingPanelOpen}
            unitsLoading={library.student.unitsLoading}
            status={library.student.status}
            error={library.student.error}
            hasVocabulary={hasStudentVocabulary}
            currentItemCount={library.student.items.length}
            onSchoolQueryChange={library.student.updateSchoolQuery}
            onSearchSchools={library.student.searchSchools}
            onChooseSchool={library.student.chooseSchool}
            onChooseTeacher={library.student.chooseTeacher}
            onSelectionChange={library.student.updateSelection}
            onLoadSet={library.student.loadSet}
            onToggleMatchingUnit={library.student.toggleMatchingUnit}
            onSeedMatchingUnits={library.student.seedMatchingUnits}
            onLoadMatchingSet={library.student.loadMatchingSet}
            onOpenTeacher={() => navigateTo(APP_VIEWS.TEACHER)}
            onOpenListening={() => navigateTo(APP_VIEWS.LISTENING)}
            onOpenSpeaking={() => navigateTo(APP_VIEWS.SPEAKING)}
            onOpenMatching={() => navigateTo(APP_VIEWS.MATCHING)}
            onOpenFishing={() => navigateTo(APP_VIEWS.FISHING)}
            onOpenBingo={() => navigateTo(APP_VIEWS.BINGO_JOIN)}
          />
        ) : null}

        {view === APP_VIEWS.TEACHER ? (
          <TeacherWorkspace
            gradeOptions={GRADE_OPTIONS}
            publisherOptions={PUBLISHER_OPTIONS}
            remoteConfigured={library.remoteConfigured}
            auth={library.auth}
            profile={library.teacher.profile}
            profileLoading={library.teacher.profileLoading}
            profileError={library.teacher.profileError}
            requiresOnboarding={library.teacher.requiresOnboarding}
            onboarding={library.teacher.onboarding}
            selection={library.teacher.selection}
            publisher={library.teacher.publisher}
            units={library.teacher.units}
            published={library.teacher.published}
            catalogEntry={library.teacher.catalogEntry}
            status={library.teacher.status}
            autoSaveStatus={library.teacher.autoSaveStatus}
            error={library.teacher.error}
            loading={library.teacher.loading}
            saving={library.teacher.saving}
            importing={library.teacher.importing}
            dirty={library.teacher.dirty}
            items={library.teacher.items}
            speech={speechSynthesis}
            bingo={library.teacher.bingo}
            onSelectionChange={library.teacher.updateSelection}
            onPublisherChange={library.teacher.updatePublisher}
            onPublishedChange={library.teacher.setPublished}
            onLoadSet={library.teacher.loadSet}
            onSaveSet={library.teacher.saveSet}
            onDeleteSet={library.teacher.deleteSet}
            onResetGradeSets={library.teacher.resetGradeSets}
            onImportWorkbook={library.teacher.importWorkbook}
            copySources={library.teacher.copySources}
            selectedCopySourceId={library.teacher.selectedCopySourceId}
            copyLoading={library.teacher.copyLoading}
            copying={library.teacher.copying}
            copyStatus={library.teacher.copyStatus}
            copyError={library.teacher.copyError}
            onSearchCopySources={library.teacher.searchCopySources}
            onSelectCopySource={library.teacher.selectCopySource}
            onCopySource={library.teacher.copySource}
            onAddItem={library.teacher.addItem}
            onUpdateItem={library.teacher.updateItem}
            onRemoveItem={library.teacher.removeItem}
            onClearItems={library.teacher.clearItems}
            onOpenBingoHost={handleOpenTeacherBingoHost}
            canStartBingo={canStartTeacherBingo}
            leaderboard={library.teacher.leaderboard}
            onBack={() => navigateTo(APP_VIEWS.HOME)}
          />
        ) : null}

        {view === APP_VIEWS.LISTENING ? (
          <ListeningQuiz
            items={library.student.items}
            remoteConfigured={library.remoteConfigured}
            progressionContext={library.student.progressionContext}
            studentNameDraft={library.student.nameDraft}
            onStudentNameDraftChange={library.student.updateNameDraft}
            speech={speechSynthesis}
            celebration={celebrationAudio}
            onBack={() => navigateTo(APP_VIEWS.HOME)}
          />
        ) : null}

        {view === APP_VIEWS.SPEAKING ? (
          <SpeakingQuiz
            items={library.student.items}
            remoteConfigured={library.remoteConfigured}
            progressionContext={library.student.progressionContext}
            studentNameDraft={library.student.nameDraft}
            onStudentNameDraftChange={library.student.updateNameDraft}
            speech={speechSynthesis}
            celebration={celebrationAudio}
            onBack={() => navigateTo(APP_VIEWS.HOME)}
          />
        ) : null}

        {view === APP_VIEWS.MATCHING ? (
          <WordMatchingGame
            items={library.student.matchingItems}
            selectedUnits={library.student.matchingUnits}
            leaderboardContext={library.student.leaderboardContext}
            progressionContext={library.student.progressionContext}
            remoteConfigured={library.remoteConfigured}
            studentNameDraft={library.student.nameDraft}
            onStudentNameDraftChange={library.student.updateNameDraft}
            speech={speechSynthesis}
            celebration={celebrationAudio}
            onBack={() => navigateTo(APP_VIEWS.HOME)}
            onChooseUnits={() => navigateTo(APP_VIEWS.HOME, { openMatchingPanel: true })}
          />
        ) : null}

        {view === APP_VIEWS.FISHING ? (
          <WordFishingGame
            items={library.student.items}
            speech={speechSynthesis}
            celebration={celebrationAudio}
            onBack={() => navigateTo(APP_VIEWS.HOME)}
          />
        ) : null}

        {view === APP_VIEWS.BINGO_HOST ? (
          <TeacherBingoHost
            sessionCode={teacherBingo.sessionCode}
            sessionTitle={teacherBingoSessionTitle}
            teacherName={library.teacher.profile?.teacherName ?? ""}
            classLabel={
              teacherBingo.session?.grade &&
              (teacherBingo.session?.selectedUnitLabels?.length ?? 0) > 0
                ? `${teacherBingo.session.grade}학년 · ${teacherBingo.session.selectedUnitLabels.join(", ")}`
                : teacherBingoSelectedUnitLabels.length > 0
                  ? `${library.teacher.selection.grade}학년 · ${teacherBingoSelectedUnitLabels.join(", ")}`
                : ""
            }
            roomLabel={library.teacher.publisher ? `출판사 ${library.teacher.publisher}` : ""}
            callMode={bingoTeacherMode}
            currentWordId={teacherBingo.session?.activeWordId ?? ""}
            currentWord={teacherBingo.session?.activeWordText ?? ""}
            students={teacherBingo.players.map((player) => ({
              id: player.playerId ?? player.id,
              name: player.studentName,
              bingoCount: player.bingoLines ?? 0,
              connected: true,
              status:
                (player.bingoLines ?? 0) >= 3
                  ? `${player.bingoLines}빙고 달성`
                  : (player.bingoLines ?? 0) > 0
                    ? `${player.bingoLines}빙고 진행 중`
                    : "대기 중",
            }))}
            callHistory={[...(teacherBingo.session?.callSequence ?? [])]
              .reverse()
              .map((entry, index) => ({
                id: `${entry.wordId ?? entry.word ?? "call"}-${index}`,
                wordId: entry.wordId,
                word: entry.word,
                source: formatBingoCallSource(entry),
              }))}
            wordOptions={teacherBingo.session?.vocabularyItems ?? []}
            statusMessage={
              teacherBingo.session?.status === "finished"
                ? "세션을 종료했습니다."
                : teacherBingo.players.length > 0
                  ? `${teacherBingo.players.length}명의 학생이 참여 중입니다.`
                  : "참여 코드를 알려주고 학생들이 들어오기를 기다리세요."
            }
            errorMessage={teacherBingo.error}
            isPicking={bingoTeacherMode === "random" && teacherBingo.actionLoading}
            isComplete={teacherBingo.session?.status === "finished"}
            onToggleCallMode={setBingoTeacherMode}
            onPickRandomWord={async () => {
              try {
                await teacherBingo.drawWord({
                  sessionId: teacherBingo.sessionCode,
                  teacherUserId: library.teacher.profile?.userId ?? "",
                  mode: "tts",
                });
              } catch {
                // Hook error state already captures the message for the host.
              }
            }}
            onSelectWord={async (option) => {
              try {
                await teacherBingo.callWord({
                  sessionId: teacherBingo.sessionCode,
                  teacherUserId: library.teacher.profile?.userId ?? "",
                  wordId: option.id,
                  word: option.word,
                  meaning: option.meaning,
                  mode: bingoTeacherMode === "tts" ? "tts" : "manual",
                });
                if (bingoTeacherMode === "tts") {
                  speakBingoWord(option.word);
                }
              } catch {
                // Hook error state already captures the message for the host.
              }
            }}
            onSpeakCurrentWord={speakBingoWord}
            onEndGame={async () => {
              try {
                await teacherBingo.endSession({
                  sessionId: teacherBingo.sessionCode,
                  teacherUserId: library.teacher.profile?.userId ?? "",
                });
              } catch {
                return;
              }

              navigateTo(APP_VIEWS.TEACHER);
            }}
            onBack={() => navigateTo(APP_VIEWS.TEACHER)}
          />
        ) : null}

        {view === APP_VIEWS.BINGO_JOIN ? (
          <StudentBingoJoin
            sessionCode={studentBingo.sessionCode}
            teacherName={studentBingo.session?.teacherName ?? ""}
            playerName={library.student.nameDraft}
            joinCode={bingoJoinCode}
            statusMessage={
              studentBingo.session?.teacherName
                ? `${studentBingo.session.teacherName} 선생님 세션입니다.`
                : ""
            }
            errorMessage={studentBingo.error}
            joining={studentBingo.actionLoading}
            onSessionCodeChange={setBingoJoinCode}
            onPlayerNameChange={library.student.updateNameDraft}
            onJoin={handleJoinBingoSession}
            onBack={() => navigateTo(APP_VIEWS.HOME)}
          />
        ) : null}

        {view === APP_VIEWS.BINGO_BOARD ? (
          <StudentBingoBoard
            sessionCode={studentBingo.sessionCode}
            playerName={studentBingo.player?.studentName ?? library.student.nameDraft}
            boardTitle={
              studentBingo.session?.schoolName &&
              (studentBingo.session?.selectedUnitLabels?.length ?? 0) > 0
                ? `${studentBingo.session.schoolName} · ${studentBingo.session.selectedUnitLabels.join(", ")} 빙고`
                : "영어 단어 빙고 보드"
            }
            boardWords={studentBingo.player?.boardCells ?? []}
            setupStatus={studentBingo.player?.setupStatus ?? "arranging"}
            availableWords={studentBingo.player?.availableWords ?? []}
            requiredCellCount={studentBingo.player?.requiredCellCount ?? 0}
            setupStartedAt={studentBingo.player?.setupStartedAt ?? null}
            setupCompletedAt={studentBingo.player?.setupCompletedAt ?? null}
            playerId={studentBingo.playerId}
            currentWordId={studentBingo.session?.activeWordId ?? ""}
            currentWord={studentBingo.session?.activeWordText ?? ""}
            currentWordSource={formatBingoCallSource(studentBingoCall)}
            bingoCount={studentBingo.player?.bingoLines ?? 0}
            claimedWords={studentBingo.player?.markedWordIds ?? []}
            completedWords={[]}
            lockedWords={[]}
            statusMessage={
              studentBingo.session?.status === "finished"
                ? "선생님이 빙고 수업을 종료했습니다."
                : (studentBingo.player?.bingoLines ?? 0) >= 3
                  ? `${studentBingo.player?.bingoLines ?? 0}빙고! 선생님이 종료하기 전까지 계속 이어서 체크할 수 있어요.`
                  : ""
            }
            errorMessage={studentBingo.error}
            roundLabel={
              studentBingo.session?.grade &&
              (studentBingo.session?.selectedUnitLabels?.length ?? 0) > 0
                ? `${studentBingo.session.grade}학년 ${studentBingo.session.selectedUnitLabels.join(", ")}`
                : ""
            }
            actionLoading={studentBingo.actionLoading}
            canContinue={studentBingo.session?.status === "live"}
            onSaveSetupDraft={({ boardCells }) =>
              studentBingo.saveBoardSetup({
                sessionId: studentBingo.sessionCode,
                playerId: studentBingo.playerId,
                boardCells,
              })
            }
            onFinalizeSetup={({ boardCells, autoFillRemaining }) =>
              studentBingo.finalizeBoardSetup({
                sessionId: studentBingo.sessionCode,
                playerId: studentBingo.playerId,
                boardCells,
                autoFillRemaining,
              })
            }
            onCheckWord={(wordId) =>
              studentBingo.markCell({
                sessionId: studentBingo.sessionCode,
                playerId: studentBingo.playerId,
                wordId,
              })
            }
            onBack={() => navigateTo(APP_VIEWS.HOME)}
          />
        ) : null}
      </main>

      <UpdateHistoryModal
        open={updateHistoryOpen}
        currentVersion={APP_VERSION}
        updates={APP_UPDATES}
        onClose={() => setUpdateHistoryOpen(false)}
      />
    </div>
  );
}

export default App;
