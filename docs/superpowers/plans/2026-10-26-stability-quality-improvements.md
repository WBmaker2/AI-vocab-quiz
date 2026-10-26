# 안정성·품질 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 최근 두 차례 라이브 장애처럼 빌드·기존 테스트를 통과한 런타임 문제를 더 빨리 발견하고, 활동 하나의 오류가 앱 전체를 죽이지 않게 하며, 오류 안내·정적 검사·관측성·CI·문서·E2E 기반을 한 번에 정리한다.

**Architecture:** 활동 렌더링 경계에 Error Boundary를 두고, Firebase/네트워크 오류를 공통 한국어 메시지로 변환한다. ESLint 정적 검사와 자동 테스트 발견으로 미정의 변수·누락 테스트를 막고, 브라우저 오류·Web Vitals를 경량 수집기로 보낸다. CI audit 게이트를 정리하고, 게임 컴포넌트 스모크를 전체 활동·교사 탭으로 확장한다. 현재 운영 기준은 단일 문서로 통합한다.

**Tech Stack:** React 19, Vite, Node test runner, ESLint flat config, Playwright, web-vitals, optional Sentry SDK, Firebase Firestore

---

## 파일 구조

### 새로 만들 파일

- `src/components/AppErrorBoundary.jsx`
- `src/components/ErrorNotice.jsx`
- `src/utils/appError.js`
- `src/utils/appError.test.js`
- `src/lib/observability.js`
- `src/lib/observability.test.js`
- `eslint.config.js`
- `scripts/run_unit_tests.mjs`
- `tests/activity-smoke.jsx` (기존 `tests/game-smoke.jsx` 확장 또는 대체)
- `tests/activity-smoke.html`
- `scripts/activity_component_smoke.mjs`
- `docs/OPERATIONS.md`
- `docs/changes/2026-10-26-stability-quality.md`

### 수정할 파일

- `src/main.jsx`
- `src/App.jsx`
- `src/hooks/useVocabularyLibrary.js`
- `src/components/progression/useActivityProgression.js`
- `src/components/progression/ActivityProgressionBlock.jsx`
- `src/components/typing/TypingResultCard.jsx`
- `src/components/matching/MatchingSummary.jsx`
- `src/hooks/teacher/useTeacherLeaderboards.js`
- `src/hooks/teacher/useTeacherWeakWords.js`
- `src/styles/global.css`
- `package.json`, `package-lock.json`
- `.env.example`
- `.github/workflows/ci.yml`
- `README.md`
- `docs/project-handoff.md`
- `docs/prd.md`
- `docs/deployment-policy.md`
- `src/constants/app.js`

### 참고할 파일

- `firestore.rules`
- `docs/firebase-architecture.md`
- `tests/firestore.rules.test.js`
- `scripts/playwright_smoke.js`
- `scripts/game_component_smoke.mjs`

---

## Task 1: 활동별 Error Boundary

- [x] `AppErrorBoundary` 작성
  - `componentDidCatch`에서 `reportClientError` 호출
  - `key={view}`로 화면 전환 시 경계 초기화
  - fallback 카드에 활동명, 한국어 안내, “다시 시도”, “홈으로” 버튼
- [x] `App.jsx`의 `Suspense` 바깥을 `AppErrorBoundary`로 감싸기
- [x] 앱 최상위에도 별도 경계를 두어 치명적 오류 시 전체 화면 fallback 제공
- [x] `global.css`에 오류 카드 스타일 추가
- [x] `tests/error-boundary-smoke.jsx` 또는 기존 activity smoke에 오류 유발 케이스 추가
  - 오류 발생 → fallback 표시 → “홈으로” 클릭 → 정상 화면 복귀 확인

## Task 2: 친절한 오류 메시지

- [x] `src/utils/appError.js` 작성
  - `permission-denied`, `unauthenticated`, `unavailable`, `deadline-exceeded`, `resource-exhausted`, `not-found`, 네트워크/오프라인, localStorage 오류 매핑
  - 이미 한국어인 도메인 오류 메시지는 유지
  - `formatAppError(error, fallback)` 형태의 단일 API
- [x] `src/utils/appError.test.js` 작성
  - 권한 오류, 네트워크 오류, 한국어 메시지 유지, 알 수 없는 오류 fallback
- [x] `useVocabularyLibrary`의 `normalizeErrorMessage`를 `formatAppError`로 교체
- [x] `useActivityProgression`의 catch에서 `formatAppError` 사용
- [x] `useTeacherLeaderboards` 기본 formatter 교체
- [x] `useTeacherWeakWords`의 원문 오류 노출 제거
- [x] `TypingResultCard`, `MatchingSummary`의 저장 실패 메시지 교체
- [x] `ErrorNotice` 컴포넌트 작성
  - `message`, `onRetry`, `retryLabel`, `role="alert"`
- [x] `ActivityProgressionBlock`의 오류 영역에 “다시 시도” 버튼 추가
- [x] `TeacherWorkspace`의 주요 오류 배너에도 `ErrorNotice` 적용 가능한 범위 확인

## Task 3: ESLint 정적 검사

- [x] devDependencies 추가
  - `eslint`, `@eslint/js`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `globals`
- [x] `eslint.config.js` 작성
  - `no-undef`, `no-unused-vars`(warn), `react/jsx-no-undef`, `react/jsx-uses-vars`, `react-hooks/rules-of-hooks`
  - browser/node globals, `dist`/`work`/`node_modules` ignore
- [x] `package.json`에 `lint`, `lint:fix` 스크립트 추가
- [x] `npm run lint` 실행 후 오류 수정
- [x] CI `static-checks` job 추가
- [x] 최근 두 장애 유형을 잡는지 확인
  - 미정의 상수(`ROUND_DURATION_SECONDS`, `ATTEMPT_LIMIT`)
  - JSX 미정의 컴포넌트/변수

## Task 4: 프로덕션 관측성

- [x] `src/lib/observability.js` 작성
  - `reportClientError(error, context)` — 중복/빈도 제한, 버전·URL·view·userAgent 포함
  - `installGlobalErrorHandlers()` — `error`, `unhandledrejection`
  - `initWebVitals()` — LCP, CLS, INP, TTFB 수집
  - `VITE_ERROR_REPORT_URL`로 `sendBeacon`/`fetch keepalive` 전송
  - `VITE_SENTRY_DSN`이 있을 때만 `@sentry/react` 동적 import 후 초기화
- [x] `src/main.jsx`에서 관측성 초기화
- [x] `.env.example`에 `VITE_ERROR_REPORT_URL`, `VITE_SENTRY_DSN` 추가
- [x] `docs/OPERATIONS.md`에 Sentry/GlitchTip 연결 방법 기록
- [x] `observability.test.js` 작성
  - 이벤트 payload 형태, 중복 제거, DSN 없을 때 no-op
- [x] `npm run build`에서 Sentry가 초기 번들에 포함되지 않고 DSN 설정 시에만 동적 로드되는지 확인

## Task 5: CI audit 게이트 정리

- [x] `package.json`에 `@grpc/grpc-js` override 적용 시도
  - `"overrides": { "@grpc/grpc-js": "^1.14.6" }`
- [x] `npm install` 후 `npm audit --omit=dev` 확인
- [x] `npm test`, `npm run test:rules`, `npm run build`, `npm run test:smoke`, `npm run test:games` 재검증
- [x] override가 Firestore Emulator/브라우저 빌드에 문제를 만들면 되돌리고
  - audit 단계를 테스트 뒤로 이동하거나
  - 위험 수용 정책을 문서화하고 별도 security job으로 분리
- [x] CI `unit-build-smoke`가 audit에서 먼저 멈추지 않도록 순서/정책 확정

## Task 6: 테스트 자동 발견

- [x] `scripts/run_unit_tests.mjs` 작성
  - `src/**/*.test.js` 자동 수집
  - `tests/firestore.rules.test.js`는 `test:rules`로 분리
  - 새 테스트 파일을 수동 등록하지 않아도 실행
- [x] `package.json`의 `test`를 `node scripts/run_unit_tests.mjs`로 변경
- [x] `npm test` 실행 후 기존 207개 단위 테스트가 모두 발견되는지 확인
- [x] 테스트 파일을 하나 추가해 자동 발견되는지 확인
- [x] CI는 기존 `npm test` 그대로 사용

## Task 7: 문서 단일화

- [x] `docs/OPERATIONS.md` 작성
  - 현재 버전, 라이브 URL, 배포 대상(Vercel primary)
  - Firebase Hosting 상태와 예비 주소
  - 필수 검증 명령과 CI job 목록
  - 릴리스 기록 규칙, 오류 대응, 관측성 설정
  - 문서별 역할과 단일 출처 표시
- [x] `README.md`의 배포 설명을 `docs/OPERATIONS.md` 기준으로 수정
- [x] `docs/project-handoff.md`의 현재 버전/배포 대상 최신화
- [x] `docs/prd.md` 상단에 “초기 MVP PRD, 현재 범위는 OPERATIONS 참고” 명시
- [x] `docs/deployment-policy.md`와 README의 Vercel/Firebase Hosting 설명 충돌 제거
- [x] `src/constants/app.js`의 `v1.19.0` 업데이트 내역 추가
- [x] `package.json` 버전 `1.19.0`

## Task 8: E2E 매트릭스 확대

- [x] 기존 `tests/game-smoke`를 `tests/activity-smoke`로 확장
- [x] 케이스 추가
  - 듣기: 첫 문제와 선택지 표시
  - 말하기: 지원되지 않는 환경 fallback 또는 fake recognition으로 첫 문제 표시
  - 짝 맞추기: 보드와 카드 표시
  - 철자: 시작 → 입력 화면
  - 받아쓰기: 시작 → 입력 화면
  - 낚시/타자: 기존 케이스 유지
  - 빙고 참여: 코드/이름 입력 화면
  - 교사 탭: 기본 관리/일괄 등록/학급 빙고/리더보드 탭 전환
- [x] 각 케이스에서 `pageerror`/콘솔 오류 수집
- [x] `npm run test:activities` 스크립트 추가
- [x] CI `activity-smoke` job 추가 또는 기존 game-smoke job 확장
- [x] 실패 시 어떤 활동/단계에서 실패했는지 로그에 표시

## Task 9: 릴리스 검증·배포

- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run test:rules`
- [x] `npm run test:games` 또는 `npm run test:activities`
- [x] `npm run build`
- [x] `npm run test:smoke`
- [x] `npm audit --omit=dev`
- [x] `docs/changes/2026-10-26-stability-quality.md` 작성
- [x] git diff 확인 후 의도한 파일만 커밋
- [x] 원격 브랜치 push
- [x] Vercel production 배포
- [x] 라이브 번들 버전과 주요 활동 진입 확인
- [x] CI `static-checks`, `activity-smoke`, `firestore-rules` 통과 확인

---

## 예상 결과

- 활동 하나에서 오류가 나도 앱 전체가 빈 화면이 되지 않음
- Firebase/네트워크 오류가 한국어 안내와 재시도 동선으로 표시됨
- 미정의 상수·JSX 참조가 lint에서 차단됨
- 프로덕션 런타임 오류와 Web Vitals를 수집할 수 있는 기반 마련
- CI가 audit에서 먼저 멈추지 않고 실제 테스트 게이트가 실행됨
- 새 테스트 파일이 자동으로 실행됨
- 운영 기준 문서가 하나로 정리됨
- 듣기·말하기·짝 맞추기·철자·받아쓰기·낚시·타자·빙고·교사 탭의 시작/복귀가 스모크로 검증됨

## 롤백

- Error Boundary/오류 메시지 변경은 화면 단위로 되돌릴 수 있음
- ESLint/Observability는 설정과 초기화 호출만 제거하면 기존 동작으로 복귀
- audit override는 `package.json`에서 제거 후 재설치
- Firestore 규칙·데이터 구조는 변경하지 않음
