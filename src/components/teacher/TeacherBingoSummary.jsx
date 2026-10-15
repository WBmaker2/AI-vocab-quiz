export function TeacherBingoSummary({ bingoSummary, totalStudents, normalizedStudents, changedStudentIdSet }) {
  return (
    <section className="bingo-summary-card bingo-inline-summary">
          <div className="bingo-card-head">
            <div>
              <p className="mode-label">Student Status</p>
              <h3>빙고 현황</h3>
            </div>
            <span className="bingo-status-chip">{totalStudents}명</span>
          </div>

          <div className="bingo-summary-grid">
            <div className="summary-card bingo-mini-summary">
              <span>0빙고</span>
              <strong>{bingoSummary["0"]}</strong>
            </div>
            <div className="summary-card bingo-mini-summary">
              <span>1빙고</span>
              <strong>{bingoSummary["1"]}</strong>
            </div>
            <div className="summary-card bingo-mini-summary">
              <span>2빙고</span>
              <strong>{bingoSummary["2"]}</strong>
            </div>
            <div className="summary-card bingo-mini-summary">
              <span>3+빙고</span>
              <strong>{bingoSummary["3+"]}</strong>
            </div>
          </div>

          <div className="bingo-callout">
            <strong>진행 규칙</strong>
            <p>
              3빙고가 나와도 세션은 계속됩니다. 선생님이 종료할 때까지 학생들은
              계속 체크할 수 있어요.
            </p>
          </div>

          <ul className="bingo-student-list" aria-label="학생 상태 목록">
            {normalizedStudents.length > 0 ? (
              normalizedStudents.map((student) => (
                <li
                  key={student.id}
                  className={
                    changedStudentIdSet.has(student.id)
                      ? "bingo-student-row bingo-student-row-updated"
                      : "bingo-student-row"
                  }
                >
                  {changedStudentIdSet.has(student.id) ? (
                    <span className="bingo-student-new-badge">NEW</span>
                  ) : null}
                  <div className="bingo-student-meta">
                    <strong>{student.name}</strong>
                    {student.status ? <span>{student.status}</span> : <span>대기 중</span>}
                  </div>
                  <div className="bingo-student-badges">
                    <span className="bingo-student-bingo">
                      {student.bingoCount}빙고
                    </span>
                    <span
                      className={
                        student.connected
                          ? "bingo-presence bingo-presence-on"
                          : "bingo-presence"
                      }
                    >
                      {student.connected ? "접속" : "오프라인"}
                    </span>
                  </div>
                </li>
              ))
            ) : (
              <li className="bingo-empty-state">아직 참여한 학생이 없습니다.</li>
            )}
          </ul>
    </section>
  );
}
