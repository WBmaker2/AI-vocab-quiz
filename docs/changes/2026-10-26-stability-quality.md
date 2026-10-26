# 안정성·품질 개선 (v1.19.0)

- 버전: `v1.19.0`
- 날짜: `2026-10-26`

## 목표

최근 두 차례 라이브 장애처럼 빌드·기존 테스트를 통과한 런타임 문제를 더 빨리 발견하고, 활동 하나의 오류가 앱 전체를 죽이지 않게 한다. 오류 안내·정적 검사·관측성·CI·문서·E2E 기반을 함께 정리한다.

## 변경

### 활동별 Error Boundary

- `AppErrorBoundary`를 추가해 활동 렌더링 오류를 활동 단위로 격리
- 오류 발생 시 “다시 시도”와 “홈으로” 복구 동선 제공
- 앱 최상위에도 오류 경계를 두어 치명적 오류 시 전체 fallback 표시
- `src/main.jsx`에서 관측성 초기화와 함께 앱 경계 구성

### 친절한 오류 메시지

- `src/utils/appError.js` 추가
  - 권한, 로그인, 네트워크, 시간 초과, 요청 한도, 저장 공간 오류를 한국어로 매핑
  - 이미 한국어인 도메인 메시지는 유지
- `useVocabularyLibrary`, `useActivityProgression`, `useTeacherLeaderboards`, `useTeacherWeakWords`, `TypingResultCard`, `MatchingSummary`에 적용
- `ErrorNotice` 컴포넌트 추가
- 개인 기록 저장 오류에 “다시 시도” 버튼 추가

### 정적 검사

- ESLint flat config 추가
  - `no-undef`, `no-unused-vars`(warn), `react/jsx-no-undef`, React Hooks 검사
- `npm run lint`, `npm run lint:fix` 추가
- `no-undef`로 드러난 기존 누락 import 수정
  - `studentProfiles` 저장 모듈
  - 교사 로그인 persistence
  - 교사 리더보드/빙고/리더보드 payload 모듈
  - `TeacherProfileSection` 핸들러
  - 받아쓰기 shuffle self-assign

### 관측성

- `src/lib/observability.js` 추가
  - `error`, `unhandledrejection`, Error Boundary 오류 수집
  - Web Vitals LCP/CLS/INP/TTFB 수집
  - `VITE_ERROR_REPORT_URL` beacon 전송
  - `VITE_SENTRY_DSN` 설정 시 `@sentry/react` 동적 로드
- `.env.example`, `docs/OPERATIONS.md`에 설정 방법 기록
- Sentry는 DSN이 없으면 로드되지 않도록 동적 chunk 분리

### CI·테스트

- `@grpc/grpc-js` override로 production audit high 항목 해소
- `scripts/run_unit_tests.mjs`로 `src/**/*.test.js` 자동 발견
- `test:activities` 추가
  - 듣기·말하기·짝 맞추기·낚시·철자·타자·받아쓰기·빙고 참여·교사 탭·오류 경계
- CI `static-checks` job 추가
- 기존 game smoke job에서 activity smoke 실행

### 문서 단일화

- `docs/OPERATIONS.md`를 현재 운영·배포·검증 기준의 단일 출처로 추가
- `README.md`, `docs/project-handoff.md`, `docs/prd.md`, `docs/deployment-policy.md` 정합성 수정
- `docs/improvement-ideas.md`에 전체 개선 아이디어 기록

## 검증

- `npm test`
- `npm run lint`
- `npm run test:rules`
- `npm run test:activities`
- `npm run build`
- `npm run test:smoke`
- `npm audit --omit=dev`

## 배포

- Firestore 규칙 변경 없음
- Vercel production 재배포
