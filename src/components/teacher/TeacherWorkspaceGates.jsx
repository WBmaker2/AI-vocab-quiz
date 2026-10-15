function GateShell({ eyebrow, title, actions, children }) {
  return (
    <section className="workspace-panel">
      <div className="section-heading">
        <div>
          <p className="mode-label">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function HomeButton({ onBack }) {
  return (
    <button className="ghost-button" onClick={onBack}>
      홈으로
    </button>
  );
}

function SignOutButton({ onSignOut }) {
  return (
    <button className="ghost-button" onClick={onSignOut}>
      로그아웃
    </button>
  );
}

export function RemoteConfigGate({ onBack }) {
  return (
    <GateShell eyebrow="Teacher Mode" title="선생님 모드 설정 필요" actions={<HomeButton onBack={onBack} />}>
      <article className="empty-card">
        <h3>Firebase 환경 변수가 필요합니다</h3>
        <p>
          Google 로그인과 교사별 단어 저장을 사용하려면 Firebase 웹 앱 설정값을
          먼저 입력하세요.
        </p>
      </article>
    </GateShell>
  );
}

export function LoadingGate({ onBack }) {
  return (
    <GateShell eyebrow="Teacher Mode" title="선생님 정보를 확인하는 중입니다" actions={<HomeButton onBack={onBack} />}>
      <article className="empty-card">
        <h3>잠시만 기다리세요</h3>
        <p>로그인 상태와 선생님 프로필을 확인하고 있습니다.</p>
      </article>
    </GateShell>
  );
}

export function SignInGate({ onBack, auth }) {
  return (
    <GateShell eyebrow="Teacher Mode" title="Google 로그인 후 시작" actions={<HomeButton onBack={onBack} />}>
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
    </GateShell>
  );
}

export function ProfileErrorGate({ auth, profileError }) {
  return (
    <GateShell
      eyebrow="Teacher Mode"
      title="선생님 정보를 불러오지 못했습니다"
      actions={<SignOutButton onSignOut={auth.signOut} />}
    >
      <article className="empty-card">
        <h3>프로필 오류</h3>
        <p>{profileError}</p>
      </article>
    </GateShell>
  );
}

export function OnboardingGate({ onBack, auth, onboarding }) {
  return (
    <section className="workspace-panel">
      <div className="section-heading">
        <div>
          <p className="mode-label">Teacher Onboarding</p>
          <h2>선생님 정보 등록</h2>
        </div>
        <div className="toolbar-row">
          <HomeButton onBack={onBack} />
          <SignOutButton onSignOut={auth.signOut} />
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

export function ApprovalPendingGate({ onBack, auth, profile }) {
  return (
    <section className="workspace-panel approval-wait-panel">
      <div className="section-heading">
        <div>
          <p className="mode-label">Teacher Approval</p>
          <h2>선생님 승인 대기</h2>
        </div>
        <div className="toolbar-row">
          <HomeButton onBack={onBack} />
          <SignOutButton onSignOut={auth.signOut} />
        </div>
      </div>

      <article className="approval-wait-card">
        <p className="mode-label">Approval Requested</p>
        <h3>관리자 확인 후 단어 세트를 관리할 수 있습니다</h3>
        <p>
          {profile.schoolName} · {profile.teacherName} 정보로 승인 요청이
          접수되었습니다. 학교 관리자가 승인하면 이 화면에서 관리 기능을 바로
          사용할 수 있습니다.
        </p>
        <p className="inline-hint">
          학교 정보가 잘못되었다면 관리자에게 문의해 주세요.
        </p>
      </article>
    </section>
  );
}
