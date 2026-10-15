import { useState } from "react";
import { useTeacherWeakWords } from "../../hooks/teacher/useTeacherWeakWords.js";

export function TeacherWeakWordsPanel({ schoolId, gradeOptions = [] }) {
  const [grade, setGrade] = useState("");
  const [activityType, setActivityType] = useState("");
  const { reports, ranking, loading, error, status, refresh, clearAll } = useTeacherWeakWords({
    schoolId,
    grade,
    activityType,
    enabled: Boolean(schoolId),
  });

  if (!schoolId) {
    return null;
  }

  return (
    <article className="form-card">
      <div className="section-heading compact">
        <div>
          <p className="mode-label">Weak Words</p>
          <h3>자주 틀린 단어</h3>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={refresh}
          disabled={loading}
        >
          {loading ? "불러오는 중..." : "새로고침"}
        </button>
      </div>

      <p className="inline-hint">
        학생이 듣기·말하기·타자에서 틀린 단어가 모입니다. 다음 수업 단어 선정에
        참고하세요. (최근 {reports.length}건 집계)
      </p>

      <div className="toolbar-row">
        <label className="field">
          <span>학년</span>
          <select value={grade} onChange={(event) => setGrade(event.target.value)}>
            <option value="">전체</option>
            {gradeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>활동</span>
          <select value={activityType} onChange={(event) => setActivityType(event.target.value)}>
            <option value="">전체</option>
            <option value="listening">듣기</option>
            <option value="speaking">말하기</option>
            <option value="typing">타자</option>
          </select>
        </label>
        <button
          type="button"
          className="ghost-button danger-button"
          onClick={() => void clearAll()}
          disabled={loading || reports.length === 0}
        >
          기록 비우기
        </button>
      </div>

      {error ? <p className="inline-hint warning-hint">{error}</p> : null}
      {status ? <p className="inline-hint success-hint">{status}</p> : null}

      {ranking.length === 0 && !loading ? (
        <p className="inline-hint">아직 모인 기록이 없습니다. 학생이 활동을 마치면 틀린 단어가 쌓입니다.</p>
      ) : null}

      {ranking.length > 0 ? (
        <ul className="bingo-student-list" aria-label="자주 틀린 단어 목록">
          {ranking.map((entry, index) => (
            <li key={`${entry.word}-${index}`} className="bingo-student-row">
              <div className="bingo-student-meta">
                <strong>{index + 1}위 {entry.word}</strong>
                {entry.meaning ? <span>{entry.meaning}</span> : null}
              </div>
              <div className="bingo-student-badges">
                <span className="bingo-student-bingo">{entry.count}회</span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
