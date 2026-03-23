import { useState } from "react";
import { BrowserSupportNotice } from "./components/BrowserSupportNotice.jsx";
import { ListeningQuiz } from "./components/ListeningQuiz.jsx";
import { ModeSelector } from "./components/ModeSelector.jsx";
import { UpdateHistoryModal } from "./components/UpdateHistoryModal.jsx";
import { SpeakingQuiz } from "./components/SpeakingQuiz.jsx";
import { TeacherWorkspace } from "./components/TeacherWorkspace.jsx";
import { WordMatchingGame } from "./components/WordMatchingGame.jsx";
import { APP_UPDATES, APP_VERSION } from "./constants/app.js";
import { GRADE_OPTIONS, PUBLISHER_OPTIONS } from "./constants/vocabulary.js";
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
};

function App() {
  const [view, setView] = useState(APP_VIEWS.HOME);
  const [homeMatchingPanelOpen, setHomeMatchingPanelOpen] = useState(false);
  const [updateHistoryOpen, setUpdateHistoryOpen] = useState(false);
  const speechSynthesis = useSpeechSynthesis();
  const celebrationAudio = useCelebrationAudio();
  const library = useVocabularyLibrary();

  const support = {
    tts: speechSynthesis.supported,
    stt: isSpeechRecognitionSupported(),
  };

  const hasStudentVocabulary = library.student.items.length > 0;

  function navigateTo(nextView, options = {}) {
    speechSynthesis.cancel();
    if (nextView === APP_VIEWS.HOME) {
      setHomeMatchingPanelOpen(Boolean(options.openMatchingPanel));
    } else {
      setHomeMatchingPanelOpen(false);
    }
    setView(nextView);
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
            error={library.teacher.error}
            loading={library.teacher.loading}
            saving={library.teacher.saving}
            importing={library.teacher.importing}
            dirty={library.teacher.dirty}
            items={library.teacher.items}
            speech={speechSynthesis}
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
            onBack={() => navigateTo(APP_VIEWS.HOME)}
          />
        ) : null}

        {view === APP_VIEWS.LISTENING ? (
          <ListeningQuiz
            items={library.student.items}
            speech={speechSynthesis}
            celebration={celebrationAudio}
            onBack={() => navigateTo(APP_VIEWS.HOME)}
            onOpenTeacher={() => navigateTo(APP_VIEWS.TEACHER)}
          />
        ) : null}

        {view === APP_VIEWS.SPEAKING ? (
          <SpeakingQuiz
            items={library.student.items}
            speech={speechSynthesis}
            celebration={celebrationAudio}
            onBack={() => navigateTo(APP_VIEWS.HOME)}
            onOpenTeacher={() => navigateTo(APP_VIEWS.TEACHER)}
          />
        ) : null}

        {view === APP_VIEWS.MATCHING ? (
          <WordMatchingGame
            items={library.student.matchingItems}
            selectedUnits={library.student.matchingUnits}
            speech={speechSynthesis}
            celebration={celebrationAudio}
            onBack={() => navigateTo(APP_VIEWS.HOME)}
            onChooseUnits={() => navigateTo(APP_VIEWS.HOME, { openMatchingPanel: true })}
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
