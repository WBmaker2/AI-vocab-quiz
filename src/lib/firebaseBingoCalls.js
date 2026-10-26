import { db, ensureFirebase } from "./firebaseCore.js";
import { runTransaction, serverTimestamp, Timestamp } from "firebase/firestore";
import { canMarkBingoCell, computeBingoLines, createBingoWordId, normalizeBingoText, selectNextBingoWord } from "../utils/bingo.js";
import { createBingoPlayerRef, createBingoSessionRef, normalizeBingoPlayerDocument, normalizeBingoSessionDocument } from "./firebaseBingo.js";
import { mergeBingoCompletedLineKeys } from "../utils/bingoPlayer.js";


export async function callBingoWord({
  sessionId,
  wordId,
  teacherUserId,
  mode,
  word,
  meaning,
  random = Math.random,
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSessionId = String(sessionId ?? "").trim().toUpperCase();
  const sessionRef = createBingoSessionRef(firestore, cleanSessionId);
  const cleanWordId = String(wordId ?? "").trim();
  const cleanWord = normalizeBingoText(word);
  const cleanMeaning = normalizeBingoText(meaning);
  const cleanTeacherUserId = normalizeBingoText(teacherUserId);
  const cleanMode = normalizeBingoText(mode).toLowerCase();

  return runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists()) {
      throw new Error("빙고 세션을 찾을 수 없습니다.");
    }

    const currentSession = normalizeBingoSessionDocument(snapshot.data(), {
      sessionCode: cleanSessionId,
    });

    if (
      cleanTeacherUserId
      && currentSession.teacherUserId
      && currentSession.teacherUserId !== cleanTeacherUserId
    ) {
      throw new Error("이 빙고 세션의 교사가 아닙니다.");
    }

    const selectedItem = (() => {
      if (cleanWordId || cleanWord) {
        const matchedItem = currentSession.vocabularyItems.find((item) => {
          const itemId = normalizeBingoText(item.id);
          const itemWord = normalizeBingoText(item.word);
          return (
            (cleanWordId && itemId === cleanWordId)
            || (cleanWord && itemWord === cleanWord)
          );
        });

        if (!matchedItem) {
          throw new Error("세션 단어 목록에 없는 단어입니다.");
        }

        return matchedItem;
      }

      return selectNextBingoWord(
        currentSession.vocabularyItems,
        currentSession.calledWordIds,
        random,
      );
    })();

    if (!selectedItem) {
      throw new Error("호출할 단어가 더 이상 없습니다.");
    }

    const normalizedSelectedItem = {
      id: createBingoWordId(selectedItem),
      word: normalizeBingoText(selectedItem.word),
      meaning: normalizeBingoText(selectedItem.meaning),
      imageHint: normalizeBingoText(selectedItem.imageHint),
      exampleSentence: normalizeBingoText(selectedItem.exampleSentence),
    };
    const calledAt = Timestamp.now();
    const callRecord = {
      wordId: normalizedSelectedItem.id,
      word: normalizedSelectedItem.word,
      meaning: normalizedSelectedItem.meaning,
      mode: cleanMode === "tts" ? "tts" : currentSession.mode,
      calledAt,
      calledBy: cleanTeacherUserId || currentSession.teacherUserId,
    };
    const nextCalledWordIds = Array.from(
      new Set([...currentSession.calledWordIds, normalizedSelectedItem.id]),
    );

    transaction.update(sessionRef, {
      selectedUnits: currentSession.selectedUnits,
      selectedUnitLabels: currentSession.selectedUnitLabels,
      requiredCellCount: currentSession.requiredCellCount || currentSession.boardSize * currentSession.boardSize,
      activeWordId: normalizedSelectedItem.id,
      activeWordText: normalizedSelectedItem.word,
      activeWordMeaning: normalizedSelectedItem.meaning,
      callSequence: [...currentSession.callSequence, callRecord],
      calledWordIds: nextCalledWordIds,
      updatedAt: serverTimestamp(),
    });

    return {
      sessionId: cleanSessionId,
      sessionCode: cleanSessionId,
      activeWord: normalizedSelectedItem,
      callRecord,
    };
  });
}

export async function drawNextBingoWord({
  sessionId,
  teacherUserId,
  mode,
  random = Math.random,
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSessionId = String(sessionId ?? "").trim().toUpperCase();
  const sessionRef = createBingoSessionRef(firestore, cleanSessionId);
  const cleanTeacherUserId = normalizeBingoText(teacherUserId);
  const cleanMode = normalizeBingoText(mode).toLowerCase();

  return runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists()) {
      throw new Error("빙고 세션을 찾을 수 없습니다.");
    }

    const currentSession = normalizeBingoSessionDocument(snapshot.data(), {
      sessionCode: cleanSessionId,
    });

    if (
      cleanTeacherUserId
      && currentSession.teacherUserId
      && currentSession.teacherUserId !== cleanTeacherUserId
    ) {
      throw new Error("이 빙고 세션의 교사가 아닙니다.");
    }

    const nextWord = selectNextBingoWord(
      currentSession.vocabularyItems,
      currentSession.calledWordIds,
      random,
    );

    if (!nextWord) {
      throw new Error("호출할 단어가 더 이상 없습니다.");
    }

    const nextWordId = createBingoWordId(nextWord);
    const calledAt = Timestamp.now();
    const callRecord = {
      wordId: nextWordId,
      word: normalizeBingoText(nextWord.word),
      meaning: normalizeBingoText(nextWord.meaning),
      mode: cleanMode === "tts" ? "tts" : currentSession.mode,
      calledAt,
      calledBy: currentSession.teacherUserId,
      isRandomDraw: true,
    };
    const nextCalledWordIds = Array.from(
      new Set([...currentSession.calledWordIds, nextWordId]),
    );

    transaction.update(sessionRef, {
      selectedUnits: currentSession.selectedUnits,
      selectedUnitLabels: currentSession.selectedUnitLabels,
      requiredCellCount: currentSession.requiredCellCount || currentSession.boardSize * currentSession.boardSize,
      activeWordId: nextWordId,
      activeWordText: normalizeBingoText(nextWord.word),
      activeWordMeaning: normalizeBingoText(nextWord.meaning),
      callSequence: [...currentSession.callSequence, callRecord],
      calledWordIds: nextCalledWordIds,
      updatedAt: serverTimestamp(),
    });

    return {
      sessionId: cleanSessionId,
      sessionCode: cleanSessionId,
      activeWord: {
        id: nextWordId,
        word: normalizeBingoText(nextWord.word),
        meaning: normalizeBingoText(nextWord.meaning),
      },
      callRecord,
    };
  });
}

export async function markBingoCell({
  sessionId,
  playerId,
  wordId,
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSessionId = String(sessionId ?? "").trim().toUpperCase();
  const cleanPlayerId = String(playerId ?? "").trim();
  const cleanWordId = String(wordId ?? "").trim();
  const sessionRef = createBingoSessionRef(firestore, cleanSessionId);
  const playerRef = createBingoPlayerRef(firestore, cleanSessionId, cleanPlayerId);

  return runTransaction(firestore, async (transaction) => {
    const [sessionSnapshot, playerSnapshot] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(playerRef),
    ]);

    if (!sessionSnapshot.exists()) {
      throw new Error("빙고 세션을 찾을 수 없습니다.");
    }

    if (!playerSnapshot.exists()) {
      throw new Error("빙고 참가자를 찾을 수 없습니다.");
    }

    const sessionData = normalizeBingoSessionDocument(sessionSnapshot.data(), {
      sessionCode: cleanSessionId,
    });
    const playerData = normalizeBingoPlayerDocument(playerSnapshot.data(), {
      studentName: playerSnapshot.data()?.studentName,
      boardSize: playerSnapshot.data()?.boardSize,
      setupStatus: playerSnapshot.data()?.setupStatus,
      boardCells: playerSnapshot.data()?.boardCells,
      markedWordIds: playerSnapshot.data()?.markedWordIds,
      availableWords: playerSnapshot.data()?.availableWords,
      requiredCellCount: playerSnapshot.data()?.requiredCellCount,
      bingoRank: playerSnapshot.data()?.bingoRank,
      hasBingo: playerSnapshot.data()?.hasBingo,
    });
    const activeWordId = normalizeBingoText(sessionData.activeWordId);

    if (!activeWordId) {
      throw new Error("현재 호출된 단어가 없습니다.");
    }

    if (playerData.setupStatus !== "ready") {
      throw new Error("빙고판 배치가 완료된 후에만 체크할 수 있습니다.");
    }

    const boardCell = playerData.boardCells.find(
      (cell) => cell.wordId === cleanWordId,
    );

    if (!boardCell) {
      throw new Error("빙고판에 없는 단어입니다.");
    }

    if (!canMarkBingoCell({
      activeWordId,
      activeWordText: sessionData.activeWordText,
      cellWordId: cleanWordId,
      cellWordText: boardCell.word,
      alreadyMarked: playerData.markedWordIds.includes(cleanWordId),
    })) {
      throw new Error("현재 호출된 단어만 체크할 수 있습니다.");
    }

    const nextMarkedWordIds = Array.from(
      new Set([...playerData.markedWordIds, cleanWordId]),
    );
    const bingoLinesResult = computeBingoLines(
      nextMarkedWordIds,
      playerData.boardCells,
      playerData.boardSize,
    );
    const nextCompletedLineKeys = mergeBingoCompletedLineKeys(
      playerSnapshot.data()?.completedLineKeys,
      bingoLinesResult.completedLineKeys,
    );
    const nextBingoLines = bingoLinesResult.bingoLines;
    const nextHasBingo = nextBingoLines >= 3;

    transaction.update(playerRef, {
      markedWordIds: nextMarkedWordIds,
      bingoLines: nextBingoLines,
      completedLineKeys: nextCompletedLineKeys,
      hasBingo: nextHasBingo,
      bingoRank: playerData.bingoRank ?? (nextHasBingo ? 1 : null),
      updatedAt: serverTimestamp(),
    });

    return {
      sessionId: cleanSessionId,
      playerId: cleanPlayerId,
      markedWordId: cleanWordId,
      bingoLines: nextBingoLines,
      completedLineKeys: nextCompletedLineKeys,
      hasBingo: nextHasBingo,
      isBingo: nextHasBingo && !playerData.hasBingo,
      session: {
        id: sessionSnapshot.id,
        ...sessionData,
      },
      player: {
        id: playerSnapshot.id,
        ...playerData,
        markedWordIds: nextMarkedWordIds,
        bingoLines: nextBingoLines,
        completedLineKeys: nextCompletedLineKeys,
        hasBingo: nextHasBingo,
        bingoRank: playerData.bingoRank ?? (nextHasBingo ? 1 : null),
      },
    };
  });
}

export async function endBingoSession({
  sessionId,
  teacherUserId,
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSessionId = String(sessionId ?? "").trim().toUpperCase();
  const cleanTeacherUserId = normalizeBingoText(teacherUserId);
  const sessionRef = createBingoSessionRef(firestore, cleanSessionId);

  return runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists()) {
      throw new Error("빙고 세션을 찾을 수 없습니다.");
    }

    const currentSession = normalizeBingoSessionDocument(snapshot.data(), {
      sessionCode: cleanSessionId,
    });

    if (
      cleanTeacherUserId
      && currentSession.teacherUserId
      && currentSession.teacherUserId !== cleanTeacherUserId
    ) {
      throw new Error("이 빙고 세션의 교사가 아닙니다.");
    }

    transaction.update(sessionRef, {
      status: "finished",
      finishedAt: serverTimestamp(),
      finishedBy: cleanTeacherUserId || currentSession.teacherUserId,
      selectedUnits: currentSession.selectedUnits,
      selectedUnitLabels: currentSession.selectedUnitLabels,
      requiredCellCount: currentSession.requiredCellCount || currentSession.boardSize * currentSession.boardSize,
      updatedAt: serverTimestamp(),
    });

    return {
      sessionId: cleanSessionId,
      sessionCode: cleanSessionId,
      status: "finished",
    };
  });
}
