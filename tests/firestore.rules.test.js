import { readFile } from "node:fs/promises";
import path from "node:path";
import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  Timestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const PROJECT_ID = "talking-vocab-quiz-rules";
const RULES_PATH = path.resolve(process.cwd(), "firestore.rules");
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const SHOULD_RUN_RULES = Boolean(FIRESTORE_HOST);

let testEnv;

function rulesTest(name, fn) {
  if (SHOULD_RUN_RULES) {
    return test(name, fn);
  }

  return test(
    name,
    {
      skip: "Requires FIRESTORE_EMULATOR_HOST. Run via the Firestore emulator.",
    },
    fn,
  );
}

before(async () => {
  if (!SHOULD_RUN_RULES) {
    return;
  }

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: await readFile(RULES_PATH, "utf8"),
    },
  });
});

beforeEach(async () => {
  if (!testEnv) {
    return;
  }

  await testEnv.clearFirestore();
});

after(async () => {
  if (!testEnv) {
    return;
  }

  await testEnv.cleanup();
});

function createTimestamp(seconds) {
  return Timestamp.fromMillis(seconds * 1000);
}

function createStudentProfileDoc(overrides = {}) {
  return {
    schoolId: "school-1",
    schoolName: "테스트초",
    grade: "3",
    studentName: "민수",
    studentNameNormalized: "민수",
    totalSessions: 1,
    listeningSessions: 0,
    speakingSessions: 0,
    matchingSessions: 0,
    typingSessions: 1,
    listeningBestScore: 0,
    listeningBestCorrectCount: 0,
    speakingBestScore: 0,
    speakingBestCorrectCount: 0,
    matchingBestScore: 0,
    matchingBestTime: 0,
    typingBestScore: 90,
    typingBestCorrectCount: 9,
    typingBestAccuracy: 95,
    typingBestQuestionCount: 10,
    typingBestHintUsedCount: 0,
    typingBestCombo: 6,
    typingBestElapsedSeconds: 45,
    typingLastPlayedAt: createTimestamp(100),
    earnedBadges: ["first_challenge"],
    createdAt: createTimestamp(10),
    updatedAt: createTimestamp(100),
    ...overrides,
  };
}

function createTypingLeaderboardDoc(overrides = {}) {
  return {
    scopeKey: "school-1__3__week__2026-w15",
    schoolId: "school-1",
    schoolName: "테스트초",
    grade: "3",
    studentName: "민수",
    studentNameNormalized: "민수",
    periodType: "week",
    periodKey: "2026-w15",
    score: 120,
    elapsedSeconds: 40,
    questionCount: 10,
    correctCount: 9,
    accuracy: 90,
    hintUsedCount: 1,
    bestCombo: 4,
    createdAt: createTimestamp(10),
    updatedAt: createTimestamp(100),
    ...overrides,
  };
}

function createBingoVocabularyItems() {
  return Array.from({ length: 9 }, (_, index) => ({
    id: `word-${index + 1}`,
    word: `word ${index + 1}`,
    meaning: `뜻 ${index + 1}`,
    imageHint: "",
    exampleSentence: "",
  }));
}

function createBingoSessionDoc(overrides = {}) {
  return {
    sessionCode: "ABC123",
    teacherUserId: "teacher-1",
    teacherName: "김선생",
    schoolId: "school-1",
    schoolName: "테스트초",
    grade: "3",
    unit: "1단원",
    publisher: "천재",
    selectedUnits: ["1단원"],
    selectedUnitLabels: ["1단원"],
    requiredCellCount: 9,
    mode: "manual",
    boardSize: 3,
    status: "live",
    activeWordId: "",
    activeWordText: "",
    activeWordMeaning: "",
    callSequence: [],
    calledWordIds: [],
    vocabularyItems: createBingoVocabularyItems(),
    createdAt: createTimestamp(10),
    updatedAt: createTimestamp(10),
    finishedAt: null,
    finishedBy: "",
    ...overrides,
  };
}

function createBingoBoardCells(items = createBingoVocabularyItems()) {
  return items.map((item, index) => ({
    index,
    row: Math.floor(index / 3),
    column: index % 3,
    wordId: item.id,
    word: item.word,
    meaning: item.meaning,
    imageHint: item.imageHint,
    exampleSentence: item.exampleSentence,
  }));
}

function createBingoPlayerDoc(overrides = {}) {
  const availableWords = createBingoVocabularyItems();
  const boardCells = createBingoBoardCells(availableWords);

  return {
    studentName: "민수",
    studentNameNormalized: "민수",
    boardSize: 3,
    requiredCellCount: 9,
    setupStatus: "arranging",
    availableWords,
    boardCells,
    boardWordIds: [],
    markedWordIds: [],
    bingoLines: 0,
    completedLineKeys: [],
    hasBingo: false,
    bingoRank: null,
    setupStartedAt: createTimestamp(20),
    setupCompletedAt: null,
    joinedAt: createTimestamp(20),
    updatedAt: createTimestamp(20),
    ...overrides,
  };
}

async function seedTeacher(context) {
  const adminDb = context.firestore();
  await setDoc(doc(adminDb, "teachers", "teacher-1"), {
    teacherName: "김선생",
    schoolId: "school-1",
    schoolName: "테스트초",
    isActive: true,
    gradePublishers: {},
    createdAt: createTimestamp(1),
    updatedAt: createTimestamp(1),
  });
}

rulesTest(
  "studentProfiles allows a typing best-score update even when accuracy drops on the winning run",
  async () => {
    const profileId = "school-1__3__민수";

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "studentProfiles", profileId),
        createStudentProfileDoc(),
      );
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      updateDoc(doc(studentDb, "studentProfiles", profileId), {
        totalSessions: 2,
        typingSessions: 2,
        typingBestScore: 110,
        typingBestCorrectCount: 10,
        typingBestAccuracy: 90,
        typingBestQuestionCount: 10,
        typingBestHintUsedCount: 1,
        typingBestCombo: 4,
        typingBestElapsedSeconds: 38,
        typingLastPlayedAt: createTimestamp(200),
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "typingLeaderboards rejects a slower run when score and accuracy stay tied",
  async () => {
    const entryRefPath = [
      "typingLeaderboards",
      "school-1__3__week__2026-w15",
      "entries",
      "민수",
    ];

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), ...entryRefPath), createTypingLeaderboardDoc());
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(studentDb, ...entryRefPath), {
        elapsedSeconds: 45,
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "bingo player can finalize setup and mark exactly one called word in a live session",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);
    });

    const teacherDb = testEnv.authenticatedContext("teacher-1").firestore();
    await assertSucceeds(
      setDoc(
        doc(teacherDb, "bingoSessions", "ABC123"),
        createBingoSessionDoc(),
      ),
    );

    const playerDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        createBingoPlayerDoc(),
      ),
    );

    const readyPlayer = createBingoPlayerDoc({
      setupStatus: "ready",
      boardWordIds: createBingoVocabularyItems().map((item) => item.id),
      setupCompletedAt: createTimestamp(30),
      updatedAt: createTimestamp(30),
    });

    await assertSucceeds(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        {
          setupStatus: readyPlayer.setupStatus,
          boardWordIds: readyPlayer.boardWordIds,
          setupCompletedAt: readyPlayer.setupCompletedAt,
          updatedAt: readyPlayer.updatedAt,
        },
      ),
    );

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), "bingoSessions", "ABC123"), {
        activeWordId: "word-1",
        activeWordText: "word 1",
        activeWordMeaning: "뜻 1",
        calledWordIds: ["word-1"],
        updatedAt: createTimestamp(31),
      });
    });

    await assertSucceeds(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        {
          markedWordIds: ["word-1"],
          bingoLines: 0,
          completedLineKeys: [],
          hasBingo: false,
          updatedAt: createTimestamp(32),
        },
      ),
    );

    const playerSnapshot = await getDoc(
      doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
    );
    assert.deepEqual(playerSnapshot.data()?.markedWordIds, ["word-1"]);
  },
);
