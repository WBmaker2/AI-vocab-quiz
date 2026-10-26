import { ErrorNotice } from "../ErrorNotice.jsx";
import { StudentProgressPanel } from "../StudentProgressPanel.jsx";

export function ActivityProgressionBlock({
  title,
  studentNameDraft,
  onStudentNameDraftChange,
  progressionLoading,
  hasSavedProgress,
  progressionStatus,
  progressionError,
  progressionComparison,
  newlyEarnedBadges,
  progressionDisabledReason,
  onSaveProgress,
  reviewCard,
}) {
  return (
    <>
      <section className="result-progression-block">
        <div className="result-progression-form">
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
              onClick={() => void onSaveProgress()}
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
                  : "개인 기록 저장"}
            </button>
          </div>
        </div>
        {progressionStatus ? (
          <p className="matching-leaderboard-status">{progressionStatus}</p>
        ) : null}
        {progressionError ? (
          <ErrorNotice
            title="개인 기록을 저장하지 못했습니다"
            message={progressionError}
            onRetry={
              !progressionLoading &&
              !hasSavedProgress &&
              String(studentNameDraft ?? "").trim()
                ? () => void onSaveProgress()
                : undefined
            }
          />
        ) : null}
        <StudentProgressPanel
          comparison={progressionComparison}
          newlyEarnedBadges={newlyEarnedBadges}
          disabledReason={!progressionComparison ? progressionDisabledReason : ""}
          loading={progressionLoading}
          title={title}
        />
      </section>
      {reviewCard}
    </>
  );
}
