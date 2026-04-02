# 단어 낚시 리더보드 및 교사 통합 관리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 단어 낚시 게임에도 짝 맞추기와 동일한 수준의 리더보드를 추가하고, 교사 화면에서 짝 맞추기와 낚시 리더보드를 활동 탭으로 전환하며 이름 수정과 기록 삭제를 관리할 수 있게 만든다.

**Architecture:** 기존 매칭 전용 리더보드 로직을 `activityType` 기반 공통 리더보드 레이어로 일반화한다. 학생 완료 화면은 게임별 결과 메트릭만 다르게 주고 공통 리더보드 저장/조회 UI를 공유한다. 교사 화면은 `리더보드 관리` 카드 하나를 유지한 채 활동 탭과 기간 탭으로 현재 대상 리더보드를 전환한다.

**Tech Stack:** React, Vite, existing Firebase Firestore client, existing teacher leaderboard admin flow, Firestore security rules

---

## 파일 구조

### 새로 만들 파일

- `src/components/GameLeaderboardPanel.jsx`
  - 학생 게임 완료 화면에서 공통 리더보드 저장/조회 UI를 담당
- `src/utils/activityLeaderboard.js`
  - activityType, scopeKey, 저장 payload, 비교 규칙 공통 유틸

### 수정할 파일

- `src/components/WordFishingGame.jsx`
  - 결과 화면에 공통 리더보드 패널 연결
- `src/components/WordMatchingGame.jsx`
  - 기존 매칭 전용 리더보드 UI를 공통 패널로 대체
- `src/components/TeacherWorkspace.jsx`
  - 활동 탭 추가 및 활동별 리더보드 목록 전환
- `src/hooks/useVocabularyLibrary.js`
  - teacher leaderboard state를 activityType 기준으로 확장
- `src/lib/firebase.js`
  - 공통 리더보드 fetch/save/rename/delete 함수 추가 및 기존 매칭 함수 정리
- `src/utils/leaderboard.js`
  - period/type 유틸을 공통 구조와 맞게 보강
- `firestore.rules`
  - 공통 activity leaderboard 경로와 권한 규칙 추가 또는 전환
- `src/styles/global.css`
  - 공통 리더보드 패널과 교사 활동 탭 스타일 추가
- `src/constants/app.js`
  - update info 기록 추가
- `package.json`
  - 버전 소폭 상승

### 참고할 기존 파일

- `src/components/WordMatchingGame.jsx`
- `src/components/TeacherWorkspace.jsx`
- `src/lib/firebase.js`
- `src/utils/leaderboard.js`
- `docs/superpowers/specs/2026-04-02-word-fishing-leaderboard-design.md`

---

### Task 1: 공통 리더보드 유틸 정의

**Files:**
- Create: `src/utils/activityLeaderboard.js`
- Modify: `src/utils/leaderboard.js`
- Test: `node --input-type=module`

- [ ] **Step 1: activityType 상수와 정규화 함수 작성**

필수 값:

- `matching`
- `fishing`

예상 함수:

```js
normalizeActivityLeaderboardType(value)
```

- [ ] **Step 2: 공통 scope/document id 생성 함수 작성**

예상 함수:

```js
createActivityLeaderboardScopeKey({ activityType, schoolId, grade, periodType, periodKey })
createActivityLeaderboardEntryId({ activityType, schoolId, grade, periodType, periodKey, studentName })
```

- [ ] **Step 3: 기록 우선순위 비교 함수 공통화**

기준:

1. 점수 높은 기록
2. 동점이면 시간 짧은 기록
3. 그래도 같으면 기존 기록 유지

- [ ] **Step 4: 기본 회귀 체크 실행**

Run:

```bash
node --input-type=module -e "import { createActivityLeaderboardScopeKey } from './src/utils/activityLeaderboard.js'; console.log(createActivityLeaderboardScopeKey({ activityType: 'fishing', schoolId: 's1', grade: '3', periodType: 'week', periodKey: '2026-W14' }));"
```

Expected:
- `fishing__s1__3__week__2026-W14`

---

### Task 2: Firebase 공통 리더보드 저장/조회 레이어 작성

**Files:**
- Modify: `src/lib/firebase.js`
- Modify: `src/utils/activityLeaderboard.js`
- Test: `npm run build`

- [ ] **Step 1: 공통 payload 생성 함수 추가**

공통 필드와 활동별 메트릭을 함께 담는 payload 생성 함수를 만든다.

예상 shape:

```js
{
  activityType,
  scopeKey,
  schoolId,
  schoolName,
  grade,
  studentName,
  studentNameNormalized,
  periodType,
  periodKey,
  score,
  elapsedSeconds,
  solvedPairs,
  correctCount,
  wrongCount,
  missCount,
}
```

- [ ] **Step 2: 공통 upsert 함수 작성**

예상 함수:

```js
upsertActivityLeaderboardPeriod(...)
```

규칙:

- 기존 기록보다 점수가 높을 때만 갱신
- 동점이면 시간 짧은 기록만 갱신
- 그렇지 않으면 `skipped`

- [ ] **Step 3: 공통 fetch 함수 작성**

예상 함수:

```js
fetchActivityLeaderboards({ activityType, schoolId, grade, now, limitCount })
```

- [ ] **Step 4: 매칭 wrapper 유지**

기존 공개 함수가 깨지지 않도록 아래 wrapper를 유지한다.

- `fetchMatchingLeaderboards`
- `saveMatchingLeaderboardScore`

- [ ] **Step 5: 낚시 wrapper 추가**

새 함수:

- `fetchFishingLeaderboards`
- `saveFishingLeaderboardScore`

- [ ] **Step 6: 빌드로 회귀 확인**

Run:

```bash
npm run build
```

Expected:
- build 성공

---

### Task 3: 교사 리더보드 관리 로직을 activityType 기준으로 확장

**Files:**
- Modify: `src/hooks/useVocabularyLibrary.js`
- Modify: `src/lib/firebase.js`
- Test: `npm run build`

- [ ] **Step 1: teacher leaderboard 상태에 활동 탭 추가**

필수 상태:

- `activityType`
- `setActivityType`

기본값:
- `matching`

- [ ] **Step 2: 교사 리더보드 refresh 함수에 activityType 반영**

현재 선택 활동 기준으로 해당 리더보드만 불러오게 수정한다.

- [ ] **Step 3: 이름 수정 함수에 activityType 인자 추가**

예상 흐름:

```js
renameTeacherActivityLeaderboardStudent({ activityType, schoolId, grade, oldStudentName, newStudentName })
```

- [ ] **Step 4: 삭제 함수에 activityType 인자 추가**

예상 흐름:

```js
deleteTeacherActivityLeaderboardStudent({ activityType, schoolId, grade, studentName })
```

- [ ] **Step 5: 기존 매칭 관리 동작이 유지되는지 빌드 확인**

Run:

```bash
npm run build
```

Expected:
- build 성공

---

### Task 4: 교사 화면 활동 탭 UI 추가

**Files:**
- Modify: `src/components/TeacherWorkspace.jsx`
- Modify: `src/styles/global.css`
- Test: `npm run build`

- [ ] **Step 1: 활동 탭 UI 추가**

리더보드 관리 카드 상단에 아래 탭을 추가한다.

- `짝 맞추기`
- `단어 낚시`

- [ ] **Step 2: 기간 탭과 활동 탭을 함께 동작시키기**

현재 선택된 활동의 보드만 목록에 보이게 한다.

- [ ] **Step 3: 상태/에러 문구를 공통 위치에 유지**

기존 카드 구조를 유지하고, 활동 변경 시에도 문구 위치는 변하지 않게 한다.

- [ ] **Step 4: 모바일 레이아웃 보강**

활동 탭과 기간 탭이 좁은 화면에서 줄바꿈 또는 가로 스크롤로 안전하게 보이도록 한다.

- [ ] **Step 5: 빌드 확인**

Run:

```bash
npm run build
```

Expected:
- build 성공

---

### Task 5: 학생 공통 리더보드 패널 작성

**Files:**
- Create: `src/components/GameLeaderboardPanel.jsx`
- Modify: `src/components/WordMatchingGame.jsx`
- Modify: `src/styles/global.css`
- Test: `npm run build`

- [ ] **Step 1: 공통 props 설계**

예상 props:

```js
{
  activityType,
  finalScore,
  elapsedSeconds,
  leaderboardContext,
  studentNameDraft,
  onStudentNameDraftChange,
  remoteConfigured,
  metrics,
}
```

- [ ] **Step 2: 저장 질문 / 이름 입력 / 탭형 목록 UI 이동**

현재 매칭 완료 화면의 리더보드 블록을 공통 패널로 이동한다.

- [ ] **Step 3: 매칭 게임에 공통 패널 연결**

기존 동작, 문구, 탭 표시가 유지되는지 확인한다.

- [ ] **Step 4: 빌드 확인**

Run:

```bash
npm run build
```

Expected:
- build 성공

---

### Task 6: 단어 낚시 결과 화면에 리더보드 연결

**Files:**
- Modify: `src/components/WordFishingGame.jsx`
- Modify: `src/components/GameLeaderboardPanel.jsx`
- Test: `npm run build`

- [ ] **Step 1: 낚시 게임 전체 소요 시간 계산 값 정리**

리더보드 저장용 `elapsedSeconds`를 결과 화면에서 안정적으로 계산한다.

권장 값:
- 실제 전체 플레이 시간 또는 라운드 진행 누적 시간

- [ ] **Step 2: 낚시 결과 화면에 공통 리더보드 패널 삽입**

전달할 메트릭:

- `correctCount`
- `wrongCount`
- `missCount`

- [ ] **Step 3: 낚시 게임 전용 저장 함수 연결**

`activityType: 'fishing'` 기준으로 저장되게 한다.

- [ ] **Step 4: 점수 저장 후 리더보드 재조회 확인**

저장 직후 탭 목록이 새 점수 기준으로 갱신되게 한다.

- [ ] **Step 5: 빌드 확인**

Run:

```bash
npm run build
```

Expected:
- build 성공

---

### Task 7: Firestore rules를 공통 activity leaderboard 기준으로 확장

**Files:**
- Modify: `firestore.rules`
- Test: `npx firebase-tools deploy --only firestore:rules --project talking-vocab-quiz`

- [ ] **Step 1: 공통 activity leaderboard 경로 규칙 추가**

새 경로 예시:

- `activityLeaderboards/{activityScopeKey}/entries/{studentKey}`

- [ ] **Step 2: 학생 저장 허용 규칙 작성**

허용 조건:

- 허용된 `activityType`만 저장 가능
- scope key와 문서 key가 payload와 일치
- 점수 업데이트는 더 좋은 기록일 때만 허용

- [ ] **Step 3: 교사 수정/삭제 허용 규칙 작성**

허용 조건:

- 로그인 필수
- 교사 학교와 대상 `schoolId` 일치
- update/delete는 교사만 가능

- [ ] **Step 4: 기존 매칭 경로와 전환 전략 정리**

완전 전환 전까지 기존 경로를 남길지, 새 경로로만 이동할지 구현 상태에 맞춰 결정한다.

- [ ] **Step 5: rules 배포로 문법 검증**

Run:

```bash
npx firebase-tools deploy --only firestore:rules --project talking-vocab-quiz
```

Expected:
- rules compile and deploy success

---

### Task 8: 회귀 검증 및 문서/버전 반영

**Files:**
- Modify: `src/constants/app.js`
- Modify: `package.json`
- Test: `npm run build`

- [ ] **Step 1: 버전 소폭 상승**

현재 버전에서 소폭 증가시킨다.

- [ ] **Step 2: update info 기록 추가**

추가 내용:

- 단어 낚시 리더보드 추가
- 교사 화면 활동 탭형 리더보드 관리 추가
- 낚시 게임 이름 수정 / 기록 삭제 지원

- [ ] **Step 3: 최종 빌드 실행**

Run:

```bash
npm run build
```

Expected:
- build 성공

- [ ] **Step 4: 수동 검증 체크리스트 실행**

검증 항목:

1. 짝 맞추기 결과 화면에서 기존 리더보드가 정상 동작한다.
2. 단어 낚시 결과 화면에서 저장 질문과 탭형 리더보드가 보인다.
3. 교사 화면에서 활동 탭 전환이 된다.
4. 낚시 활동 탭에서 이름 수정과 기록 삭제가 동작한다.
5. 활동 전환 시 UI가 과도하게 복잡해 보이지 않는다.

- [ ] **Step 5: 커밋**

```bash
git add src/components/GameLeaderboardPanel.jsx src/components/WordFishingGame.jsx src/components/WordMatchingGame.jsx src/components/TeacherWorkspace.jsx src/hooks/useVocabularyLibrary.js src/lib/firebase.js src/utils/activityLeaderboard.js src/utils/leaderboard.js src/styles/global.css src/constants/app.js package.json firestore.rules
git commit -m "Add fishing leaderboard and shared teacher admin"
```
