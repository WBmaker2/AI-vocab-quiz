# 2026-10-27 기술 부채 정리·보안·접근성

- 릴리스: `v1.19.1`
- 범위: 학교 검색 인덱스, 배포 보안 헤더, 선택적 App Check, 접근성 자동 검사, ESLint 경고 0개
- 제외: 수업/학급 코드, 학급 명단, 내 기록 복구, 딥링크, SRS, 관리자 콘솔

## 1. 학교 검색 인덱스

- 학생 학교 검색이 `vocabularySets`의 공개 세트 전체를 읽던 경로를 `schools` 컬렉션의 `normalizedName` prefix 쿼리로 교체했습니다.
- `schools` 결과가 없을 때만 기존 공개 세트 기반 검색을 fallback으로 사용합니다.
- 인기 학교 집계는 기존처럼 공개 세트를 사용하지만 `sessionStorage`에 5분간 캐시해 반복 전체 읽기를 줄였습니다.
- 검색 정규화·범위 계산은 `src/utils/schoolSearch.js`로 분리하고 단위 테스트를 추가했습니다.

## 2. 보안

- Vercel(`vercel.json`)과 Firebase Hosting(`firebase.json`)에 공통 보안 헤더를 추가했습니다.
  - `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`
  - `Permissions-Policy` (마이크는 same-origin만 허용)
  - `Cross-Origin-Opener-Policy: same-origin-allow-popups` (Google 로그인 팝업 유지)
  - `Strict-Transport-Security`
- Firebase App Check 초기화 지점을 추가했습니다.
  - `VITE_FIREBASE_APP_CHECK_SITE_KEY`가 있을 때만 reCAPTCHA v3 provider를 지연 로드합니다.
  - App Check 코드는 `firebase-app-check` 별도 청크로 분리해 설정이 없을 때 초기 로드에 포함되지 않습니다.
  - `VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN`은 로컬 디버깅용이며 운영에는 사용하지 않습니다.
- App Check **강제(enforcement)는 Firebase Console에서 별도로 켜야 합니다.** 이번 릴리스는 연결 지점과 문서만 추가했습니다.
- 익명 리더보드·오답 리포트 쓰기 제한은 학급/학생 식별자 도입 이후로 남겨 두었습니다.

## 3. 접근성

- `본문으로 건너뛰기` skip link를 추가하고 `.view-content`를 `#main-content`로 연결했습니다.
- `global.css`에 누락되어 있던 `--ink-soft` 색상 변수를 정의했습니다.
- Playwright 스모크에 axe WCAG 2 A/AA 검사를 추가했습니다. 홈과 교사 화면에서 critical/serious 위반이 있으면 스모크가 실패합니다.

## 4. 코드 정리

- ESLint 경고 135개를 0개로 정리하고 `npm run lint`를 `--max-warnings=0`으로 강화했습니다.
- `src/lib/firebase.js`의 사용하지 않는 re-export import를 제거했습니다.
- 빙고 관련 파일의 dead import와 unused 변수를 제거했습니다.
- `useEffectEvent`를 effect 밖(버튼·키보드 핸들러)에서 호출하던 게임 컴포넌트를 일반 함수/effect event 조합으로 정리했습니다.
- `useSpeakingGrading`은 `useEffectEvent`로 음성 인식 결과 처리 의존성을 정리했습니다.
- 불필요한 `return;`을 `return undefined;`로 바꿔 effect cleanup 계약을 명확히 했습니다.

## 5. 검증

- `npm test`: 223개 통과
- `npm run lint`: 경고 0개
- `npm run test:rules`: 85개 통과
- `npm run test:activities`: 전체 활동 스모크 통과
- `npm run build`: 통과
- `npm run test:smoke`: 통과 (axe 접근성 검사 포함)
- `npm audit --omit=dev`: 취약점 0개

## 6. 운영 참고

- 배포는 하지 않았습니다. Vercel production 반영 시 `vercel.json` 헤더가 함께 적용됩니다.
- App Check를 켜려면 Firebase Console > App Check에서 reCAPTCHA v3 provider를 등록하고, 빌드 환경에 `VITE_FIREBASE_APP_CHECK_SITE_KEY`를 넣은 뒤 선택적으로 enforcement를 활성화합니다.
- 인기 학교 목록은 최대 5분간 이전 값을 보여 줄 수 있습니다.
