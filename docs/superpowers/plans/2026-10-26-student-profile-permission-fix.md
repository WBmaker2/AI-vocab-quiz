# 개인 기록 저장 권한 오류 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 학생이 처음 개인 기록을 저장할 때 `Missing or insufficient permissions.`가 발생하지 않도록 Firestore 규칙과 저장 흐름을 고치고, 기존 프로필 업데이트에서도 같은 오류가 재발하지 않게 한다.

**Architecture:** `studentProfiles` 문서가 없는 상태에서 `runTransaction()`이 `transaction.get()`으로 문서를 읽으면, 현재 `get` 규칙이 `resource.data`를 평가하다 오류를 내고 요청을 거부한다. 없는 문서에 대한 get만 허용하고, 기존 문서는 지금처럼 전체 capability 검증을 유지한다. 추가로 업데이트 시 이미 저장된 `schoolName`/`studentName`을 사용해 표시 값 불일치로 인한 권한 오류를 막는다.

**Tech Stack:** Firestore Security Rules, Firebase Emulator rules tests, React/Vite client, Node test runner

---

## 파일 구조

### 수정할 파일

- `firestore.rules`
  - `studentProfiles`의 get 규칙에서 없는 문서(`resource == null`)를 허용
- `tests/firestore.rules.test.js`
  - 트랜잭션 기반 최초 생성/업데이트 회귀 테스트 추가
- `src/lib/firebaseProgress.js`
  - 기존 프로필 업데이트 시 저장된 `schoolName`/`studentName`을 유지
- `src/lib/firebase.test.js`
  - `createNextStudentProfile()`의 저장된 표시 값 유지 테스트 추가
- `src/constants/app.js`
  - `v1.18.1` 업데이트 내역 추가
- `package.json`
  - 버전 `1.18.1`
- `package-lock.json`
  - 버전 메타데이터 갱신
- `docs/changes/2026-10-26-student-profile-permission-fix.md`
  - 원인, 수정, 검증, 배포 기록
- `docs/firebase-architecture.md`
  - 없는 capability 문서 get 허용 이유 기록

### 참고할 파일

- `src/components/progression/useActivityProgression.js`
- `src/utils/studentProgress.js`
- `src/utils/studentProfileCapability.js`
- `docs/project-handoff.md`

---

## 문제 요약

`saveStudentProgress()`는 저장 전에 트랜잭션으로 기존 프로필을 읽는다.

```js
await runTransaction(firestore, async (transaction) => {
  const snapshot = await transaction.get(profileRef);
  ...
});
```

신규 학생은 `studentProfiles/{schoolId}__{grade}__{name}__{token}` 문서가 없다. 이때 Firestore는 `get` 규칙을 `resource == null` 상태로 평가한다. 현재 규칙은 `isStudentProfileRead(profileId)` 안에서 `resource.data`를 읽기 때문에 평가 오류가 나고, 클라이언트에는 `permission-denied`로 전달된다.

에뮬레이터 재현 결과:

```text
현재 규칙: FAIL permission-denied
evaluation error at L760:21 for 'get' ... Null value error

수정 규칙(resource == null 허용): CREATE OK, UPDATE OK
```

---

## 구현 단계

### Task 1: 실패하는 규칙 테스트 작성

- [x] `tests/firestore.rules.test.js`에 `runTransaction` import 추가
- [x] "studentProfiles allows a transaction to create a missing profile" 테스트 추가
  - 인증 없는 컨텍스트에서 `transaction.get()` 후 `transaction.set()` 실행
  - 듣기 첫 저장과 같은 `totalSessions: 1`, `listeningSessions: 1` 문서 사용
- [x] "studentProfiles allows a transaction to update an existing profile" 테스트 추가
  - 관리자 컨텍스트로 기존 프로필 seed
  - 인증 없는 컨텍스트에서 `transaction.get()` 후 `transaction.update()` 실행
- [x] "studentProfiles still rejects reads for malformed profile documents" 테스트 추가
  - 문서는 존재하지만 `profileToken`이 경로와 다른 경우 get이 거부되는지 확인
- [x] `npm run test:rules` 실행
  - 최초 생성 테스트가 현재 규칙에서 실패하는지 확인 (RED)

### Task 2: get 규칙 수정

- [x] `firestore.rules:760`을 아래처럼 수정

```javascript
allow get: if resource == null || isStudentProfileRead(profileId);
```

- [x] `npm run test:rules` 실행
  - 신규 테스트 3개를 포함해 전체 통과 확인 (GREEN)
- [x] 기존 `studentProfiles` 테스트가 모두 통과하는지 확인

### Task 3: 기존 프로필 표시 값 유지

- [x] `src/lib/firebase.test.js`에 실패하는 테스트 추가
  - 기존 프로필의 `schoolName: "테스트초"`, `studentName: "Minsu"`를
    새 입력 `schoolName: "새이름초"`, `studentName: "minsu"`로 저장할 때
    `createNextStudentProfile()`이 저장된 표시 값을 유지하는지 확인
- [x] `npm test` 실행
  - 새 테스트가 현재 코드에서 실패하는지 확인 (RED)
- [x] `src/lib/firebaseProgress.js`의 `createNextStudentProfile()` 수정
  - `schoolName: currentProfile.schoolName || schoolName`
  - `studentName: currentProfile.studentName || studentName`
  - `studentNameNormalized`는 유지된 `studentName` 기준으로 계산
- [x] `npm test` 실행
  - 새 테스트와 기존 테스트 모두 통과 확인 (GREEN)

### Task 4: 릴리스 기록

- [x] `src/constants/app.js` 맨 위에 `v1.18.1` 항목 추가
  - 날짜: `2026-10-26`
  - 요약: 새 기기에서도 첫 개인 기록과 배지를 저장할 수 있도록 권한 오류 수정
- [x] `package.json`, `package-lock.json` 버전을 `1.18.1`로 갱신
- [x] `docs/changes/2026-10-26-student-profile-permission-fix.md` 생성
- [x] `docs/firebase-architecture.md`의 `studentProfiles` 섹션에
  없는 문서 get 허용 이유와 기존 문서 검증 유지 설명 추가
- [x] 필요하면 `docs/project-handoff.md` 작업 기록에 한 줄 추가

### Task 5: 전체 검증

- [x] `npm test`
- [x] `npm run test:rules`
- [x] `npm run build`
- [x] `npm run test:smoke`
- [x] `npm audit --omit=dev`

### Task 6: 배포

- [x] Firestore 규칙 배포

```bash
npx firebase deploy --only firestore:rules --project talking-vocab-quiz
```

- [x] Firebase Console > Firestore > Rules에서 새 규칙 게시 확인
- [x] 앱 업데이트 내역 반영을 위해 Vercel production 재배포
- [x] 새 브라우저(새 capability 토큰)에서 임시 학생 이름으로 첫 저장 확인
- [x] QA 문서는 Firebase Console 또는 Admin SDK로 정리
- [x] 실제 학생 이름과 실제 기록은 라이브 검증에 사용하지 않음

---

## 예상 결과

- 신규 학생도 첫 개인 기록과 배지를 정상 저장
- 기존 학생은 최고 기록 갱신과 배지 누적이 그대로 동작
- 기존 프로필의 표시 이름 대소문자/학교 이름이 달라도 업데이트가 실패하지 않음
- 리더보드와 다른 Firestore 컬렉션에는 영향 없음

## 롤백

- 규칙 문제 시 `firestore.rules`의 get 한 줄을 되돌리고 규칙만 재배포
- 클라이언트 표시 값 유지 변경은 새 프로필 생성/기존 프로필 업데이트 모두에서
  하위 호환이므로 데이터 마이그레이션은 필요 없음
