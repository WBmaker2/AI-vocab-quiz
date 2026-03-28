export function StudentBingoJoin({
  sessionCode = "",
  sessionTitle = "빙고 참여",
  teacherName = "",
  playerName = "",
  joinCode = "",
  statusMessage = "",
  errorMessage = "",
  joining = false,
  onSessionCodeChange,
  onPlayerNameChange,
  onJoin,
  onBack,
}) {
  function handleSubmit(event) {
    event.preventDefault();
    onJoin?.();
  }

  return (
    <section className="workspace-panel bingo-join-shell">
      <div className="section-heading">
        <div>
          <p className="mode-label">Student Bingo</p>
          <h2>{sessionTitle}</h2>
          <p className="bingo-host-copy">
            영어 단어 보드에서 선생님이 부른 단어만 체크할 수 있습니다.
          </p>
        </div>
        {onBack ? (
          <button className="ghost-button" type="button" onClick={onBack}>
            홈으로
          </button>
        ) : null}
      </div>

      <div className="bingo-session-strip">
        <span className="bingo-session-pill">
          세션 코드 <strong>{sessionCode || "-"}</strong>
        </span>
        {teacherName ? (
          <span className="bingo-session-pill">
            선생님 <strong>{teacherName}</strong>
          </span>
        ) : null}
      </div>

      <div className="bingo-join-grid">
        <article className="bingo-card">
          <p className="mode-label">Join Session</p>
          <h3>참여 정보 입력</h3>
          <form className="bingo-join-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>세션 코드</span>
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="예: BINGO42"
                value={joinCode}
                onChange={(event) => onSessionCodeChange?.(event.target.value)}
              />
            </label>
            <label className="field">
              <span>이름</span>
              <input
                type="text"
                autoComplete="name"
                placeholder="학생 이름"
                value={playerName}
                onChange={(event) => onPlayerNameChange?.(event.target.value)}
              />
            </label>
            <div className="toolbar-row">
              <button className="primary-button" type="submit" disabled={joining}>
                {joining ? "참여 중..." : "빙고 참여하기"}
              </button>
            </div>
          </form>
          {statusMessage ? <p className="bingo-host-status">{statusMessage}</p> : null}
          {errorMessage ? <p className="bingo-host-status bingo-host-status-error">{errorMessage}</p> : null}
        </article>

        <article className="bingo-card bingo-join-instructions">
          <p className="mode-label">How it works</p>
          <h3>학생 참여 방법</h3>
          <ol>
            <li>세션 코드를 입력하고 이름으로 들어갑니다.</li>
            <li>보드에 있는 영어 단어만 체크할 수 있습니다.</li>
            <li>선생님이 직접 고른 단어 또는 랜덤으로 뽑은 단어만 체크됩니다.</li>
            <li>3빙고 이후에도 게임은 계속됩니다.</li>
          </ol>
        </article>
      </div>
    </section>
  );
}
