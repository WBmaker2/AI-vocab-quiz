import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatCallMode,
  getBingoBucket,
  normalizeStudent,
  normalizeWordOption,
} from "./teacher/teacherBingoView.js";
import { TeacherBingoSummary } from "./teacher/TeacherBingoSummary.jsx";

import {
  collectBingoCountChanges,
  summarizeBingoWordBoard,
} from "../utils/bingo.js";


export function TeacherBingoHost({
  sessionCode = "",
  sessionTitle = "빙고 세션",
  teacherName = "",
  classLabel = "",
  roomLabel = "",
  callMode = "random",
  currentWordId = "",
  currentWord = "",
  students = [],
  callHistory = [],
  wordOptions = [],
  statusMessage = "",
  errorMessage = "",
  isPicking = false,
  isComplete = false,
  autoSpeakOnReveal = true,
  onToggleCallMode,
  onPickRandomWord,
  onSelectWord,
  onSpeakCurrentWord,
  onEndGame,
  onBack,
}) {
  const [rollingVisual, setRollingVisual] = useState(false);
  const [revealPulse, setRevealPulse] = useState(false);
  const [showSessionCodeModal, setShowSessionCodeModal] = useState(false);
  const [changedStudentIds, setChangedStudentIds] = useState([]);
  const pendingSpeakRef = useRef(false);
  const previousWordRef = useRef(currentWord);
  const previousBingoCountsRef = useRef(new Map());
  const revealTimerRef = useRef(null);
  const resetTimerRef = useRef(null);
  const changeBadgeTimersRef = useRef(new Map());

  const normalizedStudents = useMemo(
    () =>
      (Array.isArray(students) ? students : [])
        .map(normalizeStudent)
        .filter((student) => student.name),
    [students],
  );
  const changedStudentIdSet = useMemo(
    () => new Set(changedStudentIds),
    [changedStudentIds],
  );

  const bingoSummary = useMemo(() => {
    return normalizedStudents.reduce(
      (summary, student) => {
        summary[getBingoBucket(student.bingoCount)] += 1;
        return summary;
      },
      { "0": 0, "1": 0, "2": 0, "3+": 0 },
    );
  }, [normalizedStudents]);

  const visibleCurrentWord = String(currentWord ?? "").trim();
  const currentWordLabel = visibleCurrentWord || "아직 호출된 단어가 없습니다.";
  const currentModeLabel = formatCallMode(callMode);
  const totalStudents = normalizedStudents.length;
  const calledWordIdSet = useMemo(
    () =>
      new Set(
        (Array.isArray(callHistory) ? callHistory : [])
          .map((entry) => String(entry?.wordId ?? "").trim())
          .filter(Boolean),
      ),
    [callHistory],
  );
  const normalizedWordOptions = useMemo(
    () =>
      (Array.isArray(wordOptions) ? wordOptions : [])
        .map((option, index) =>
          normalizeWordOption(option, index, calledWordIdSet, currentWordId),
        )
        .filter((option) => option.word),
    [calledWordIdSet, currentWordId, wordOptions],
  );
  const wordBoardSummary = useMemo(
    () => summarizeBingoWordBoard(normalizedWordOptions),
    [normalizedWordOptions],
  );
  const recentHistory = (Array.isArray(callHistory) ? callHistory : [])
    .slice(0, 4)
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          id: `${item}-${index}`,
          word: item,
          source: "",
        };
      }

      return {
        id: String(item?.id ?? item?.word ?? index),
        word: String(item?.word ?? item?.label ?? "").trim(),
        source: String(item?.source ?? item?.mode ?? "").trim(),
      };
    });

  useEffect(() => {
    if (previousWordRef.current === visibleCurrentWord) {
      return;
    }

    previousWordRef.current = visibleCurrentWord;

    if (!visibleCurrentWord) {
      pendingSpeakRef.current = false;
      setRollingVisual(false);
      return;
    }

    if (pendingSpeakRef.current && autoSpeakOnReveal && onSpeakCurrentWord) {
      onSpeakCurrentWord(visibleCurrentWord);
    }

    pendingSpeakRef.current = false;
    setRevealPulse(true);

    window.clearTimeout(revealTimerRef.current);
    revealTimerRef.current = window.setTimeout(() => {
      setRevealPulse(false);
    }, 1200);
  }, [autoSpeakOnReveal, onSpeakCurrentWord, visibleCurrentWord]);

  useEffect(() => {
    setRollingVisual(Boolean(isPicking));
    if (!isPicking) {
      pendingSpeakRef.current = false;
    }
  }, [isPicking]);

  useEffect(() => {
    const { changedIds, nextCounts } = collectBingoCountChanges(
      previousBingoCountsRef.current,
      normalizedStudents,
    );
    previousBingoCountsRef.current = nextCounts;

    setChangedStudentIds((previousIds) =>
      previousIds.filter((studentId) => nextCounts.has(studentId)),
    );

    if (!changedIds.length) {
      return;
    }

    setChangedStudentIds((previousIds) =>
      Array.from(new Set([...previousIds, ...changedIds])),
    );

    changedIds.forEach((studentId) => {
      const activeTimer = changeBadgeTimersRef.current.get(studentId);
      if (activeTimer) {
        window.clearTimeout(activeTimer);
      }

      const timeoutId = window.setTimeout(() => {
        setChangedStudentIds((previousIds) =>
          previousIds.filter((id) => id !== studentId),
        );
        changeBadgeTimersRef.current.delete(studentId);
      }, 3000);

      changeBadgeTimersRef.current.set(studentId, timeoutId);
    });
  }, [normalizedStudents]);

  useEffect(() => {
    return () => {
      window.clearTimeout(revealTimerRef.current);
      window.clearTimeout(resetTimerRef.current);
      changeBadgeTimersRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      changeBadgeTimersRef.current.clear();
    };
  }, []);

  function handlePickRandomWord() {
    if (isPicking || !onPickRandomWord) {
      return;
    }

    pendingSpeakRef.current = true;
    setRollingVisual(true);
    window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => {
      setRollingVisual(false);
    }, 1400);
    onPickRandomWord();
  }

  return (
    <section className="workspace-panel bingo-host-shell" aria-live="polite">
      <div className="section-heading bingo-host-heading">
        <div>
          <p className="mode-label">Bingo Host</p>
          <h2>{sessionTitle}</h2>
          <p className="bingo-host-copy">
            3빙고 이후에도 계속 진행하고, 선생님이 수업 종료를 누를 때만 세션이
            끝납니다.
          </p>
        </div>
        <div className="bingo-host-actions">
          {onBack ? (
            <button className="ghost-button" type="button" onClick={onBack}>
              홈으로
            </button>
          ) : null}
          {onEndGame ? (
            <button className="secondary-button" type="button" onClick={onEndGame}>
              수업 종료
            </button>
          ) : null}
        </div>
      </div>

      <div className="bingo-session-strip">
        <button
          className="bingo-session-pill bingo-session-pill-button"
          type="button"
          onClick={() => setShowSessionCodeModal(true)}
        >
          세션 코드 <strong>{sessionCode || "-"}</strong>
        </button>
        {teacherName ? (
          <span className="bingo-session-pill">
            선생님 <strong>{teacherName}</strong>
          </span>
        ) : null}
        {classLabel ? (
          <span className="bingo-session-pill">
            학급 <strong>{classLabel}</strong>
          </span>
        ) : null}
        {roomLabel ? (
          <span className="bingo-session-pill">
            교실 <strong>{roomLabel}</strong>
          </span>
        ) : null}
        <span className="bingo-session-pill bingo-session-pill-accent">
          호출 방식 <strong>{currentModeLabel}</strong>
        </span>
      </div>

      <div className="bingo-host-grid">
        <article className="bingo-card bingo-current-card">
          <div className="bingo-card-head">
            <div>
              <p className="mode-label">Current Call</p>
              <h3>지금 부른 단어</h3>
            </div>
            <span
              className={
                revealPulse ? "bingo-status-chip bingo-status-chip-reveal" : "bingo-status-chip"
              }
            >
              {isPicking || rollingVisual ? "뽑는 중" : isComplete ? "마감" : "대기"}
            </span>
          </div>

          <div className={`bingo-current-word${revealPulse ? " bingo-current-word-reveal" : ""}`}>
            {currentWordLabel}
          </div>

          <div className="bingo-host-controls">
            <div className="bingo-mode-toggle" role="tablist" aria-label="호출 방식 선택">
              <button
                type="button"
                className={callMode === "random" ? "bingo-mode-button bingo-mode-button-active" : "bingo-mode-button"}
                onClick={() => onToggleCallMode?.("random")}
              >
                랜덤
              </button>
              <button
                type="button"
                className={callMode === "manual" ? "bingo-mode-button bingo-mode-button-active" : "bingo-mode-button"}
                onClick={() => onToggleCallMode?.("manual")}
              >
                직접 선택
              </button>
              <button
                type="button"
                className={callMode === "tts" ? "bingo-mode-button bingo-mode-button-active" : "bingo-mode-button"}
                onClick={() => onToggleCallMode?.("tts")}
              >
                TTS
              </button>
            </div>

            <div className="bingo-host-action-row">
              <button
                className="primary-button bingo-pick-button"
                type="button"
                onClick={handlePickRandomWord}
                disabled={Boolean(isPicking) || !onPickRandomWord}
              >
                <span className="bingo-pick-button-label">
                  {isPicking || rollingVisual ? "단어 뽑는 중..." : "랜덤 단어 뽑기"}
                </span>
                {isPicking || rollingVisual ? (
                  <span className="bingo-pick-spinner" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : null}
              </button>

              <button
                className="ghost-button"
                type="button"
                onClick={() => onSpeakCurrentWord?.(visibleCurrentWord)}
                disabled={!visibleCurrentWord || !onSpeakCurrentWord}
              >
                다시 읽기
              </button>
            </div>

            {statusMessage ? (
              <p className="bingo-host-status">{statusMessage}</p>
            ) : null}
            {errorMessage ? (
              <p className="bingo-host-status bingo-host-status-error">{errorMessage}</p>
            ) : null}
          </div>

          <TeacherBingoSummary bingoSummary={bingoSummary} totalStudents={totalStudents} normalizedStudents={normalizedStudents} changedStudentIdSet={changedStudentIdSet} />
        </article>
      </div>

      <section className="bingo-history-card">
        <div className="bingo-card-head">
          <div>
            <p className="mode-label">Word Call Board</p>
            <h3>단어 선택 보드</h3>
          </div>
          <span className="bingo-status-chip">
            남은 단어 <strong>{wordBoardSummary.remainingWordCount}</strong>
            <span aria-hidden="true"> / </span>
            전체 단어 <strong>{wordBoardSummary.totalWordCount}</strong>
          </span>
        </div>

        {normalizedWordOptions.length > 0 ? (
          <div className="bingo-word-grid">
            {normalizedWordOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={
                  option.active
                    ? "bingo-word-button bingo-word-button-active"
                    : option.called
                      ? "bingo-word-button bingo-word-button-called"
                      : "bingo-word-button"
                }
                onClick={() => {
                  if (!option.id || !onSelectWord) {
                    return;
                  }

                  pendingSpeakRef.current = false;
                  onSelectWord(option);
                }}
                disabled={!onSelectWord}
              >
                {option.called ? (
                  <span className="bingo-word-button-called-badge">호출 완료</span>
                ) : null}
                <strong>{option.word}</strong>
                {option.meaning ? <small>{option.meaning}</small> : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="bingo-empty-state">
            세션에 사용할 단어가 아직 준비되지 않았습니다.
          </p>
        )}
      </section>

      <section className="bingo-history-card">
        <div className="bingo-card-head">
          <div>
            <p className="mode-label">Recent Calls</p>
            <h3>최근 호출 단어</h3>
          </div>
        </div>

        {recentHistory.length > 0 ? (
          <div className="bingo-history-list">
            {recentHistory.map((entry) => (
              <span key={entry.id} className="bingo-history-chip">
                <strong>{entry.word || "-"}</strong>
                {entry.source ? <small>{entry.source}</small> : null}
              </span>
            ))}
          </div>
        ) : (
          <p className="bingo-empty-state">아직 호출 기록이 없습니다.</p>
        )}
      </section>

      {showSessionCodeModal ? (
        <div
          className="bingo-code-modal-backdrop"
          role="presentation"
          onClick={() => setShowSessionCodeModal(false)}
        >
          <div
            className="bingo-code-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bingo-session-code-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mode-label" id="bingo-session-code-title">
              Session Code
            </p>
            <h3>학생들에게 이 코드를 보여주세요</h3>
            <div className="bingo-code-modal-code">{sessionCode || "-"}</div>
            <p className="bingo-host-copy">
              학생은 참여 화면에서 이 세션 코드를 입력해 학급 빙고에 들어옵니다.
            </p>
            <div className="toolbar-row">
              <button
                className="primary-button"
                type="button"
                onClick={() => setShowSessionCodeModal(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
