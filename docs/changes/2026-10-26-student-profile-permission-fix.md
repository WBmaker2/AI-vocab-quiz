# 개인 기록 첫 저장 권한 오류 수정

- 버전: `v1.18.1`
- 날짜: `2026-10-26`

## 증상

학생 결과 화면에서 `개인 기록 저장`을 누르면 `Missing or insufficient permissions.`가 표시되고 저장되지 않았다.

## 원인

`saveStudentProgress()`는 저장 전에 `runTransaction()`으로 `studentProfiles` 문서를 먼저 읽는다. 신규 학생은 문서가 없는데, `studentProfiles`의 get 규칙이 없는 문서에 대해 `resource.data`를 평가하면서 오류가 발생했고 Firestore가 요청을 거부했다.

이 문제는 기기 전용 capability 문서 구조가 도입될 때 get 규칙이 `allow get: if true`에서 엄격한 문서 검증으로 바뀌면서 생겼다. 기존 규칙 테스트는 `setDoc`/`updateDoc`만 확인해 트랜잭션의 없는 문서 읽기 경로를 검증하지 못했다.

## 수정

- `firestore.rules`: 없는 capability 문서에 한해 get을 허용하고, 기존 문서는 기존 검증을 그대로 유지
- `src/lib/firebaseProgress.js`: 기존 프로필 업데이트 시 저장된 `schoolName`/`studentName`을 유지해 표시 값 불일치로 인한 권한 오류 방지
- `tests/firestore.rules.test.js`: 트랜잭션 최초 생성/기존 업데이트/잘못된 문서 거부 회귀 테스트 추가
- `src/lib/firebase.test.js`: 저장된 표시 값 유지 테스트 추가

## 검증

- Firestore Emulator에서 현재 규칙의 최초 저장 실패 재현 후 수정 규칙으로 생성/업데이트 성공 확인
- `npm test`
- `npm run test:rules`
- `npm run build`
- `npm run test:smoke`
- `npm audit --omit=dev`: 기존 `firebase` 전이 의존성 `@grpc/grpc-js` 관련 high 4건이 보고됨. 이번 변경 이전부터 있던 항목이며, 비파괴적 자동 수정 경로가 없어 이번 범위에서는 건드리지 않음

## 배포

- Firestore 규칙은 Vercel 배포와 별개로 Firebase에 배포해야 한다.
- `npx firebase deploy --only firestore:rules --project talking-vocab-quiz`
- 앱 업데이트 내역 반영을 위해 Vercel production도 재배포한다.

### 배포 결과

- Firestore 규칙: `talking-vocab-quiz` 프로젝트에 배포 완료
- Vercel production: `dpl_RnkqRTGghiwZujPZ3gZEmBw2UcDz`
- Production URL: <https://talking-vacab-quiz.vercel.app>
- 라이브 번들에서 `v1.18.1` 업데이트 내역 확인
- 운영 환경 QA: 임시 capability 프로필 생성/업데이트 성공 후 `firestore:delete`로 삭제
- 실제 학생 이름과 실제 기록은 사용하지 않음
