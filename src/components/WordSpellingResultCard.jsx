import { GameLeaderboardPanel } from "./GameLeaderboardPanel.jsx";
import { formatElapsedSeconds } from "../utils/quiz.js";
import { calculateSpellingAccuracy } from "../utils/wordSpelling.js";

export function WordSpellingResultCard({
  score,
  correctCount,
  questionCount,
  revealedCount,
  hintUsedCount,
  totalAttempts,
  elapsedSeconds,
  leaderboardContext,
  remoteConfigured,
  studentNameDraft,
  onStudentNameDraftChange,
  onRetry,
  onBack,
}) {
  const accuracy = calculateSpellingAccuracy(correctCount, questionCount);

  return (
    <section className="workspace-panel word-spelling-shell">
      <div className="section-heading">
        <div>
          <p className="mode-label">Spelling Completion Result</p>
          <h2>철자 완성 게임 완료</h2>
        </div>
        <button className="ghost-button" type="button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <article className="result-card word-spelling-result-card">
        <p className="mode-label">Spelling Summary</p>
        <h3>가려진 철자 단서를 보고 단어 쓰기를 마쳤어요</h3>
        <p className="result-score">{score}점</p>

        <div className="word-spelling-summary-grid">
          <article className="word-spelling-summary-card">
            <span>정답 문제</span>
            <strong>{correctCount} / {questionCount}</strong>
          </article>
          <article className="word-spelling-summary-card">
            <span>정확도</span>
            <strong>{accuracy}%</strong>
          </article>
          <article className="word-spelling-summary-card">
            <span>정답 공개</span>
            <strong>{revealedCount}회</strong>
          </article>
          <article className="word-spelling-summary-card">
            <span>도움으로 맞힌 문제</span>
            <strong>{hintUsedCount}개</strong>
          </article>
          <article className="word-spelling-summary-card">
            <span>총 시도 횟수</span>
            <strong>{totalAttempts}회</strong>
          </article>
          <article className="word-spelling-summary-card">
            <span>걸린 시간</span>
            <strong>{formatElapsedSeconds(elapsedSeconds)}</strong>
          </article>
        </div>

        <GameLeaderboardPanel
          activityType="spelling"
          finalScore={score}
          elapsedSeconds={elapsedSeconds}
          leaderboardContext={leaderboardContext}
          remoteConfigured={remoteConfigured}
          studentNameDraft={studentNameDraft}
          onStudentNameDraftChange={onStudentNameDraftChange}
          metrics={{
            correctCount,
            questionCount,
            accuracy,
            revealedCount,
            hintUsedCount,
            totalAttempts,
          }}
        />

        <div className="toolbar-row">
          <button className="primary-button" type="button" onClick={onRetry}>
            다시 하기
          </button>
          <button className="ghost-button" type="button" onClick={onBack}>
            홈으로
          </button>
        </div>
      </article>
    </section>
  );
}
