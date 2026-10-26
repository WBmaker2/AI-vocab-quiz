import { useEffect, useState } from "react";
import { saveStudentProgress, saveTypingLeaderboardScore } from "../../lib/firebase.js";
import { GameLeaderboardPanel } from "../GameLeaderboardPanel.jsx";
import { StudentProgressPanel } from "../StudentProgressPanel.jsx";
import { createCombinedStudentResultStatus, saveCombinedStudentResult } from "../../utils/studentResultSave.js";
import { formatElapsedSeconds } from "../../utils/quiz.js";
import { formatAverageSeconds } from "../../utils/wordTyping.js";



export function TypingResultCard({
  score,
  correctCount,
  failedCount,
  questionCount,
  elapsedSeconds,
  hintUsedCount,
  averageSeconds,
  bestCombo,
  accuracy,
  leaderboardContext,
  progressionContext,
  remoteConfigured,
  studentNameDraft,
  onStudentNameDraftChange,
  hasReviewAvailable,
  reviewCount,
  reviewSummary,
  onStartReview,
  onRetry,
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
  }, [
    score,
    correctCount,
    failedCount,
    questionCount,
    elapsedSeconds,
    hintUsedCount,
    bestCombo,
    accuracy,
    progressionSchoolId,
    progressionSchoolName,
    progressionGrade,
    remoteConfigured,
  ]);

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
          saveTypingLeaderboardScore({
            schoolId: leaderboardSchoolId,
            schoolName: leaderboardSchoolName,
            grade: leaderboardGrade,
            studentName: cleanStudentName,
            score,
            elapsedSeconds,
            questionCount,
            correctCount,
            accuracy,
            hintUsedCount,
            bestCombo,
          }),
        saveProgress: (cleanStudentName) =>
          saveStudentProgress({
            schoolId: progressionSchoolId,
            schoolName: progressionSchoolName,
            grade: progressionGrade,
            studentName: cleanStudentName,
            activityType: "typing",
            result: {
              score,
              elapsedSeconds,
              correctCount,
              questionCount,
              accuracy,
              hintUsedCount,
              bestCombo,
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
          activityLabel: "영어 타자",
          studentName: saved.studentName,
          leaderboard: saved.leaderboard,
          progressSaved: Boolean(saved.progress),
        }),
      );
    } catch (error) {
      setProgressionError(error?.message || "기록을 저장하지 못했습니다.");
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
    <section className="workspace-panel word-typing-shell">
      <div className="section-heading">
        <div>
          <p className="mode-label">Word Typing Result</p>
          <h2>영어 단어 타자 게임 완료</h2>
        </div>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <article className="result-card word-typing-result-card">
        <p className="mode-label">Typing Summary</p>
        <h3>단원 핵심 단어를 직접 써 보며 연습을 마쳤어요</h3>
        <p className="result-score">{score}점</p>
        <p className="result-copy">
          뜻과 발음을 단서로 단어를 떠올려 직접 입력한 결과입니다.
        </p>

        <div className="word-typing-summary-grid">
          <article className="word-typing-summary-card">
            <span>정답</span>
            <strong>{correctCount}개</strong>
          </article>
          <article className="word-typing-summary-card">
            <span>문항 수</span>
            <strong>{questionCount}개</strong>
          </article>
          <article className="word-typing-summary-card">
            <span>정확도</span>
            <strong>{formatTypingAccuracy(accuracy)}</strong>
          </article>
          <article className="word-typing-summary-card">
            <span>걸린 시간</span>
            <strong>{formatElapsedSeconds(elapsedSeconds)}</strong>
          </article>
          <article className="word-typing-summary-card">
            <span>힌트 사용</span>
            <strong>{hintUsedCount}회</strong>
          </article>
          <article className="word-typing-summary-card">
            <span>최고 콤보</span>
            <strong>{bestCombo}콤보</strong>
          </article>
        </div>

        <p className="result-copy">
          {failedCount > 0
            ? `틀린 문제는 ${failedCount}개였습니다. 정확도와 콤보를 함께 올리는 방향으로 연습해 보세요.`
            : "모든 문제를 한 번 이상 맞혔습니다. 다음에는 더 빠르게 써 보는 연습을 해 보세요."}
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
            title="영어 타자 성장 기록"
          />
        </section>

        {reviewSummary ? (
          <article className="session-review-summary-card">
            <p className="mode-label">Session Review</p>
            <h4>오답 복습을 마쳤어요</h4>
            <p className="result-copy">
              틀린 단어 {reviewSummary.total}개 중 {reviewSummary.correctedCount}개를 바로 다시 썼어요.
            </p>
          </article>
        ) : hasReviewAvailable ? (
          <article className="session-review-card">
            <p className="mode-label">Session Review</p>
            <h4>방금 틀린 단어만 다시 써볼까요?</h4>
            <p className="result-copy">
              {reviewCount}개 단어를 바로 다시 쓰며 복습할 수 있어요.
            </p>
            <div className="toolbar-row">
              <button className="primary-button" onClick={onStartReview}>
                오답 복습 시작
              </button>
              <button className="ghost-button" onClick={onBack}>
                이번에는 건너뛰기
              </button>
            </div>
          </article>
        ) : null}

        <GameLeaderboardPanel
          activityType="typing"
          finalScore={score}
          elapsedSeconds={elapsedSeconds}
          leaderboardContext={leaderboardContext}
          remoteConfigured={remoteConfigured}
          studentNameDraft={studentNameDraft}
          onStudentNameDraftChange={onStudentNameDraftChange}
          allowSaving={false}
          refreshVersion={leaderboardRefreshVersion}
          metrics={{
            correctCount,
            questionCount,
            accuracy,
            hintUsedCount,
            bestCombo,
          }}
        />

        <article className="hint-card word-typing-tip-card">
          <p className="mode-label">Typing Tip</p>
          <h3>진행 팁</h3>
          <p className="question-copy">
            뜻을 먼저 보고, 발음을 들은 뒤 또박또박 철자를 떠올려 입력해 보세요.
            틀렸을 때는 발음을 다시 듣고 힌트를 참고하면 좋습니다.
          </p>
          <div className="progression-metrics">
            <div className="progression-metric">
              <span>완료한 문제</span>
              <strong>{questionCount}개</strong>
            </div>
            <div className="progression-metric">
              <span>평균 입력 시간</span>
              <strong>{formatAverageSeconds(averageSeconds)}</strong>
            </div>
          </div>
        </article>

        <div className="toolbar-row">
          <button className="primary-button" onClick={onRetry}>
            다시 하기
          </button>
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>
      </article>
    </section>
  );

}

function formatTypingAccuracy(value) {
  const numericValue = Number(value ?? 0);

  return Number.isInteger(numericValue)
    ? `${numericValue}%`
    : `${numericValue.toFixed(1)}%`;
}
