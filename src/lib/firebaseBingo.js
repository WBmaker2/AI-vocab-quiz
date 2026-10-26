import { doc, getDoc, runTransaction, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import {
  canMarkBingoCell,
  computeBingoLines,
  createBingoSessionCode,
  createBingoSetupBoard,
  createBingoWordId,
  determineBingoBoardSize,
  normalizeBingoItems,
  normalizeBingoText,
  selectNextBingoWord,
} from "../utils/bingo.js";
import { createBingoBoard } from "../utils/bingoSetup.js";
import { normalizeBingoRank } from "../utils/bingoPlayer.js";
import { db, ensureFirebase } from "./firebaseCore.js";

export function createBingoSessionRef(firestore, sessionId) {
  return doc(firestore, "bingoSessions", String(sessionId ?? "").trim());
}

export function createBingoPlayerRef(firestore, sessionId, playerId) {
  return doc(
    firestore,
    "bingoSessions",
    String(sessionId ?? "").trim(),
    "players",
    String(playerId ?? "").trim(),
  );
}

export function normalizeBingoSessionItems(items) {
  return normalizeBingoItems(items).map((item) => ({
    id: item.id,
    word: item.word,
    meaning: item.meaning,
    imageHint: item.imageHint,
    exampleSentence: item.exampleSentence,
  }));
}

export function normalizeBingoPlayerName(studentName) {
  return normalizeBingoText(studentName);
}

export function normalizeBingoSelectionList(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => normalizeBingoText(value))
        .filter(Boolean),
    ),
  );
}

export function createBingoPlayerId(studentName) {
  return normalizeBingoPlayerName(studentName)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, "_")
    .replace(/^_+|_+$/g, "");
}

export function normalizeBingoBoardCells(boardCells) {
  return (Array.isArray(boardCells) ? boardCells : []).map((cell, index) => ({
    index: Number.isFinite(Number(cell?.index)) ? Number(cell.index) : index,
    row: Number.isFinite(Number(cell?.row)) ? Number(cell.row) : 0,
    column: Number.isFinite(Number(cell?.column)) ? Number(cell.column) : 0,
    wordId: String(cell?.wordId ?? "").trim(),
    word: String(cell?.word ?? "").trim(),
    meaning: String(cell?.meaning ?? "").trim(),
    imageHint: String(cell?.imageHint ?? "").trim(),
    exampleSentence: String(cell?.exampleSentence ?? "").trim(),
  }));
}

export function normalizeBingoSessionDocument(snapshotData, fallback = {}) {
  const cleanFallback = fallback ?? {};
  const sessionCode = String(snapshotData?.sessionCode ?? cleanFallback.sessionCode ?? "").trim();
  const boardSize = Number(snapshotData?.boardSize ?? cleanFallback.boardSize ?? 0);
  const requiredCellCount = Number(
    snapshotData?.requiredCellCount
      ?? cleanFallback.requiredCellCount
      ?? (Number.isFinite(boardSize) && boardSize > 0 ? boardSize * boardSize : 0),
  );
  const fallbackUnit = String(cleanFallback.unit ?? "").trim();
  const selectedUnits = normalizeBingoSelectionList(
    snapshotData?.selectedUnits
      ?? cleanFallback.selectedUnits
      ?? (fallbackUnit ? [fallbackUnit] : []),
  );
  const selectedUnitLabels = normalizeBingoSelectionList(
    snapshotData?.selectedUnitLabels
      ?? cleanFallback.selectedUnitLabels
      ?? (fallbackUnit ? [fallbackUnit] : []),
  );

  return {
    sessionCode,
    teacherUserId: String(snapshotData?.teacherUserId ?? cleanFallback.teacherUserId ?? "").trim(),
    teacherName: String(snapshotData?.teacherName ?? cleanFallback.teacherName ?? "").trim(),
    schoolId: String(snapshotData?.schoolId ?? cleanFallback.schoolId ?? "").trim(),
    schoolName: String(snapshotData?.schoolName ?? cleanFallback.schoolName ?? "").trim(),
    grade: String(snapshotData?.grade ?? cleanFallback.grade ?? "").trim(),
    unit: String(snapshotData?.unit ?? cleanFallback.unit ?? "").trim(),
    publisher: String(snapshotData?.publisher ?? cleanFallback.publisher ?? "").trim(),
    selectedUnits,
    selectedUnitLabels,
    requiredCellCount: Number.isFinite(requiredCellCount) ? requiredCellCount : 0,
    mode: String(snapshotData?.mode ?? cleanFallback.mode ?? "manual").trim(),
    boardSize: Number.isFinite(boardSize) ? boardSize : 0,
    status: String(snapshotData?.status ?? cleanFallback.status ?? "waiting").trim(),
    activeWordId: String(snapshotData?.activeWordId ?? cleanFallback.activeWordId ?? "").trim(),
    activeWordText: String(snapshotData?.activeWordText ?? cleanFallback.activeWordText ?? "").trim(),
    activeWordMeaning: String(snapshotData?.activeWordMeaning ?? cleanFallback.activeWordMeaning ?? "").trim(),
    callSequence: Array.isArray(snapshotData?.callSequence)
      ? snapshotData.callSequence
      : Array.isArray(cleanFallback.callSequence)
        ? cleanFallback.callSequence
        : [],
    calledWordIds: Array.isArray(snapshotData?.calledWordIds)
      ? snapshotData.calledWordIds.map((value) => String(value ?? "").trim()).filter(Boolean)
      : Array.isArray(cleanFallback.calledWordIds)
        ? cleanFallback.calledWordIds.map((value) => String(value ?? "").trim()).filter(Boolean)
        : [],
    vocabularyItems: normalizeBingoSessionItems(
      snapshotData?.vocabularyItems ?? cleanFallback.vocabularyItems ?? [],
    ),
    createdAt: snapshotData?.createdAt ?? cleanFallback.createdAt ?? null,
    updatedAt: snapshotData?.updatedAt ?? cleanFallback.updatedAt ?? null,
    finishedAt: snapshotData?.finishedAt ?? cleanFallback.finishedAt ?? null,
    finishedBy: String(snapshotData?.finishedBy ?? cleanFallback.finishedBy ?? "").trim(),
  };
}

export function normalizeBingoPlayerDocument(snapshotData, fallback = {}) {
  const cleanFallback = fallback ?? {};
  const studentName = normalizeBingoPlayerName(
    snapshotData?.studentName ?? cleanFallback.studentName,
  );
  const boardCells = normalizeBingoBoardCells(
    snapshotData?.boardCells ?? cleanFallback.boardCells ?? [],
  );
  const boardSize = Number(snapshotData?.boardSize ?? cleanFallback.boardSize ?? 0);
  const setupStatus = String(snapshotData?.setupStatus ?? cleanFallback.setupStatus ?? "ready").trim();
  const requiredCellCount = Number(
    snapshotData?.requiredCellCount
      ?? cleanFallback.requiredCellCount
      ?? (Number.isFinite(boardSize) && boardSize > 0 ? boardSize * boardSize : 0),
  );
  const markedWordIds = Array.isArray(snapshotData?.markedWordIds)
    ? snapshotData.markedWordIds.map((value) => String(value ?? "").trim()).filter(Boolean)
    : Array.isArray(cleanFallback.markedWordIds)
      ? cleanFallback.markedWordIds.map((value) => String(value ?? "").trim()).filter(Boolean)
      : [];
  const availableWords = normalizeBingoSessionItems(
    snapshotData?.availableWords
      ?? cleanFallback.availableWords
      ?? boardCells.map((cell) => ({
        id: cell.wordId,
        word: cell.word,
        meaning: cell.meaning,
        imageHint: cell.imageHint,
        exampleSentence: cell.exampleSentence,
      })),
  );
  const setupStartedAt = snapshotData?.setupStartedAt
    ?? cleanFallback.setupStartedAt
    ?? snapshotData?.joinedAt
    ?? cleanFallback.joinedAt
    ?? snapshotData?.updatedAt
    ?? cleanFallback.updatedAt
    ?? null;
  const setupCompletedAt = snapshotData?.setupCompletedAt
    ?? cleanFallback.setupCompletedAt
    ?? snapshotData?.updatedAt
    ?? cleanFallback.updatedAt
    ?? snapshotData?.joinedAt
    ?? cleanFallback.joinedAt
    ?? null;
  const bingoRankValue = snapshotData?.bingoRank === undefined
    ? cleanFallback.bingoRank
    : snapshotData.bingoRank;
  const bingoLinesResult = computeBingoLines(markedWordIds, boardCells, boardSize);

  return {
    studentName,
    studentNameNormalized: createBingoPlayerId(studentName),
    boardSize: Number.isFinite(boardSize) ? boardSize : 0,
    setupStatus,
    requiredCellCount: Number.isFinite(requiredCellCount) ? requiredCellCount : 0,
    availableWords,
    boardCells,
    boardWordIds: Array.isArray(snapshotData?.boardWordIds)
      ? snapshotData.boardWordIds.map((value) => String(value ?? "").trim()).filter(Boolean)
      : boardCells.map((cell) => cell.wordId).filter(Boolean),
    markedWordIds,
    bingoLines: bingoLinesResult.bingoLines,
    completedLineKeys: bingoLinesResult.completedLineKeys,
    hasBingo: Boolean(snapshotData?.hasBingo ?? cleanFallback.hasBingo ?? bingoLinesResult.bingoLines > 0),
    bingoRank: normalizeBingoRank(bingoRankValue),
    setupStartedAt,
    setupCompletedAt,
    joinedAt: snapshotData?.joinedAt ?? cleanFallback.joinedAt ?? null,
    updatedAt: snapshotData?.updatedAt ?? cleanFallback.updatedAt ?? null,
  };
}

export function createBingoSessionPayload({
  teacherUserId,
  teacherName,
  schoolId,
  schoolName,
  grade,
  unit,
  publisher,
  selectedUnits,
  selectedUnitLabels,
  mode,
  items,
  boardSize,
  sessionCode,
}) {
  const normalizedItems = normalizeBingoSessionItems(items);
  const safeBoardSize = boardSize ?? determineBingoBoardSize(normalizedItems.length);
  const board = createBingoBoard(normalizedItems, safeBoardSize);
  const cleanSelectedUnits = normalizeBingoSelectionList(
    selectedUnits ?? [unit],
  );
  const cleanSelectedUnitLabels = normalizeBingoSelectionList(
    selectedUnitLabels ?? [unit],
  );
  const cleanMode = normalizeBingoText(mode).toLowerCase() || "manual";
  const cleanTeacherUserId = normalizeBingoText(teacherUserId);
  const cleanTeacherName = normalizeBingoText(teacherName);

  return {
    sessionCode,
    teacherUserId: cleanTeacherUserId,
    teacherName: cleanTeacherName,
    schoolId: normalizeBingoText(schoolId),
    schoolName: normalizeBingoText(schoolName),
    grade: normalizeBingoText(grade),
    unit: normalizeBingoText(cleanSelectedUnitLabels[0] ?? unit),
    publisher: normalizeBingoText(publisher),
    selectedUnits: cleanSelectedUnits,
    selectedUnitLabels: cleanSelectedUnitLabels,
    requiredCellCount: board.boardSize * board.boardSize,
    mode: cleanMode === "tts" ? "tts" : "manual",
    boardSize: board.boardSize,
    status: "live",
    activeWordId: "",
    activeWordText: "",
    activeWordMeaning: "",
    callSequence: [],
    calledWordIds: [],
    vocabularyItems: normalizedItems,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    finishedAt: null,
    finishedBy: "",
  };
}

export async function createBingoSession({
  teacherUserId,
  teacherName,
  schoolId,
  schoolName,
  grade,
  unit,
  publisher,
  selectedUnits = [],
  selectedUnitLabels = [],
  mode = "manual",
  items,
  boardSize,
  sessionCode = createBingoSessionCode(),
}) {
  const { db: firestore } = ensureFirebase();
  const cleanSessionCode = String(sessionCode ?? "").trim().toUpperCase();
  const cleanTeacherUserId = String(teacherUserId ?? "").trim();
  const cleanTeacherName = String(teacherName ?? "").trim();
  const cleanSchoolId = String(schoolId ?? "").trim();
  const cleanSchoolName = String(schoolName ?? "").trim();
  const cleanGrade = String(grade ?? "").trim();
  const cleanUnit = String(unit ?? "").trim();
  const cleanPublisher = String(publisher ?? "").trim();
  const cleanSelectedUnits = normalizeBingoSelectionList(
    selectedUnits.length ? selectedUnits : [cleanUnit],
  );
  const cleanSelectedUnitLabels = normalizeBingoSelectionList(
    selectedUnitLabels.length ? selectedUnitLabels : [cleanUnit],
  );
  const normalizedItems = normalizeBingoSessionItems(items);

  if (!cleanSessionCode) {
    throw new Error("Bingo session code is required.");
  }

  if (!cleanTeacherUserId) {
    throw new Error("Teacher user id is required.");
  }

  if (!cleanTeacherName) {
    throw new Error("Teacher name is required.");
  }

  if (!cleanSchoolId) {
    throw new Error("School id is required.");
  }

  if (!cleanSchoolName) {
    throw new Error("School name is required.");
  }

  if (!cleanGrade) {
    throw new Error("Grade is required.");
  }

  if (!cleanUnit) {
    throw new Error("Unit is required.");
  }

  if (normalizedItems.length < 9) {
    throw new Error("Bingo requires at least 9 unique words.");
  }

  const sessionRef = createBingoSessionRef(firestore, cleanSessionCode);
  const existingSession = await getDoc(sessionRef);

  if (existingSession.exists()) {
    throw new Error("이미 사용 중인 빙고 참여 코드입니다.");
  }

  const payload = createBingoSessionPayload({
    teacherUserId: cleanTeacherUserId,
    teacherName: cleanTeacherName,
    schoolId: cleanSchoolId,
    schoolName: cleanSchoolName,
    grade: cleanGrade,
    unit: cleanUnit,
    publisher: cleanPublisher,
    selectedUnits: cleanSelectedUnits,
    selectedUnitLabels: cleanSelectedUnitLabels,
    mode,
    items: normalizedItems,
    boardSize,
    sessionCode: cleanSessionCode,
  });

  await setDoc(sessionRef, payload);

  return {
    sessionId: cleanSessionCode,
    sessionCode: cleanSessionCode,
    session: {
      id: cleanSessionCode,
      ...normalizeBingoSessionDocument(payload),
    },
  };
}

export async function joinBingoSession({ sessionCode, studentName }) {
  const { db: firestore } = ensureFirebase();
  const cleanSessionCode = String(sessionCode ?? "").trim().toUpperCase();
  const cleanStudentName = normalizeBingoPlayerName(studentName);
  const playerId = createBingoPlayerId(cleanStudentName);

  if (!cleanSessionCode) {
    throw new Error("Bingo session code is required.");
  }

  if (!cleanStudentName) {
    throw new Error("Student name is required.");
  }

  if (!playerId) {
    throw new Error("Student name must contain letters or numbers.");
  }

  const sessionRef = createBingoSessionRef(firestore, cleanSessionCode);
  const playerRef = createBingoPlayerRef(firestore, cleanSessionCode, playerId);

  return runTransaction(firestore, async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);

    if (!sessionSnapshot.exists()) {
      throw new Error("빙고 참여 코드를 찾을 수 없습니다.");
    }

    const sessionData = normalizeBingoSessionDocument(sessionSnapshot.data(), {
      sessionCode: cleanSessionCode,
    });

    if (sessionData.status === "finished") {
      throw new Error("이미 종료된 빙고 세션입니다.");
    }

    const playerSnapshot = await transaction.get(playerRef);

    if (playerSnapshot.exists()) {
      throw new Error("같은 이름의 학생이 이미 참여했습니다.");
    }

    const setupBoard = createBingoSetupBoard(
      sessionData.vocabularyItems,
      sessionData.boardSize,
    );
    const playerPayload = {
      studentName: cleanStudentName,
      studentNameNormalized: playerId,
      boardSize: setupBoard.boardSize,
      requiredCellCount: setupBoard.requiredCellCount,
      setupStatus: "arranging",
      availableWords: setupBoard.availableWords,
      boardCells: setupBoard.boardCells,
      boardWordIds: setupBoard.boardWordIds,
      markedWordIds: [],
      bingoLines: 0,
      completedLineKeys: [],
      hasBingo: false,
      bingoRank: null,
      setupStartedAt: serverTimestamp(),
      setupCompletedAt: null,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    transaction.set(playerRef, playerPayload);

    return {
      sessionId: cleanSessionCode,
      sessionCode: cleanSessionCode,
      playerId,
      session: {
        id: sessionSnapshot.id,
        ...sessionData,
      },
      player: {
        id: playerId,
        playerId,
        ...normalizeBingoPlayerDocument(playerPayload, {
          studentName: cleanStudentName,
          boardSize: setupBoard.boardSize,
          requiredCellCount: setupBoard.requiredCellCount,
          setupStatus: "arranging",
          boardCells: setupBoard.boardCells,
          availableWords: setupBoard.availableWords,
        }),
      },
    };
  });
}

export {
  normalizeBingoBoardSetupDraft,
  saveBingoBoardSetupDraft,
  finalizeBingoBoardSetup,
} from "./firebaseBingoSetup.js";

export {
  callBingoWord,
  drawNextBingoWord,
  markBingoCell,
  endBingoSession,
} from "./firebaseBingoCalls.js";
