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
