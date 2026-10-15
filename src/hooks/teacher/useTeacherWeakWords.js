import { useCallback, useEffect, useState } from "react";
import {
  clearWordMissReports,
  listWordMissReports,
} from "../../lib/firebase.js";
import {
  aggregateWordMissReports,
  filterWordMissReports,
} from "../../utils/wordMissStats.js";

export function useTeacherWeakWords({ schoolId, grade = "", activityType = "", enabled = true }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);

  const refresh = useCallback(() => {
    setRefreshVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !schoolId) {
      setReports([]);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    listWordMissReports({ schoolId })
      .then((loaded) => {
        if (cancelled) {
          return;
        }

        setReports(loaded);
        setLoading(false);
      })
      .catch((fetchError) => {
        if (cancelled) {
          return;
        }

        setError(fetchError?.message || "약점 단어를 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, schoolId, refreshVersion]);

  const filtered = filterWordMissReports(reports, { grade, activityType });
  const ranking = aggregateWordMissReports(filtered);

  const clearAll = useCallback(async () => {
    if (!schoolId || filtered.length === 0) {
      return false;
    }

    setLoading(true);
    setError("");
    setStatus("");

    try {
      await clearWordMissReports({ reportIds: filtered.map((report) => report.id) });
      setStatus("모은 약점 기록을 비웠습니다.");
      setRefreshVersion((current) => current + 1);
      return true;
    } catch (clearError) {
      setError(clearError?.message || "약점 기록을 비우지 못했습니다.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [filtered, schoolId]);

  return { reports: filtered, ranking, loading, error, status, refresh, clearAll };
}
