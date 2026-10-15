import { ResultSummary } from "../ResultSummary.jsx";

function ListeningShell({ eyebrow, title, onBack, children }) {
  return (
    <section className="workspace-panel">
      <div className="section-heading">
        <div>
          <p className="mode-label">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <button className="ghost-button" onClick={onBack}>
          홈으로
        </button>
      </div>
      {children}
    </section>
  );
}

export function ListeningEmptyNotice({ onBack }) {
  return (
    <ListeningShell eyebrow="Listening Quiz" title="듣기 퀴즈" onBack={onBack}>
      <article className="empty-card">
        <h3>먼저 단어 세트를 불러오세요</h3>
        <p>
          듣기 퀴즈를 시작하려면 홈 화면에서 학년과 단원을 선택한 뒤 학생용
          단어 세트를 먼저 불러와야 합니다.
        </p>
        <div className="toolbar-row">
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>
      </article>
    </ListeningShell>
  );
}

export function ListeningReviewCompleteScreen({ reviewSummary, onReturnToResult, onBack }) {
  return (
    <ListeningShell eyebrow="Listening Review" title="듣기 오답 복습 완료" onBack={onBack}>
      <ResultSummary
        title="듣기 오답 복습 완료"
        score={reviewSummary?.correctedCount ?? 0}
        total={reviewSummary?.total ?? 0}
        summaryCopy={`틀린 문제 ${reviewSummary?.total ?? 0}개 중 ${reviewSummary?.correctedCount ?? 0}개를 바로 고쳤어요.`}
        extraContent={
          <article className="session-review-summary-card">
            <p className="mode-label">Session Review</p>
            <h4>헷갈렸던 뜻을 다시 확인했어요</h4>
            <div className="session-review-progress">
              <span>복습 문제</span>
              <strong>{reviewSummary?.total ?? 0}개</strong>
            </div>
            <div className="session-review-progress">
              <span>다시 맞힌 문제</span>
              <strong>{reviewSummary?.correctedCount ?? 0}개</strong>
            </div>
          </article>
        }
        footerContent={
          <div className="toolbar-row">
            <button className="primary-button" onClick={onReturnToResult}>
              원래 결과 다시 보기
            </button>
            <button className="ghost-button" onClick={onBack}>
              홈으로
            </button>
          </div>
        }
        onRetry={onReturnToResult}
        onBack={onBack}
      />
    </ListeningShell>
  );
}

export function ListeningCompleteScreen({ score, totalQuestions, progressionContent, onRetry, onBack }) {
  return (
    <ListeningShell eyebrow="Listening Quiz" title="듣기 퀴즈 완료" onBack={onBack}>
      <ResultSummary
        title="듣고 뜻 고르기 완료"
        score={score}
        total={totalQuestions}
        extraContent={progressionContent}
        onRetry={onRetry}
        onBack={onBack}
      />
    </ListeningShell>
  );
}

export function buildListeningReviewCard({
  reviewSummary,
  availableReviewItems,
  onStartReview,
  onBack,
}) {
  if (reviewSummary) {
    return (
      <article className="session-review-summary-card">
        <p className="mode-label">Session Review</p>
        <h4>오답 복습을 마쳤어요</h4>
        <p className="result-copy">
          틀린 문제 {reviewSummary.total}개 중 {reviewSummary.correctedCount}개를 바로 고쳤어요.
        </p>
      </article>
    );
  }

  if (availableReviewItems.length > 0) {
    return (
      <article className="session-review-card">
        <p className="mode-label">Session Review</p>
        <h4>방금 틀린 문제만 다시 연습할까요?</h4>
        <p className="result-copy">
          {availableReviewItems.length}문제를 바로 다시 풀 수 있어요.
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
    );
  }

  return null;
}
