import { ResultSummary } from "../ResultSummary.jsx";

function SpeakingShell({ eyebrow, title, onBack, children }) {
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

export function SpeakingEmptyNotice({ onBack }) {
  return (
    <SpeakingShell eyebrow="Speaking Quiz" title="말하기 연습" onBack={onBack}>
      <article className="empty-card">
        <h3>먼저 단어 세트를 불러오세요</h3>
        <p>
          말하기 연습을 시작하려면 홈 화면에서 학년과 단원을 선택한 뒤
          학생용 단어 세트를 먼저 불러와야 합니다.
        </p>
        <div className="toolbar-row">
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>
      </article>
    </SpeakingShell>
  );
}

export function SpeakingUnsupportedNotice({ onBack }) {
  return (
    <SpeakingShell eyebrow="Speaking Quiz" title="말하기 연습" onBack={onBack}>
      <article className="empty-card">
        <h3>브라우저 지원이 필요합니다</h3>
        <p>
          현재 브라우저에서는 말하기 평가를 사용할 수 없습니다. Chrome 또는
          Edge에서 다시 열면 마이크 기반 STT 평가가 동작합니다.
        </p>
        <div className="toolbar-row">
          <button className="ghost-button" onClick={onBack}>
            홈으로
          </button>
        </div>
      </article>
    </SpeakingShell>
  );
}

export function SpeakingReviewCompleteScreen({ reviewSummary, onReturnToResult, onBack }) {
  return (
    <SpeakingShell eyebrow="Speaking Review" title="말하기 오답 복습 완료" onBack={onBack}>
      <ResultSummary
        title="말하기 오답 복습 완료"
        score={reviewSummary?.correctedCount ?? 0}
        total={reviewSummary?.total ?? 0}
        summaryCopy={`틀린 문제 ${reviewSummary?.total ?? 0}개 중 ${reviewSummary?.correctedCount ?? 0}개를 바로 다시 말했어요.`}
        extraContent={
          <article className="session-review-summary-card">
            <p className="mode-label">Session Review</p>
            <h4>헷갈렸던 발음을 바로 복습했어요</h4>
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
    </SpeakingShell>
  );
}

export function SpeakingCompleteScreen({ score, totalQuestions, progressionContent, onRetry, onBack }) {
  return (
    <SpeakingShell eyebrow="Speaking Quiz" title="말하기 연습 완료" onBack={onBack}>
      <ResultSummary
        title="보고 말하기 완료"
        score={score}
        total={totalQuestions}
        extraContent={progressionContent}
        onRetry={onRetry}
        onBack={onBack}
      />
    </SpeakingShell>
  );
}

export function buildSpeakingReviewCard({
  reviewSummary,
  hasReviewAvailable,
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
          틀린 문제 {reviewSummary.total}개 중 {reviewSummary.correctedCount}개를 바로 다시 말했어요.
        </p>
      </article>
    );
  }

  if (hasReviewAvailable) {
    return (
      <article className="session-review-card">
        <p className="mode-label">Session Review</p>
        <h4>헷갈렸던 말하기 단어를 다시 연습할까요?</h4>
        <p className="result-copy">
          방금 틀린 {availableReviewItems.length}문제를 바로 다시 말해볼 수 있어요.
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
