import { db, ensureFirebase } from "./firebaseCore.js";
import { serverTimestamp } from "firebase/firestore";
import { normalizeBingoText } from "../utils/bingo.js";
import { createEmptyBingoBoardCells } from "../utils/bingoSetup.js";


export function normalizeBingoBoardSetupDraft(boardCells, boardSize, availableWords = []) {
  const safeBoardSize = Number(boardSize);
  const requiredCellCount = safeBoardSize * safeBoardSize;
  const normalizedCells = createEmptyBingoBoardCells(safeBoardSize);
  const seenWordIds = new Set();
  const availableWordMap = new Map(
    normalizeBingoSessionItems(availableWords).map((item) => [item.id, item]),
  );
  const incomingCells = Array.isArray(boardCells) ? boardCells : [];

  incomingCells.forEach((cell, index) => {
    const cellIndex = Number.isFinite(Number(cell?.index))
      ? Number(cell.index)
      : index;

    if (cellIndex < 0 || cellIndex >= requiredCellCount) {
      return;
    }

    const wordId = normalizeBingoText(cell?.wordId);
    const word = normalizeBingoText(cell?.word);
    const meaning = normalizeBingoText(cell?.meaning);
    const imageHint = normalizeBingoText(cell?.imageHint);
    const exampleSentence = normalizeBingoText(cell?.exampleSentence);

    if (!wordId) {
      return;
    }

    if (seenWordIds.has(wordId)) {
      throw new Error("같은 단어는 한 번만 배치할 수 있습니다.");
    }

    seenWordIds.add(wordId);
    const selectedItem = availableWordMap.get(wordId) ?? {
      id: wordId,
      word,
      meaning,
      imageHint,
      exampleSentence,
    };
    normalizedCells[cellIndex] = {
      index: cellIndex,
      row: Math.floor(cellIndex / safeBoardSize),
      column: cellIndex % safeBoardSize,
      wordId: selectedItem.id,
      word: normalizeBingoText(selectedItem.word) || word,
      meaning: normalizeBingoText(selectedItem.meaning) || meaning,
      imageHint: normalizeBingoText(selectedItem.imageHint) || imageHint,
      exampleSentence:
        normalizeBingoText(selectedItem.exampleSentence) || exampleSentence,
    };
  });

  return normalizedCells;
}

export async function saveBingoBoardSetupDraft({
  sessionId,
  playerId,
  boardCells,
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSessionId = String(sessionId ?? "").trim().toUpperCase();
  const cleanPlayerId = String(playerId ?? "").trim();
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
      requiredCellCount: playerSnapshot.data()?.requiredCellCount,
      availableWords: playerSnapshot.data()?.availableWords,
      boardCells: playerSnapshot.data()?.boardCells,
      boardWordIds: playerSnapshot.data()?.boardWordIds,
      markedWordIds: playerSnapshot.data()?.markedWordIds,
      bingoRank: playerSnapshot.data()?.bingoRank,
      hasBingo: playerSnapshot.data()?.hasBingo,
    });

    if (sessionData.status !== "live") {
      throw new Error("이미 종료된 빙고 세션입니다.");
    }

    if (playerData.setupStatus !== "arranging") {
      throw new Error("이미 빙고판 배치가 완료되었습니다.");
    }

    const availableWordMap = new Map(
      playerData.availableWords.map((item) => [item.id, item]),
    );
    const draftCells = normalizeBingoBoardSetupDraft(
      boardCells ?? playerData.boardCells,
      playerData.boardSize,
      playerData.availableWords,
    );
    const draftWordIds = draftCells
      .map((cell) => normalizeBingoText(cell.wordId))
      .filter(Boolean);

    draftWordIds.forEach((wordId) => {
      if (!availableWordMap.has(wordId)) {
        throw new Error("빙고판에 없는 단어는 배치할 수 없습니다.");
      }
    });

    transaction.update(playerRef, {
      boardCells: draftCells,
      boardWordIds: draftWordIds,
      updatedAt: serverTimestamp(),
    });

    return {
      sessionId: cleanSessionId,
      playerId: cleanPlayerId,
      boardCells: draftCells,
      boardWordIds: draftWordIds,
      player: {
        id: playerSnapshot.id,
        ...playerData,
        boardCells: draftCells,
        boardWordIds: draftWordIds,
      },
    };
  });
}

export async function finalizeBingoBoardSetup({
  sessionId,
  playerId,
  boardCells,
  autoFillRemaining = false,
  random = Math.random,
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSessionId = String(sessionId ?? "").trim().toUpperCase();
  const cleanPlayerId = String(playerId ?? "").trim();
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
      requiredCellCount: playerSnapshot.data()?.requiredCellCount,
      availableWords: playerSnapshot.data()?.availableWords,
      boardCells: playerSnapshot.data()?.boardCells,
      boardWordIds: playerSnapshot.data()?.boardWordIds,
      markedWordIds: playerSnapshot.data()?.markedWordIds,
      bingoRank: playerSnapshot.data()?.bingoRank,
      hasBingo: playerSnapshot.data()?.hasBingo,
    });

    if (sessionData.status !== "live") {
      throw new Error("이미 종료된 빙고 세션입니다.");
    }

    if (playerData.setupStatus !== "arranging") {
      throw new Error("이미 빙고판 배치가 완료되었습니다.");
    }

    const finalizedBoard = finalizeBingoBoardPlacements({
      boardCells: boardCells ?? playerData.boardCells,
      availableWords: playerData.availableWords,
      boardSize: playerData.boardSize,
      autoFillRemaining,
      random,
    });

    transaction.update(playerRef, {
      setupStatus: "ready",
      boardCells: finalizedBoard.boardCells,
      boardWordIds: finalizedBoard.boardWordIds,
      requiredCellCount: finalizedBoard.requiredCellCount,
      setupCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      sessionId: cleanSessionId,
      playerId: cleanPlayerId,
      boardCells: finalizedBoard.boardCells,
      boardWordIds: finalizedBoard.boardWordIds,
      player: {
        id: playerSnapshot.id,
        ...playerData,
        setupStatus: "ready",
        boardCells: finalizedBoard.boardCells,
        boardWordIds: finalizedBoard.boardWordIds,
        requiredCellCount: finalizedBoard.requiredCellCount,
      },
    };
  });
}
