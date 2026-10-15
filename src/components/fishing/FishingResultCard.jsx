import { GameLeaderboardPanel } from "../GameLeaderboardPanel.jsx";
import { formatElapsedSeconds } from "../../utils/quiz.js";

export function FishingResultCard({
  score,
  correctCount,
  wrongCount,
  missCount,
  averageReaction,
  elapsedSeconds,
  leaderboardContext,
  remoteConfigured,
  studentNameDraft,
  onStudentNameDraftChange,
  onRetry,
  onBack,
}) {
  return (
    <section className="workspace-panel word-fishing-shell">
      <div className="section-heading">
        <div>
          <p className="mode-label">Word Fishing Result</p>
          <h2>단어 낚시 완료</h2>
        </div>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>

      <article className="result-card word-fishing-result-card">
        <p className="mode-label">Fishing Summary</p>
        <h3>떠다니는 뜻 카드 낚시를 마쳤어요</h3>
        <p className="result-score">{score}점</p>
        <p className="result-copy">
          반응 속도와 정확도를 합쳐 최종 점수를 계산했습니다.
        </p>

        <div className="word-fishing-summary-grid">
          <article className="word-fishing-summary-card">
            <span>정답</span>
            <strong>{correctCount}개</strong>
          </article>
          <article className="word-fishing-summary-card">
            <span>오답</span>
            <strong>{wrongCount}개</strong>
          </article>
          <article className="word-fishing-summary-card">
            <span>놓침</span>
            <strong>{missCount}개</strong>
          </article>
          <article className="word-fishing-summary-card">
            <span>평균 반응 시간</span>
            <strong>{averageReaction}</strong>
          </article>
          <article className="word-fishing-summary-card">
            <span>걸린 시간</span>
            <strong>{formatElapsedSeconds(elapsedSeconds)}</strong>
          </article>
        </div>

        <GameLeaderboardPanel
          activityType="fishing"
          finalScore={score}
          elapsedSeconds={elapsedSeconds}
          leaderboardContext={leaderboardContext}
          remoteConfigured={remoteConfigured}
          studentNameDraft={studentNameDraft}
          onStudentNameDraftChange={onStudentNameDraftChange}
          metrics={{
            correctCount,
            wrongCount,
            missCount,
          }}
        />

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
