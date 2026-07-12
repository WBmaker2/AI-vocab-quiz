# Session Review Mission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 활동이 끝난 직후 학생이 방금 틀린 문제만 3~5개 다시 풀 수 있는 `세션 직후 복습` 흐름을 듣기, 말하기, 타자 게임에 추가합니다.

**Architecture:** 각 활동 컴포넌트가 세션 중 틀린 문제를 로컬 상태로 수집하고, 결과 화면에서 `오답 복습 시작` CTA를 노출합니다. 복습 데이터 정렬/중복 제거는 공통 유틸로 처리하고, 복습 입력 UI는 각 활동이 원래 쓰던 상호작용을 그대로 재사용해 과도한 공통화 없이 붙입니다. Firebase 저장이나 장기 복습 큐는 이번 범위에서 제외합니다.

**Tech Stack:** React 19, Vite, 기존 `node:test` 유틸 테스트, 기존 TTS/STT hooks, 기존 quiz utility helpers

---

## File Structure

- Create: `src/utils/sessionReview.js`
  - 세션 오답 항목의 키 생성, dedupe, wrongCount 누적, 우선순위 정렬, 복습 세트 제한 개수 계산
- Create: `src/utils/sessionReview.test.js`
  - 공통 오답 복습 유틸 단위 테스트
- Create: `src/utils/quiz.test.js`
  - 듣기 복습용 선택지 생성 시 원본 전체 문제 풀을 distractor로 재사용하는지 검증
- Modify: `src/utils/quiz.js`
  - 듣기 복습 질문 생성 helper를 추가하거나 기존 helper를 확장
- Modify: `src/components/ListeningQuiz.jsx`
  - 듣기 퀴즈 오답 수집, 결과 화면 CTA, 복습 phase, 복습 완료 요약
- Modify: `src/components/SpeakingQuiz.jsx`
  - 말하기 퀴즈 오답 수집, 결과 화면 CTA, 복습 phase, 복습 완료 요약
- Modify: `src/components/WordTypingGame.jsx`
  - 타자 게임 오답 수집, 결과 화면 CTA, 복습 phase, 복습 완료 요약
- Modify: `src/components/ResultSummary.jsx`
  - 필요 시 결과 카드 하단 액션을 확장할 수 있도록 review CTA 슬롯을 추가
- Modify: `src/styles/global.css`
  - 복습 CTA 카드, 복습 완료 카드, 복습 진행 상태 UI 스타일
- Modify: `package.json`
  - 새 `node:test` 파일을 `npm test` 스크립트에 포함

## Product Rules

- 복습 대상은 `듣기`, `말하기`, `타자` 세 활동만 포함합니다.
- 같은 `word + meaning` 조합을 같은 세션에서 여러 번 틀려도 복습 목록에는 1개만 남기고 `wrongCount`만 증가시킵니다.
- 복습 문제 수는 최대 5개, 기본 노출은 3개부터 시작합니다.
- 복습 점수는 본 게임 점수와 분리합니다.
- 복습 시작은 강제가 아니라 결과 화면 CTA로 진입합니다.
- 복습 완료 후에는 `원래 결과 보기`와 `홈으로` 둘 다 가능해야 합니다.
- `예문`, `이미지 힌트`가 없어도 완전히 동작해야 합니다.

## State Model

### Shared review entry shape

```js
{
  reviewKey: "apple__사과",
  id: "item-id",
  word: "apple",
  meaning: "사과",
  imageHint: "",
  exampleSentence: "",
  sourceActivityType: "listening",
  wrongCount: 2,
  lastWrongAt: 1712900000000,
}
```

### Per-activity review state

- `reviewEntries`
- `reviewPhase` (`idle | playing | complete`)
- `reviewItems`
- `reviewIndex`
- `reviewScore`
- `reviewSummary`

`handleRetry` 또는 `startGame` 시 본 게임 상태와 함께 review 상태도 반드시 초기화합니다.

---

### Task 1: Add shared session review utilities

**Files:**
- Create: `src/utils/sessionReview.js`
- Test: `src/utils/sessionReview.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write the failing utility tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  createSessionReviewKey,
  registerSessionReviewMiss,
  buildSessionReviewItems,
} from "./sessionReview.js";

test("registerSessionReviewMiss dedupes by word and meaning", () => {
  const first = registerSessionReviewMiss([], {
    id: "1",
    word: "apple",
    meaning: "사과",
  });
  const second = registerSessionReviewMiss(first, {
    id: "2",
    word: "apple",
    meaning: "사과",
  });

  assert.equal(second.length, 1);
  assert.equal(second[0].wrongCount, 2);
});

test("buildSessionReviewItems prioritizes higher wrongCount then later miss", () => {
  const items = buildSessionReviewItems([
    { reviewKey: "a", wrongCount: 1, lastWrongAt: 10 },
    { reviewKey: "b", wrongCount: 3, lastWrongAt: 5 },
    { reviewKey: "c", wrongCount: 3, lastWrongAt: 20 },
  ], 2);

  assert.deepEqual(items.map((item) => item.reviewKey), ["c", "b"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/utils/sessionReview.test.js`
Expected: FAIL because `src/utils/sessionReview.js` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Implement in `src/utils/sessionReview.js`:

```js
export function createSessionReviewKey(item) {
  return `${String(item.word ?? "").trim().toLowerCase()}__${String(item.meaning ?? "").trim()}`;
}

export function registerSessionReviewMiss(entries, item, sourceActivityType, now = Date.now()) {
  const reviewKey = createSessionReviewKey(item);
  const existing = entries.find((entry) => entry.reviewKey === reviewKey);

  if (!existing) {
    return [
      ...entries,
      {
        reviewKey,
        id: item.id ?? reviewKey,
        word: item.word,
        meaning: item.meaning,
        imageHint: item.imageHint ?? "",
        exampleSentence: item.exampleSentence ?? "",
        sourceActivityType,
        wrongCount: 1,
        lastWrongAt: now,
      },
    ];
  }

  return entries.map((entry) =>
    entry.reviewKey === reviewKey
      ? { ...entry, wrongCount: entry.wrongCount + 1, lastWrongAt: now }
      : entry,
  );
}

export function buildSessionReviewItems(entries, limit = 5) {
  return [...entries]
    .sort((left, right) => {
      if (right.wrongCount !== left.wrongCount) {
        return right.wrongCount - left.wrongCount;
      }
      return right.lastWrongAt - left.lastWrongAt;
    })
    .slice(0, limit);
}
```

- [ ] **Step 4: Add the new test file to the package test script**

Update `package.json` `test` script to include:

```json
"node --test src/utils/sessionReview.test.js ..."
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test src/utils/sessionReview.test.js`
Expected: PASS

- [ ] **Step 6: Run full test script**

Run: `npm test`
Expected: PASS with the new session review util test included.

- [ ] **Step 7: Commit**

```bash
git add package.json src/utils/sessionReview.js src/utils/sessionReview.test.js
git commit -m "feat: add session review utilities"
```

---

### Task 2: Extend quiz helpers for listening review questions

**Files:**
- Modify: `src/utils/quiz.js`
- Test: `src/utils/quiz.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write the failing quiz utility tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createListeningQuestions } from "./quiz.js";

test("createListeningQuestions uses the full pool for distractors when review items are few", () => {
  const reviewItems = [{ id: "1", word: "apple", meaning: "사과" }];
  const allItems = [
    { id: "1", word: "apple", meaning: "사과" },
    { id: "2", word: "banana", meaning: "바나나" },
    { id: "3", word: "cat", meaning: "고양이" },
    { id: "4", word: "dog", meaning: "강아지" },
  ];

  const [question] = createListeningQuestions(reviewItems, allItems);
  assert.equal(question.choices.length, 4);
  assert.ok(question.choices.includes("사과"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/utils/quiz.test.js`
Expected: FAIL because `createListeningQuestions` does not yet accept a second pool argument.

- [ ] **Step 3: Update the helper with a choice pool parameter**

Refactor `src/utils/quiz.js`:

```js
export function createListeningQuestions(items, choicePool = items) {
  const uniqueMeaningItems = getUniqueMeaningItems(choicePool);
  ...
}
```

Keep the current default behavior unchanged for existing callers.

- [ ] **Step 4: Add the new test file to the package test script**

Update `package.json` `test` script to include:

```json
"node --test src/utils/quiz.test.js ..."
```

- [ ] **Step 5: Run the quiz utility test**

Run: `node --test src/utils/quiz.test.js`
Expected: PASS

- [ ] **Step 6: Run the existing relevant utility tests**

Run: `node --test src/utils/wordTyping.test.js src/utils/sessionReview.test.js src/utils/quiz.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add package.json src/utils/quiz.js src/utils/quiz.test.js
git commit -m "refactor: support listening review question pools"
```

---

### Task 3: Add session review flow to Listening Quiz

**Files:**
- Modify: `src/components/ListeningQuiz.jsx`
- Modify: `src/components/ResultSummary.jsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Introduce review state into the component**

Add local state:

```js
const [reviewEntries, setReviewEntries] = useState([]);
const [reviewPhase, setReviewPhase] = useState("idle");
const [reviewQuestions, setReviewQuestions] = useState([]);
const [reviewIndex, setReviewIndex] = useState(0);
const [reviewScore, setReviewScore] = useState(0);
const [reviewSelectedAnswer, setReviewSelectedAnswer] = useState("");
const [reviewStatus, setReviewStatus] = useState("idle");
const [reviewSummary, setReviewSummary] = useState(null);
```

- [ ] **Step 2: Record incorrect answers during the main session**

In the wrong-answer branch of `handleSelectChoice`, add:

```js
setReviewEntries((current) =>
  registerSessionReviewMiss(current, question, "listening"),
);
```

- [ ] **Step 3: Reset review state on retry and item changes**

Clear all review-related state inside the existing reset effect and `handleRetry`.

- [ ] **Step 4: Add the result-screen CTA**

When `reviewEntries.length > 0` and `reviewPhase === "idle"`, render:

```jsx
<article className="session-review-card">
  <p className="mode-label">Session Review</p>
  <h4>방금 틀린 문제만 다시 연습할까요?</h4>
  <p>{buildSessionReviewItems(reviewEntries, 3).length}문제를 바로 다시 풀 수 있어요.</p>
  <div className="toolbar-row">
    <button className="primary-button" onClick={handleStartReview}>오답 복습 시작</button>
    <button className="ghost-button" onClick={onBack}>이번에는 건너뛰기</button>
  </div>
</article>
```

- [ ] **Step 5: Build the review question set**

Implement `handleStartReview`:

```js
const selectedReviewItems = buildSessionReviewItems(reviewEntries, 3);
setReviewQuestions(createListeningQuestions(selectedReviewItems, items));
setReviewIndex(0);
setReviewScore(0);
setReviewSelectedAnswer("");
setReviewStatus("idle");
setReviewPhase("playing");
```

- [ ] **Step 6: Render the listening review phase**

Add a dedicated render branch before the existing `isComplete` branch. Reuse the current question card and choice grid, but bind it to `reviewQuestions[reviewIndex]`, `reviewSelectedAnswer`, `reviewStatus`.

Rules:
- review score is separate from `score`
- on correct answer, increment `reviewScore`
- on next, move to next review question
- after the last question, set:

```js
setReviewSummary({
  total: reviewQuestions.length,
  correctedCount: reviewScoreAfterSubmit,
});
setReviewPhase("complete");
```

- [ ] **Step 7: Render the review completion card**

Render a completion card with:
- `틀린 문제 3개 중 2개를 바로 고쳤어요`
- `원래 결과 다시 보기`
- `홈으로`

Returning to the original result screen should keep the main activity score intact.

- [ ] **Step 8: Extend `ResultSummary` only if needed**

If the current `extraContent` placement is not enough, add a dedicated `footerContent` prop instead of rewriting the component structure.

- [ ] **Step 9: Add review card styles**

Add `.session-review-card`, `.session-review-summary-card`, `.session-review-progress` styles to `src/styles/global.css` using the existing card system.

- [ ] **Step 10: Run verification**

Run: `npm run build`
Expected: PASS

Manual smoke:
1. `npm run dev`
2. Load a student set
3. Intentionally miss 2+ listening questions
4. Confirm result screen shows `오답 복습 시작`
5. Complete review and confirm `원래 결과` 점수는 유지되고 `복습 결과`만 별도로 보임

- [ ] **Step 11: Commit**

```bash
git add src/components/ListeningQuiz.jsx src/components/ResultSummary.jsx src/styles/global.css
git commit -m "feat: add listening session review flow"
```

---

### Task 4: Add session review flow to Speaking Quiz

**Files:**
- Modify: `src/components/SpeakingQuiz.jsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add review state mirroring the listening flow**

Reuse the same review state shape as Listening Quiz.

- [ ] **Step 2: Record misses once per failed question, not per STT attempt**

Do **not** register a review miss every time STT returns incorrect text. Only register when the student advances after:
- `failedAttempts >= 3`, or
- `blockingError` exists and the question cannot be completed correctly

Place the registration in the branch that finalizes the current question before moving on.

- [ ] **Step 3: Reset speech recognition when entering review**

Before `setReviewPhase("playing")`, call:

```js
recognition.reset();
```

Also clear transcript-related review state between review questions.

- [ ] **Step 4: Render the review CTA on the result screen**

Use the same CTA copy pattern as listening, but label the section:

```jsx
<h4>헷갈렸던 말하기 단어를 다시 연습할까요?</h4>
```

- [ ] **Step 5: Render the speaking review phase**

Reuse the existing speaking UI pattern:
- target word card
- microphone button
- transcript area
- correctness feedback

Differences from the main flow:
- no main score mutation
- review result only updates `reviewScore`
- failedAttempts still gate advancement

- [ ] **Step 6: Handle STT edge cases**

Rules:
- if STT is unsupported, no review CTA should appear
- if a question was missed only because of a configuration error, it may still appear in review, but the UI must continue to show the existing guidance card
- if review is impossible due to browser support, allow the student to exit review without blocking

- [ ] **Step 7: Render the review completion summary**

Show:
- corrected count
- total review items
- `원래 결과 다시 보기`
- `홈으로`

- [ ] **Step 8: Run verification**

Run: `npm run build`
Expected: PASS

Manual smoke:
1. `npm run dev`
2. Load a set in a supported browser
3. Intentionally fail 1~2 speaking questions
4. Confirm result CTA appears
5. Complete review and confirm transcript resets correctly between questions

- [ ] **Step 9: Commit**

```bash
git add src/components/SpeakingQuiz.jsx src/styles/global.css
git commit -m "feat: add speaking session review flow"
```

---

### Task 5: Add session review flow to Word Typing Game

**Files:**
- Modify: `src/components/WordTypingGame.jsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add review entry collection to the main typing session**

When `nextAttemptCount >= ATTEMPT_LIMIT`, before moving to the next question, record:

```js
setReviewEntries((current) =>
  registerSessionReviewMiss(current, currentQuestion, "typing"),
);
```

- [ ] **Step 2: Add review state to the typing game**

Mirror the shared review state shape, but keep it inside `WordTypingGame` because the result screen is currently rendered by `TypingResultCard`.

- [ ] **Step 3: Expose review CTA in the typing result card**

Pass these props into `TypingResultCard`:
- `reviewCount`
- `onStartReview`
- `reviewSummary`
- `hasReviewAvailable`

Render a review CTA block above the leaderboard panel.

- [ ] **Step 4: Add a typing review phase**

Extend `phase`:

```js
"ready" | "playing" | "complete" | "review" | "review-complete"
```

When starting review:
- build review items with `buildSessionReviewItems(reviewEntries, 3)`
- reset typing-specific temporary state (`attemptCount`, `currentInput`, `feedbackTone`, `feedbackMessage`)
- keep the main session result metrics unchanged

- [ ] **Step 5: Reuse the typing play UI for review**

Render the same typing input screen during `phase === "review"` with these differences:
- score display shows `복습 정답 수`
- no leaderboard/progression save
- completion goes to `review-complete`, not `complete`

- [ ] **Step 6: Add the review completion card**

Show:
- `틀린 단어 3개 중 2개를 바로 다시 썼어요`
- `결과 다시 보기`
- `홈으로`

- [ ] **Step 7: Run verification**

Run: `npm run build`
Expected: PASS

Manual smoke:
1. `npm run dev`
2. Fail at least 2 typing words by exhausting 3 attempts
3. Confirm the result card shows review CTA
4. Complete review and confirm the original score, accuracy, combo summary remain unchanged

- [ ] **Step 8: Commit**

```bash
git add src/components/WordTypingGame.jsx src/styles/global.css
git commit -m "feat: add typing session review flow"
```

---

### Task 6: Regression pass and release notes

**Files:**
- Modify: `docs/agent-memory.md` (only if this repo uses it for short shipping notes)

- [ ] **Step 1: Run the targeted automated checks**

Run:

```bash
node --test src/utils/sessionReview.test.js src/utils/quiz.test.js src/utils/wordTyping.test.js
npm run build
```

Expected: PASS

- [ ] **Step 2: Manual smoke all three flows**

Verify:
- Listening result screen offers review only after at least one wrong answer
- Speaking review does not duplicate the same word for multiple failed STT attempts
- Typing review only includes words that were actually failed after exhausting attempts
- Retry fully resets review state
- Home exit works from review result screens

- [ ] **Step 3: Update short release note if the repo is tracking shipped changes there**

Add one short note mentioning `세션 직후 오답 복습` for listening, speaking, typing.

- [ ] **Step 4: Commit**

```bash
git add docs/agent-memory.md
git commit -m "docs: note session review mission rollout"
```

## Risks To Watch

- Listening review with only 1 wrong item will generate too few distractors unless the full original item pool is reused.
- Speaking review can double-count misses if the miss is recorded on every transcript rather than only on question finalization.
- Typing review can accidentally overwrite main-session counters if the review phase reuses `score`, `correctCount`, or `failedCount` directly.
- `handleRetry` must clear both main activity state and review state, or stale review items will leak between sessions.

## Acceptance Checklist

- Result screens for listening, speaking, typing show `오답 복습 시작` only when the student missed at least one item.
- Review items are deduped by `word + meaning`.
- Review question count is capped at 3 for the initial rollout.
- Review completion is tracked separately from the original game score.
- Retrying the main activity clears all review data.
- Build passes and targeted util tests pass.
