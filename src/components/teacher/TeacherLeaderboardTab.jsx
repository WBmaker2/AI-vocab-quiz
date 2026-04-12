import { LEADERBOARD_PERIOD_DEFINITIONS } from "../../utils/leaderboard.js";
import {
  formatTeacherLeaderboardEntryDetail,
  getTeacherActivityLeaderboardDefinition,
  TEACHER_ACTIVITY_LEADERBOARD_DEFINITIONS,
} from "./teacherLeaderboardView.js";

export function TeacherLeaderboardTab({ profile, leaderboard }) {
  const activeLeaderboardDefinition = getTeacherActivityLeaderboardDefinition(
    leaderboard?.activityType,
  );
  const activeLeaderboard = leaderboard?.boards?.[leaderboard?.tab] ?? null;
  const activeLeaderboardEntries = activeLeaderboard?.entries ?? [];

  function handleStartLeaderboardEdit(studentName) {
    leaderboard?.startEdit?.(studentName);
  }

  function handleCancelLeaderboardEdit() {
    leaderboard?.cancelEdit?.();
  }

  async function handleRenameLeaderboardStudent() {
    if (!leaderboard?.editingName || !leaderboard?.draftName) {
      return;
    }

    const saved = await leaderboard.renameStudent(
      leaderboard.editingName,
      leaderboard.draftName,
    );

    if (saved) {
      handleCancelLeaderboardEdit();
    }
  }

  async function handleDeleteLeaderboardStudent(studentName) {
    const saved = await leaderboard.deleteStudent(studentName);
    if (saved && leaderboard.editingName === studentName) {
      handleCancelLeaderboardEdit();
    }
  }

  return (
    <article className="form-card teacher-leaderboard-card">
      <div className="section-heading compact">
        <div>
          <p className="mode-label">Leaderboard Admin</p>
          <h3>리더보드 관리</h3>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={leaderboard?.refresh}
          disabled={leaderboard?.loading}
        >
          {leaderboard?.loading ? "불러오는 중..." : "새로고침"}
        </button>
      </div>

      <p className="inline-hint">
        현재 학교의 같은 학년 기준으로 {activeLeaderboardDefinition.label} 리더보드를
        관리하고, 우리학교 전체 순위 탭까지 함께 확인할 수 있습니다.
      </p>

      {!profile?.schoolId ? (
        <p className="inline-hint warning-hint">
          학교 정보가 없어 리더보드 관리 기능을 사용할 수 없습니다. 먼저 학교와
          선생님 정보를 확인해 주세요.
        </p>
      ) : (
        <>
          {leaderboard?.error ? (
            <p className="inline-hint warning-hint">{leaderboard.error}</p>
          ) : null}

          {leaderboard?.status ? (
            <p className="inline-hint success-hint">{leaderboard.status}</p>
          ) : null}

          <div
            className="matching-leaderboard-tabs"
            role="tablist"
            aria-label="교사 리더보드 활동"
          >
            {TEACHER_ACTIVITY_LEADERBOARD_DEFINITIONS.map(({ type, label }) => (
              <button
                key={type}
                type="button"
                className={
                  leaderboard?.activityType === type
                    ? "matching-leaderboard-tab matching-leaderboard-tab-active"
                    : "matching-leaderboard-tab"
                }
                onClick={() => leaderboard?.setActivityType?.(type)}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            className="matching-leaderboard-tabs"
            role="tablist"
            aria-label="교사 리더보드 기간"
          >
            {LEADERBOARD_PERIOD_DEFINITIONS.map(({ type, label }) => (
              <button
                key={type}
                type="button"
                className={
                  leaderboard?.tab === type
                    ? "matching-leaderboard-tab matching-leaderboard-tab-active"
                    : "matching-leaderboard-tab"
                }
                onClick={() => leaderboard?.setTab?.(type)}
              >
                {label}
              </button>
            ))}
          </div>

          {leaderboard?.loading ? (
            <p className="inline-hint">리더보드를 불러오는 중입니다...</p>
          ) : activeLeaderboardEntries.length > 0 ? (
            <ol className="teacher-leaderboard-list">
              {activeLeaderboardEntries.map((entry) => (
                <li key={entry.id} className="teacher-leaderboard-item">
                  <div className="teacher-leaderboard-meta">
                    <strong>{entry.rank}위</strong>
                    <span>{entry.studentName}</span>
                    <small>
                      {entry.score}점 ·{" "}
                      {formatTeacherLeaderboardEntryDetail(
                        entry,
                        leaderboard?.activityType,
                        leaderboard?.tab,
                      )}
                    </small>
                  </div>

                  <div className="teacher-leaderboard-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleStartLeaderboardEdit(entry.studentName)}
                      disabled={leaderboard?.saving}
                    >
                      이름 수정
                    </button>
                    <button
                      type="button"
                      className="ghost-button danger-button"
                      onClick={() => handleDeleteLeaderboardStudent(entry.studentName)}
                      disabled={leaderboard?.saving}
                    >
                      기록 삭제
                    </button>
                  </div>

                  {leaderboard?.editingName === entry.studentName ? (
                    <div className="teacher-leaderboard-edit-row">
                      <input
                        value={leaderboard?.draftName ?? ""}
                        onChange={(event) =>
                          leaderboard?.setDraftName?.(event.target.value)
                        }
                        placeholder="새 학생 이름"
                      />
                      <button
                        type="button"
                        className="primary-button"
                        onClick={handleRenameLeaderboardStudent}
                        disabled={leaderboard?.saving}
                      >
                        {leaderboard?.saving ? "저장 중..." : "수정 저장"}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={handleCancelLeaderboardEdit}
                        disabled={leaderboard?.saving}
                      >
                        취소
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="inline-hint">아직 관리할 리더보드 기록이 없습니다.</p>
          )}
        </>
      )}
    </article>
  );
}
