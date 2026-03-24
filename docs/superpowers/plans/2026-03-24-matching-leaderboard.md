# Matching Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 짝 맞추기 게임 완료 후 학교/학년별 주간·월간·연간 리더보드를 탭형으로 보여주고, 학생 이름 기준 최고 점수만 저장하도록 구현한다.

**Architecture:** `WordMatchingGame` 완료 화면에 리더보드 등록 및 표시 UI를 추가하고, Firestore에는 `matchingLeaderboards` 컬렉션을 새로 도입한다. 클라이언트는 현재 학교/학년 문맥과 완료 점수를 바탕으로 주간·월간·연간 period key를 계산해 upsert를 수행하고, 각 기간의 상위 점수를 조회해 탭형 리더보드를 렌더링한다.

**Tech Stack:** React, Vite, Firebase Auth, Firestore, existing quiz utilities, existing update-history/version system

---

## File map

### Modify
- `src/components/WordMatchingGame.jsx`
  - 완료 화면에 리더보드 등록 질문, 이름 입력, 저장 상태, 탭형 리더보드 UI 추가
  - 현재 완료 점수와 학교/학년 문맥을 리더보드 저장 함수에 연결
- `src/hooks/useVocabularyLibrary.js`
  - 학생 문맥에서 현재 학교/학년 정보를 게임 컴포넌트로 넘길 수 있게 필요한 선택 상태 노출 정리
  - 필요 시 매칭 게임 진입/복귀 시 리더보드 컨텍스트 보존
- `src/lib/firebase.js`
  - 리더보드 period key 생성 헬퍼
  - 리더보드 저장 함수
  - 리더보드 조회 함수
  - 학생 이름 정규화 및 문서 id 생성 함수
- `src/constants/app.js`
  - 버전 `v1.4.0` 추가
  - 업데이트 기록 요약 추가
- `package.json`
  - 버전 `1.4.0`으로 갱신
- `firestore.rules`
  - `matchingLeaderboards` 컬렉션 읽기/쓰기 규칙 추가
- `src/styles/global.css`
  - 완료 화면 리더보드 카드, 탭, 이름 입력, 빈 상태, 저장 상태 스타일 추가

### Create
- `src/utils/leaderboard.js`
  - period key 계산
  - 학생 이름 정규화
  - 문서 id 생성
  - 탭 메타데이터와 표시 라벨 정의
- `docs/superpowers/specs/2026-03-24-matching-leaderboard-design.md`
  - 이미 작성됨

### Verification targets
- `npm run build`
- 필요 시 로컬 preview + 브라우저 스모크 체크

---

### Task 1: 리더보드 데이터 유틸 분리

**Files:**
- Create: `src/utils/leaderboard.js`
- Test/Verify: local import sanity via build

- [ ] **Step 1: 리더보드 period 정의를 정리한다**

`week`, `month`, `year` 3개 period type과 한국어 라벨을 `src/utils/leaderboard.js`에 상수로 정의한다.

- [ ] **Step 2: period key 계산 함수를 작성한다**

아래 함수를 추가한다.

- `createLeaderboardPeriodKeys(now = new Date())`
- 반환값 예시:
  - `{ week: "2026-W13", month: "2026-03", year: "2026" }`

주간 키는 ISO week에 맞춰 계산하되, 앱 사용 시간대는 한국 기준으로 가정한다.

- [ ] **Step 3: 학생 이름 정규화 함수와 문서 id 생성 함수를 추가한다**

예시 함수:

```js
export function normalizeStudentName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function createMatchingLeaderboardId({
  schoolId,
  grade,
  periodType,
  periodKey,
  studentName,
}) {
  return [
    encodeURIComponent(String(schoolId ?? "").trim()),
    encodeURIComponent(String(grade ?? "").trim()),
    encodeURIComponent(String(periodType ?? "").trim()),
    encodeURIComponent(String(periodKey ?? "").trim()),
    encodeURIComponent(normalizeStudentName(studentName).toLowerCase()),
  ].join("__");
}
```

- [ ] **Step 4: build로 import 안정성을 확인한다**

Run: `npm run build`  
Expected: PASS

---

### Task 2: Firebase 리더보드 저장/조회 계층 추가

**Files:**
- Modify: `src/lib/firebase.js`
- Create/Use: `src/utils/leaderboard.js`
- Modify: `firestore.rules`

- [ ] **Step 1: `matchingLeaderboards` 컬렉션 CRUD 함수를 추가한다**

`src/lib/firebase.js`에 다음 함수들을 추가한다.

- `fetchMatchingLeaderboards({ schoolId, grade, now })`
- `saveMatchingLeaderboardScore({ schoolId, schoolName, grade, studentName, score, elapsedSeconds, solvedPairs, now })`

조회 결과는 period별로 top N 배열을 묶어 반환한다.

- [ ] **Step 2: 저장 로직은 period별 upsert 규칙으로 구현한다**

`saveMatchingLeaderboardScore`는 내부에서 `week`, `month`, `year`를 모두 순회하며:

1. 문서 id 생성
2. 기존 문서 조회
3. 없으면 생성
4. 있으면 `score` 비교
5. 새 점수가 더 높을 때만 update

반환값 예시:

```js
{
  updatedPeriods: ["week", "year"],
  skippedPeriods: ["month"],
}
```

- [ ] **Step 3: 조회 함수는 period별 상위 10개를 반환하도록 정리한다**

각 기간에 대해:

- 같은 `schoolId`, `grade`, `periodType`, `periodKey`
- `score desc`, `elapsedSeconds asc`, `updatedAt asc`
- `limit(10)`

형태로 조회한다.

- [ ] **Step 4: Firestore rules에 `matchingLeaderboards` 규칙을 추가한다**

읽기:
- 학교/학년/기간 기준 공개 읽기 허용

쓰기:
- 현재 앱이 쓰는 필드만 허용
- `schoolId`, `schoolName`, `grade`, `studentName`, `studentNameNormalized`, `periodType`, `periodKey`, `score`, `elapsedSeconds`, `solvedPairs`, `createdAt`, `updatedAt`
- `studentName`은 string
- `score`, `elapsedSeconds`, `solvedPairs`는 number/int

초기 구현에서는 익명 학생 저장을 허용하되 필드 스키마를 강하게 제한한다.

- [ ] **Step 5: Firestore 규칙 변경이 빌드에 영향 없는지 확인한다**

Run: `npm run build`  
Expected: PASS

---

### Task 3: 완료 화면 리더보드 UI 상태 추가

**Files:**
- Modify: `src/components/WordMatchingGame.jsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: 완료 화면 전용 상태를 추가한다**

`WordMatchingGame`에 다음 상태를 추가한다.

- `leaderboardTab`
- `leaderboardPromptState` (`idle`, `asking`, `editing`, `saved`, `skipped`)
- `studentNameDraft`
- `leaderboardSaving`
- `leaderboardStatus`
- `leaderboardError`
- `leaderboards`
- `leaderboardsLoading`

- [ ] **Step 2: 완료 화면 진입 시 리더보드 데이터를 조회한다**

게임 완료 후 `schoolId`와 `grade`가 있으면 `fetchMatchingLeaderboards`를 호출한다.

- [ ] **Step 3: `리더보드에 점수를 등록하시겠습니까?` 질문 영역을 추가한다**

질문 영역은 아래 흐름을 가진다.

- `등록하기` 클릭 -> 이름 입력 상태로 전환
- `건너뛰기` 클릭 -> 질문 영역 닫거나 스킵 상태 표시

- [ ] **Step 4: 학생 이름 입력과 저장 버튼을 추가한다**

이름 입력 후 `저장` 클릭 시:

- 공백 이름이면 에러 표시
- 저장 중 버튼 disabled
- 저장 성공 시 안내 메시지 표시
- 저장 후 리더보드 재조회

- [ ] **Step 5: 탭형 리더보드 UI를 추가한다**

완료 화면 하단에 리더보드 카드 섹션을 만들고:

- `이 주의 영단어 왕`
- `이 달의 영단어 왕`
- `올해의 영단어 왕`

탭 버튼으로 전환하게 한다.

- [ ] **Step 6: 빈 상태와 정렬 기준을 명확히 보여준다**

항목에는 다음을 표시한다.

- `1위`
- 학생 이름
- 점수 (`2349점`)
- 걸린 시간 (`00:51`)

데이터가 없으면 `아직 등록된 기록이 없습니다.`를 보여준다.

- [ ] **Step 7: 스타일을 추가한다**

`src/styles/global.css`에 다음 스타일을 추가한다.

- 완료 화면 리더보드 카드
- 탭 버튼 활성/비활성
- 이름 입력 row
- 저장 상태 메시지
- 빈 상태 card
- 모바일 레이아웃

---

### Task 4: 게임 컨텍스트 연결

**Files:**
- Modify: `src/components/WordMatchingGame.jsx`
- Modify: `src/hooks/useVocabularyLibrary.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: 매칭 게임에 학교/학년 문맥을 전달한다**

`WordMatchingGame`이 다음 값을 props로 받게 한다.

- `leaderboardContext.schoolId`
- `leaderboardContext.schoolName`
- `leaderboardContext.grade`

- [ ] **Step 2: 학생 선택 상태에서 현재 학교/학년 값을 안전하게 노출한다**

`useVocabularyLibrary`에서 현재 선택된 학교와 학년을 매칭 게임에 넘길 수 있도록 정리한다.

- [ ] **Step 3: 학교/학년이 없는 경우 리더보드 등록 UI를 제한한다**

이 경우 완료 화면에서는:

- 리더보드 조회를 하지 않음
- `학교와 학년을 먼저 선택한 상태에서 기록할 수 있습니다.` 같은 안내만 보여준다.

---

### Task 5: 저장 결과 메시지와 중복 갱신 UX 다듬기

**Files:**
- Modify: `src/components/WordMatchingGame.jsx`

- [ ] **Step 1: period별 저장 결과 메시지를 사람이 읽기 쉽게 바꾼다**

예시:

- `이번 점수로 주간/연간 기록이 갱신되었습니다.`
- `기존 최고 점수가 더 높아 리더보드는 유지되었습니다.`

- [ ] **Step 2: 동일 이름 낮은 점수 재등록 시 중복 저장이 안 되는 흐름을 UI에 반영한다**

저장 성공이지만 갱신 없음인 경우도 정상 흐름으로 안내한다.

- [ ] **Step 3: 저장 완료 후 다시 입력하지 않아도 탭 전환으로 결과를 볼 수 있게 유지한다**

저장 후 즉시 탭 목록이 최신 데이터로 갱신되어야 한다.

---

### Task 6: 버전 및 업데이트 이력 반영

**Files:**
- Modify: `src/constants/app.js`
- Modify: `package.json`

- [ ] **Step 1: 앱 버전을 `v1.4.0`으로 올린다**

`src/constants/app.js`의 `APP_UPDATES` 첫 항목을 새 릴리스로 추가한다.

요약은 1~3줄로 작성한다. 예시:

- `짝 맞추기 완료 화면에 주간·월간·연간 리더보드를 추가했습니다.`
- `같은 학생 이름은 기간별 최고 점수만 갱신되도록 했습니다.`

- [ ] **Step 2: `package.json` 버전도 `1.4.0`으로 맞춘다**

---

### Task 7: 검증과 리뷰

**Files:**
- Verify only

- [ ] **Step 1: 정적 검증 실행**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 2: diff 체크 실행**

Run: `git diff --check`  
Expected: no output

- [ ] **Step 3: 로컬 브라우저 스모크 체크**

최소 시나리오:

1. 학생 모드 진입
2. 학교/선생님/학년/단원 선택
3. 짝 맞추기 완료
4. 완료 화면에서 리더보드 질문 확인
5. 이름 입력 후 저장
6. 탭 전환으로 주간/월간/연간 표시 확인
7. 같은 이름으로 낮은 점수 저장 시 갱신 안 되는 메시지 확인

- [ ] **Step 4: 구현이 spec과 어긋나지 않는지 리뷰한다**

특히 아래를 확인한다.

- 리더보드는 완료 화면에만 표시되는가
- 탭형인가
- 같은 학생의 낮은 점수는 덮어쓰지 않는가
- 학교/학년 범위가 정확한가

- [ ] **Step 5: 필요 시 Firestore rules 배포 여부를 기록한다**

코드 변경만으로 끝나지 않고 실제 규칙 배포가 필요한 경우, 최종 보고에서 명시한다.

