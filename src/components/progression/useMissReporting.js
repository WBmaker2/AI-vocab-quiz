import { useEffect, useRef } from "react";
import { saveWordMissReports } from "../../lib/firebase.js";

export function useMissReporting({
  resetKey,
  isComplete,
  availableReviewItems,
  progressionContext,
  remoteConfigured,
  activityType,
}) {
  const missReportedRef = useRef(false);

  useEffect(() => {
    missReportedRef.current = false;
  }, [resetKey]);

  useEffect(() => {
    if (!isComplete || missReportedRef.current) {
      return;
    }

    missReportedRef.current = true;

    if (!remoteConfigured || availableReviewItems.length === 0) {
      return;
    }

    const context = progressionContext ?? {};

    if (!context.schoolId || !context.teacherUserId) {
      return;
    }

    void saveWordMissReports({
      schoolId: context.schoolId,
      schoolName: context.schoolName,
      grade: context.grade,
      unit: context.unit,
      teacherUserId: context.teacherUserId,
      teacherName: context.teacherName,
      activityType,
      misses: availableReviewItems,
    }).catch(() => {});
  }, [availableReviewItems, isComplete, progressionContext, remoteConfigured, activityType]);
}
