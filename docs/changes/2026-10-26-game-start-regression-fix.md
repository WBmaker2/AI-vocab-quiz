# 단어 낚시·영어 단어 타자 게임 실행 오류 복구

- 버전: `v1.18.2`
- 날짜: `2026-10-26`

## 증상

- `단어 낚시`를 열면 화면이 정상 렌더링되지 않았다.
- `영어 단어 타자 게임`에서 `게임 시작`을 누르면 플레이 화면 대신 빈 화면/렌더 오류가 발생했다.

## 원인

v1.18.0에서 큰 화면 파일을 작은 컴포넌트로 분리하는 과정에서 두 가지 연결이 빠졌다.

1. `FishingStartCard.jsx`가 부모 `WordFishingGame.jsx`에만 있던 `ROUND_DURATION_SECONDS`, `MAX_ROUNDS`를 import 없이 참조해 시작 화면 렌더링 시 `ReferenceError`가 발생했다.
2. `WordTypingGame.jsx`의 플레이 단계 마지막 JSX 앞에 `return (`이 빠져 `phase === "playing"`에서 컴포넌트가 `undefined`를 반환했다. 또한 `TypingPlayCard.jsx`가 부모 상수 `ATTEMPT_LIMIT`를 직접 참조해 return을 복구해도 다음 오류가 발생할 상태였다.

두 문제 모두 자유 변수/미사용 JSX 식이라 빌드와 기존 unit test를 통과했고, 홈 화면만 확인하던 browser smoke도 잡지 못했다.

## 수정

- `src/utils/wordFishing.js`: `FISHING_MAX_ROUNDS`, `FISHING_ROUND_DURATION_SECONDS` 공용 상수 추가
- `WordFishingGame.jsx`, `FishingStartCard.jsx`: 같은 상수를 import해 사용
- `WordTypingGame.jsx`: 플레이 단계 `TypingPlayCard`를 `return`으로 반환
- `TypingPlayCard.jsx`: `ATTEMPT_LIMIT` 대신 `attemptLimit` prop 사용
- `TypingResultCard.jsx`: 중복 정답 수 표시 제거, 걸린 시간을 `formatElapsedSeconds`로 통일
- `tests/game-smoke.html`, `tests/game-smoke.jsx`, `scripts/game_component_smoke.mjs`: 실제 게임 컴포넌트를 렌더링하는 Playwright 스모크 추가
- `package.json`: `test:games` 스크립트 추가
- `.github/workflows/ci.yml`: Chromium 설치 후 `npm run test:games` 실행

## 검증

- `npm run test:games`: 낚시 시작/플레이, 타자 시작/입력/정답 피드백 통과
- 회귀 확인: 수정 전 낚시는 `ROUND_DURATION_SECONDS is not defined`, 타자는 플레이 화면 누락으로 실패
- `ATTEMPT_LIMIT`를 임시로 되돌렸을 때 게임 스모크가 `ReferenceError`로 실패하는 것도 확인
- `npm test`
- `npm run test:rules`
- `npm run build`
- `npm run test:smoke`
- `npm audit --omit=dev`: 기존 `@grpc/grpc-js` high 항목은 이번 변경과 무관

## 배포

- Firestore 규칙 변경 없음
- Vercel production만 재배포
