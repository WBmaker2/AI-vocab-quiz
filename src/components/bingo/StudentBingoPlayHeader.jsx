export function StudentBingoPlayHeader({ boardTitle, onBack, sessionCode, playerName, boardStateLabel, roundLabel, setupCompletedAt }) {
  return (
    <>
      <div className="section-heading bingo-board-heading">
        <div>
          <p className="mode-label">Student Board</p>
          <h2>{boardTitle}</h2>
          <p className="bingo-host-copy">
            영어 단어 보드에서 현재 부른 단어만 체크하세요.
          </p>
        </div>
        {onBack ? (
          <button className="ghost-button" type="button" onClick={onBack}>
            나가기
          </button>
        ) : null}
      </div>

      <div className="bingo-session-strip">
        <span className="bingo-session-pill">
          세션 코드 <strong>{sessionCode || "-"}</strong>
        </span>
        {playerName ? (
          <span className="bingo-session-pill">
            학생 <strong>{playerName}</strong>
          </span>
        ) : null}
        <span className="bingo-session-pill bingo-session-pill-accent">
          상태 <strong>{boardStateLabel}</strong>
        </span>
        {roundLabel ? (
          <span className="bingo-session-pill">
            라운드 <strong>{roundLabel}</strong>
          </span>
        ) : null}
        <span className="bingo-session-pill">
          완료 <strong>{setupCompletedAt ? "YES" : "NO"}</strong>
        </span>
      </div>
    </>
  );
}
