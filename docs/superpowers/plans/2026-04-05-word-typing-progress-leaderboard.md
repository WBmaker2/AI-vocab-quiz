# 영어 단어 타자 게임 리더보드/성장 기록 확장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 영어 단어 타자 게임 완료 후 점수를 리더보드에 저장하고, 학생 개인 최고 기록과 성장 요약을 확인할 수 있게 하며, 교사 화면에서도 타자 리더보드를 이름 수정과 삭제까지 관리할 수 있게 만든다.

**Architecture:** 기존 `matching`/`fishing` 활동 구조를 따라 `typing` 활동 타입을 추가하고, 활동 리더보드 컬렉션과 학생 성장 집계 구조를 공통 체계 안으로 확장한다. 학생 화면은 `WordTypingGame` 결과 단계에서 공통 `GameLeaderboardPanel`과 `StudentProgressPanel`을 재사용하고, 교사 화면은 활동 탭만 추가해 동일한 관리 UI를 유지한다. 세션 히스토리 저장 구조는 설계해 두되, 1차 구현은 리더보드와 집계 프로필 중심으로 마무리한다.

**Tech Stack:** React, Firebase Firestore, existing leaderboard utilities, existing student progress utilities, existing teacher leaderboard management, Vite

---

## 파일 구조

### 수정할 파일

- `src/utils/activityLeaderboard.js`
  - `typing` 활동 리더보드 정의 추가
- `src/utils/studentProgress.js`
  - `typing` 활동 타입, 비교 함수, 성장 요약 확장
- `src/lib/firebase.js`
  - 타자 리더보드 저장/조회/이름수정/삭제 API 추가
  - `saveStudentProgress`에 `typing` 저장 지원 추가
- `src/components/GameLeaderboardPanel.jsx`
  - 타자 리더보드 fetch/save 핸들러 연결
  - 타자 메트릭 표기 추가
- `src/components/StudentProgressPanel.jsx`
  - 타자 성장 기록 값 렌더링 포맷 확장
- `src/components/WordTypingGame.jsx`
  - 완료 화면에 리더보드/성장 기록 연결
  - 학생 이름 입력 draft, 저장 상태, 결과 메트릭 전달
- `src/components/TeacherWorkspace.jsx`
  - 리더보드 활동 탭에 `영어 타자` 추가
- `src/hooks/useVocabularyLibrary.js`
  - 교사 리더보드 활동 타입에 `typing` 추가
  - 조회/이름수정/삭제 흐름 공통화 연결
- `firestore.rules`
  - `typingLeaderboards` 및 타자 성장 기록 쓰기 규칙 추가
- `src/constants/app.js`
  - 버전 및 update info 기록 추가
- `package.json`
  - 버전 반영

### 참고할 파일

- `src/components/WordMatchingGame.jsx`
- `src/components/WordFishingGame.jsx`
- `src/components/GameLeaderboardPanel.jsx`
- `src/components/StudentProgressPanel.jsx`
- `src/lib/firebase.js`
- `src/utils/leaderboard.js`

### 이번 계획에서 새로 만들지 않는 파일

- 별도 `TypingLeaderboardPanel` 컴포넌트는 만들지 않는다.
- 별도 `saveTypingStudentProgress` 파일은 만들지 않는다.
- 세션 히스토리 전용 UI 컴포넌트는 이번 범위에 넣지 않는다.

---

### Task 1: 활동 타입과 공통 리더보드 정의 확장

**Files:**
- Modify: `src/utils/activityLeaderboard.js`
- Modify: `src/hooks/useVocabularyLibrary.js`
- Modify: `src/components/TeacherWorkspace.jsx`

- [ ] **Step 1: `typing` 활동 정의 추가**

`src/utils/activityLeaderboard.js`의 정의 목록에 아래 항목을 추가한다.

```js
{
  type: "typing",
  label: "영어 타자",
  collectionName: "typingLeaderboards",
}
```

- [ ] **Step 2: 활동 타입 정규화가 `typing`을 유지하는지 확인**

Run:

```bash
node --input-type=module -e "import { normalizeActivityLeaderboardType } from './src/utils/activityLeaderboard.js'; console.log(normalizeActivityLeaderboardType('typing'));"
```

Expected:
- `typing`

- [ ] **Step 3: 교사 리더보드 상태에서 기본 활동 탭 배열 확인**

`src/hooks/useVocabularyLibrary.js`에서 활동 탭 후보가 하드코딩되어 있다면 `typing`을 추가한다.

예상 라벨:

- `짝 맞추기`
- `단어 낚시`
- `영어 타자`

- [ ] **Step 4: 교사 화면 활동 탭 렌더링에 `영어 타자`가 보이게 연결**

`src/components/TeacherWorkspace.jsx`에서 활동 탭 UI가 새 정의를 읽도록 유지하거나, 하드코딩이면 `typing`을 추가한다.

- [ ] **Step 5: 활동 탭만 바뀌고 기존 교사 편집 UI는 그대로 유지되는지 확인**

점검 기준:
- 기간 탭 구조 유지
- 이름 수정 버튼 유지
- 삭제 버튼 유지
- 카드 수 증설 없음

---

### Task 2: 타자 리더보드 Firestore API 추가

**Files:**
- Modify: `src/lib/firebase.js`
- Reference: existing matching/fishing leaderboard helpers

- [ ] **Step 1: 타자 리더보드 payload 생성 함수 추가**

추가 함수 예시:

```js
function createTypingLeaderboardPayload({
  schoolId,
  schoolName,
  grade,
  studentName,
  periodType,
  periodKey,
  score,
  elapsedSeconds,
  correctCount,
  questionCount,
  accuracy,
  hintUsedCount,
  bestCombo,
}) {
  return { ... };
}
```

- [ ] **Step 2: 타자 리더보드 entry ref 생성 함수 추가**

경로:

```js
doc(firestore, "typingLeaderboards", scopeKey, "entries", studentKey)
```

- [ ] **Step 3: 기간별 upsert 함수 추가**

함수 예시:

```js
async function upsertTypingLeaderboardPeriod(...) {}
```

최고 기록 판정 규칙:
- 점수 우선
- 점수 동점이면 정확도 우선
- 정확도도 같으면 시간 짧은 쪽 우선

- [ ] **Step 4: 기간별 fetch 함수 추가**

함수 예시:

```js
async function fetchTypingLeaderboardPeriod(...) {}
```

반환 엔트리에는 `rank`를 포함한다.

- [ ] **Step 5: 공개 API 추가**

추가 함수:

- `fetchTypingLeaderboards`
- `saveTypingLeaderboardScore`
- `renameTeacherTypingLeaderboardStudent`
- `deleteTeacherTypingLeaderboardStudent`

그리고 아래 공통 API가 `typing`을 분기 처리하도록 수정한다.

- `fetchTeacherActivityLeaderboards`
- `renameTeacherActivityLeaderboardStudent`
- `deleteTeacherActivityLeaderboardStudent`

- [ ] **Step 6: 타자 리더보드 저장 함수 smoke check**

Run:

```bash
rg -n "typingLeaderboards|saveTypingLeaderboardScore|fetchTypingLeaderboards" src/lib/firebase.js
```

Expected:
- 관련 함수와 컬렉션명이 모두 검색된다.

---

### Task 3: 학생 성장 기록 모델에 typing 추가

**Files:**
- Modify: `src/utils/studentProgress.js`
- Modify: `src/lib/firebase.js`

- [ ] **Step 1: 학생 성장 활동 타입에 `typing` 추가**

`ACTIVITY_TYPES`와 관련 비교 로직에 `typing`을 추가한다.

예상 상수:

```js
typing: "typing"
```

- [ ] **Step 2: 타자 게임 비교 함수 작성**

추가 함수:

```js
export function compareTypingProgress(profile, result) {}
```

비교 기준:
- `score`
- `accuracy`
- `elapsedSeconds`
- `bestCombo`

- [ ] **Step 3: 학생 프로필 누적 필드 업데이트 로직 확장**

`createNextStudentProfile` 또는 대응 분기 로직에 아래 필드를 추가한다.

- `typingSessions`
- `typingBestScore`
- `typingBestCorrectCount`
- `typingBestAccuracy`
- `typingBestCombo`
- `typingFastestClearSeconds`
- `typingLastPlayedAt`

- [ ] **Step 4: `saveStudentProgress`가 `typing`을 허용하도록 수정**

오류 메시지 예시도 아래처럼 갱신한다.

```js
"Activity type must be listening, speaking, matching, or typing."
```

- [ ] **Step 5: 성장 요약 라벨 추가**

`buildProgressSummary`에 다음 라벨을 추가한다.

- `영어 타자 성장 기록`

- [ ] **Step 6: 배지 로직은 최소 변경으로 유지**

1차 구현에서는 아래만 확인한다.

- 공통 배지 흐름이 깨지지 않는지
- `typing` 때문에 기존 활동 배지 판정이 오작동하지 않는지

타자 전용 신규 배지는 이번 단계에서 넣지 않는다.

---

### Task 4: StudentProgressPanel과 GameLeaderboardPanel 타자 표시 확장

**Files:**
- Modify: `src/components/StudentProgressPanel.jsx`
- Modify: `src/components/GameLeaderboardPanel.jsx`

- [ ] **Step 1: 리더보드 패널 핸들러에 typing 추가**

현재 `matching`/`fishing` 분기에 `typing`을 추가한다.

예상 연결:

```js
typing -> {
  fetchLeaderboards: fetchTypingLeaderboards,
  saveScore: saveTypingLeaderboardScore,
}
```

- [ ] **Step 2: 타자 리더보드 상세 문구 정의**

예시 표기:

- `02:14 · 정답 18/20 · 정확도 90%`

필수 포함 후보:
- 시간
- 정답 수
- 정확도

- [ ] **Step 3: StudentProgressPanel 값 포맷에 typing 추가**

예시:

```js
if (activityType === "typing") {
  return `${score}점 · ${accuracy}% · ${formatDuration(elapsedSeconds)}`;
}
```

- [ ] **Step 4: 타자 기록이 없을 때도 기존 패널 문구가 자연스럽게 유지되는지 확인**

점검 기준:
- 빈 상태 문구 유지
- 비활성 사유 문구 유지
- 다른 활동 포맷 영향 없음

---

### Task 5: WordTypingGame 완료 화면에 리더보드와 성장 기록 연결

**Files:**
- Modify: `src/components/WordTypingGame.jsx`
- Reference: `src/components/WordMatchingGame.jsx`

- [ ] **Step 1: 타자 게임 결과 메트릭 정리**

완료 시 사용할 값:

- `score`
- `elapsedSeconds`
- `correctCount`
- `questionCount`
- `accuracy`
- `hintUsedCount`
- `bestCombo`

정확도 계산 예시:

```js
const accuracy = questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0;
```

- [ ] **Step 2: 학생 이름 draft 상태 추가**

타자 게임 결과 화면에서 이름 입력을 유지하기 위해 `studentNameDraft` 상태를 둔다.

- [ ] **Step 3: 리더보드 컨텍스트 연결**

필요 컨텍스트:

- `schoolId`
- `schoolName`
- `grade`

현재 앱에서 내려오는 학생 선택 정보 구조를 그대로 재사용한다.

- [ ] **Step 4: 결과 화면에 `GameLeaderboardPanel` 추가**

전달 값:

```jsx
<GameLeaderboardPanel
  activityType="typing"
  finalScore={score}
  elapsedSeconds={elapsedSeconds}
  leaderboardContext={leaderboardContext}
  remoteConfigured={remoteConfigured}
  studentNameDraft={studentNameDraft}
  onStudentNameDraftChange={setStudentNameDraft}
  metrics={{
    correctCount,
    questionCount,
    accuracy,
    hintUsedCount,
    bestCombo,
  }}
/>
```

- [ ] **Step 5: 결과 저장 후 `saveStudentProgress` 연결**

`WordMatchingGame.jsx` 패턴을 참고해 타자 게임도 개인 성장 기록을 저장한다.

결과 payload 예시:

```js
{
  score,
  correctCount,
  questionCount,
  accuracy,
  elapsedSeconds,
  hintUsedCount,
  bestCombo,
  completed: true,
}
```

- [ ] **Step 6: `StudentProgressPanel` 연결**

학생 이름이 입력되고 저장이 성공한 뒤, 타자 성장 기록 요약이 결과 화면에 나타나도록 한다.

---

### Task 6: 교사 리더보드 관리에서 typing 이름 수정/삭제 연결

**Files:**
- Modify: `src/hooks/useVocabularyLibrary.js`
- Modify: `src/components/TeacherWorkspace.jsx`

- [ ] **Step 1: 교사 리더보드 refresh가 typing을 읽도록 수정**

현재 활동 타입이 `typing`일 때도 조회 함수가 정상 호출되게 한다.

- [ ] **Step 2: 이름 수정 액션이 typing도 처리하도록 수정**

공통 함수에서 `activityType === "typing"` 분기를 추가한다.

- [ ] **Step 3: 삭제 액션이 typing도 처리하도록 수정**

공통 함수에서 `typingLeaderboards` 삭제 API를 타게 한다.

- [ ] **Step 4: 교사 화면 표시 문구 자연화**

`영어 타자` 탭에서 아래 값이 어색하지 않게 보이도록 한다.

- 점수
- 정확도
- 시간

- [ ] **Step 5: 기존 짝 맞추기/단어 낚시 편집 흐름 회귀 확인**

점검 기준:
- 활동 탭 전환 시 기존 데이터 유지
- 이름 수정 취소/저장 동작 유지
- 삭제 확인창 동작 유지

---

### Task 7: Firestore rules 확장

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: `typingLeaderboards` 읽기/쓰기 규칙 추가**

기준:
- 학생 점수 저장 허용
- 교사 이름 수정/삭제 허용
- 기존 `matchingLeaderboards` / `fishingLeaderboards`와 동일한 정책 유지

- [ ] **Step 2: `studentProfiles` typing 저장 허용**

`typing` 활동 결과를 저장할 때 권한 오류가 나지 않도록 activity type 검증을 확장한다.

- [ ] **Step 3: 세션 히스토리 구조를 위한 규칙 자리 확보**

이번 단계에서 실제 `activitySessions` 쓰기를 넣는다면 규칙도 함께 추가한다.
이번 단계에서 저장을 미루면 주석이나 TODO 없이 규칙 변경도 최소화한다.

- [ ] **Step 4: 규칙 파일 lint/배포 전 점검**

Run:

```bash
rg -n "typingLeaderboards|typing" firestore.rules
```

Expected:
- typing 관련 규칙 항목이 모두 잡힌다.

---

### Task 8: 버전과 업데이트 기록 반영

**Files:**
- Modify: `src/constants/app.js`
- Modify: `package.json`

- [ ] **Step 1: 버전 번호 소폭 상승**

현재 버전 기준으로 하나 올린다.

- [ ] **Step 2: update info 요약 추가**

요약에 포함할 내용:
- 영어 타자 게임 리더보드 추가
- 영어 타자 개인 성장 기록 추가
- 교사 화면에서 타자 리더보드 관리 지원

---

### Task 9: 검증

**Files:**
- Verify: `src/components/WordTypingGame.jsx`
- Verify: `src/components/GameLeaderboardPanel.jsx`
- Verify: `src/components/TeacherWorkspace.jsx`
- Verify: `firestore.rules`

- [ ] **Step 1: 빌드 검증**

Run:

```bash
npm run build
```

Expected:
- build 성공

- [ ] **Step 2: 학생 타자 게임 저장 흐름 smoke check**

수동 확인:
- 단어 세트 로드
- 타자 게임 완료
- 이름 입력 후 점수 저장
- 기간별 리더보드 표시 확인
- 성장 기록 패널 표시 확인

- [ ] **Step 3: 교사 리더보드 탭 smoke check**

수동 확인:
- `영어 타자` 탭 노출
- 기록 목록 확인
- 이름 수정 확인
- 기록 삭제 확인

- [ ] **Step 4: 권한 회귀 확인**

중점 확인:
- 학생 저장 시 `Missing or insufficient permissions.`가 없어야 함
- 교사 수정/삭제 시 권한 오류가 없어야 함

- [ ] **Step 5: 기존 활동 회귀 확인**

수동 확인:
- 짝 맞추기 리더보드 저장
- 단어 낚시 리더보드 저장
- 듣기/말하기 성장 기록 패널 유지

- [ ] **Step 6: 커밋**

```bash
git add src/utils/activityLeaderboard.js src/utils/studentProgress.js src/lib/firebase.js src/components/GameLeaderboardPanel.jsx src/components/StudentProgressPanel.jsx src/components/WordTypingGame.jsx src/components/TeacherWorkspace.jsx src/hooks/useVocabularyLibrary.js firestore.rules src/constants/app.js package.json
git commit -m "Add typing leaderboards and progress tracking"
```

---

## 구현 순서 요약

1. 활동 타입과 공통 정의부터 늘린다.
2. Firestore 저장/조회 API를 만든다.
3. 학생 성장 비교 로직을 확장한다.
4. 학생 결과 화면에 리더보드/성장 기록을 붙인다.
5. 교사 관리 탭에 `영어 타자`를 연결한다.
6. rules와 버전 기록을 마무리한다.
7. 학생/교사/기존 활동까지 함께 검증한다.
