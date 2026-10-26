# 단어 낚시·영어 단어 타자 게임 실행 오류 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** v1.18.0 컴포넌트 분리 과정에서 빠진 상수 import, return, prop 연결을 복구해 `단어 낚시`와 `영어 단어 타자 게임`이 시작 화면부터 실제 플레이까지 정상 동작하게 한다. 같은 유형의 회귀를 잡는 게임 전용 브라우저 스모크 테스트를 추가한다.

**Architecture:** 두 게임은 `App.jsx`에서 lazy import되는 독립 화면이다. 낚시는 부모 `WordFishingGame`과 자식 `FishingStartCard`가 같은 라운드 상수를 공유해야 하고, 타자는 `WordTypingGame`이 플레이 단계에서 `TypingPlayCard`를 반환해야 하며 자식은 부모의 시도 제한을 prop으로 받아야 한다. 게임 전용 Vite dev server + Playwright 하네스로 실제 컴포넌트를 렌더링해 런타임 오류를 검증한다.

**Tech Stack:** React 19, Vite, Playwright, Node test runner, Firebase-free component harness

---

## 파일 구조

### 수정할 파일

- `src/utils/wordFishing.js`
  - `FISHING_MAX_ROUNDS`, `FISHING_ROUND_DURATION_SECONDS` 공용 상수 추가
- `src/components/WordFishingGame.jsx`
  - 로컬 상수 제거, 공용 상수 import
- `src/components/fishing/FishingStartCard.jsx`
  - 공용 상수 import, 시작 문구를 상수 기반으로 변경
- `src/components/WordTypingGame.jsx`
  - 플레이 단계 `TypingPlayCard`에 `return (` 추가
- `src/components/typing/TypingPlayCard.jsx`
  - `ATTEMPT_LIMIT` → `attemptLimit` prop 사용
- `src/components/typing/TypingResultCard.jsx`
  - 중복 정답 수 표시 제거, 걸린 시간 포맷 통일
- `src/constants/app.js`
  - `v1.18.2` 업데이트 내역 추가
- `package.json`, `package-lock.json`
  - 버전 `1.18.2`, `test:games` 스크립트 추가
- `.github/workflows/ci.yml`
  - Chromium 설치 후 게임 스모크 실행
- `docs/firebase-architecture.md` 등 기존 문서는 변경하지 않음

### 새로 만들 파일

- `tests/game-smoke.html`
- `tests/game-smoke.jsx`
- `scripts/game_component_smoke.mjs`
- `docs/changes/2026-10-26-game-start-regression-fix.md`
- `docs/superpowers/plans/2026-10-26-game-start-regression-fix.md`

### 참고할 파일

- `scripts/playwright_smoke.js`
- `src/App.jsx`
- `src/utils/wordTyping.js`
- `src/utils/quiz.js`

---

## 문제 요약

### 단어 낚시

`FishingStartCard.jsx`가 `ROUND_DURATION_SECONDS`와 `MAX_ROUNDS`를 참조하지만 두 값은 부모 `WordFishingGame.jsx`에만 있다. 시작 화면 렌더링 시 `ReferenceError`가 발생한다. 빌드는 자유 변수를 오류로 보지 않아 통과했다.

### 영어 단어 타자 게임

`WordTypingGame.jsx` 마지막의 `<TypingPlayCard ... />` 앞에 `return (`이 빠져 있다. JSX 식은 유효한 표현식이라 빌드는 통과하지만, 플레이 단계에서 컴포넌트가 `undefined`를 반환한다. 또한 `TypingPlayCard.jsx`가 부모 상수 `ATTEMPT_LIMIT`를 직접 참조해 return을 복구해도 다음 런타임 오류가 발생한다.

### 기존 검증 공백

`npm test`는 JSX 컴포넌트를 렌더링하지 않고, `npm run test:smoke`는 홈 화면만 확인한다. 그래서 v1.18.0 빌드가 통과했고 v1.18.1 배포 후 라이브에서 문제가 드러났다.

---

## 구현 단계

### Task 1: 게임 스모크 하네스 작성 (RED)

- [x] `tests/game-smoke.html` 작성
  - `#root`와 `/tests/game-smoke.jsx` module script
- [x] `tests/game-smoke.jsx` 작성
  - `?game=fishing|typing` 쿼리로 실제 게임 컴포넌트 렌더링
  - 더미 단어 6개, 가짜 `speech` 객체(`supported: true`, `cancel`, `speak`)
  - `leaderboardContext`, `progressionContext`, `remoteConfigured: false` 전달
- [x] `scripts/game_component_smoke.mjs` 작성
  - Vite dev server 시작
  - Playwright Chromium 실행, `pageerror` 수집
  - 낚시: `단어 낚시` → `게임 시작` → `지금 읽은 영어 단어`와 뜻 카드 확인
  - 타자: `영어 단어 타자 게임` → `게임 시작` → `영어 단어 입력` 확인 → `apple` 입력/제출 → `정답입니다!` 확인
  - page error 또는 필수 UI 누락 시 실패
- [x] `package.json`에 `"test:games": "node scripts/game_component_smoke.mjs"` 추가
- [x] `npm run test:games` 실행
  - 현재 코드에서 낚시 시작 화면 오류와 타자 플레이 화면 누락이 재현되는지 확인 (RED)

### Task 2: 낚시 상수 복구

- [x] `src/utils/wordFishing.js`에 공용 상수 추가

```js
export const FISHING_MAX_ROUNDS = 10;
export const FISHING_ROUND_DURATION_SECONDS = FISHING_ROUND_DURATION_MS / 1000;
```

- [x] `WordFishingGame.jsx`에서 로컬 `ROUND_DURATION_SECONDS`, `MAX_ROUNDS`를 제거하고 공용 상수 import
- [x] `FishingStartCard.jsx`에서 공용 상수 import
- [x] 시작 카드 문구와 규칙 카드가 같은 상수를 사용하도록 변경
- [x] `src/utils/wordFishing.test.js`에 상수와 라운드 생성 계약 테스트 추가
- [x] `npm run test:games` 재실행
  - 낚시 시작/플레이 화면이 통과하는지 확인

### Task 3: 타자 return·prop 복구

- [x] `WordTypingGame.jsx` 마지막 플레이 JSX를 `return (...)`으로 감싸기
- [x] `TypingPlayCard.jsx`의 `ATTEMPT_LIMIT`를 `attemptLimit`로 변경
- [x] `TypingResultCard.jsx` 중복 정답 수 `<strong>` 제거
- [x] `TypingResultCard.jsx`의 `걸린 시간`을 `formatElapsedSeconds(elapsedSeconds)`로 변경
- [x] `npm run test:games` 재실행
  - 타자 시작/입력/정답 피드백이 통과하는지 확인 (GREEN)

### Task 4: 전체 검증

- [x] `npm test`
- [x] `npm run test:rules`
- [x] `npm run test:games`
- [x] `npm run build`
- [x] `npm run test:smoke`
- [x] `npm audit --omit=dev`
  - 기존 `@grpc/grpc-js` high 항목은 별도 기록

### Task 5: 릴리스 기록

- [x] `src/constants/app.js` 맨 위에 `v1.18.2` 항목 추가
  - 날짜: `2026-10-26`
  - 요약: 단어 낚시·영어 단어 타자 게임 실행 오류 복구
- [x] `package.json`, `package-lock.json` 버전 `1.18.2`
- [x] `docs/changes/2026-10-26-game-start-regression-fix.md` 생성
  - 원인, 수정, 게임 스모크, 검증, 배포 결과 기록
- [x] `.github/workflows/ci.yml`의 Chromium 설치 뒤 `npm run test:games` 추가

### Task 6: 배포

- [ ] `git status`, `git diff` 확인 후 의도한 파일만 커밋
- [ ] 원격 브랜치 `codex/typing-leaderboards`로 push
- [ ] `CI=1 npx --yes vercel --prod --yes`로 Vercel production 배포
- [ ] 라이브 번들에서 `v1.18.2` 확인
- [ ] 라이브에서 단어 세트를 불러와 두 게임 시작/첫 문제 동작 확인
- [ ] Firestore 규칙은 변경 없음, 재배포하지 않음

---

## 예상 결과

- 단어 낚시가 시작 화면부터 정상 렌더링되고 첫 라운드가 표시됨
- 영어 단어 타자 게임이 시작 후 입력 화면과 정답 피드백까지 정상 동작
- `npm run test:games`가 두 게임의 런타임 회귀를 CI에서 차단
- 라이브 Vercel 앱이 `v1.18.2`로 갱신됨

## 롤백

- 게임 수정 배포 전 급한 경우 이전 정상 Vercel production 배포로 롤백
- 코드 롤백 시 `wordFishing` 상수 export와 자식 컴포넌트 import를 함께 되돌려야 함
- Firestore 규칙과 데이터에는 영향 없음
