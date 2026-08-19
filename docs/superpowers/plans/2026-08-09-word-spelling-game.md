# 영어 철자 완성 게임 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax (- [ ]) for tracking.

**Goal:** 학생이 단어의 일부 철자를 단서로 보고 키보드로 전체 단어를 입력하며, 3회 시도 점수와 독립 리더보드에 기록을 남길 수 있는 철자 완성 게임을 추가한다.

**Architecture:** 기존 WordTypingGame.jsx와 분리된 WordSpellingGame.jsx를 만들고, 순수 철자 규칙은 wordSpelling.js에서 관리한다. 리더보드는 기존 공통 활동 정의와 Firebase 기간별 저장 흐름을 재사용하되 spellingLeaderboards 컬렉션을 별도로 사용한다. 개인 성장 기록 프로필은 이번 계획에 포함하지 않는다.

**Tech Stack:** React 19, Vite, vanilla CSS, Firebase Firestore, Firebase Rules Unit Testing, Node test runner, Playwright smoke test

## Global Constraints

- 학생 홈 버튼 순서는 단어 낚시 → 철자 완성 게임 → 영어 단어 타자 게임으로 유지한다.
- 새 게임은 activityType을 spelling으로, Firestore 컬렉션을 spellingLeaderboards로 사용한다.
- WordTypingGame.jsx에 새 게임 코드를 추가하지 않는다.
- 한 파일이 500줄에 가까워지면 시작 카드와 결과 카드를 별도 컴포넌트로 유지한다.
- 문제당 최대 3회 입력하며 1·2·3번째 정답은 100·70·40점, 3회 오답 후 정답 공개는 10점이다.
- 긴 단어에는 중간 철자 단서가 반드시 포함되고, 같은 게임을 다시 시작하면 가능한 범위에서 중간 단서 위치가 달라진다.
- 단어 세트의 순서와 중복 항목은 유지한다. 동일 단어가 반복되어도 출제마다 가림 패턴을 새로 고른다.
- Firebase가 없어도 로컬 게임은 진행할 수 있지만 리더보드 저장 불가 이유를 결과 화면에 표시한다.
- 게임 시작, 입력 확인, 다음 문제, 점수 저장 버튼에는 gi-pulse 강조 효과를 적용하고 reduced-motion 설정에서는 애니메이션을 줄인다.
- 새 의존성을 추가하지 않는다.
- 구현 완료 시 package.json과 화면 업데이트 기록의 버전을 1.12.0으로 맞춘다.

---

## File Map

### Create

- src/utils/wordSpelling.js: 단어 정규화, 가림 패턴, 정답 판정, 시도 점수와 결과 지표를 제공한다.
- src/utils/wordSpelling.test.js: 철자 규칙의 TDD 회귀 테스트를 제공한다.
- src/utils/activityLeaderboard.test.js: spelling 활동 정의와 동률 비교 테스트를 제공한다.
- src/components/WordSpellingStartCard.jsx: 게임 시작 안내와 시작 버튼을 렌더링한다.
- src/components/WordSpellingResultCard.jsx: 결과 요약과 철자 리더보드 section을 렌더링한다.
- src/components/WordSpellingGame.jsx: 게임 상태, 입력 제출, 문제 전환을 관리한다.

### Modify

- src/utils/activityLeaderboard.js: spelling 활동 정의와 철자 리더보드 동률 비교를 추가한다.
- src/components/teacher/teacherLeaderboardView.js: 교사 철자 리더보드 상세 지표를 표시한다.
- src/lib/firebase.js: 철자 리더보드 검증, 저장, 조회, 교사 이름 수정·삭제 API를 추가한다.
- src/lib/firebase.test.js: 철자 리더보드 검증과 저장 계약을 테스트한다.
- firestore.rules: spellingLeaderboards 경로의 학생·교사 권한과 필드 범위를 검증한다.
- tests/firestore.rules.test.js: 철자 리더보드 규칙 허용·거부 사례를 추가한다.
- src/components/GameLeaderboardPanel.jsx: spelling 핸들러와 표시 지표를 연결한다.
- src/components/ModeSelector.jsx: 새 버튼 callback과 버튼을 단어 낚시와 타자 게임 사이에 추가한다.
- src/App.jsx: lazy import, APP_VIEWS.SPELLING, 홈 callback과 게임 route를 추가한다.
- src/utils/appChrome.test.js: spelling 화면의 compact chrome 계약을 추가한다.
- src/styles/global.css: 철자 게임 카드, 가림 글자, 피드백, 반응형 규칙과 gi-pulse를 추가한다.
- scripts/playwright_smoke.js: 홈 버튼 순서와 새 화면의 기본 접근성·overflow 검사를 추가한다.
- package.json: 새 Node 테스트 파일을 npm test 목록에 추가하고 버전을 1.12.0으로 올린다.
- src/constants/app.js: v1.12.0 업데이트 내역을 최상단에 추가한다.
- docs/project-handoff.md: 철자 게임 규칙, 리더보드 컬렉션, 검증 결과를 기록한다.

---

### Task 1: 철자 규칙 유틸리티를 TDD로 구현

**Files:**
- Create: src/utils/wordSpelling.js
- Create: src/utils/wordSpelling.test.js
- Modify: package.json:4, package.json:8-12

**Interfaces:**

- Consumes: 단어 항목 배열과 선택 가능한 난수 함수
- Produces: 다음 exports를 이후 UI가 사용한다.
  - SPELLING_ATTEMPT_LIMIT: 숫자 3
  - SPELLING_SCORE_BY_ATTEMPT: 1회 100, 2회 70, 3회 40
  - normalizeSpellingItems(items)
  - normalizeSpellingAnswer(value)
  - isSpellingAnswerCorrect(input, expectedWord)
  - createSpellingMask(word, options)
  - calculateSpellingAttemptScore({ attemptsUsed, revealed })
  - calculateSpellingAccuracy(correctCount, questionCount)

**Implementation contract:**

    normalizeSpellingItems(items)
    -> Array<{
         id: string,
         word: string,
         meaning: string,
         normalizedWord: string,
         letterCount: number
       }>

    createSpellingMask(word, {
      usedSignatures = new Set(),
      random = Math.random
    })
    -> {
         characters: Array<{
           value: string,
           visible: boolean,
           separator: boolean
         }>,
         visibleIndexes: number[],
         signature: string,
         displayText: string
       }

- [ ] **Step 1: 테스트 파일에 정규화와 점수 실패 사례를 작성한다.**

    import test from "node:test";
    import assert from "node:assert/strict";
    import {
      calculateSpellingAccuracy,
      calculateSpellingAttemptScore,
      isSpellingAnswerCorrect,
      normalizeSpellingItems,
    } from "./wordSpelling.js";

    test("normalizes spelling items and answers", () => {
      const items = normalizeSpellingItems([
        { id: "1", word: "  Ice  Cream ", meaning: "아이스크림" },
        { id: "2", word: "", meaning: "비어 있음" },
      ]);

      assert.equal(items.length, 1);
      assert.equal(items[0].normalizedWord, "ice cream");
      assert.equal(isSpellingAnswerCorrect(" ICE   CREAM ", "ice cream"), true);
    });

    test("calculates the fixed spelling attempt scores", () => {
      assert.equal(calculateSpellingAttemptScore({ attemptsUsed: 1 }), 100);
      assert.equal(calculateSpellingAttemptScore({ attemptsUsed: 2 }), 70);
      assert.equal(calculateSpellingAttemptScore({ attemptsUsed: 3 }), 40);
      assert.equal(calculateSpellingAttemptScore({ attemptsUsed: 3, revealed: true }), 10);
    });

    test("calculates accuracy from completed questions", () => {
      assert.equal(calculateSpellingAccuracy(2, 3), 67);
      assert.equal(calculateSpellingAccuracy(0, 0), 0);
    });

- [ ] **Step 2: 테스트를 단독 실행해 아직 export가 없어 실패하는지 확인한다.**

Run: node --test src/utils/wordSpelling.test.js

Expected: FAIL with a module/export error because src/utils/wordSpelling.js does not exist yet.

- [ ] **Step 3: 정규화와 점수 계산을 최소 구현한다.**

  - normalizeSpellingItems는 배열이 아닌 입력을 빈 배열로 처리한다.
  - word를 trim하고 연속 공백을 하나로 줄인다.
  - word가 비어 있는 항목은 제외하고, meaning은 같은 방식으로 정리한다.
  - 답안 비교는 소문자와 공백 정규화만 적용하며 하이픈과 아포스트로피는 보존한다.
  - calculateSpellingAttemptScore는 revealed가 true면 10, 그렇지 않으면 1·2·3회에 대해 100·70·40을 반환하고 범위를 벗어나면 0을 반환한다.
  - accuracy는 questionCount가 0이면 0, 아니면 correctCount / questionCount를 백분율 반올림으로 반환한다.

- [ ] **Step 4: 단어 길이별 가림 패턴 테스트를 추가한다.**

    import { createSpellingMask } from "./wordSpelling.js";

    test("shows an internal clue for long words", () => {
      const mask = createSpellingMask("computer", { random: () => 0.25 });

      assert.equal(mask.visibleIndexes.includes(0), true);
      assert.equal(mask.visibleIndexes.includes(7), true);
      assert.equal(
        mask.visibleIndexes.some((index) => index > 0 && index < 7),
        true,
      );
      assert.equal(mask.characters.filter((character) => character.visible).length, 3);
    });

    test("uses the configured clue count for short and medium words", () => {
      assert.equal(
        createSpellingMask("cat", { random: () => 0 }).visibleIndexes.length,
        1,
      );
      assert.equal(
        createSpellingMask("apple", { random: () => 0 }).visibleIndexes.length,
        2,
      );
      assert.equal(
        createSpellingMask("responsibility", { random: () => 0 }).visibleIndexes.length,
        4,
      );
    });

    test("avoids a used mask signature when another pattern exists", () => {
      const usedSignatures = new Set();
      const first = createSpellingMask("computer", {
        usedSignatures,
        random: () => 0,
      });
      usedSignatures.add(first.signature);

      const second = createSpellingMask("computer", {
        usedSignatures,
        random: () => 0,
      });

      assert.notEqual(second.signature, first.signature);
    });

- [ ] **Step 5: 길이별 후보 생성과 마스크 중복 방지를 구현한다.**

  - 3~4글자는 표시 글자 1개를 선택한다.
  - 5~7글자는 표시 글자 2개를 선택하고 내부 글자 인덱스를 최소 하나 포함한다.
  - 8~10글자는 첫 글자·끝 글자·내부 글자 1개를 표시한다.
  - 11글자 이상은 첫 글자·끝 글자·서로 다른 내부 글자 2개를 표시한다.
  - 알파벳이 아닌 공백·하이픈·아포스트로피는 separator true와 visible true로 고정한다.
  - 후보 signature를 무작위 시작점부터 순회해 usedSignatures에 없는 후보를 선택한다. 후보를 모두 사용했으면 직전과 다른 후보를 우선하고, 후보가 하나뿐이면 재사용한다.
  - displayText는 표시 글자는 소문자 원문, 숨겨진 글자는 underscore, separator는 원문으로 만든다.

- [ ] **Step 6: 전체 유틸리티 테스트를 통과시키고 커밋한다.**

Run: node --test src/utils/wordSpelling.test.js

Expected: PASS for normalization, answer matching, score, accuracy, length rules, internal clues, and mask rotation.

Run: node --check src/utils/wordSpelling.js

Expected: no syntax errors.

Modify package.json test script to include src/utils/wordSpelling.test.js.

Commit:

    git add src/utils/wordSpelling.js src/utils/wordSpelling.test.js package.json
    git commit -m "feat: add spelling game rules"

---

### Task 2: 공통 활동 정의와 리더보드 동률 규칙 추가

**Files:**
- Modify: src/utils/activityLeaderboard.js:9-25, 45-105
- Create: src/utils/activityLeaderboard.test.js
- Modify: src/components/teacher/teacherLeaderboardView.js:9-42
- Modify: src/utils/teacherLeaderboards.test.js:1-20
- Modify: package.json test script

**Interfaces:**

- Consumes: 기존 ActivityLeaderboardEntry 형태와 spelling metric fields
- Produces: getActivityLeaderboardDefinition("spelling")이 spelling 정의를 반환하고, 공통 선택·교사 탭이 spelling을 인식한다.

- [ ] **Step 1: spelling 정의와 동률 테스트를 작성한다.**

    import test from "node:test";
    import assert from "node:assert/strict";
    import {
      ACTIVITY_LEADERBOARD_DEFINITIONS,
      getActivityLeaderboardDefinition,
      pickBetterActivityLeaderboardEntry,
    } from "./activityLeaderboard.js";

    test("registers spelling as an independent leaderboard activity", () => {
      assert.deepEqual(getActivityLeaderboardDefinition("spelling"), {
        type: "spelling",
        label: "철자 완성",
        collectionName: "spellingLeaderboards",
      });
      assert.deepEqual(
        ACTIVITY_LEADERBOARD_DEFINITIONS.map((definition) => definition.type),
        ["matching", "fishing", "spelling", "typing"],
      );
    });

    test("ranks spelling ties by correct count, attempts, then elapsed time", () => {
      const winner = pickBetterActivityLeaderboardEntry(
        {
          score: 180,
          correctCount: 2,
          totalAttempts: 6,
          elapsedSeconds: 50,
          revealedCount: 1,
        },
        {
          score: 180,
          correctCount: 2,
          totalAttempts: 7,
          elapsedSeconds: 40,
          revealedCount: 1,
        },
      );

      assert.equal(winner.totalAttempts, 6);
    });

- [ ] **Step 2: 테스트를 실행해 spelling 정의가 없어 실패하는지 확인한다.**

Run: node --test src/utils/activityLeaderboard.test.js

Expected: FAIL because the current activity definitions do not contain spelling.

- [ ] **Step 3: activityLeaderboard.js에 spelling을 등록한다.**

  - fishing과 typing 사이에 spelling 정의를 추가해 학생 결과와 교사 탭 순서를 맞춘다.
  - hasSpellingMetrics를 추가해 revealedCount 또는 totalAttempts 필드를 가진 기록을 spelling 비교 대상으로 판정한다.
  - spelling 비교 순서는 score 내림차순, correctCount 내림차순, totalAttempts 오름차순, elapsedSeconds 오름차순, updatedAt 내림차순이다.
  - 기존 matching과 typing 비교 순서는 변경하지 않는다.

- [ ] **Step 4: 교사 상세 지표 표시 테스트와 구현을 추가한다.**

  teacherLeaderboardView.js의 formatTeacherLeaderboardEntryDetail에 spelling branch를 추가한다.

    if (activityType === "spelling") {
      detailParts.push(
        "정답 " + (entry.correctCount ?? 0) + "/" + (entry.questionCount ?? 0),
      );
      detailParts.push("공개 " + (entry.revealedCount ?? 0) + "회");
      detailParts.push("시도 " + (entry.totalAttempts ?? 0) + "회");
    }

  src/utils/teacherLeaderboards.test.js에는 spelling definition이 공통 teacher definition에서 반환되는지 추가한다.

- [ ] **Step 5: 공통 테스트를 통과시키고 커밋한다.**

Run: node --test src/utils/activityLeaderboard.test.js src/utils/teacherLeaderboards.test.js

Expected: PASS.

Modify package.json test script to include src/utils/activityLeaderboard.test.js.

Commit:

    git add src/utils/activityLeaderboard.js src/utils/activityLeaderboard.test.js src/components/teacher/teacherLeaderboardView.js src/utils/teacherLeaderboards.test.js package.json
    git commit -m "feat: register spelling leaderboard activity"

---

### Task 3: Firebase 철자 리더보드 저장·조회 API와 Firestore 규칙 구현

**Files:**
- Modify: src/lib/firebase.js:189-285, 580-735, 820-1120, 1256-1400, 1514-2030, 2794-3160
- Modify: src/lib/firebase.test.js
- Modify: firestore.rules:500-620, 867-900
- Modify: tests/firestore.rules.test.js

**Interfaces:**

- Consumes: spelling result metrics and existing school/grade/period helpers
- Produces:
  - validateSpellingLeaderboardResult({ score, elapsedSeconds, questionCount, correctCount, accuracy, revealedCount, totalAttempts })
  - fetchSpellingLeaderboards({ schoolId, grade, now, limitCount })
  - saveSpellingLeaderboardScore({ schoolId, schoolName, grade, studentName, score, elapsedSeconds, questionCount, correctCount, accuracy, revealedCount, totalAttempts, now })
  - fetchTeacherActivityLeaderboards("spelling", ...)
  - renameTeacherActivityLeaderboardStudent({ activityType: "spelling", ... })
  - deleteTeacherActivityLeaderboardStudent({ activityType: "spelling", ... })

- [ ] **Step 1: Firebase validator tests를 작성한다.**

    test("validates spelling leaderboard metrics", () => {
      assert.deepEqual(
        validateSpellingLeaderboardResult({
          score: 180,
          elapsedSeconds: 60,
          questionCount: 3,
          correctCount: 2,
          accuracy: 67,
          revealedCount: 1,
          totalAttempts: 5,
        }),
        {
          score: 180,
          elapsedSeconds: 60,
          questionCount: 3,
          correctCount: 2,
          accuracy: 67,
          revealedCount: 1,
          totalAttempts: 5,
        },
      );
    });

    test("rejects impossible spelling leaderboard metrics", () => {
      assert.throws(
        () => validateSpellingLeaderboardResult({
          score: 301,
          elapsedSeconds: 60,
          questionCount: 3,
          correctCount: 2,
          accuracy: 67,
          revealedCount: 1,
          totalAttempts: 5,
        }),
        /score/i,
      );
      assert.throws(
        () => validateSpellingLeaderboardResult({
          score: 180,
          elapsedSeconds: 60,
          questionCount: 3,
          correctCount: 2,
          accuracy: 67,
          revealedCount: 1,
          totalAttempts: 2,
        }),
        /totalAttempts/i,
      );
    });

- [ ] **Step 2: validator를 실행해 export가 없어 실패하는지 확인한다.**

Run: node --test src/lib/firebase.test.js

Expected: FAIL for the new spelling validator tests only.

- [ ] **Step 3: validateSpellingLeaderboardResult를 구현한다.**

  - questionCount는 정수 1~500이다.
  - correctCount와 revealedCount는 0 이상 questionCount 이하이며 correctCount + revealedCount는 questionCount와 같다.
  - totalAttempts는 정수 questionCount 이상 questionCount * 3 이하이다.
  - accuracy는 정수 0~100이며 기존 typing 정확도와 같은 오차 허용식으로 correctCount와 일치해야 한다.
  - elapsedSeconds는 정수 0~86400이다.
  - score는 0 이상 questionCount * 100 이하이다.
  - 검증 후 숫자 필드만 포함한 정규화 결과를 반환한다.

- [ ] **Step 4: spelling payload·reference·upsert helper를 구현한다.**

  typing helper를 복사해 이름만 바꾸는 것이 아니라 spelling metric fields를 정확히 전달한다.

  - createSpellingLeaderboardPayload는 schoolId, schoolName, grade, studentName, periodType, periodKey와 검증 결과를 합친다.
  - createSpellingLeaderboardEntryRef는 spellingLeaderboards/{scopeKey}/entries/{studentKey}를 가리킨다.
  - createSpellingLeaderboardWritePayload는 교사 이름 변경 시 기존 spelling metric을 유지한다.
  - upsertSpellingLeaderboardPeriod는 없으면 생성하고, 있으면 score → correctCount → totalAttempts 역순 → elapsedSeconds 순으로 더 좋은 기록일 때만 update한다.
  - update 시 score, elapsedSeconds, questionCount, correctCount, accuracy, revealedCount, totalAttempts, updatedAt를 함께 갱신한다.
  - 생성·업데이트·skip 결과는 기존 updatedPeriods/skippedPeriods 처리와 호환되게 반환한다.

- [ ] **Step 5: fetch와 save 공개 API를 구현한다.**

  fetchSpellingLeaderboardPeriod는 spellingLeaderboards 컬렉션을 읽어 다음 순서로 정렬한다.

    score 내림차순
    correctCount 내림차순
    totalAttempts 오름차순
    elapsedSeconds 오름차순
    updatedAt 내림차순

  fetchSpellingLeaderboards는 기존 LEADERBOARD_PERIOD_DEFINITIONS를 순회해 week, month, year, school_all 객체를 반환한다.

  saveSpellingLeaderboardScore는 학교 id·이름·학년·학생 이름을 기존 함수와 같은 방식으로 검증하고, 결과를 먼저 validateSpellingLeaderboardResult로 검증한 뒤 모든 기간을 upsert한다.

- [ ] **Step 6: 교사 activity dispatch와 이름 변경·삭제를 추가한다.**

  fetchTeacherActivityLeaderboards, renameTeacherActivityLeaderboardStudent, deleteTeacherActivityLeaderboardStudent에 spelling branch를 추가한다.

  - renameTeacherSpellingLeaderboardStudent는 oldStudentName과 newStudentName을 각 기간에서 읽고, 새 이름 문서가 이미 있으면 spelling 동률 비교로 우승 기록을 남긴다.
  - deleteTeacherSpellingLeaderboardStudent는 각 기간의 spelling 문서를 transaction으로 삭제한다.
  - 기존 matching, fishing, typing branch의 동작은 변경하지 않는다.

- [ ] **Step 7: Firestore rules 테스트 fixture와 실패 사례를 추가한다.**

  tests/firestore.rules.test.js에 다음 fixture를 추가한다.

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
        score: 180,
        elapsedSeconds: 60,
        questionCount: 3,
        correctCount: 2,
        accuracy: 67,
        revealedCount: 1,
        totalAttempts: 5,
        createdAt: createTimestamp(10),
        updatedAt: createTimestamp(100),
        ...overrides,
      };
    }

  emulator 실행 시 다음 사례를 추가한다.

  - 학생이 자신의 studentNameNormalized 문서를 생성하면 성공한다.
  - 다른 studentKey, 다른 schoolId, scopeKey 불일치 문서는 실패한다.
  - correctCount + revealedCount가 questionCount와 다르면 실패한다.
  - totalAttempts가 questionCount보다 작거나 questionCount * 3보다 크면 실패한다.
  - 점수가 기존보다 낮은 update는 실패한다.
  - 교사는 자신의 학교 spelling 문서를 수정·삭제할 수 있고 다른 학교 문서는 실패한다.

- [ ] **Step 8: Firebase와 규칙 테스트를 통과시키고 커밋한다.**

Run: node --test src/lib/firebase.test.js

Expected: PASS, including spelling validator tests.

Run: npm run test:rules

Expected: Firestore emulator is started by the script and spelling create/update/delete cases pass. If Java or emulator setup is unavailable, stop at the environment error and report it rather than treating rules as verified.

Commit:

    git add src/lib/firebase.js src/lib/firebase.test.js firestore.rules tests/firestore.rules.test.js
    git commit -m "feat: persist spelling leaderboard scores"

---

### Task 4: 공통 학생 리더보드 패널에 spelling 연결

**Files:**
- Modify: src/components/GameLeaderboardPanel.jsx:1-70, 100-230, 250-410

**Interfaces:**

- Consumes: fetchSpellingLeaderboards, saveSpellingLeaderboardScore, activityType="spelling", spelling metrics
- Produces: 결과 화면에서 기존 이름 입력·저장·기간 탭·오류 상태 흐름을 그대로 사용할 수 있다.

- [ ] **Step 1: 패널 연결 지점을 수정한다.**

  - firebase import에 fetchSpellingLeaderboards와 saveSpellingLeaderboardScore를 추가한다.
  - LEADERBOARD_HANDLERS.spelling에 fetchLeaderboards와 saveScore를 연결한다.
  - getActivityDefinition은 spelling을 공통 정의에서 반환하게 하고, typing의 기존 표시 override는 유지한다.
  - formatLeaderboardEntryDetail에 spelling branch를 추가한다.

    if (activityType === "spelling") {
      detailParts.push(
        "정답 " + (entry.correctCount ?? 0) + "/" + (entry.questionCount ?? 0),
      );
      detailParts.push("공개 " + (entry.revealedCount ?? 0) + "회");
      detailParts.push("시도 " + (entry.totalAttempts ?? 0) + "회");
    }

  - 패널의 저장 성공 후 refresh는 spelling fetch API를 사용한다.
  - 저장 버튼과 이름 입력은 기존 remoteConfigured, schoolId, schoolName, grade 검사를 그대로 따른다.

- [ ] **Step 2: 빌드와 기존 패널 관련 테스트를 실행한다.**

Run: npm run build

Expected: PASS with spelling Firebase exports resolved.

Run: node --test src/utils/studentResultSave.test.js src/utils/teacherLeaderboards.test.js src/lib/firebase.test.js

Expected: PASS; existing matching, fishing, typing behavior remains unchanged.

- [ ] **Step 3: 패널 변경을 커밋한다.**

    git add src/components/GameLeaderboardPanel.jsx
    git commit -m "feat: connect spelling leaderboard panel"

---

### Task 5: 독립 철자 게임 화면 구현

**Files:**
- Create: src/components/WordSpellingStartCard.jsx
- Create: src/components/WordSpellingResultCard.jsx
- Create: src/components/WordSpellingGame.jsx

**Interfaces:**

    export function WordSpellingStartCard({
      canStart,
      itemCount,
      onStart,
      onBack,
    })

    export function WordSpellingResultCard({
      score,
      correctCount,
      questionCount,
      revealedCount,
      totalAttempts,
      elapsedSeconds,
      leaderboardContext,
      remoteConfigured,
      studentNameDraft,
      onStudentNameDraftChange,
      onRetry,
      onBack,
    })

    export function WordSpellingGame({
      items,
      celebration,
      leaderboardContext,
      remoteConfigured,
      studentNameDraft,
      onStudentNameDraftChange,
      onBack,
    })

- [ ] **Step 1: 시작 카드와 결과 카드의 정적 구조를 만든다.**

  WordSpellingStartCard는 workspace-panel 안에서 다음을 표시한다.

  - mode-label: Spelling Completion
  - 제목: 철자 완성 게임
  - 현재 문제 수
  - 가려진 철자를 보고 영어 단어 전체를 입력한다는 설명
  - gi-pulse가 적용된 게임 시작 버튼
  - 홈으로 버튼

  WordSpellingResultCard는 다음 지표를 표시한다.

  - 최종 점수
  - 정답 문제 수 / 전체 문제 수
  - 정답 공개 문제 수
  - 총 시도 횟수
  - 걸린 시간
  - 다시 하기, 홈으로 버튼
  - activityType="spelling"인 GameLeaderboardPanel

  리더보드 호출은 다음 계약을 사용한다.

    <GameLeaderboardPanel
      activityType="spelling"
      finalScore={score}
      elapsedSeconds={elapsedSeconds}
      leaderboardContext={leaderboardContext}
      remoteConfigured={remoteConfigured}
      studentNameDraft={studentNameDraft}
      onStudentNameDraftChange={onStudentNameDraftChange}
      metrics={{
        correctCount,
        questionCount,
        accuracy,
        revealedCount,
        totalAttempts,
      }}
    />

- [ ] **Step 2: WordSpellingGame의 준비 상태와 정리 effect를 구현한다.**

  - normalizeSpellingItems(items) 결과를 memoized spellingItems로 만든다.
  - phase는 ready, playing, complete 세 값만 사용한다.
  - questions, questionIndex, attemptCount, questionCompleted, score, correctCount, revealedCount, totalAttempts, currentInput, feedbackTone, feedbackMessage, elapsedMs를 관리한다.
  - items가 바뀌거나 컴포넌트가 unmount되면 timeout과 현재 상태를 정리한다.
  - canStart는 spellingItems.length > 0이다.
  - startGame은 mask signature Map을 새로 만들고 spellingItems의 현재 순서를 유지한 채 각 항목에 새로운 마스크를 부여한다.

  라운드 생성은 다음 형태를 유지한다.

    const usedMasksByWord = new Map();

    const nextQuestions = spellingItems.map((item) => {
      const usedSignatures =
        usedMasksByWord.get(item.normalizedWord) ?? new Set();
      const mask = createSpellingMask(item.word, { usedSignatures });
      usedSignatures.add(mask.signature);
      usedMasksByWord.set(item.normalizedWord, usedSignatures);

      return { ...item, mask };
    });

- [ ] **Step 3: 입력 제출과 문제 완료 상태를 구현한다.**

  handleSubmit은 빈 입력을 시도로 계산하지 않고, 완료된 문제에는 아무 동작도 하지 않는다.

    function handleSubmit(event) {
      event?.preventDefault?.();

      if (!activeQuestion || questionCompleted) {
        return;
      }

      const answer = currentInput.trim();
      if (!answer) {
        setFeedbackTone("wrong");
        setFeedbackMessage("먼저 영어 단어를 입력해 주세요.");
        return;
      }

      const nextAttemptCount = attemptCount + 1;
      setAttemptCount(nextAttemptCount);
      setTotalAttempts((current) => current + 1);

      if (isSpellingAnswerCorrect(answer, activeQuestion.word)) {
        setScore((current) =>
          current + calculateSpellingAttemptScore({
            attemptsUsed: nextAttemptCount,
          }),
        );
        setCorrectCount((current) => current + 1);
        completeCurrentQuestion("correct");
        return;
      }

      if (nextAttemptCount >= SPELLING_ATTEMPT_LIMIT) {
        setScore((current) =>
          current + calculateSpellingAttemptScore({
            attemptsUsed: nextAttemptCount,
            revealed: true,
          }),
        );
        setRevealedCount((current) => current + 1);
        completeCurrentQuestion("revealed");
        return;
      }

      setFeedbackTone("wrong");
      setFeedbackMessage(
        "다시 한 번 살펴보고 써 보세요. " +
          (SPELLING_ATTEMPT_LIMIT - nextAttemptCount) +
          "번 더 입력할 수 있어요.",
      );
    }

  completeCurrentQuestion은 questionCompleted를 true로 바꾸고 다음 문제 버튼을 활성화한다. 다음 문제 버튼을 누르면 questionIndex를 증가시키고 attemptCount, questionCompleted, currentInput, feedback을 초기화한다. 마지막 문제에서 누르면 elapsedSeconds를 확정하고 phase를 complete로 바꾼다.

- [ ] **Step 4: 플레이 화면의 접근성 구조를 구현한다.**

  - 현재 문제와 전체 문제 수를 heading과 status 영역에 표시한다.
  - mask.characters를 순회해 각 글자를 별도 span으로 렌더링한다.
  - 빈칸 span에는 aria-hidden을 남용하지 않고 전체 단어 단서의 의미를 question card aria-label로 제공한다.
  - input에는 학생 이름 input과 구분되는 명확한 label인 영어 철자를 입력하세요를 연결한다.
  - 입력 확인은 form submit으로 연결하고 Enter 키를 지원한다.
  - 정답·정답 공개 상태는 aria-live="polite"로 읽히게 한다.
  - 다음 문제는 문제 완료 전 disabled이고 완료 후 gi-pulse를 적용한다.
  - celebration.playSuccess는 정답에만, celebration.playCompletion은 전체 완료에만 호출한다.

- [ ] **Step 5: 컴포넌트 경계와 JSX import를 점검한다.**

  - WordSpellingGame.jsx가 게임 상태와 문제 전환만 관리하고, 시작·결과 markup이 카드 파일에 남아 있는지 확인한다.
  - 세 컴포넌트의 named export 이름이 Interfaces 섹션과 일치하는지 확인한다.
  - 각 파일이 500줄 미만인지 확인한다.

Run: wc -l src/components/WordSpellingStartCard.jsx src/components/WordSpellingResultCard.jsx src/components/WordSpellingGame.jsx

Expected: all three files remain below 500 lines. JSX syntax and import resolution are verified by the build in Task 6 after App route integration.

- [ ] **Step 6: 게임 화면 구현을 커밋한다.**

    git add src/components/WordSpellingStartCard.jsx src/components/WordSpellingResultCard.jsx src/components/WordSpellingGame.jsx
    git commit -m "feat: add spelling completion game screens"

---

### Task 6: 학생 홈과 App view에 게임 연결

**Files:**
- Modify: src/App.jsx:34-45, 59-70, 284-326, 438-450
- Modify: src/components/ModeSelector.jsx:3-44, 379-422
- Modify: src/utils/appChrome.test.js

**Interfaces:**

- Consumes: WordSpellingGame props and spelling game callback
- Produces: 홈에서 단어 낚시와 타자 게임 사이의 새 버튼, spelling view route, compact app chrome

- [ ] **Step 1: appChrome 회귀 테스트에 spelling 화면을 추가한다.**

  compactLayouts에 다음 케이스를 추가한다.

    [
      "spelling",
      "Spelling Completion",
      "철자 완성 게임",
      "가려진 철자를 보고 영어 단어를 완성해보세요.",
      "철자 완성 게임 화면",
    ]

  getAppChromeLayout의 기존 compact layout 계약을 유지하면서 spelling이 compact로 처리되는지 확인한다.

- [ ] **Step 2: App에 lazy import와 view route를 추가한다.**

  - WordSpellingGame lazy import를 WordFishingGame과 WordTypingGame 사이에 둔다.
  - APP_VIEWS에 SPELLING: "spelling"을 추가한다.
  - ModeSelector에 onOpenSpelling={() => navigateTo(APP_VIEWS.SPELLING)}를 전달한다.
  - fishing과 typing 사이에 WordSpellingGame을 렌더링한다.
  - 전달 props는 items, celebration, leaderboardContext, remoteConfigured, studentNameDraft, onStudentNameDraftChange, onBack이다.
  - speech와 progressionContext는 새 게임에 전달하지 않는다.

- [ ] **Step 3: ModeSelector prop과 버튼을 추가한다.**

  prop 목록에 onOpenSpelling을 추가하고 게임 활동 stack-actions를 다음 순서로 유지한다.

    단어 짝 맞추기
    단어 낚시
    철자 완성 게임
    영어 단어 타자 게임
    학급 빙고 게임

  새 버튼은 hasVocabulary가 false일 때 disabled하고, className은 ghost-button으로 기존 게임 버튼 스타일을 따른다.

- [ ] **Step 4: route와 home 회귀 테스트를 실행한다.**

Run: node --test src/utils/appChrome.test.js

Expected: PASS including spelling compact layout.

Run: npm run build

Expected: PASS with the new lazy chunk and no unresolved imports.

- [ ] **Step 5: 홈 연결을 커밋한다.**

    git add src/App.jsx src/components/ModeSelector.jsx src/utils/appChrome.test.js
    git commit -m "feat: route spelling game from student home"

---

### Task 7: 철자 전용 UI 스타일, gi-pulse, 브라우저 검증과 릴리스 문서

**Files:**
- Modify: src/styles/global.css:1277-1431, 1760-1900, 2799-3065, 3183-end
- Modify: scripts/playwright_smoke.js
- Modify: package.json:4
- Modify: src/constants/app.js: current APP_UPDATES head
- Modify: docs/project-handoff.md

**Interfaces:**

- Consumes: WordSpellingGame class names and spelling leaderboard panel
- Produces: desktop/mobile UI, focus and motion behavior, release record and verified smoke checks

- [ ] **Step 1: 철자 게임 스타일을 추가한다.**

  기존 word-typing 스타일 근처에 word-spelling 스타일을 추가한다.

  - word-spelling-shell, word-spelling-grid
  - word-spelling-start-card, word-spelling-result-card
  - word-spelling-mask-card, word-spelling-mask-character, word-spelling-mask-hidden
  - word-spelling-input-form, word-spelling-textbox
  - word-spelling-feedback-idle, word-spelling-feedback-correct, word-spelling-feedback-wrong, word-spelling-feedback-revealed
  - word-spelling-summary-grid와 word-spelling-summary-card

  빈칸은 단서 글자와 다른 색상·배경으로 표시하되, 색상만으로 상태를 구분하지 않는다. 입력창 focus outline은 기존 파란 focus 규칙과 맞춘다.

- [ ] **Step 2: gi-pulse 애니메이션과 reduced-motion을 추가한다.**

  핵심 버튼에 사용할 class를 정의한다.

    .gi-pulse {
      animation: gi-pulse 2.2s ease-in-out infinite;
    }

    @keyframes gi-pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(29, 143, 255, 0.12);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(29, 143, 255, 0.03);
      }
    }

  prefers-reduced-motion: reduce에서는 animation: none으로 덮어쓴다. 새 게임의 게임 시작, 입력 확인, 다음 문제, 점수 저장에 이 class를 적용한다.

- [ ] **Step 3: responsive 규칙을 추가한다.**

  - 820px 이하에서는 요약 grid를 2열로 유지하되 전체 입력 영역은 한 열로 둔다.
  - 720px 이하에서는 입력창과 입력 확인 버튼, 결과 리더보드 row를 세로로 배치한다.
  - 480px 이하에서 마스크 글자와 버튼이 화면 밖으로 넘치지 않게 flex-wrap과 min-width: 0을 적용한다.
  - 기존 360px, 768px, 1280px viewport에서 document scrollWidth가 viewport보다 크지 않게 한다.

- [ ] **Step 4: Playwright smoke에 홈 버튼 순서 검사를 추가한다.**

  scripts/playwright_smoke.js의 홈 진입 직후에 다음 검사를 추가한다.

    const activityButtons = await page
      .locator('section[aria-labelledby="game-activity-label"] button')
      .allTextContents();

    const normalizedButtons = activityButtons.map((text) => text.trim());

    if (
      normalizedButtons.indexOf("단어 낚시") >=
        normalizedButtons.indexOf("철자 완성 게임") ||
      normalizedButtons.indexOf("철자 완성 게임") >=
        normalizedButtons.indexOf("영어 단어 타자 게임")
    ) {
      throw new Error("Spelling activity button order is incorrect.");
    }

  Firebase가 없는 smoke 환경에서도 버튼 텍스트 순서는 확인할 수 있어야 한다. 실제 문제 진행과 Firestore 저장은 별도 수동 QA에서 확인한다.

- [ ] **Step 5: 버전과 업데이트 기록을 갱신한다.**

  - package.json version을 1.12.0으로 변경한다.
  - src/constants/app.js의 APP_UPDATES 배열 최상단에 다음 release entry를 추가한다.

    {
      version: "v1.12.0",
      date: "2026-08-09",
      summary: [
        "학생 홈의 단어 낚시와 영어 단어 타자 게임 사이에 철자 완성 게임을 추가했습니다.",
        "단어 길이에 따라 중간 철자 단서를 랜덤으로 보여주고, 3회 시도 점수와 독립 철자 리더보드 등록을 지원합니다.",
      ],
    }

  - docs/project-handoff.md에 게임 목적, 100·70·40·10 점수, spellingLeaderboards 경로, 랜덤 mask 규칙, 테스트 명령과 결과를 기록한다.
  - 업데이트 내역은 newest-first 규칙을 지키고 package.json 버전과 화면 current version이 일치하는지 확인한다.

- [ ] **Step 6: 전체 테스트와 빌드를 실행한다.**

Run: npm test

Expected: PASS for existing tests plus wordSpelling.test.js and activityLeaderboard.test.js.

Run: npm run build

Expected: PASS with version 1.12.0 and spelling lazy chunk.

Run: npm run test:rules

Expected: PASS for spelling rules when the emulator environment is available.

Run: npm run test:smoke

Expected: PASS for update history, home button order, keyboard focus, and 360/768/1280px horizontal overflow.

- [ ] **Step 7: 실제 브라우저에서 철자 게임을 확인한다.**

Use the deployed or local browser with a loaded vocabulary set and verify:

  - 단어 낚시 다음에 철자 완성 게임 버튼이 있고 그 다음에 영어 단어 타자 게임이 있다.
  - 3~4글자, 5~7글자, 8~10글자, 11글자 이상 단어가 각 길이 규칙으로 표시된다.
  - 긴 단어의 중간 철자가 단서로 보인다.
  - 다시 하기를 눌렀을 때 같은 단어의 내부 단서 위치가 가능한 범위에서 달라진다.
  - 빈 입력은 시도 횟수를 소비하지 않는다.
  - 첫 번째 정답은 100점, 두 번째 정답은 70점, 세 번째 정답은 40점이다.
  - 세 번 모두 틀리면 10점, 정답 공개, 다음 문제 버튼 활성화가 확인된다.
  - 결과의 영어 철자 완성 리더보드에서 이름과 점수를 저장할 수 있다.
  - 교사 화면 리더보드 탭에 철자 완성이 나타나고 이름 수정·삭제가 동작한다.
  - 모바일 화면에서 입력창, 버튼, 리더보드가 가로로 잘리지 않는다.

- [ ] **Step 8: 릴리스 문서를 커밋한다.**

    git add src/styles/global.css scripts/playwright_smoke.js package.json src/constants/app.js docs/project-handoff.md
    git commit -m "release: document spelling completion game"

---

## Final Verification Checklist

- [ ] npm test 통과
- [ ] npm run build 통과
- [ ] npm run test:rules 통과 또는 emulator 미설정의 정확한 원인 기록
- [ ] npm run test:smoke 통과
- [ ] 새 버튼 순서와 모바일 overflow 확인
- [ ] 랜덤 mask 회귀 테스트 통과
- [ ] 100·70·40·10점 수동 확인
- [ ] spellingLeaderboards 학생 저장과 교사 관리 확인
- [ ] package.json, APP_UPDATES, project-handoff 버전이 1.12.0으로 일치
- [ ] 기존 타자·낚시·짝 맞추기 활동 회귀 없음
