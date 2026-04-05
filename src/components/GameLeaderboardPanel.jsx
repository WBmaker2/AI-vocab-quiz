import { useEffect, useMemo, useState } from "react";
import * as firebaseApi from "../lib/firebase.js";
import { getActivityLeaderboardDefinition } from "../utils/activityLeaderboard.js";
import { formatElapsedSeconds } from "../utils/quiz.js";

const TYPING_LEADERBOARD_DEFINITION = {
  type: "typing",
  label: "영어 타자",
  collectionName: "typingLeaderboards",
};

function getFirebaseApiHandler(name) {
  return firebaseApi[name];
}

function getLeaderboardHandlers(activityType) {
  if (activityType === "typing") {
    return {
      fetchLeaderboards: getFirebaseApiHandler("fetchTypingLeaderboards"),
      saveScore: getFirebaseApiHandler("saveTypingLeaderboardScore"),
    };
  }

  return activityType === "fishing"
    ? {
        fetchLeaderboards: firebaseApi.fetchFishingLeaderboards,
        saveScore: firebaseApi.saveFishingLeaderboardScore,
      }
    : {
        fetchLeaderboards: firebaseApi.fetchMatchingLeaderboards,
        saveScore: firebaseApi.saveMatchingLeaderboardScore,
      };
}

function getActivityDefinition(activityType) {
  const definition = getActivityLeaderboardDefinition(activityType);

  if (definition.type === "typing" || activityType === "typing") {
    return TYPING_LEADERBOARD_DEFINITION;
  }

  return definition;
}

function formatLeaderboardAccuracy(value) {
  const numericValue = Number(value ?? 0);

  return Number.isInteger(numericValue)
    ? `${numericValue}%`
    : `${numericValue.toFixed(1)}%`;
}

function formatLeaderboardEntryDetail(entry, periodType, activityType) {
  const detailParts = [];

  if (periodType === "school_all" && entry.grade && entry.grade !== "all") {
    detailParts.push(`${entry.grade}학년`);
  }

  detailParts.push(formatElapsedSeconds(entry.elapsedSeconds));

  if (activityType === "fishing") {
    detailParts.push(`정답 ${entry.correctCount ?? 0}`);
  } else if (activityType === "typing") {
    detailParts.push(`정답 ${entry.correctCount ?? 0}/${entry.questionCount ?? 0}`);
    detailParts.push(`정확도 ${formatLeaderboardAccuracy(entry.accuracy)}`);
    detailParts.push(`힌트 ${entry.hintUsedCount ?? 0}회`);
    detailParts.push(`최고 ${entry.bestCombo ?? 0}콤보`);
  } else if (entry.solvedPairs != null) {
    detailParts.push(`짝 ${entry.solvedPairs}개`);
  }

  return detailParts.join(" · ");
}

export function GameLeaderboardPanel({
  activityType = "matching",
  finalScore = 0,
  elapsedSeconds = 0,
  leaderboardContext,
  remoteConfigured,
  studentNameDraft,
  onStudentNameDraftChange,
  metrics = {},
}) {
  const [leaderboards, setLeaderboards] = useState({});
  const [activePeriodType, setActivePeriodType] = useState("week");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(false);
  const [leaderboardStatus, setLeaderboardStatus] = useState("");
  const [leaderboardError, setLeaderboardError] = useState("");
  const [savingScore, setSavingScore] = useState(false);

  const schoolId = String(leaderboardContext?.schoolId ?? "").trim();
  const schoolName = String(leaderboardContext?.schoolName ?? "").trim();
  const grade = String(leaderboardContext?.grade ?? "").trim();
  const canUseLeaderboard = remoteConfigured && schoolId && schoolName && grade;
  const definition = getActivityDefinition(activityType);
  const handlers = useMemo(
    () => getLeaderboardHandlers(definition.type),
    [definition.type],
  );
  const availablePeriods = Object.values(leaderboards);
  const activePeriod = leaderboards[activePeriodType] ?? availablePeriods[0] ?? null;
  const contextLabel = schoolName && grade ? `${schoolName} · ${grade}학년` : "";

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboards() {
      if (!canUseLeaderboard) {
        setLeaderboards({});
        setLoadingLeaderboards(false);
        setLeaderboardError("");
        setLeaderboardStatus("");
        return;
      }

      if (!handlers.fetchLeaderboards) {
        setLeaderboards({});
        setLoadingLeaderboards(false);
        setLeaderboardError(
          `${definition.label} 리더보드 연결이 아직 준비되지 않았습니다.`,
        );
        setLeaderboardStatus("");
        return;
      }

      setLoadingLeaderboards(true);
      setLeaderboardError("");

      try {
        const nextBoards = await handlers.fetchLeaderboards({
          schoolId,
          grade,
        });

        if (!cancelled) {
          setLeaderboards(nextBoards);
          const firstPeriod = Object.keys(nextBoards)[0] ?? "week";
          setActivePeriodType((current) =>
            nextBoards[current] ? current : firstPeriod,
          );
        }
      } catch (error) {
        if (!cancelled) {
          setLeaderboards({});
          setLeaderboardError(
            error?.message || "리더보드를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingLeaderboards(false);
        }
      }
    }

    void loadLeaderboards();

    return () => {
      cancelled = true;
    };
  }, [canUseLeaderboard, grade, handlers, schoolId]);

  useEffect(() => {
    setShowSaveForm(false);
    setSavingScore(false);
    setLeaderboardStatus("");
    setLeaderboardError("");
  }, [definition.type, finalScore, elapsedSeconds, schoolId, grade]);

  async function handleSaveScore() {
    const cleanStudentName = String(studentNameDraft ?? "")
      .trim()
      .replace(/\s+/g, " ");

    if (!canUseLeaderboard) {
      setLeaderboardError("학교와 학년 정보를 확인한 뒤 다시 시도해 주세요.");
      return;
    }

    if (!handlers.saveScore) {
      setLeaderboardError(
        `${definition.label} 점수 저장 연결이 아직 준비되지 않았습니다.`,
      );
      return;
    }

    if (!cleanStudentName) {
      setLeaderboardError("이름을 입력해 주세요.");
      return;
    }

    setSavingScore(true);
    setLeaderboardError("");
    setLeaderboardStatus("");

    try {
      const result = await handlers.saveScore({
        schoolId,
        schoolName,
        grade,
        studentName: cleanStudentName,
        score: finalScore,
        elapsedSeconds,
        ...metrics,
      });
      onStudentNameDraftChange?.(cleanStudentName);
      setShowSaveForm(false);

      if (result.failedPeriods?.length > 0 && result.updatedPeriods.length > 0) {
        setLeaderboardStatus(
          `${cleanStudentName} 학생의 일부 기록을 반영했습니다. 다시 열면 최신 리더보드를 확인할 수 있어요.`,
        );
      } else if (result.failedPeriods?.length > 0) {
        setLeaderboardError("일부 기간 점수 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      } else if (result.updatedPeriods.length > 0) {
        setLeaderboardStatus(
          `${cleanStudentName} 학생의 기록을 저장했습니다. ${finalScore}점으로 바로 반영됐어요.`,
        );
      } else {
        setLeaderboardStatus(
          `${cleanStudentName} 학생의 기존 최고 기록을 유지했습니다. 더 높은 점수를 받으면 갱신돼요.`,
        );
      }

      try {
        const refreshedBoards = await handlers.fetchLeaderboards({
          schoolId,
          grade,
        });
        setLeaderboards(refreshedBoards);
        const firstPeriod = Object.keys(refreshedBoards)[0] ?? "week";
        setActivePeriodType((current) =>
          refreshedBoards[current] ? current : firstPeriod,
        );
      } catch {
        setLeaderboardStatus((current) =>
          current
            ? `${current} 새 순위는 잠시 후 다시 열면 확인할 수 있어요.`
            : `${cleanStudentName} 학생의 점수는 저장됐고, 새 순위는 잠시 후 다시 확인할 수 있어요.`,
        );
      }
    } catch (error) {
      setLeaderboardError(error?.message || "점수를 저장하지 못했습니다.");
    } finally {
      setSavingScore(false);
    }
  }

  return (
    <section
      className="matching-leaderboard-panel"
      aria-label={`${definition.label} 리더보드`}
    >
      <div className="matching-leaderboard-head">
        <div>
          <p className="mode-label">{definition.label} Leaderboard</p>
          <h4>리더보드에 점수를 등록하시겠습니까?</h4>
        </div>
        {contextLabel ? (
          <span className="matching-leaderboard-context">{contextLabel}</span>
        ) : null}
      </div>

      {!remoteConfigured ? (
        <p className="result-copy">
          Firebase 연결이 없어 이 기기에서는 리더보드를 사용할 수 없습니다.
        </p>
      ) : null}

      {remoteConfigured && !canUseLeaderboard ? (
        <p className="result-copy">
          현재 선택한 학교 또는 학년 정보가 없어 이번 점수는 저장할 수 없습니다.
        </p>
      ) : null}

      {canUseLeaderboard ? (
        <>
          {!showSaveForm ? (
            <div className="matching-leaderboard-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setShowSaveForm(true);
                  setLeaderboardError("");
                  setLeaderboardStatus("");
                }}
              >
                네, 등록할게요
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setShowSaveForm(false);
                  setLeaderboardError("");
                  setLeaderboardStatus("원할 때 아래 리더보드만 확인할 수 있습니다.");
                }}
              >
                아니요, 이번에는 괜찮아요
              </button>
            </div>
          ) : (
            <div className="matching-save-form">
              <label className="matching-save-field">
                <span>학생 이름</span>
                <input
                  type="text"
                  value={studentNameDraft}
                  maxLength={20}
                  placeholder="이름을 입력하세요"
                  onChange={(event) => onStudentNameDraftChange?.(event.target.value)}
                  disabled={savingScore}
                />
              </label>
              <div className="matching-leaderboard-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => void handleSaveScore()}
                  disabled={savingScore}
                >
                  {savingScore ? "저장 중..." : "점수 저장"}
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setShowSaveForm(false);
                    setLeaderboardError("");
                  }}
                  disabled={savingScore}
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {leaderboardStatus ? (
            <p className="matching-leaderboard-status">{leaderboardStatus}</p>
          ) : null}
          {leaderboardError ? (
            <p className="matching-leaderboard-error">{leaderboardError}</p>
          ) : null}

          <div className="matching-leaderboard-tabs" role="tablist" aria-label="기간별 리더보드">
            {availablePeriods.map((period) => (
              <button
                key={period.periodType}
                className={
                  period.periodType === activePeriodType
                    ? "matching-leaderboard-tab matching-leaderboard-tab-active"
                    : "matching-leaderboard-tab"
                }
                type="button"
                role="tab"
                aria-selected={period.periodType === activePeriodType}
                onClick={() => setActivePeriodType(period.periodType)}
              >
                {period.label}
              </button>
            ))}
          </div>

          {loadingLeaderboards ? (
            <p className="result-copy">리더보드를 불러오는 중입니다...</p>
          ) : activePeriod ? (
            activePeriod.entries.length > 0 ? (
              <ol className="matching-leaderboard-list">
                {activePeriod.entries.map((entry) => (
                  <li key={entry.id} className="matching-leaderboard-item">
                    <div>
                      <strong>
                        {entry.rank}위 · {entry.studentName}
                      </strong>
                      <span>
                        {formatLeaderboardEntryDetail(
                          entry,
                          activePeriod.periodType,
                          definition.type,
                        )}
                      </span>
                    </div>
                    <span>{entry.score}점</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="result-copy">
                아직 등록된 기록이 없습니다. 첫 기록을 남겨 보세요.
              </p>
            )
          ) : null}
        </>
      ) : null}
    </section>
  );
}
