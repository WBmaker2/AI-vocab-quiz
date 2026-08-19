# 철자 완성 도움 계단형 힌트 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 철자 완성 게임에서 학생이 어려움을 느낄 때 단계적으로 더 많은 철자 도움을 받아 끝까지 단어를 완성하고, 정답을 본 뒤에도 따라 쓰며 성취감을 느끼게 합니다.

**Architecture:** 기존 단어 길이별 랜덤 마스크와 3회 입력 흐름은 유지합니다. 현재 문제의 `mask`에 표시할 글자를 추가하는 순수 유틸을 만들고, 게임 컴포넌트는 도움 단계와 힌트 사용 횟수만 관리합니다. 힌트는 문제를 자동 종료하지 않으며, 마지막 단계에서만 정답 공개 후 따라쓰기 상태로 전환합니다.

**Tech Stack:** React 19, Vite, JavaScript ES modules, Node test runner, Firebase Firestore spelling leaderboard

**Spec:** 이 문서가 2026-08-20 사용자 승인 추천안인 `도움 계단형 힌트`를 구현합니다.

## Global Constraints

- 기존 랜덤 마스크의 단어별 중복 방지와 구분자 표시를 유지합니다.
- 키보드 입력 중심 흐름과 `Enter` 두 번으로 다음 문제로 이동하는 동작을 유지합니다.
- 힌트를 사용해도 학생이 문제를 포기한 것으로 처리하지 않으며, 정답을 직접 입력하면 기존 시도별 점수를 적용합니다.
- 힌트로 전체 철자가 보인 뒤에도 입력창에 정답을 자동 입력하지 않고 학생이 직접 따라 쓰며,
  이 성공은 기존 시도별 점수 경로로 처리합니다.
- 세 번 오답으로 자동 정답 공개된 경우에는 기존 `revealedCount`와 공개 점수 경로를 유지합니다.
- 리더보드에는 기존 `revealedCount`와 `totalAttempts`를 계속 저장하고, 새로운 Firestore 필드는 추가하지 않습니다.
- 중요한 `도움 받기`, `입력 확인`, `다음 문제` 버튼은 기존 `gi-pulse` 강조 규칙을 따릅니다.
- 새 파일을 추가하지 않아도 각 파일의 책임이 500줄을 넘지 않도록 확인합니다.
- 버전과 화면의 `업데이트 내역`을 함께 갱신합니다.

---

### Task 1: 힌트 단계와 마스크 공개 유틸 정의

**Files:**
- Modify: `src/utils/wordSpelling.js`
- Test: `src/utils/wordSpelling.test.js`

**Interfaces:**
- Produces `createSpellingHintState(question)` returning `{ level, maxLevel, characters, displayText, hintLabel }`.
- Produces `revealNextSpellingHint(question, hintState)` returning the next immutable hint state.
- Produces `isSpellingAnswerRevealed(hintState)` for the final full-answer state.

- [x] **Step 1: Write failing tests**

  - 긴 단어의 시작 상태가 기존 랜덤 마스크를 보존하는지 확인합니다.
  - 첫 도움은 새 글자를 추가하고, 두 번째 도움은 추가 글자 또는 철자 덩어리를 더 보여주는지 확인합니다.
  - 마지막 도움은 모든 영문 글자를 표시하고 `isSpellingAnswerRevealed`가 `true`가 되는지 확인합니다.
  - 짧은 단어와 구분자(`-`, 공백)가 있는 단어에서도 글자 외 문자가 항상 표시되는지 확인합니다.

- [x] **Step 2: Run the focused test and verify it fails**

  Run: `npm test -- src/utils/wordSpelling.test.js`

  Expected: 새 힌트 유틸이 아직 없어 실패합니다.

- [x] **Step 3: Implement the minimal hint-state utilities**

  - 현재 `question.mask.characters`의 visible 상태를 기준으로 시작합니다.
  - `revealNextSpellingHint`는 아직 숨겨진 영문 글자 중에서 학생에게 유리한 순서로 글자를 공개합니다.
  - 첫 단계는 첫 글자와 마지막 글자를 우선 보장하고, 다음 단계는 내부 글자를 추가합니다.
  - 후보가 소진되면 전체 정답 표시 상태를 반환합니다.

- [x] **Step 4: Run focused tests and verify they pass**

  Run: `npm test -- src/utils/wordSpelling.test.js`

- [x] **Step 5: Refactor only after green**

  - 마스크 생성 로직과 힌트 누적 로직의 중복을 제거하되 기존 랜덤 마스크 테스트가 계속 통과하도록 유지합니다.

### Task 2: 게임 화면에 도움 계단형 흐름 연결

**Files:**
- Modify: `src/components/WordSpellingGame.jsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes `createSpellingHintState`, `revealNextSpellingHint`, `isSpellingAnswerRevealed` from `wordSpelling.js`.
- Keeps the existing result props and leaderboard payload unchanged.

- [x] **Step 1: Add the failing component-level behavior through pure state expectations**

  - 힌트 사용 횟수가 `revealedCount`나 `totalAttempts`에 포함되지 않고,
    문제별 힌트 상태만 별도로 유지되는 전이를 순수 유틸 테스트로 고정했습니다.
  - 도움을 사용한 뒤에도 입력창이 활성화되어 정답을 직접 입력할 수 있는 상태를 확인합니다.

- [x] **Step 2: Run the focused test and verify it fails**

  Run: `npm test -- src/utils/wordSpelling.test.js`

- [x] **Step 3: Implement the UI flow**

  - 현재 문제 시작 시 hint state를 초기화합니다.
  - `도움 받기` 버튼을 누를 때마다 다음 공개 단계로 이동합니다.
  - 버튼 문구를 `첫 글자 보여줘`, `한 칸 더 보여줘`, `정답 보고 따라 쓰기`처럼 현재 단계에 맞게 바꿉니다.
  - 정답 공개 단계에서는 피드백에 정답을 보여주되 입력창은 비워 둡니다. 학생이 정답을 입력하면 `따라쓰기 성공`으로 처리하고 문제를 완료합니다.
  - 일반 오답 3회 공개 흐름은 기존처럼 유지하되, 정답 공개 뒤에는 학생이 따라 쓰지 않으면 다음 문제로 넘어갈 수 없게 합니다.
  - 힌트 버튼에는 `aria-label`, 현재 도움 단계 안내, `gi-pulse`를 적용합니다.

- [x] **Step 4: Run tests and build**

  Run: `npm test -- src/utils/wordSpelling.test.js && npm run build:firebase`

  Expected: 철자 유틸 회귀 테스트와 production build가 통과합니다.

- [x] **Step 5: Verify keyboard and reduced-motion behavior**

  - 입력창에서 Enter로 채점한 뒤, 완료 상태에서 Enter로 다음 문제 이동이 계속 되는지 확인합니다.
  - `prefers-reduced-motion` 환경에서 힌트 버튼의 애니메이션이 기존 규칙대로 줄어드는지 확인합니다.

### Task 3: 긍정적 피드백과 점수 경계 확인

**Files:**
- Modify: `src/components/WordSpellingGame.jsx`
- Modify: `src/components/WordSpellingResultCard.jsx` only if the result copy needs clarification
- Test: `src/utils/wordSpelling.test.js`

**Interfaces:**
- Keeps `score`, `correctCount`, `revealedCount`, and `totalAttempts` result fields compatible with `saveSpellingLeaderboardScore`.

- [x] **Step 1: Add tests for score boundaries**

  - 힌트를 사용한 뒤 직접 정답을 입력하면 해당 입력 시도 횟수의 기존 점수를 받는지 확인합니다.
  - 힌트로 전체 정답을 본 뒤 따라 쓴 문제도 기존 직접 입력 점수 경로를 한 번만 적용합니다.
  - 세 번 오답으로 자동 공개된 문제만 `revealed` 점수 경로를 사용합니다.
  - 힌트 사용만으로 `correctCount`나 `totalAttempts`가 증가하지 않습니다.

- [x] **Step 2: Run the focused tests and verify the new expectations fail**

  Run: `npm test -- src/utils/wordSpelling.test.js`

- [x] **Step 3: Implement positive feedback copy and guarded completion**

  - 오답 메시지는 학생이 맞힌 위치와 다음 도움 단계를 알려줍니다.
  - 정답 공개 뒤 따라 쓰기에 성공하면 “정답을 보고 다시 써서 기억했어요.”라고 안내합니다.
  - 힌트만 눌렀을 때는 점수를 계산하지 않습니다.

- [x] **Step 4: Run the focused and full test suites**

  Run: `npm test`

  Expected: 전체 테스트가 실패 없이 통과하고, Firestore emulator가 없는 환경의 기존 규칙 테스트는 기존과 같이 skip됩니다.

### Task 4: 버전·변경 문서·실사용 검증

**Files:**
- Modify: `src/constants/app.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `docs/changes/2026-08-20-spelling-hint-ladder.md`

- [x] **Step 1: Add the release entry and change record**

  - 버전을 `v1.13.0`으로 올립니다.
  - 업데이트 내역에 단계형 힌트, 정답 보고 따라쓰기, 기존 리더보드 호환 내용을 기록합니다.

- [x] **Step 2: Run final verification**

  Run: `git diff --check && npm test && npm run build:firebase`

- [ ] **Step 3: Run the browser smoke flow**

  - production build의 기존 브라우저 smoke를 실행해 업데이트 내역, 활동 순서,
    반응형 화면, 교사 진입을 확인했습니다.
  - 실제 Firebase 공개 단어 세트를 이용한 힌트 버튼·따라쓰기 흐름은 배포 전
    실사용 확인 단계로 남겨 둡니다.

- [x] **Step 4: Stop before release mutation**

  - 구현·테스트·로컬 production build까지만 완료합니다.
  - 커밋·푸시·배포는 별도 사용자 지시가 있을 때 수행합니다.
