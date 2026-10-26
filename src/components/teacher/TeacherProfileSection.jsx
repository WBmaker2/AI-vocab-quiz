export function TeacherProfileSection({ expanded, profile, onboarding, onCancelProfileEditor, onSaveProfileEditor, onDeleteTeacherProfile, onDeleteSchoolProfile, onOpenProfileEditor }) {
  const handleOpenProfileEditor = onOpenProfileEditor;
  const handleCancelProfileEditor = onCancelProfileEditor;
  const handleSaveProfileEditor = onSaveProfileEditor;
  const handleDeleteTeacherProfile = onDeleteTeacherProfile;
  const handleDeleteSchoolProfile = onDeleteSchoolProfile;

  if (!expanded) {
    return (
      <article className="teacher-profile-strip">
        <div className="teacher-profile-strip-copy">
          <p className="mode-label">Teacher Profile</p>
          <p className="teacher-profile-strip-meta">
            {profile.schoolName} · {profile.teacherName}
          </p>
        </div>
        <button
          className="ghost-button ghost-button-compact"
          type="button"
          onClick={handleOpenProfileEditor}
        >
          정보 수정
        </button>
      </article>
    );
  }

  return (
    <article className="form-card">
        <div className="section-heading compact">
          <div>
            <p className="mode-label">Teacher Profile</p>
            <h3>학교와 선생님 정보</h3>
          </div>
          <button
            className="ghost-button"
            type="button"
            onClick={handleCancelProfileEditor}
          >
            수정 닫기
          </button>
        </div>

        <p className="inline-hint">
          현재 등록 정보: {profile.schoolName} · {profile.teacherName}
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
      </article>
  );
}
