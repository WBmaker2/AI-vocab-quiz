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
  deleteDoc,
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

const STUDENT_PROFILE_TOKEN = "0123456789abcdef0123456789abcdef";

function createStudentProfileId({
  schoolId = "school-1",
  grade = "3",
  studentNameNormalized = "민수",
  profileToken = STUDENT_PROFILE_TOKEN,
} = {}) {
  return `${schoolId}__${grade}__${studentNameNormalized}__${profileToken}`;
}

function createStudentProfileDoc(overrides = {}) {
  return {
    schoolId: "school-1",
    schoolName: "테스트초",
    grade: "3",
    studentName: "민수",
    studentNameNormalized: "민수",
    profileToken: STUDENT_PROFILE_TOKEN,
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

function createLegacyStudentProfileDocWithoutTypingBestFields(overrides = {}) {
  const data = createStudentProfileDoc(overrides);
  delete data.typingBestScore;
  delete data.typingBestCorrectCount;
  delete data.typingBestAccuracy;
  delete data.typingBestQuestionCount;
  delete data.typingBestHintUsedCount;
  delete data.typingBestCombo;
  delete data.typingBestElapsedSeconds;
  return data;
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

function createSpellingLeaderboardDoc(overrides = {}) {
  return {
    scopeKey: "school-1__3__week__2026-w15",
    schoolId: "school-1",
    schoolName: "테스트초",
    grade: "3",
    studentName: "민수",
    studentNameNormalized: "민수",
    periodType: "week",
    periodKey: "2026-w15",
    score: 210,
    elapsedSeconds: 60,
    questionCount: 3,
    correctCount: 2,
    accuracy: 67,
    revealedCount: 1,
    hintUsedCount: 1,
    totalAttempts: 5,
    createdAt: createTimestamp(10),
    updatedAt: createTimestamp(100),
    ...overrides,
  };
}

function createMatchingLeaderboardDoc(overrides = {}) {
  return {
    scopeKey: "school-1__3__week__2026-w15",
    schoolId: "school-1",
    schoolName: "테스트초",
    grade: "3",
    studentName: "민수",
    studentNameNormalized: "민수",
    periodType: "week",
    periodKey: "2026-w15",
    score: 80,
    elapsedSeconds: 55,
    solvedPairs: 8,
    createdAt: createTimestamp(10),
    updatedAt: createTimestamp(100),
    ...overrides,
  };
}

function createFishingLeaderboardDoc(overrides = {}) {
  return {
    scopeKey: "school-1__3__week__2026-w15",
    schoolId: "school-1",
    schoolName: "테스트초",
    grade: "3",
    studentName: "민수",
    studentNameNormalized: "민수",
    periodType: "week",
    periodKey: "2026-w15",
    score: 980,
    elapsedSeconds: 48,
    correctCount: 7,
    wrongCount: 2,
    missCount: 1,
    createdAt: createTimestamp(10),
    updatedAt: createTimestamp(100),
    ...overrides,
  };
}

function createBingoVocabularyItems() {
  return createBingoVocabularyItemsWithCount(9);
}

function createBingoVocabularyItemsWithCount(count) {
  return Array.from({ length: count }, (_, index) => ({
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

function createBingoBoardCells(items = createBingoVocabularyItems(), boardSize = 3) {
  return items.map((item, index) => ({
    index,
    row: Math.floor(index / boardSize),
    column: index % boardSize,
    wordId: item.id,
    word: item.word,
    meaning: item.meaning,
    imageHint: item.imageHint,
    exampleSentence: item.exampleSentence,
  }));
}

function createBingoBoardCellsFromWordIds(
  boardWordIds = [],
  availableWords = createBingoVocabularyItems(),
  boardSize = 3,
  cellCount = boardSize * boardSize,
) {
  const wordById = new Map(
    availableWords.map((item) => [item.id, item]),
  );

  return Array.from({ length: cellCount }, (_, index) => {
    if (index >= boardWordIds.length || boardWordIds[index] === "") {
      return {
        index,
        row: Math.floor(index / boardSize),
        column: index % boardSize,
        wordId: "",
        word: "",
        meaning: "",
        imageHint: "",
        exampleSentence: "",
      };
    }

    const item = wordById.get(boardWordIds[index]);
    return {
      index,
      row: Math.floor(index / boardSize),
      column: index % boardSize,
      wordId: boardWordIds[index],
      word: item?.word ?? "",
      meaning: item?.meaning ?? "",
      imageHint: item?.imageHint ?? "",
      exampleSentence: item?.exampleSentence ?? "",
    };
  });
}

function createEmptyBingoBoardCells(boardSize = 3) {
  return Array.from({ length: boardSize * boardSize }, (_, index) => ({
    index,
    row: Math.floor(index / boardSize),
    column: index % boardSize,
    wordId: "",
    word: "",
    meaning: "",
    imageHint: "",
    exampleSentence: "",
  }));
}

function createBingoPlayerDoc(overrides = {}) {
  const boardSize = overrides.boardSize ?? 3;
  const requiredCellCount = overrides.requiredCellCount ?? boardSize * boardSize;
  const availableWords = overrides.availableWords
    ?? createBingoVocabularyItemsWithCount(requiredCellCount);
  const boardWordIds = overrides.boardWordIds ?? [];
  const boardCells = overrides.boardCells
    ?? createBingoBoardCellsFromWordIds(
      boardWordIds,
      availableWords,
      boardSize,
      requiredCellCount,
    );

  return {
    studentName: "민수",
    studentNameNormalized: "민수",
    boardSize,
    requiredCellCount,
    setupStatus: "arranging",
    availableWords,
    boardCells,
    boardWordIds,
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

function createTeacherProfileDoc(overrides = {}) {
  return {
    teacherName: "김선생",
    schoolId: "school-1",
    schoolName: "테스트초",
    isActive: true,
    gradePublishers: {},
    createdAt: createTimestamp(1),
    updatedAt: createTimestamp(1),
    ...overrides,
  };
}

function createVocabularySetDoc(overrides = {}) {
  return {
    ownerUid: "teacher-1",
    schoolId: "school-1",
    schoolName: "테스트초",
    teacherName: "김선생",
    grade: "3",
    unit: "1단원",
    publisher: "천재",
    published: false,
    sourceType: "manual",
    items: [],
    createdAt: createTimestamp(1),
    updatedAt: createTimestamp(1),
    ...overrides,
  };
}

async function seedTeacher(context, teacherId = "teacher-1", overrides = {}) {
  const adminDb = context.firestore();
  await setDoc(
    doc(adminDb, "teachers", teacherId),
    createTeacherProfileDoc(overrides),
  );
}

rulesTest(
  "teacher profile creation rejects client-selected activation",
  async () => {
    const pendingDb = testEnv.authenticatedContext("pending-1").firestore();

    await assertFails(
      setDoc(
        doc(pendingDb, "teachers", "pending-1"),
        createTeacherProfileDoc({ isActive: true }),
      ),
    );
  },
);

rulesTest(
  "teacher profile creation requires a school identity and bounded display name",
  async () => {
    const pendingDb = testEnv.authenticatedContext("pending-1").firestore();

    await assertFails(
      setDoc(
        doc(pendingDb, "teachers", "pending-1"),
        createTeacherProfileDoc({ isActive: false, schoolId: "" }),
      ),
    );
    await assertFails(
      setDoc(
        doc(pendingDb, "teachers", "pending-1"),
        createTeacherProfileDoc({
          isActive: false,
          teacherName: "가".repeat(81),
        }),
      ),
    );
  },
);

rulesTest(
  "pending teacher cannot activate their own profile",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context, "pending-1", { isActive: false });
    });

    const pendingDb = testEnv.authenticatedContext("pending-1").firestore();
    await assertFails(
      updateDoc(doc(pendingDb, "teachers", "pending-1"), { isActive: true }),
    );
  },
);

rulesTest(
  "teacher cannot change their bound school",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);
    });

    const teacherDb = testEnv.authenticatedContext("teacher-1").firestore();
    await assertFails(
      updateDoc(doc(teacherDb, "teachers", "teacher-1"), {
        schoolId: "school-2",
        schoolName: "다른초",
      }),
    );
  },
);

rulesTest(
  "pending teacher cannot write vocabulary sets",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context, "pending-1", { isActive: false });
    });

    const pendingDb = testEnv.authenticatedContext("pending-1").firestore();
    await assertFails(
      setDoc(
        doc(pendingDb, "vocabularySets", "pending-1__3__1"),
        createVocabularySetDoc({ ownerUid: "pending-1" }),
      ),
    );
  },
);

rulesTest(
  "pending teacher can update allowed self-service profile fields",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context, "pending-1", { isActive: false });
    });

    const pendingDb = testEnv.authenticatedContext("pending-1").firestore();
    await assertSucceeds(
      updateDoc(doc(pendingDb, "teachers", "pending-1"), {
        teacherName: "김새선생",
        gradePublishers: { 3: "천재" },
        updatedAt: createTimestamp(2),
      }),
    );
  },
);

rulesTest(
  "active teacher can manage vocabulary sets only for their bound school",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);
    });

    const teacherDb = testEnv.authenticatedContext("teacher-1").firestore();
    const boundSetRef = doc(teacherDb, "vocabularySets", "teacher-1__3__1");

    await assertSucceeds(setDoc(boundSetRef, createVocabularySetDoc()));
    await assertSucceeds(updateDoc(boundSetRef, { published: true }));
    await assertSucceeds(deleteDoc(boundSetRef));
    await assertFails(
      setDoc(
        doc(teacherDb, "vocabularySets", "teacher-1__3__2"),
        createVocabularySetDoc({ schoolId: "school-2", schoolName: "다른초" }),
      ),
    );
  },
);

rulesTest(
  "active teacher cannot move an existing vocabulary set to another school or owner",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);
      await setDoc(
        doc(context.firestore(), "vocabularySets", "teacher-1__3__1"),
        createVocabularySetDoc(),
      );
    });

    const teacherDb = testEnv.authenticatedContext("teacher-1").firestore();
    const setRef = doc(teacherDb, "vocabularySets", "teacher-1__3__1");

    await assertFails(
      updateDoc(setRef, { schoolId: "school-2", schoolName: "다른초" }),
    );
    await assertFails(updateDoc(setRef, { ownerUid: "teacher-2" }));
  },
);

rulesTest(
  "active teacher cannot create or mutate a vocabulary set with another school name",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);
      await setDoc(
        doc(context.firestore(), "vocabularySets", "teacher-1__3__1"),
        createVocabularySetDoc(),
      );
    });

    const teacherDb = testEnv.authenticatedContext("teacher-1").firestore();

    await assertFails(
      setDoc(
        doc(teacherDb, "vocabularySets", "teacher-1__3__2"),
        createVocabularySetDoc({ schoolName: "위조초" }),
      ),
    );
    await assertFails(
      updateDoc(doc(teacherDb, "vocabularySets", "teacher-1__3__1"), {
        schoolName: "위조초",
      }),
    );
  },
);

rulesTest(
  "studentProfiles allows first matching score record when baseline is zero",
  async () => {
    const profileId = createStudentProfileId();

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
        matchingSessions: 1,
        matchingBestScore: 0,
        matchingBestTime: 12,
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "studentProfiles rejects fractional listening and speaking session counters",
  async () => {
    const profileId = createStudentProfileId();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "studentProfiles", profileId),
        createStudentProfileDoc(),
      );
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(studentDb, "studentProfiles", profileId), {
        totalSessions: 2,
        listeningSessions: 0.5,
        speakingSessions: 0.5,
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "studentProfiles rejects fractional listening best fields during a valid session advance",
  async () => {
    const profileId = createStudentProfileId();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "studentProfiles", profileId),
        createStudentProfileDoc(),
      );
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(studentDb, "studentProfiles", profileId), {
        totalSessions: 2,
        listeningSessions: 1,
        listeningBestScore: 1.5,
        listeningBestCorrectCount: 1.5,
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "studentProfiles rejects arbitrary earned badge additions during a valid session advance",
  async () => {
    const profileId = createStudentProfileId();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "studentProfiles", profileId),
        createStudentProfileDoc(),
      );
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(studentDb, "studentProfiles", profileId), {
        totalSessions: 2,
        typingSessions: 2,
        typingLastPlayedAt: createTimestamp(200),
        earnedBadges: ["first_challenge", "arbitrary_badge"],
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "studentProfiles accepts allowed earned badge additions during a valid session advance",
  async () => {
    const profileId = createStudentProfileId();

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
        typingLastPlayedAt: createTimestamp(200),
        earnedBadges: ["first_challenge", "practice_keeper"],
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "studentProfiles rejects a slower tied zero matching record after the first matching session",
  async () => {
    const profileId = createStudentProfileId();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "studentProfiles", profileId),
        createStudentProfileDoc({
          totalSessions: 1,
          listeningSessions: 0,
          speakingSessions: 0,
          matchingSessions: 1,
          typingSessions: 0,
          matchingBestScore: 0,
          matchingBestTime: 10,
        }),
      );
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(studentDb, "studentProfiles", profileId), {
        totalSessions: 2,
        matchingSessions: 2,
        matchingBestScore: 0,
        matchingBestTime: 20,
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "studentProfiles rejects matching best time changes when typing advances without matching session increase",
  async () => {
    const profileId = createStudentProfileId();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "studentProfiles", profileId),
        createStudentProfileDoc(),
      );
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(studentDb, "studentProfiles", profileId), {
        totalSessions: 2,
        typingSessions: 2,
        matchingBestTime: 999,
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "studentProfiles rejects matching best score changes when listening advances without matching session increase",
  async () => {
    const profileId = createStudentProfileId();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "studentProfiles", profileId),
        createStudentProfileDoc(),
      );
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(studentDb, "studentProfiles", profileId), {
        totalSessions: 2,
        listeningSessions: 1,
        matchingBestScore: 10,
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "studentProfiles allows a typing best-score update even when accuracy drops on the winning run",
  async () => {
    const profileId = createStudentProfileId();

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
  "studentProfiles allows the first typing best update for a legacy profile without typing best fields",
  async () => {
    const profileId = createStudentProfileId();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "studentProfiles", profileId),
        createLegacyStudentProfileDocWithoutTypingBestFields({
          totalSessions: 1,
          listeningSessions: 1,
          speakingSessions: 0,
          matchingSessions: 0,
          typingSessions: 0,
        }),
      );
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      updateDoc(doc(studentDb, "studentProfiles", profileId), {
        totalSessions: 2,
        typingSessions: 1,
        typingBestScore: 80,
        typingBestCorrectCount: 8,
        typingBestAccuracy: 80,
        typingBestQuestionCount: 10,
        typingBestHintUsedCount: 1,
        typingBestCombo: 3,
        typingBestElapsedSeconds: 50,
        typingLastPlayedAt: createTimestamp(200),
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "studentProfiles allows a first typing record with zero baseline score and elapsed time",
  async () => {
    const profileId = createStudentProfileId();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "studentProfiles", profileId),
        createStudentProfileDoc({
          totalSessions: 1,
          listeningSessions: 1,
          speakingSessions: 0,
          matchingSessions: 0,
          typingSessions: 0,
          typingBestScore: 0,
          typingBestCorrectCount: 0,
          typingBestAccuracy: 0,
          typingBestQuestionCount: 0,
          typingBestHintUsedCount: 0,
          typingBestCombo: 0,
          typingBestElapsedSeconds: 0,
        }),
      );
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      updateDoc(doc(studentDb, "studentProfiles", profileId), {
        totalSessions: 2,
        typingSessions: 1,
        typingBestScore: 0,
        typingBestCorrectCount: 0,
        typingBestAccuracy: 0,
        typingBestQuestionCount: 0,
        typingBestHintUsedCount: 0,
        typingBestCombo: 0,
        typingBestElapsedSeconds: 5,
        typingLastPlayedAt: createTimestamp(200),
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "studentProfiles rejects duplicate earned badges",
  async () => {
    const profileId = createStudentProfileId();
    const studentDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(
      setDoc(
        doc(studentDb, "studentProfiles", profileId),
        createStudentProfileDoc({
          earnedBadges: ["first_challenge", "first_challenge"],
        }),
      ),
    );
  },
);

rulesTest(
  "studentProfiles allows capability-shaped creates and gets",
  async () => {
    const profileId = createStudentProfileId();
    const studentDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(
      setDoc(
        doc(studentDb, "studentProfiles", profileId),
        createStudentProfileDoc(),
      ),
    );
    await assertSucceeds(getDoc(doc(studentDb, "studentProfiles", profileId)));
  },
);

rulesTest(
  "studentProfiles rejects the legacy predictable profile path",
  async () => {
    const studentDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(
      setDoc(
        doc(studentDb, "studentProfiles", "school-1__3__민수"),
        createStudentProfileDoc(),
      ),
    );
  },
);

rulesTest(
  "studentProfiles rejects profile token mutation during a valid session update",
  async () => {
    const profileId = createStudentProfileId();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "studentProfiles", profileId),
        createStudentProfileDoc(),
      );
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(studentDb, "studentProfiles", profileId), {
        totalSessions: 2,
        typingSessions: 2,
        typingLastPlayedAt: createTimestamp(200),
        profileToken: "fedcba9876543210fedcba9876543210",
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "studentProfiles rejects cross-scope field mutation during a valid session update",
  async () => {
    const profileId = createStudentProfileId();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "studentProfiles", profileId),
        createStudentProfileDoc(),
      );
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(studentDb, "studentProfiles", profileId), {
        totalSessions: 2,
        typingSessions: 2,
        typingLastPlayedAt: createTimestamp(200),
        grade: "4",
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "leaderboards accept representative valid bounded result creates",
  async () => {
    const studentDb = testEnv.unauthenticatedContext().firestore();
    const scopeKey = "school-1__3__week__2026-w15";

    await assertSucceeds(
      setDoc(
        doc(studentDb, "matchingLeaderboards", scopeKey, "entries", "민수"),
        createMatchingLeaderboardDoc(),
      ),
    );
    await assertSucceeds(
      setDoc(
        doc(studentDb, "fishingLeaderboards", scopeKey, "entries", "민수"),
        createFishingLeaderboardDoc(),
      ),
    );
    await assertSucceeds(
      setDoc(
        doc(studentDb, "typingLeaderboards", scopeKey, "entries", "민수"),
        createTypingLeaderboardDoc(),
      ),
    );
  },
);

rulesTest(
  "matchingLeaderboards rejects scores above solved pair capacity",
  async () => {
    const studentDb = testEnv.unauthenticatedContext().firestore();
    const scopeKey = "school-1__3__week__2026-w15";

    await assertFails(
      setDoc(
        doc(studentDb, "matchingLeaderboards", scopeKey, "entries", "민수"),
        createMatchingLeaderboardDoc({ score: 801, solvedPairs: 8 }),
      ),
    );
  },
);

rulesTest(
  "fishingLeaderboards rejects scores above correct answer capacity",
  async () => {
    const studentDb = testEnv.unauthenticatedContext().firestore();
    const scopeKey = "school-1__3__week__2026-w15";

    await assertFails(
      setDoc(
        doc(studentDb, "fishingLeaderboards", scopeKey, "entries", "민수"),
        createFishingLeaderboardDoc({ score: 981 }),
      ),
    );
  },
);

rulesTest(
  "typingLeaderboards rejects scores above correct answer capacity",
  async () => {
    const studentDb = testEnv.unauthenticatedContext().firestore();
    const scopeKey = "school-1__3__week__2026-w15";

    await assertFails(
      setDoc(
        doc(studentDb, "typingLeaderboards", scopeKey, "entries", "민수"),
        createTypingLeaderboardDoc({ score: 1261 }),
      ),
    );
  },
);

rulesTest(
  "spellingLeaderboards accept a student's own normalized entry",
  async () => {
    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(studentDb, "spellingLeaderboards", "school-1__3__week__2026-w15", "entries", "민수"),
        createSpellingLeaderboardDoc(),
      ),
    );
  },
);

rulesTest(
  "spellingLeaderboards reject mismatched student keys, schools, and scopes",
  async () => {
    const studentDb = testEnv.unauthenticatedContext().firestore();
    const basePath = ["spellingLeaderboards", "school-1__3__week__2026-w15", "entries"];
    await assertFails(setDoc(doc(studentDb, ...basePath, "지수"), createSpellingLeaderboardDoc()));
    await assertFails(setDoc(
      doc(studentDb, ...basePath, "민수"),
      createSpellingLeaderboardDoc({ schoolId: "school-2", scopeKey: "school-1__3__week__2026-w15" }),
    ));
    await assertFails(setDoc(
      doc(studentDb, ...basePath, "민수"),
      createSpellingLeaderboardDoc({ scopeKey: "school-2__3__week__2026-w15" }),
    ));
  },
);

rulesTest(
  "spellingLeaderboards reject impossible completion metrics",
  async () => {
    const studentDb = testEnv.unauthenticatedContext().firestore();
    const entry = doc(studentDb, "spellingLeaderboards", "school-1__3__week__2026-w15", "entries", "민수");
    await assertFails(setDoc(entry, createSpellingLeaderboardDoc({ revealedCount: 0 })));
    await assertFails(setDoc(entry, createSpellingLeaderboardDoc({ totalAttempts: 2 })));
    await assertFails(setDoc(entry, createSpellingLeaderboardDoc({ totalAttempts: 10 })));
    await assertFails(setDoc(entry, createSpellingLeaderboardDoc({ score: 200 })));
    await assertFails(setDoc(entry, createSpellingLeaderboardDoc({ hintUsedCount: 3 })));
  },
);

rulesTest(
  "spellingLeaderboards reject a lower student score and allow same-school teacher maintenance",
  async () => {
    const entryRefPath = ["spellingLeaderboards", "school-1__3__week__2026-w15", "entries", "민수"];
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), ...entryRefPath), createSpellingLeaderboardDoc());
      await seedTeacher(context);
      await setDoc(doc(context.firestore(), "spellingLeaderboards", "school-2__3__week__2026-w15", "entries", "민수"),
        createSpellingLeaderboardDoc({ schoolId: "school-2", scopeKey: "school-2__3__week__2026-w15" }));
    });
    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(updateDoc(doc(studentDb, ...entryRefPath), {
      score: 180,
      totalAttempts: 6,
      updatedAt: createTimestamp(200),
    }));
    const teacherDb = testEnv.authenticatedContext("teacher-1").firestore();
    await assertSucceeds(updateDoc(doc(teacherDb, ...entryRefPath), {
      score: 180,
      totalAttempts: 6,
      updatedAt: createTimestamp(201),
    }));
    await assertSucceeds(deleteDoc(doc(teacherDb, ...entryRefPath)));
    await assertFails(deleteDoc(doc(teacherDb, "spellingLeaderboards", "school-2__3__week__2026-w15", "entries", "민수")));
  },
);

rulesTest(
  "spellingLeaderboards deny a same-school teacher delete with a mismatched student key",
  async () => {
    const mismatchedPath = [
      "spellingLeaderboards",
      "school-1__3__week__2026-w15",
      "entries",
      "지수",
    ];
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);
      await setDoc(doc(context.firestore(), ...mismatchedPath), createSpellingLeaderboardDoc());
    });

    const teacherDb = testEnv.authenticatedContext("teacher-1").firestore();
    await assertFails(
      deleteDoc(doc(
        teacherDb,
        "spellingLeaderboards",
        "school-1__3__week__2026-w15",
        "entries",
        "지수",
      )),
    );
  },
);

rulesTest(
  "spellingLeaderboards deny a same-school teacher delete with a mismatched scope key",
  async () => {
    const mismatchedPath = [
      "spellingLeaderboards",
      "school-1__3__month__2026-04",
      "entries",
      "민수",
    ];
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);
      await setDoc(doc(context.firestore(), ...mismatchedPath), createSpellingLeaderboardDoc());
    });

    const teacherDb = testEnv.authenticatedContext("teacher-1").firestore();
    await assertFails(
      deleteDoc(doc(
        teacherDb,
        "spellingLeaderboards",
        "school-1__3__month__2026-04",
        "entries",
        "민수",
      )),
    );
  },
);

rulesTest(
  "spellingLeaderboards allow a same-school teacher delete with matching path keys",
  async () => {
    const entryPath = [
      "spellingLeaderboards",
      "school-1__3__week__2026-w15",
      "entries",
      "민수",
    ];
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);
      await setDoc(doc(context.firestore(), ...entryPath), createSpellingLeaderboardDoc());
    });

    const teacherDb = testEnv.authenticatedContext("teacher-1").firestore();
    await assertSucceeds(deleteDoc(doc(teacherDb, ...entryPath)));
  },
);

rulesTest(
  "matchingLeaderboards allows a student update when the score improves",
  async () => {
    const entryRefPath = [
      "matchingLeaderboards",
      "school-1__3__week__2026-w15",
      "entries",
      "민수",
    ];

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), ...entryRefPath), createMatchingLeaderboardDoc());
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      updateDoc(doc(studentDb, ...entryRefPath), {
        score: 92,
        elapsedSeconds: 49,
        solvedPairs: 9,
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "matchingLeaderboards allows a faster elapsed time when score ties",
  async () => {
    const entryRefPath = [
      "matchingLeaderboards",
      "school-1__3__week__2026-w15",
      "entries",
      "민수",
    ];

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), ...entryRefPath), createMatchingLeaderboardDoc());
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      updateDoc(doc(studentDb, ...entryRefPath), {
        score: 80,
        elapsedSeconds: 45,
        solvedPairs: 9,
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "matchingLeaderboards rejects a tied score when elapsed time is slower",
  async () => {
    const entryRefPath = [
      "matchingLeaderboards",
      "school-1__3__week__2026-w15",
      "entries",
      "민수",
    ];

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), ...entryRefPath), createMatchingLeaderboardDoc());
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(studentDb, ...entryRefPath), {
        score: 80,
        elapsedSeconds: 60,
        solvedPairs: 9,
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "matchingLeaderboards rejects a tied score when elapsed time is equal",
  async () => {
    const entryRefPath = [
      "matchingLeaderboards",
      "school-1__3__week__2026-w15",
      "entries",
      "민수",
    ];

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), ...entryRefPath), createMatchingLeaderboardDoc());
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(studentDb, ...entryRefPath), {
        score: 80,
        elapsedSeconds: 55,
        solvedPairs: 9,
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "matchingLeaderboards rejects a student update when only elapsed time improves",
  async () => {
    const entryRefPath = [
      "matchingLeaderboards",
      "school-1__3__week__2026-w15",
      "entries",
      "민수",
    ];

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), ...entryRefPath), createMatchingLeaderboardDoc());
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(studentDb, ...entryRefPath), {
        elapsedSeconds: 70,
        solvedPairs: 8,
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "fishingLeaderboards allows a faster elapsed time when score ties",
  async () => {
    const entryRefPath = [
      "fishingLeaderboards",
      "school-1__3__week__2026-w15",
      "entries",
      "민수",
    ];

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), ...entryRefPath), createFishingLeaderboardDoc());
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      updateDoc(doc(studentDb, ...entryRefPath), {
        score: 980,
        elapsedSeconds: 40,
        correctCount: 7,
        wrongCount: 2,
        missCount: 1,
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "fishingLeaderboards rejects a tied score when elapsed time is slower",
  async () => {
    const entryRefPath = [
      "fishingLeaderboards",
      "school-1__3__week__2026-w15",
      "entries",
      "민수",
    ];

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), ...entryRefPath), createFishingLeaderboardDoc());
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(studentDb, ...entryRefPath), {
        score: 980,
        elapsedSeconds: 50,
        correctCount: 7,
        wrongCount: 2,
        missCount: 1,
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "fishingLeaderboards rejects a tied score when elapsed time is equal",
  async () => {
    const entryRefPath = [
      "fishingLeaderboards",
      "school-1__3__week__2026-w15",
      "entries",
      "민수",
    ];

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), ...entryRefPath), createFishingLeaderboardDoc());
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(studentDb, ...entryRefPath), {
        score: 980,
        elapsedSeconds: 48,
        correctCount: 7,
        wrongCount: 2,
        missCount: 1,
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "fishingLeaderboards allows a student update when the score improves",
  async () => {
    const entryRefPath = [
      "fishingLeaderboards",
      "school-1__3__week__2026-w15",
      "entries",
      "민수",
    ];

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), ...entryRefPath), createFishingLeaderboardDoc());
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      updateDoc(doc(studentDb, ...entryRefPath), {
        score: 1120,
        elapsedSeconds: 46,
        correctCount: 8,
        wrongCount: 1,
        missCount: 1,
        updatedAt: createTimestamp(200),
      }),
    );
  },
);

rulesTest(
  "fishingLeaderboards rejects a student update when only accuracy-related counts improve",
  async () => {
    const entryRefPath = [
      "fishingLeaderboards",
      "school-1__3__week__2026-w15",
      "entries",
      "민수",
    ];

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), ...entryRefPath), createFishingLeaderboardDoc());
    });

    const studentDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(doc(studentDb, ...entryRefPath), {
        correctCount: 8,
        wrongCount: 0,
        missCount: 1,
        updatedAt: createTimestamp(201),
      }),
    );
  },
);

rulesTest(
  "bingo player cannot mark a word that is not the active word",
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
          boardCells: readyPlayer.boardCells,
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

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        {
          markedWordIds: ["word-2"],
          bingoLines: 0,
          completedLineKeys: [],
          hasBingo: false,
          updatedAt: createTimestamp(32),
        },
      ),
    );
  },
);

rulesTest(
  "bingo player create rejects non-empty boardWordIds",
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
    const createPlayerDoc = createBingoPlayerDoc({
      boardWordIds: createBingoVocabularyItems().map((item) => item.id),
    });

    await assertFails(
      setDoc(doc(playerDb, "bingoSessions", "ABC123", "players", "민수"), createPlayerDoc),
    );
  },
);

rulesTest(
  "bingo player create rejects occupied boardCells",
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
    const createPlayerDoc = createBingoPlayerDoc({
      boardCells: createBingoBoardCells(),
    });
    await assertFails(
      setDoc(doc(playerDb, "bingoSessions", "ABC123", "players", "민수"), createPlayerDoc),
    );
  },
);

rulesTest(
  "bingo player cannot mark an active word that is not in calledWordIds",
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
          boardCells: readyPlayer.boardCells,
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
        calledWordIds: ["word-2"],
        updatedAt: createTimestamp(31),
      });
    });

    await assertFails(
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
  },
);

rulesTest(
  "bingo player cannot manually inflate bingo lines without marking a new word",
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
          boardCells: readyPlayer.boardCells,
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

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        {
          markedWordIds: ["word-1"],
          bingoLines: 2,
          completedLineKeys: ["line-0", "line-3"],
          hasBingo: false,
          updatedAt: createTimestamp(32),
        },
      ),
    );
  },
);

rulesTest(
  "bingo player cannot manually set hasBingo true without marking",
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
          boardCells: readyPlayer.boardCells,
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

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        {
          markedWordIds: ["word-1"],
          bingoLines: 0,
          completedLineKeys: [],
          hasBingo: true,
          updatedAt: createTimestamp(32),
        },
      ),
    );
  },
);

rulesTest(
  "bingo player cannot change immutable board state during mark",
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
          boardCells: readyPlayer.boardCells,
          setupCompletedAt: readyPlayer.setupCompletedAt,
          updatedAt: readyPlayer.updatedAt,
        },
      ),
    );

    const tamperedBoardCells = createBingoBoardCells();
    tamperedBoardCells[0] = { ...tamperedBoardCells[0], word: "changed-word" };

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), "bingoSessions", "ABC123"), {
        activeWordId: "word-1",
        activeWordText: "word 1",
        activeWordMeaning: "뜻 1",
        calledWordIds: ["word-1"],
        updatedAt: createTimestamp(31),
      });
    });

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        {
          boardCells: tamperedBoardCells,
          markedWordIds: ["word-1"],
          bingoLines: 0,
          completedLineKeys: [],
          hasBingo: false,
          updatedAt: createTimestamp(32),
        },
      ),
    );
  },
);

rulesTest(
  "bingo player cannot mark a non-active word after active already marked",
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
          boardCells: readyPlayer.boardCells,
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

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        {
          markedWordIds: ["word-1", "word-2"],
          bingoLines: 0,
          completedLineKeys: [],
          hasBingo: false,
          updatedAt: createTimestamp(33),
        },
      ),
    );
  },
);

rulesTest(
  "bingo player cannot increment bingoLines/hasBingo without completing a line",
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
          boardCells: readyPlayer.boardCells,
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

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        {
          markedWordIds: ["word-1"],
          bingoLines: 1,
          completedLineKeys: [],
          hasBingo: false,
          updatedAt: createTimestamp(32),
        },
      ),
    );
  },
);

rulesTest(
  "bingo player can mark a word that completes exactly one line",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);

      const adminDb = context.firestore();
      await setDoc(
        doc(adminDb, "bingoSessions", "ABC127"),
        createBingoSessionDoc({
          sessionCode: "ABC127",
          activeWordId: "word-3",
          activeWordText: "word 3",
          activeWordMeaning: "뜻 3",
          calledWordIds: ["word-1", "word-2", "word-3"],
          updatedAt: createTimestamp(31),
        }),
      );

      const readyPlayer = createBingoPlayerDoc({
        setupStatus: "ready",
        boardWordIds: createBingoVocabularyItems().map((item) => item.id),
        markedWordIds: ["word-1", "word-2"],
        setupCompletedAt: createTimestamp(30),
        updatedAt: createTimestamp(30),
      });

      await setDoc(
        doc(adminDb, "bingoSessions", "ABC127", "players", "민수"),
        readyPlayer,
      );
    });

    const playerDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC127", "players", "민수"),
        {
          markedWordIds: ["word-1", "word-2", "word-3"],
          bingoLines: 1,
          completedLineKeys: ["line-0"],
          hasBingo: false,
          bingoRank: null,
          updatedAt: createTimestamp(32),
        },
      ),
    );
  },
);

rulesTest(
  "bingo player appends a lower-numbered completed line after the existing line",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);

      const adminDb = context.firestore();
      await setDoc(
        doc(adminDb, "bingoSessions", "ABC136"),
        createBingoSessionDoc({
          sessionCode: "ABC136",
          activeWordId: "word-3",
          activeWordText: "word 3",
          activeWordMeaning: "뜻 3",
          calledWordIds: ["word-1", "word-2", "word-3", "word-5", "word-9"],
          updatedAt: createTimestamp(31),
        }),
      );

      await setDoc(
        doc(adminDb, "bingoSessions", "ABC136", "players", "민수"),
        createBingoPlayerDoc({
          setupStatus: "ready",
          boardWordIds: createBingoVocabularyItems().map((item) => item.id),
          markedWordIds: ["word-1", "word-2", "word-5", "word-9"],
          bingoLines: 1,
          completedLineKeys: ["line-6"],
          hasBingo: false,
          bingoRank: null,
          setupCompletedAt: createTimestamp(30),
          updatedAt: createTimestamp(30),
        }),
      );
    });

    const playerDb = testEnv.unauthenticatedContext().firestore();
    const playerRef = doc(
      playerDb,
      "bingoSessions",
      "ABC136",
      "players",
      "민수",
    );
    const nextMarkPayload = {
      markedWordIds: ["word-1", "word-2", "word-5", "word-9", "word-3"],
      bingoLines: 2,
      hasBingo: false,
      bingoRank: null,
      updatedAt: createTimestamp(32),
    };

    await assertFails(
      updateDoc(playerRef, {
        ...nextMarkPayload,
        completedLineKeys: ["line-0", "line-6"],
      }),
    );

    await assertSucceeds(
      updateDoc(playerRef, {
        ...nextMarkPayload,
        completedLineKeys: ["line-6", "line-0"],
      }),
    );
  },
);

rulesTest(
  "bingo player cannot submit the wrong completed line key for a completed top row",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);

      const adminDb = context.firestore();
      await setDoc(
        doc(adminDb, "bingoSessions", "ABC131"),
        createBingoSessionDoc({
          sessionCode: "ABC131",
          activeWordId: "word-3",
          activeWordText: "word 3",
          activeWordMeaning: "뜻 3",
          calledWordIds: ["word-1", "word-2", "word-3"],
          updatedAt: createTimestamp(31),
        }),
      );

      await setDoc(
        doc(adminDb, "bingoSessions", "ABC131", "players", "민수"),
        createBingoPlayerDoc({
          setupStatus: "ready",
          boardWordIds: createBingoVocabularyItems().map((item) => item.id),
          markedWordIds: ["word-1", "word-2"],
          setupCompletedAt: createTimestamp(30),
          updatedAt: createTimestamp(30),
        }),
      );
    });

    const playerDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC131", "players", "민수"),
        {
          markedWordIds: ["word-1", "word-2", "word-3"],
          bingoLines: 1,
          completedLineKeys: ["line-1"],
          hasBingo: false,
          bingoRank: null,
          updatedAt: createTimestamp(32),
        },
      ),
    );
  },
);

rulesTest(
  "bingo player cannot submit duplicate completed line keys when two lines complete",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);

      const adminDb = context.firestore();
      await setDoc(
        doc(adminDb, "bingoSessions", "ABC132"),
        createBingoSessionDoc({
          sessionCode: "ABC132",
          activeWordId: "word-5",
          activeWordText: "word 5",
          activeWordMeaning: "뜻 5",
          calledWordIds: ["word-1", "word-3", "word-5", "word-7", "word-9"],
          updatedAt: createTimestamp(31),
        }),
      );

      await setDoc(
        doc(adminDb, "bingoSessions", "ABC132", "players", "민수"),
        createBingoPlayerDoc({
          setupStatus: "ready",
          boardWordIds: createBingoVocabularyItems().map((item) => item.id),
          markedWordIds: ["word-1", "word-3", "word-7", "word-9"],
          setupCompletedAt: createTimestamp(30),
          updatedAt: createTimestamp(30),
        }),
      );
    });

    const playerDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC132", "players", "민수"),
        {
          markedWordIds: ["word-1", "word-3", "word-7", "word-9", "word-5"],
          bingoLines: 2,
          completedLineKeys: ["line-6", "line-6"],
          hasBingo: false,
          bingoRank: null,
          updatedAt: createTimestamp(32),
        },
      ),
    );
  },
);

rulesTest(
  "bingo player can add two completed diagonal lines after an existing line",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);

      const adminDb = context.firestore();
      await setDoc(
        doc(adminDb, "bingoSessions", "ABC133"),
        createBingoSessionDoc({
          sessionCode: "ABC133",
          activeWordId: "word-5",
          activeWordText: "word 5",
          activeWordMeaning: "뜻 5",
          calledWordIds: ["word-1", "word-2", "word-3", "word-5", "word-7", "word-9"],
          updatedAt: createTimestamp(31),
        }),
      );

      await setDoc(
        doc(adminDb, "bingoSessions", "ABC133", "players", "민수"),
        createBingoPlayerDoc({
          setupStatus: "ready",
          boardWordIds: createBingoVocabularyItems().map((item) => item.id),
          markedWordIds: ["word-1", "word-2", "word-3", "word-7", "word-9"],
          bingoLines: 1,
          completedLineKeys: ["line-0"],
          hasBingo: false,
          bingoRank: null,
          setupCompletedAt: createTimestamp(30),
          updatedAt: createTimestamp(30),
        }),
      );
    });

    const playerDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC133", "players", "민수"),
        {
          markedWordIds: ["word-1", "word-2", "word-3", "word-7", "word-9", "word-5"],
          bingoLines: 3,
          completedLineKeys: ["line-0", "line-6", "line-7"],
          hasBingo: true,
          bingoRank: 1,
          updatedAt: createTimestamp(32),
        },
      ),
    );
  },
);

rulesTest(
  "bingo player can mark a word that reaches first bingo rank",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);

      const adminDb = context.firestore();
      await setDoc(
        doc(adminDb, "bingoSessions", "ABC128"),
        createBingoSessionDoc({
          sessionCode: "ABC128",
          activeWordId: "word-5",
          activeWordText: "word 5",
          activeWordMeaning: "뜻 5",
          calledWordIds: ["word-1", "word-2", "word-3", "word-4", "word-5", "word-7"],
          updatedAt: createTimestamp(31),
        }),
      );

      const readyPlayer = createBingoPlayerDoc({
        setupStatus: "ready",
        boardWordIds: createBingoVocabularyItems().map((item) => item.id),
        markedWordIds: ["word-1", "word-2", "word-3", "word-4", "word-7"],
        bingoLines: 2,
        completedLineKeys: ["line-0", "line-3"],
        hasBingo: false,
        bingoRank: null,
        setupCompletedAt: createTimestamp(30),
        updatedAt: createTimestamp(30),
      });

      await setDoc(
        doc(adminDb, "bingoSessions", "ABC128", "players", "민수"),
        readyPlayer,
      );
    });

    const playerDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC128", "players", "민수"),
        {
          markedWordIds: ["word-1", "word-2", "word-3", "word-4", "word-7", "word-5"],
          bingoLines: 3,
          completedLineKeys: ["line-0", "line-3", "line-7"],
          hasBingo: true,
          bingoRank: 1,
          updatedAt: createTimestamp(32),
        },
      ),
    );
  },
);

rulesTest(
  "bingo player draft update rejects invalid boardWordIds",
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

    const draftPlayer = createBingoPlayerDoc({
      setupCompletedAt: null,
      updatedAt: createTimestamp(30),
    });
    draftPlayer.boardWordIds = ["invalid-word-id"];
    draftPlayer.boardCells = createBingoBoardCells();
    draftPlayer.boardCells[0] = { ...draftPlayer.boardCells[0], wordId: "invalid-word-id" };

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        {
          availableWords: draftPlayer.availableWords,
          studentName: draftPlayer.studentName,
          studentNameNormalized: draftPlayer.studentNameNormalized,
          boardSize: draftPlayer.boardSize,
          requiredCellCount: draftPlayer.requiredCellCount,
          setupStatus: "arranging",
          boardCells: draftPlayer.boardCells,
          boardWordIds: draftPlayer.boardWordIds,
          markedWordIds: draftPlayer.markedWordIds,
          bingoLines: draftPlayer.bingoLines,
          completedLineKeys: draftPlayer.completedLineKeys,
          hasBingo: draftPlayer.hasBingo,
          bingoRank: draftPlayer.bingoRank,
          setupStartedAt: draftPlayer.setupStartedAt,
          setupCompletedAt: draftPlayer.setupCompletedAt,
          joinedAt: draftPlayer.joinedAt,
          updatedAt: draftPlayer.updatedAt,
        },
      ),
    );
  },
);

rulesTest(
  "bingo player draft update rejects occupied-cell mismatch in boardCells",
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

    const draftPlayer = createBingoPlayerDoc({
      setupCompletedAt: null,
      updatedAt: createTimestamp(30),
    });
    draftPlayer.boardWordIds = ["word-1", "word-2"];
    draftPlayer.boardCells = createBingoBoardCells();
    draftPlayer.boardCells[1] = { ...draftPlayer.boardCells[1], wordId: "word-3" };

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        {
          availableWords: draftPlayer.availableWords,
          studentName: draftPlayer.studentName,
          studentNameNormalized: draftPlayer.studentNameNormalized,
          boardSize: draftPlayer.boardSize,
          requiredCellCount: draftPlayer.requiredCellCount,
          setupStatus: "arranging",
          boardCells: draftPlayer.boardCells,
          boardWordIds: draftPlayer.boardWordIds,
          markedWordIds: draftPlayer.markedWordIds,
          bingoLines: draftPlayer.bingoLines,
          completedLineKeys: draftPlayer.completedLineKeys,
          hasBingo: draftPlayer.hasBingo,
          bingoRank: draftPlayer.bingoRank,
          setupStartedAt: draftPlayer.setupStartedAt,
          setupCompletedAt: draftPlayer.setupCompletedAt,
          joinedAt: draftPlayer.joinedAt,
          updatedAt: draftPlayer.updatedAt,
        },
      ),
    );
  },
);

rulesTest(
  "bingo player draft update rejects boardCells wordIds outside availableWords",
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

    const draftPlayer = createBingoPlayerDoc({
      setupCompletedAt: null,
      updatedAt: createTimestamp(30),
    });
    draftPlayer.boardWordIds = ["word-1"];
    draftPlayer.boardCells = createBingoBoardCells();
    draftPlayer.boardCells[2] = { ...draftPlayer.boardCells[2], wordId: "invalid-word-id" };

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        {
          availableWords: draftPlayer.availableWords,
          studentName: draftPlayer.studentName,
          studentNameNormalized: draftPlayer.studentNameNormalized,
          boardSize: draftPlayer.boardSize,
          requiredCellCount: draftPlayer.requiredCellCount,
          setupStatus: "arranging",
          boardCells: draftPlayer.boardCells,
          boardWordIds: draftPlayer.boardWordIds,
          markedWordIds: draftPlayer.markedWordIds,
          bingoLines: draftPlayer.bingoLines,
          completedLineKeys: draftPlayer.completedLineKeys,
          hasBingo: draftPlayer.hasBingo,
          bingoRank: draftPlayer.bingoRank,
          setupStartedAt: draftPlayer.setupStartedAt,
          setupCompletedAt: draftPlayer.setupCompletedAt,
          joinedAt: draftPlayer.joinedAt,
          updatedAt: draftPlayer.updatedAt,
        },
      ),
    );
  },
);

rulesTest(
  "bingo player cannot finalize 3x3 board with duplicate valid word ids",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);
    });

    const teacherDb = testEnv.authenticatedContext("teacher-1").firestore();
    await assertSucceeds(
      setDoc(
        doc(teacherDb, "bingoSessions", "ABC129"),
        createBingoSessionDoc({
          sessionCode: "ABC129",
        }),
      ),
    );

    const playerDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(playerDb, "bingoSessions", "ABC129", "players", "민수"),
        createBingoPlayerDoc(),
      ),
    );

    const duplicatedBoardWordIds = createBingoVocabularyItems().map((item) => item.id);
    duplicatedBoardWordIds[8] = duplicatedBoardWordIds[0];
    const readyPlayer = createBingoPlayerDoc({
      setupStatus: "ready",
      boardWordIds: duplicatedBoardWordIds,
      boardCells: createBingoBoardCellsFromWordIds(duplicatedBoardWordIds),
      setupCompletedAt: createTimestamp(30),
      updatedAt: createTimestamp(30),
    });

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC129", "players", "민수"),
        {
          setupStatus: readyPlayer.setupStatus,
          boardWordIds: readyPlayer.boardWordIds,
          boardCells: readyPlayer.boardCells,
          setupCompletedAt: readyPlayer.setupCompletedAt,
          updatedAt: readyPlayer.updatedAt,
        },
      ),
    );
  },
);

rulesTest(
  "bingo player cannot finalize with board words outside session available words",
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

    const invalidBoardWordIds = createBingoVocabularyItems().map((item) => item.id);
    invalidBoardWordIds[0] = "invalid-word-id";

    const readyPlayer = createBingoPlayerDoc({
      setupStatus: "ready",
      setupCompletedAt: createTimestamp(30),
      updatedAt: createTimestamp(30),
    });
    readyPlayer.boardWordIds = invalidBoardWordIds;
    readyPlayer.boardCells = createBingoBoardCellsFromWordIds(
      readyPlayer.boardWordIds,
      readyPlayer.availableWords,
      readyPlayer.boardSize,
      readyPlayer.requiredCellCount,
    );

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        {
          availableWords: readyPlayer.availableWords,
          setupStatus: readyPlayer.setupStatus,
          boardWordIds: readyPlayer.boardWordIds,
          setupCompletedAt: readyPlayer.setupCompletedAt,
          boardCells: readyPlayer.boardCells,
          updatedAt: readyPlayer.updatedAt,
          completedLineKeys: [],
          bingoLines: 0,
          hasBingo: false,
          bingoRank: null,
          markedWordIds: [],
        },
      ),
    );
  },
);

rulesTest(
  "bingo player cannot finalize with boardCells that do not match boardWordIds",
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
      setupCompletedAt: createTimestamp(30),
      updatedAt: createTimestamp(30),
    });
    readyPlayer.boardWordIds = createBingoVocabularyItems().map((item) => item.id);
    readyPlayer.boardCells = createBingoBoardCells();
    readyPlayer.boardCells[0] = { ...readyPlayer.boardCells[0], wordId: "invalid-word-id" };

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        {
          availableWords: readyPlayer.availableWords,
          setupStatus: readyPlayer.setupStatus,
          boardWordIds: readyPlayer.boardWordIds,
          setupCompletedAt: readyPlayer.setupCompletedAt,
          boardCells: readyPlayer.boardCells,
          updatedAt: readyPlayer.updatedAt,
          completedLineKeys: [],
          bingoLines: 0,
          hasBingo: false,
          bingoRank: null,
          markedWordIds: [],
        },
      ),
    );
  },
);

rulesTest(
  "bingo player cannot finalize with boardCells that mismatch at index 3",
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
      setupCompletedAt: createTimestamp(30),
      updatedAt: createTimestamp(30),
    });
    readyPlayer.boardWordIds = createBingoVocabularyItems().map((item) => item.id);
    readyPlayer.boardCells = createBingoBoardCells();
    readyPlayer.boardCells[3] = { ...readyPlayer.boardCells[3], wordId: "invalid-word-id" };

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        {
          availableWords: readyPlayer.availableWords,
          setupStatus: readyPlayer.setupStatus,
          boardWordIds: readyPlayer.boardWordIds,
          setupCompletedAt: readyPlayer.setupCompletedAt,
          boardCells: readyPlayer.boardCells,
          updatedAt: readyPlayer.updatedAt,
          completedLineKeys: [],
          bingoLines: 0,
          hasBingo: false,
          bingoRank: null,
          markedWordIds: [],
        },
      ),
    );
  },
);

rulesTest(
  "bingo player cannot finalize 4x4 board with duplicate valid word ids",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);
    });

    const items4x4 = createBingoVocabularyItemsWithCount(16);
    const teacherDb = testEnv.authenticatedContext("teacher-1").firestore();
    await assertSucceeds(
      setDoc(
        doc(teacherDb, "bingoSessions", "ABC130"),
        createBingoSessionDoc({
          sessionCode: "ABC130",
          boardSize: 4,
          requiredCellCount: 16,
          vocabularyItems: items4x4,
        }),
      ),
    );

    const playerDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(playerDb, "bingoSessions", "ABC130", "players", "민수"),
        createBingoPlayerDoc({
          boardSize: 4,
          requiredCellCount: 16,
          availableWords: items4x4,
          boardCells: createEmptyBingoBoardCells(4),
        }),
      ),
    );

    const duplicatedBoardWordIds = items4x4.map((item) => item.id);
    duplicatedBoardWordIds[15] = duplicatedBoardWordIds[0];
    const readyPlayer = createBingoPlayerDoc({
      boardSize: 4,
      requiredCellCount: 16,
      availableWords: items4x4,
      setupStatus: "ready",
      boardWordIds: duplicatedBoardWordIds,
      boardCells: createBingoBoardCellsFromWordIds(duplicatedBoardWordIds, items4x4, 4, 16),
      setupCompletedAt: createTimestamp(30),
      updatedAt: createTimestamp(30),
    });

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC130", "players", "민수"),
        {
          availableWords: readyPlayer.availableWords,
          setupStatus: readyPlayer.setupStatus,
          boardWordIds: readyPlayer.boardWordIds,
          setupCompletedAt: readyPlayer.setupCompletedAt,
          boardCells: readyPlayer.boardCells,
          updatedAt: readyPlayer.updatedAt,
          completedLineKeys: [],
          bingoLines: 0,
          hasBingo: false,
          bingoRank: null,
          markedWordIds: [],
        },
      ),
    );
  },
);

rulesTest(
  "bingo player can finalize and mark setup on a 4x4 board with matching words",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);
    });

    const items4x4 = createBingoVocabularyItemsWithCount(16);
    const teacherDb = testEnv.authenticatedContext("teacher-1").firestore();
    await assertSucceeds(
      setDoc(
        doc(teacherDb, "bingoSessions", "ABC124"),
        createBingoSessionDoc({
          sessionCode: "ABC124",
          boardSize: 4,
          requiredCellCount: 16,
          vocabularyItems: items4x4,
        }),
      ),
    );

    const playerDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(playerDb, "bingoSessions", "ABC124", "players", "민수"),
        createBingoPlayerDoc({
          boardSize: 4,
          requiredCellCount: 16,
          availableWords: items4x4,
          boardCells: createEmptyBingoBoardCells(4),
        }),
      ),
    );

    const readyPlayer = createBingoPlayerDoc({
      boardSize: 4,
      requiredCellCount: 16,
      availableWords: items4x4,
      setupStatus: "ready",
      boardWordIds: items4x4.map((item) => item.id),
      boardCells: createBingoBoardCells(items4x4, 4),
      setupCompletedAt: createTimestamp(30),
      updatedAt: createTimestamp(30),
    });

    await assertSucceeds(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC124", "players", "민수"),
        {
          availableWords: readyPlayer.availableWords,
          setupStatus: readyPlayer.setupStatus,
          boardWordIds: readyPlayer.boardWordIds,
          setupCompletedAt: readyPlayer.setupCompletedAt,
          boardCells: readyPlayer.boardCells,
          updatedAt: readyPlayer.updatedAt,
          completedLineKeys: [],
          bingoLines: 0,
          hasBingo: false,
          bingoRank: null,
          markedWordIds: [],
        },
      ),
    );

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), "bingoSessions", "ABC124"), {
        activeWordId: "word-1",
        activeWordText: "word 1",
        activeWordMeaning: "뜻 1",
        calledWordIds: ["word-1"],
        updatedAt: createTimestamp(31),
      });
    });

    await assertSucceeds(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC124", "players", "민수"),
        {
          markedWordIds: ["word-1"],
          bingoLines: 0,
          completedLineKeys: [],
          hasBingo: false,
          updatedAt: createTimestamp(32),
        },
      ),
    );
  },
);

rulesTest(
  "bingo player cannot finalize 4x4 board words outside session available words",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);
    });

    const items4x4 = createBingoVocabularyItemsWithCount(16);
    const teacherDb = testEnv.authenticatedContext("teacher-1").firestore();
    await assertSucceeds(
      setDoc(
        doc(teacherDb, "bingoSessions", "ABC125"),
        createBingoSessionDoc({
          sessionCode: "ABC125",
          boardSize: 4,
          requiredCellCount: 16,
          vocabularyItems: items4x4,
        }),
      ),
    );

    const playerDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(playerDb, "bingoSessions", "ABC125", "players", "민수"),
        createBingoPlayerDoc({
          boardSize: 4,
          requiredCellCount: 16,
          availableWords: items4x4,
          boardCells: createEmptyBingoBoardCells(4),
        }),
      ),
    );

    const readyPlayer = createBingoPlayerDoc({
      boardSize: 4,
      requiredCellCount: 16,
      availableWords: items4x4,
      setupStatus: "ready",
      boardCells: createBingoBoardCells(items4x4, 4),
      setupCompletedAt: createTimestamp(30),
      updatedAt: createTimestamp(30),
      boardWordIds: [...items4x4.map((item) => item.id)],
    });
    readyPlayer.boardWordIds[0] = "invalid-word-id";
    readyPlayer.boardCells = createBingoBoardCellsFromWordIds(
      readyPlayer.boardWordIds,
      readyPlayer.availableWords,
      readyPlayer.boardSize,
      readyPlayer.requiredCellCount,
    );

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC125", "players", "민수"),
        {
          availableWords: readyPlayer.availableWords,
          setupStatus: "ready",
          boardWordIds: readyPlayer.boardWordIds,
          setupCompletedAt: readyPlayer.setupCompletedAt,
          boardCells: readyPlayer.boardCells,
          updatedAt: readyPlayer.updatedAt,
          completedLineKeys: [],
          bingoLines: 0,
          hasBingo: false,
          bingoRank: null,
          markedWordIds: [],
        },
      ),
    );
  },
);

rulesTest(
  "bingo player cannot finalize 4x4 boardCells that mismatch at index 10",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);
    });

    const items4x4 = createBingoVocabularyItemsWithCount(16);
    const teacherDb = testEnv.authenticatedContext("teacher-1").firestore();
    await assertSucceeds(
      setDoc(
        doc(teacherDb, "bingoSessions", "ABC126"),
        createBingoSessionDoc({
          sessionCode: "ABC126",
          boardSize: 4,
          requiredCellCount: 16,
          vocabularyItems: items4x4,
        }),
      ),
    );

    const playerDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(playerDb, "bingoSessions", "ABC126", "players", "민수"),
        createBingoPlayerDoc({
          boardSize: 4,
          requiredCellCount: 16,
          availableWords: items4x4,
          boardCells: createEmptyBingoBoardCells(4),
        }),
      ),
    );

    const readyPlayer = createBingoPlayerDoc({
      boardSize: 4,
      requiredCellCount: 16,
      availableWords: items4x4,
      setupStatus: "ready",
      boardWordIds: items4x4.map((item) => item.id),
      boardCells: createBingoBoardCells(items4x4, 4),
      setupCompletedAt: createTimestamp(30),
      updatedAt: createTimestamp(30),
    });
    readyPlayer.boardCells[10] = { ...readyPlayer.boardCells[10], wordId: "invalid-word-id" };

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC126", "players", "민수"),
        {
          availableWords: readyPlayer.availableWords,
          setupStatus: readyPlayer.setupStatus,
          boardWordIds: readyPlayer.boardWordIds,
          setupCompletedAt: readyPlayer.setupCompletedAt,
          boardCells: readyPlayer.boardCells,
          updatedAt: readyPlayer.updatedAt,
          completedLineKeys: [],
          bingoLines: 0,
          hasBingo: false,
          bingoRank: null,
          markedWordIds: [],
        },
      ),
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
  "bingo player first called word rejects legacy rank zero and allows null rank",
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
          boardCells: readyPlayer.boardCells,
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

    const playerRef = doc(
      playerDb,
      "bingoSessions",
      "ABC123",
      "players",
      "민수",
    );
    const firstMarkPayload = {
      markedWordIds: ["word-1"],
      bingoLines: 0,
      completedLineKeys: [],
      hasBingo: false,
      updatedAt: createTimestamp(32),
    };

    await assertFails(
      updateDoc(
        playerRef,
        {
          ...firstMarkPayload,
          bingoRank: 0,
        },
      ),
    );

    await assertSucceeds(
      updateDoc(playerRef, {
        ...firstMarkPayload,
        bingoRank: null,
      }),
    );

    const playerSnapshot = await getDoc(playerRef);
    assert.deepEqual(playerSnapshot.data()?.markedWordIds, ["word-1"]);
    assert.equal(playerSnapshot.data()?.bingoRank, null);
  },
);

rulesTest(
  "bingo player create ties availableWords to session vocabulary",
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
    const tamperedVocabulary = createBingoVocabularyItemsWithCount(9).map((item) => ({
      ...item,
      id: `tampered-${item.id}`,
    }));

    await assertFails(
      setDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        createBingoPlayerDoc({
          availableWords: tamperedVocabulary,
        }),
      ),
    );
  },
);

rulesTest(
  "bingo player create allows 3x3 availableWords subset from a 10 word session",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);
    });

    const sessionVocabulary = createBingoVocabularyItemsWithCount(10);
    const playerAvailableWords = sessionVocabulary.slice(1);
    const teacherDb = testEnv.authenticatedContext("teacher-1").firestore();
    await assertSucceeds(
      setDoc(
        doc(teacherDb, "bingoSessions", "ABC134"),
        createBingoSessionDoc({
          sessionCode: "ABC134",
          vocabularyItems: sessionVocabulary,
        }),
      ),
    );

    const playerDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(playerDb, "bingoSessions", "ABC134", "players", "민수"),
        createBingoPlayerDoc({
          availableWords: playerAvailableWords,
        }),
      ),
    );
  },
);

rulesTest(
  "bingo player create allows 4x4 availableWords subset from a 17 word session",
  async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await seedTeacher(context);
    });

    const sessionVocabulary = createBingoVocabularyItemsWithCount(17);
    const playerAvailableWords = sessionVocabulary.slice(1);
    const teacherDb = testEnv.authenticatedContext("teacher-1").firestore();
    await assertSucceeds(
      setDoc(
        doc(teacherDb, "bingoSessions", "ABC135"),
        createBingoSessionDoc({
          sessionCode: "ABC135",
          boardSize: 4,
          requiredCellCount: 16,
          vocabularyItems: sessionVocabulary,
        }),
      ),
    );

    const playerDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(
      setDoc(
        doc(playerDb, "bingoSessions", "ABC135", "players", "민수"),
        createBingoPlayerDoc({
          boardSize: 4,
          requiredCellCount: 16,
          availableWords: playerAvailableWords,
        }),
      ),
    );
  },
);

rulesTest(
  "bingo player draft update allows partial board with matching occupied ids",
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

    const draftPlayer = createBingoPlayerDoc({
      setupCompletedAt: null,
      updatedAt: createTimestamp(30),
    });
    const occupiedWordIds = ["word-1", "word-3"];
    draftPlayer.boardWordIds = occupiedWordIds;
    draftPlayer.boardCells = createBingoBoardCellsFromWordIds(
      occupiedWordIds,
      draftPlayer.availableWords,
      draftPlayer.boardSize,
      draftPlayer.requiredCellCount,
    );

    await assertSucceeds(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        {
          availableWords: draftPlayer.availableWords,
          studentName: draftPlayer.studentName,
          studentNameNormalized: draftPlayer.studentNameNormalized,
          boardSize: draftPlayer.boardSize,
          requiredCellCount: draftPlayer.requiredCellCount,
          setupStatus: "arranging",
          boardWordIds: draftPlayer.boardWordIds,
          boardCells: draftPlayer.boardCells,
          markedWordIds: draftPlayer.markedWordIds,
          bingoLines: draftPlayer.bingoLines,
          completedLineKeys: draftPlayer.completedLineKeys,
          hasBingo: draftPlayer.hasBingo,
          bingoRank: draftPlayer.bingoRank,
          setupStartedAt: draftPlayer.setupStartedAt,
          setupCompletedAt: draftPlayer.setupCompletedAt,
          joinedAt: draftPlayer.joinedAt,
          updatedAt: draftPlayer.updatedAt,
        },
      ),
    );
  },
);

rulesTest(
  "bingo player draft update rejects occupied cell missing from boardWordIds",
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

    const draftPlayer = createBingoPlayerDoc({
      setupCompletedAt: null,
      updatedAt: createTimestamp(30),
    });
    const occupiedWordIds = ["word-1"];
    draftPlayer.boardWordIds = occupiedWordIds;
    draftPlayer.boardCells = createBingoBoardCellsFromWordIds(
      occupiedWordIds,
      draftPlayer.availableWords,
      draftPlayer.boardSize,
      draftPlayer.requiredCellCount,
    );
    draftPlayer.boardCells[1] = { ...draftPlayer.boardCells[1], wordId: "word-2" };

    await assertFails(
      updateDoc(
        doc(playerDb, "bingoSessions", "ABC123", "players", "민수"),
        {
          availableWords: draftPlayer.availableWords,
          studentName: draftPlayer.studentName,
          studentNameNormalized: draftPlayer.studentNameNormalized,
          boardSize: draftPlayer.boardSize,
          requiredCellCount: draftPlayer.requiredCellCount,
          setupStatus: "arranging",
          boardWordIds: draftPlayer.boardWordIds,
          boardCells: draftPlayer.boardCells,
          markedWordIds: draftPlayer.markedWordIds,
          bingoLines: draftPlayer.bingoLines,
          completedLineKeys: draftPlayer.completedLineKeys,
          hasBingo: draftPlayer.hasBingo,
          bingoRank: draftPlayer.bingoRank,
          setupStartedAt: draftPlayer.setupStartedAt,
          setupCompletedAt: draftPlayer.setupCompletedAt,
          joinedAt: draftPlayer.joinedAt,
          updatedAt: draftPlayer.updatedAt,
        },
      ),
    );
  },
);
