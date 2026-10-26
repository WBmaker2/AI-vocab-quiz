import { useEffect, useState } from "react";
import { saveMatchingLeaderboardScore, saveStudentProgress } from "../../lib/firebase.js";
import { GameLeaderboardPanel } from "../GameLeaderboardPanel.jsx";
import { StudentProgressPanel } from "../StudentProgressPanel.jsx";
import { formatAppError } from "../../utils/appError.js";
import { formatElapsedSeconds } from "../../utils/quiz.js";
import { createCombinedStudentResultStatus, saveCombinedStudentResult } from "../../utils/studentResultSave.js";


export function MatchingSummary({
  solvedPairs,
  elapsedSeconds,
  finalScore,
  leaderboardContext,
  progressionContext,
  remoteConfigured,
  studentNameDraft,
  onStudentNameDraftChange,
  onRetry,
  onChooseUnits,
  onBack,
}) {
  const [progressionLoading, setProgressionLoading] = useState(false);
  const [progressionStatus, setProgressionStatus] = useState("");
  const [progressionError, setProgressionError] = useState("");
  const [progressionComparison, setProgressionComparison] = useState(null);
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState([]);
  const [progressionStudentName, setProgressionStudentName] = useState("");
  const [leaderboardRefreshVersion, setLeaderboardRefreshVersion] = useState(0);
  const progressionSchoolId = String(progressionContext?.schoolId ?? "").trim();
  const progressionSchoolName = String(progressionContext?.schoolName ?? "").trim();
  const progressionGrade = String(progressionContext?.grade ?? "").trim();
  const leaderboardSchoolId = String(leaderboardContext?.schoolId ?? "").trim();
  const leaderboardSchoolName = String(leaderboardContext?.schoolName ?? "").trim();
  const leaderboardGrade = String(leaderboardContext?.grade ?? "").trim();
  const canSaveRecords =
    remoteConfigured &&
    progressionSchoolId &&
    progressionSchoolName &&
    progressionGrade &&
    leaderboardSchoolId &&
    leaderboardSchoolName &&
    leaderboardGrade;

  useEffect(() => {
    setProgressionLoading(false);
    setProgressionStatus("");
    setProgressionError("");
    setProgressionComparison(null);
    setNewlyEarnedBadges([]);
    setProgressionStudentName("");
  }, [finalScore, solvedPairs, elapsedSeconds, progressionSchoolId, progressionGrade]);

  useEffect(() => {
    const cleanDraft = String(studentNameDraft ?? "").trim().replace(/\s+/g, " ");
    const cleanSaved = String(progressionStudentName ?? "")
      .trim()
      .replace(/\s+/g, " ");

    if (cleanSaved && cleanDraft && cleanSaved === cleanDraft) {
      return;
    }

    if (!cleanDraft || (cleanSaved && cleanSaved !== cleanDraft)) {
      setProgressionStatus("");
      setProgressionError("");
      setProgressionComparison(null);
      setNewlyEarnedBadges([]);
      if (cleanSaved && cleanSaved !== cleanDraft) {
        setProgressionStudentName("");
      }
    }
  }, [progressionStudentName, studentNameDraft]);

  async function handleSaveRecords() {
    if (!canSaveRecords) {
      setProgressionError("학교와 학년 정보를 확인한 뒤 다시 시도해 주세요.");
      return;
    }

    setProgressionLoading(true);
    setProgressionError("");
    setProgressionStatus("");

    try {
      const saved = await saveCombinedStudentResult({
        studentName: studentNameDraft,
        saveLeaderboard: (cleanStudentName) =>
          saveMatchingLeaderboardScore({
            schoolId: leaderboardSchoolId,
            schoolName: leaderboardSchoolName,
            grade: leaderboardGrade,
            studentName: cleanStudentName,
            score: finalScore,
            elapsedSeconds,
            solvedPairs,
          }),
        saveProgress: (cleanStudentName) =>
          saveStudentProgress({
            schoolId: progressionSchoolId,
            schoolName: progressionSchoolName,
            grade: progressionGrade,
            studentName: cleanStudentName,
            activityType: "matching",
            result: {
              score: finalScore,
              elapsedSeconds,
              solvedPairs,
            },
          }),
      });

      onStudentNameDraftChange?.(saved.studentName);
      setLeaderboardRefreshVersion((current) => current + 1);

      if (saved.progress) {
        setProgressionStudentName(saved.studentName);
        setProgressionComparison(saved.progress.comparison);
        setNewlyEarnedBadges(saved.progress.newlyEarnedBadges ?? []);
      }

      setProgressionStatus(
        createCombinedStudentResultStatus({
          activityLabel: "짝 맞추기",
          studentName: saved.studentName,
          leaderboard: saved.leaderboard,
          progressSaved: Boolean(saved.progress),
        }),
      );
    } catch (error) {
      setProgressionError(
        formatAppError(error, "기록을 저장하지 못했습니다."),
      );
    } finally {
      setProgressionLoading(false);
    }
  }

  const progressionDisabledReason = !remoteConfigured
    ? "Firebase 연결이 없어 이 기기에서는 기록을 저장할 수 없습니다."
    : !canSaveRecords
      ? "학교와 학년을 먼저 선택하면 개인 최고 기록과 리더보드를 함께 저장할 수 있어요."
      : !String(studentNameDraft ?? "").trim()
        ? "학생 이름을 입력하면 개인 최고 기록과 리더보드를 함께 저장할 수 있어요."
        : "";
  const hasSavedProgress = Boolean(progressionStudentName);

  return (
    <article className="result-card">
      <p className="mode-label">Matching Result</p>
      <h3>단어 짝 맞추기 완료</h3>
      <p className="result-score">{finalScore}점</p>
      <div className="matching-result-grid">
        <div className="summary-card">
          <span>맞춘 문제 수</span>
          <strong>{solvedPairs}개</strong>
        </div>
        <div className="summary-card">
          <span>걸린 시간</span>
          <strong>{formatElapsedSeconds(elapsedSeconds)}</strong>
        </div>
      </div>
      <p className="result-copy">
        맞춘 문제 수와 걸린 시간을 반영해 최종 점수를 계산했습니다.
      </p>
      <section className="result-progression-block">
        <div className="matching-leaderboard-head">
          <div>
            <p className="mode-label">Student Progress</p>
            <h4>개인 최고 기록과 리더보드 점수를 함께 저장할까요?</h4>
          </div>
        </div>

        <div className="matching-save-form">
          <label className="matching-save-field">
            <span>학생 이름</span>
            <input
              type="text"
              value={studentNameDraft}
              maxLength={20}
              placeholder="이름을 입력하세요"
              onChange={(event) => onStudentNameDraftChange?.(event.target.value)}
              disabled={progressionLoading || hasSavedProgress}
            />
          </label>
          <div className="matching-leaderboard-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => void handleSaveRecords()}
              disabled={
                progressionLoading ||
                hasSavedProgress ||
                !String(studentNameDraft ?? "").trim()
              }
            >
              {progressionLoading
                ? "저장 중..."
                : hasSavedProgress
                  ? "저장 완료"
                  : "기록 저장"}
            </button>
          </div>
        </div>

        {progressionStatus ? (
          <p className="matching-leaderboard-status">{progressionStatus}</p>
        ) : null}
        {progressionError ? (
          <p className="matching-leaderboard-error">{progressionError}</p>
        ) : null}

        <StudentProgressPanel
          comparison={progressionComparison}
          newlyEarnedBadges={newlyEarnedBadges}
          disabledReason={!progressionComparison ? progressionDisabledReason : ""}
          loading={progressionLoading}
          title="짝 맞추기 성장 기록"
        />
      </section>

      <GameLeaderboardPanel
        activityType="matching"
        finalScore={finalScore}
        elapsedSeconds={elapsedSeconds}
        leaderboardContext={leaderboardContext}
        remoteConfigured={remoteConfigured}
        studentNameDraft={studentNameDraft}
        onStudentNameDraftChange={onStudentNameDraftChange}
        allowSaving={false}
        refreshVersion={leaderboardRefreshVersion}
        metrics={{ solvedPairs }}
      />

      <div className="toolbar-row">
        <button className="primary-button" onClick={onRetry}>
          다시 하기
        </button>
        <button className="secondary-button" onClick={onChooseUnits}>
          게임 단원 선택
        </button>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>
    </article>
  );
}
