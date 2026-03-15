import { useState } from "react";

export function ModeSelector({
  gradeOptions,
  remoteConfigured,
  auth,
  schoolQuery,
  schoolResults,
  schoolSearchLoading,
  selectedSchool,
  teachers,
  teachersLoading,
  selectedTeacher,
  selection,
  units,
  matchingUnits,
  matchingLoading,
  unitsLoading,
  status,
  error,
  hasVocabulary,
  currentItemCount,
  onSchoolQueryChange,
  onSearchSchools,
  onChooseSchool,
  onChooseTeacher,
  onSelectionChange,
  onLoadSet,
  onToggleMatchingUnit,
  onLoadMatchingSet,
  onOpenTeacher,
  onOpenListening,
  onOpenSpeaking,
  onOpenMatching,
}) {
  const [matchingPanelOpen, setMatchingPanelOpen] = useState(false);

  async function handleStartMatching() {
    const loaded = await onLoadMatchingSet();

    if (loaded) {
      onOpenMatching();
    }
  }

  return (
    <section className="panel-grid">
      <article className="mode-card mode-card-teacher">
        <p className="mode-label">Teacher Mode</p>
        <h2>선생님 단어 세트 관리</h2>
        <p>
          Google 로그인 후 학교와 선생님 정보를 등록하면, 내 단어 세트만
          저장하고 공개할 수 있습니다.
        </p>
        <button className="primary-button" onClick={onOpenTeacher}>
          {auth.signedIn ? "내 단어 세트 열기" : "Google 로그인 후 시작"}
        </button>
      </article>

      <article className="mode-card mode-card-student">
        <p className="mode-label">Student Mode</p>
        <h2>학생 활동 시작</h2>
        <p>학교를 찾고, 선생님과 학년, 단원을 순서대로 선택하세요.</p>

        <div className="form-grid compact-grid">
          <label className="field field-wide">
            <span>학교 이름</span>
            <input
              value={schoolQuery}
              onChange={(event) => onSchoolQueryChange(event.target.value)}
              placeholder="예: 서울초등학교"
              disabled={!remoteConfigured}
            />
          </label>
        </div>

        <div className="toolbar-row">
          <button
            className="secondary-button"
            onClick={onSearchSchools}
            disabled={!remoteConfigured || schoolSearchLoading}
          >
            {schoolSearchLoading ? "학교 검색 중..." : "학교 검색"}
          </button>
        </div>

        {schoolResults.length > 0 ? (
          <div className="selection-chip-group" aria-label="학교 검색 결과">
            {schoolResults.map((school) => (
              <button
                key={school.id}
                className={
                  selectedSchool?.id === school.id
                    ? "choice-chip choice-chip-selected"
                    : "choice-chip"
                }
                onClick={() => onChooseSchool(school)}
              >
                {school.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="form-grid compact-grid">
          <label className="field">
            <span>선생님</span>
            <select
              value={selectedTeacher?.userId ?? ""}
              onChange={(event) => onChooseTeacher(event.target.value)}
              disabled={!remoteConfigured || !selectedSchool || teachersLoading}
            >
              <option value="">
                {teachersLoading ? "불러오는 중..." : "선생님 선택"}
              </option>
              {teachers.map((teacher) => (
                <option key={teacher.userId} value={teacher.userId}>
                  {teacher.teacherName}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>학년</span>
            <select
              value={selection.grade}
              onChange={(event) =>
                onSelectionChange("grade", event.target.value)
              }
              disabled={!remoteConfigured || !selectedTeacher}
            >
              {gradeOptions.map((grade) => (
                <option key={grade.value} value={grade.value}>
                  {grade.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field field-wide">
            <span>단원</span>
            <select
              value={selection.unit}
              onChange={(event) =>
                onSelectionChange("unit", event.target.value)
              }
              disabled={!remoteConfigured || !selectedTeacher || unitsLoading}
            >
              <option value="">
                {unitsLoading ? "단원 확인 중..." : "단원 선택"}
              </option>
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}단원
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="toolbar-row">
          <button
            className="secondary-button"
            onClick={onLoadSet}
            disabled={!remoteConfigured || !selectedTeacher || !selection.unit}
          >
            단어 세트 불러오기
          </button>
        </div>

        {matchingPanelOpen ? (
          <article className="matching-launch-card">
            <div className="section-heading compact">
              <div>
                <p className="mode-label">Word Matching Game</p>
                <h3>게임에 사용할 단원 선택</h3>
              </div>
            </div>
            <p className="question-copy">
              같은 선생님과 학년 안에서 여러 단원을 체크하면, 선택한 모든
              단원의 공개 단어를 모아 짝 맞추기 게임을 시작합니다.
            </p>

            <div className="matching-unit-grid" role="group" aria-label="짝 맞추기 단원 선택">
              {units.map((unit) => {
                const checked = matchingUnits.includes(unit);

                return (
                  <label key={unit} className="matching-unit-option">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleMatchingUnit(unit)}
                    />
                    <span>{unit}단원</span>
                  </label>
                );
              })}
            </div>

            {units.length === 0 ? (
              <p className="inline-hint">
                먼저 선생님과 학년을 고르면 공개된 단원 목록을 확인할 수 있습니다.
              </p>
            ) : null}

            <div className="toolbar-row">
              <button
                className="primary-button"
                onClick={handleStartMatching}
                disabled={!selectedTeacher || matchingUnits.length === 0 || matchingLoading}
              >
                {matchingLoading ? "게임 준비 중..." : "선택한 단원으로 게임 시작"}
              </button>
              <button
                className="ghost-button"
                onClick={() => setMatchingPanelOpen(false)}
              >
                닫기
              </button>
            </div>
          </article>
        ) : null}

        {!remoteConfigured ? (
          <p className="inline-hint warning-hint">
            Firebase 환경 변수가 없어서 학교와 공개 단어세트를 불러올 수 없습니다.
          </p>
        ) : null}
        {error ? <p className="inline-hint warning-hint">{error}</p> : null}
        {status ? <p className="inline-hint success-hint">{status}</p> : null}
        {hasVocabulary ? (
          <p className="inline-hint">
            현재 {currentItemCount}개 단어가 준비되었습니다.
          </p>
        ) : null}

        <div className="stack-actions">
          <button
            className="secondary-button"
            onClick={onOpenListening}
            disabled={!hasVocabulary}
          >
            듣기 퀴즈 열기
          </button>
          <button
            className="secondary-button"
            onClick={onOpenSpeaking}
            disabled={!hasVocabulary}
          >
            말하기 연습 열기
          </button>
          <button
            className="ghost-button"
            onClick={() => setMatchingPanelOpen((current) => !current)}
            disabled={!remoteConfigured || !selectedTeacher || unitsLoading}
          >
            단어 짝 맞추기
          </button>
        </div>

        {!hasVocabulary ? (
          <p className="inline-hint">
            학생 활동을 시작하려면 학교, 선생님, 학년, 단원을 고른 뒤 공개된
            단어 세트를 먼저 불러오세요.
          </p>
        ) : null}
      </article>
    </section>
  );
}
