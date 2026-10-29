# 2026-10-29 교사 로그인 오류 수정

- 릴리스: `v1.19.2`

- 증상: 교사 관리 화면에서 `Google로 로그인` 버튼을 누르면 `authPersistenceReady is not defined` 오류가 나옵니다.
- 원인: `src/lib/firebaseSchools.js`에서 선언되지 않은 `authPersistenceReady`를 직접 참조했습니다. `src/lib/firebaseCore.js`는 준비 상태를 export하지만, 로그인 쪽에서 정적 import 없이 쓰면서 참조 오류가 생겼습니다. 앞선 수정에서 동적 import와 전역 캐시로 우회했으나 구조가 복잡해 다시 깨지기 쉬웠습니다.
- 수정:
  - `src/lib/firebaseCore.js`에서 인증 저장소 준비 상태를 `export const authPersistenceReady`로 단순하게 내보냅니다. 불필요한 전역 캐시를 없앴습니다.
  - `src/lib/firebaseSchools.js`에서 `authPersistenceReady`를 정적 import로 받아 `signInWithGoogle` 실행 전에 직접 기다립니다. 실패해도 로그인은 계속 시도합니다.
- 검증:
  - `npm run lint`: 경고 0개
  - `npm test`: 223개 통과
  - `npm run build`: 통과
  - 로컬 개발 서버에서 교사 화면 → `Google로 로그인` 클릭 시 콘솔 오류 0건, `authPersistenceReady` 관련 오류 없음 확인 (미승인 도메인 경고만 남으며 이는 Firebase 콘솔 설정 문제입니다)

## 같은 날 배포 복구 (v1.19.2 포함)

- 증상: Vercel 프로덕션(`https://talking-vocab-quiz.vercel.app`)이 `DEPLOYMENT_NOT_FOUND`로 열리지 않았습니다.
- 원인 1: `vercel.json`에 SPA 폴백이 없어 빌드 산출물 라우팅에서 정적 파일 처리가 빠졌습니다. `rewrites`에 `/(.*)` → `/index.html`을 추가했습니다 (Firebase Hosting의 `rewrites`와 같은 역할).
- 원인 2: Vercel 인증(SSO) 보호가 프로덕션까지 막고 있어 로그인 화면으로 튕겼습니다. 배포 보호 범위를 미리보기만으로 바꿔 프로덕션은 누구나 열리게 했습니다.
- 배포: `vercel --prod`로 프로덕션 배포 후 브라우저에서 직접 확인했습니다. v1.19.2 표시, 교사 화면 → `Google로 로그인` 클릭 시 구글 로그인 창이 정상 열리고 콘솔 오류 0건입니다.
