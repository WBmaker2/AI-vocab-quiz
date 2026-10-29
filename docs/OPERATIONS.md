# 운영 기준 문서

- 최종 갱신: 2026-10-29
- 현재 버전: `v1.19.2`
- 라이브 주소: <https://talking-vacab-quiz.vercel.app>
- Firebase 프로젝트: `talking-vocab-quiz`

이 문서는 현재 운영·배포·검증 기준의 **단일 출처**입니다. README, handoff, PRD, deployment policy가 서로 다르게 설명할 경우 이 문서를 우선합니다.

## 1. 배포 대상

| 구분 | 상태 | 주소 |
|---|---|---|
| Vercel production | **기본 운영 대상** | https://talking-vacab-quiz.vercel.app |
| Firebase Hosting | 보조/대체 경로 | https://talking-vocab-quiz.web.app |
| Firestore | 운영 데이터 | Firebase 프로젝트 `talking-vocab-quiz` |

- 앱 코드는 Vercel에 배포합니다.
- Firestore 규칙은 Vercel 배포와 별개로 Firebase에 배포합니다.
- Firebase Hosting은 필요할 때만 보조 경로로 사용합니다.

## 2. 릴리스 순서

1. 코드 수정
2. 사용자-visible 변경이면 `src/constants/app.js`의 `APP_UPDATES`에 항목 추가
3. `docs/changes/YYYY-MM-DD-*.md`에 변경 기록
4. 아래 검증 명령 실행
5. `git status`, `git diff` 확인 후 의도한 파일만 커밋
6. 원격 브랜치에 push
7. Vercel production 배포
8. Firestore 규칙이 바뀌었다면 Firebase 규칙 배포
9. 라이브 버전·핵심 활동 확인

## 3. 필수 검증

```bash
npm test
npm run lint
npm run test:rules
npm run test:activities
npm run build
npm run test:smoke
npm audit --omit=dev
```

- `npm test`: `src/**/*.test.js`를 자동 수집해 실행
- `npm run lint`: 경고 0개 기준 (`--max-warnings=0`)
- `npm run test:rules`: Firestore Emulator 기반 보안 규칙 테스트
- `npm run test:activities`: 듣기·말하기·짝 맞추기·낚시·철자·타자·받아쓰기·빙고·교사 탭·오류 경계 스모크
- `npm run test:smoke`: 빌드 결과 홈/교사 진입·업데이트 모달·반응형 스모크 + axe WCAG 2 A/AA 접근성 검사
- `npm run test:games`: 기존 낚시·타자 중심 스모크 (현재 `test:activities`와 같은 스크립트)

## 4. CI

| job | 내용 |
|---|---|
| `unit-build-smoke` | audit, unit test, build, browser smoke |
| `static-checks` | ESLint `no-undef` 포함 정적 검사, 경고 0개 기준 |
| `game-smoke` | 학생 활동·교사 탭·오류 경계 컴포넌트 스모크 |
| `firestore-rules` | Firestore Emulator 규칙 테스트 |

- `@grpc/grpc-js` audit 항목은 `package.json` override로 고정한다.
- audit에서 실패하면 unit/build/smoke가 skip되므로 audit 단계가 먼저 통과해야 한다.

## 5. 오류·관측성

### 사용자 안내

- Firebase 권한·네트워크·저장 오류는 `src/utils/appError.js`에서 한국어로 변환한다.
- 활동 렌더링 오류는 `AppErrorBoundary`가 활동 단위로 잡고 “다시 시도”·“홈으로”를 제공한다.
- 원문 오류를 UI에 그대로 노출하지 않는다.

### 수집

- `VITE_ERROR_REPORT_URL`: 브라우저 오류·Web Vitals를 받을 수집 엔드포인트
- `VITE_SENTRY_DSN`: 설정 시 `@sentry/react`를 동적 로드해 Sentry/GlitchTip으로 전송
- 수집 항목: `error`, `unhandledrejection`, Error Boundary, LCP/CLS/INP/TTFB
- 수집에는 버전, URL, view, userAgent만 포함하고 학생 이름·단어 기록은 보내지 않는다.

## 6. 데이터·보안 기준

- 학생 개인 기록은 기기 전용 capability 토큰으로 보호한다.
- `studentProfiles`는 문서가 없을 때만 get을 허용하고 기존 문서는 전체 검증한다.
- 공개 리더보드는 익명 읽기가 가능하므로 학생 실명 노출 정책을 별도로 검토한다.
- 리더보드·오답 리포트의 익명 쓰기는 아직 제한하지 않았다. 학급/학생 식별자 도입 전까지는 App Check와 Firebase 사용량 모니터링으로 남용을 감시한다.
- 교사 승인은 현재 Firebase Console/Admin SDK 수동 승인이다.
- Firestore 규칙 변경 시 `npm run test:rules` 필수.

### 배포 보안 헤더

- `vercel.json`과 `firebase.json`의 `hosting.headers`가 같은 보안 헤더를 설정한다.
  - `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`
  - `Permissions-Policy`: 마이크는 same-origin만 허용
  - `Cross-Origin-Opener-Policy: same-origin-allow-popups`: Google 로그인 팝업 유지
  - `Strict-Transport-Security`
- `tests/security-headers.test.js`가 두 설정 파일의 필수 헤더를 검사한다.

### App Check

- `VITE_FIREBASE_APP_CHECK_SITE_KEY`가 있을 때만 reCAPTCHA v3 provider를 지연 초기화한다.
- `VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN`은 로컬 디버깅 전용이며 운영 빌드에 넣지 않는다.
- 코드는 연결 지점만 제공한다. Firebase Console에서 App Check provider 등록과 enforcement를 별도로 켜야 실제 차단이 시작된다.

## 7. 문서 지도

| 문서 | 역할 |
|---|---|
| `docs/OPERATIONS.md` | 현재 운영·배포·검증 기준 (최우선) |
| `README.md` | 개발 시작과 공통 명령 |
| `docs/firebase-architecture.md` | Firestore 데이터 구조 |
| `docs/deployment-policy.md` | 배포 정책 |
| `docs/project-handoff.md` | 새 세션용 프로젝트 요약 |
| `docs/improvement-ideas.md` | 향후 개선 아이디어 전체 목록 |
| `docs/changes/` | 날짜별 변경 기록 |
| `src/constants/app.js` | 사용자에게 보이는 업데이트 내역 |

## 8. 알려진 제약

- 브라우저 TTS/STT 품질은 기기·브라우저에 따라 다르다.
- Safari 음성 인식은 실험적이며 fallback이 필요하다.
- 학생 기록은 브라우저 저장소를 지우면 새 기록으로 시작한다.
- 학교 검색은 `schools` 컬렉션의 `normalizedName` prefix 쿼리를 사용한다. 기존 데이터에 학교 문서가 없을 때만 공개 세트 fallback을 사용한다.
- `schools` 디렉터리에는 아직 공개 세트가 없는 학교도 포함될 수 있다. 단원 목록이 비어 있으면 공개된 세트가 없다는 안내를 따른다.
- 학교 이름을 바꾸면 이전 `schools` 문서가 남을 수 있다. 안정적인 학교 ID와 문서 정리는 후속 작업이다.
- 인기 학교 목록은 공개 세트 집계를 5분간 sessionStorage에 캐시한다. 대규모 확장 전에는 학교별 집계 문서가 필요하다.
- 리더보드·오답 리포트의 익명 쓰기 제한은 학급/학생 식별자 도입 이후로 미뤘다.
- 교사 승인·학교명 변경·데이터 정리는 아직 관리자 콘솔이 없다.
