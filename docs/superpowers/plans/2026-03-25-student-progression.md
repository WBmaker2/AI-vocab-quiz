# Student Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 듣기, 말하기, 짝 맞추기 활동에 공통으로 적용되는 학생 개인 최고 기록과 배지 수집 시스템을 추가해 학생이 자신의 성장과 보상을 계속 보게 만든다.

**Architecture:** Firebase에 `studentProfiles` 컬렉션을 추가하고, `학교 + 학년 + 학생 이름` 기준으로 학생 프로필을 저장한다. 각 활동 완료 화면은 현재 결과를 student profile과 비교해 개인 최고 메시지와 새 배지를 계산하고, 그 결과를 공통 프로필 API를 통해 저장한다. 리더보드는 경쟁 보상으로 유지하고, 개인 최고/배지는 성장 보상으로 완료 화면에서 리더보드 위에 노출한다.

**Tech Stack:** React, Vite, Firebase Firestore, existing quiz result flows, existing matching leaderboard flow, browser smoke checks, Node-based utility checks

---

## File Structure

### Existing files to modify

- `src/App.jsx`
  - 공통 progression context prop을 각 활동 컴포넌트로 전달
- `src/components/ListeningQuiz.jsx`
  - 완료 화면에 개인 최고 기록/배지 영역 추가
- `src/components/SpeakingQuiz.jsx`
  - 완료 화면에 개인 최고 기록/배지 영역 추가
- `src/components/WordMatchingGame.jsx`
  - 기존 리더보드 위에 개인 최고 기록/배지 영역 추가
- `src/hooks/useVocabularyLibrary.js`
  - 학생 컨텍스트에서 학교/학년/이름 기반 progression 저장에 필요한 공통 값과 학생 이름 draft 상태 노출
- `src/lib/firebase.js`
  - `studentProfiles` 읽기/쓰기, 배지 병합, 활동별 최고 기록 저장 API 추가
- `src/styles/global.css`
  - 개인 성장 카드, 배지 칩, 결과 화면 레이아웃 스타일 추가
- `src/constants/app.js`
  - 버전 `v1.5.0` 및 업데이트 기록 추가
- `package.json`
  - 버전 `1.5.0` 반영
- `package-lock.json`
  - 버전 `1.5.0` 반영
- `firestore.rules`
  - `studentProfiles` 읽기/쓰기 규칙 추가

### New files to create

- `src/constants/badges.js`
  - 초기 배지 정의, 라벨, 조건 설명 상수
- `src/utils/studentProgress.js`
  - student profile id 생성, badge 판정, 활동별 최고 기록 비교, 요약 메시지 생성
- `src/components/StudentProgressPanel.jsx`
  - 완료 화면 공통으로 쓰는 `내 성장 기록` + `이번에 얻은 배지` 패널

### Notes

- 현재 코드베이스에는 Jest/Vitest 기반 테스트가 없다.
- 이번 기능 검증은 `npm run build`, 작은 Node 유틸 검증, 브라우저 스모크 체크 중심으로 진행한다.
- `unit_master` 배지는 활동 간 누적 상태 설계가 필요하므로 이번 릴리스에서는 명시적으로 보류하고, spec의 rollout 전략에 남긴다.

---

### Task 1: Add Student Progress Data Model

**Files:**
- Create: `src/constants/badges.js`
- Create: `src/utils/studentProgress.js`
- Modify: `src/lib/firebase.js`
- Modify: `firestore.rules`

- [ ] **Step 1: Add badge definitions**

`src/constants/badges.js`에 초기 배지 목록을 추가한다.

```js
export const BADGE_DEFINITIONS = {
  first_challenge: { label: "첫 도전", description: "첫 활동을 완료했어요." },
  listening_star: { label: "듣기 스타", description: "듣기 퀴즈에서 높은 점수를 달성했어요." },
  speaking_bravery: { label: "말하기 용기상", description: "말하기 연습을 끝까지 완료했어요." },
  matching_speed: { label: "짝 맞추기 스피드왕", description: "짝 맞추기를 빠르게 완료했어요." },
  practice_keeper: { label: "꾸준한 연습왕", description: "여러 번 반복해서 연습했어요." },
};
```

- [ ] **Step 2: Add student progression helpers**

`src/utils/studentProgress.js`에 아래 순수 함수들을 추가한다.

```js
export function createStudentProfileId({ schoolId, grade, studentName }) {}
export function normalizeStudentProfileName(value) {}
export function compareListeningProgress(profile, result) {}
export function compareSpeakingProgress(profile, result) {}
export function compareMatchingProgress(profile, result) {}
export function evaluateEarnedBadges({ profile, activityType, result }) {}
export function buildProgressSummary({ activityType, comparisonResult }) {}
```

핵심 규칙:
- 이름 normalization은 leaderboard와 같은 방식 재사용 또는 동일 규칙으로 통일
- comparison 함수는 `isNewBest`, `summaryLines`, `bestValue`, `nextHint` 같은 UI-friendly summary를 반환
- badge 판정은 순수 함수로 두어 브라우저와 Node에서 쉽게 검증 가능하게 한다

- [ ] **Step 3: Add student profile read/write API**

`src/lib/firebase.js`에 `studentProfiles` 전용 API를 추가한다.

```js
export async function fetchStudentProfile({ schoolId, grade, studentName }) {}

export async function saveStudentProgress({
  schoolId,
  schoolName,
  grade,
  studentName,
  activityType,
  result,
}) {}
```

`saveStudentProgress`는:
- Firestore transaction으로 기존 프로필 읽기
- 활동별 최고 기록 비교
- `totalSessions` 증가
- 새 배지 병합
- 결과 요약 반환

반드시 `runTransaction` 또는 동등한 atomic semantics를 사용한다. 이유:
- `totalSessions` 증가 경쟁 방지
- 최고 기록 regression 방지
- badge 중복/경쟁 업데이트 방지

반환 구조 예시:

```js
{
  profile,
  comparison: { isNewBest: true, summaryLines: [...] },
  newlyEarnedBadges: ["first_challenge", "matching_speed"],
}
```

- [ ] **Step 4: Add Firestore rules for studentProfiles**

`firestore.rules`에 `studentProfiles/{profileId}`를 추가한다.

초기 규칙 방향:
- read: 공개 학생 활동 흐름에서 허용
- create/update: 학생 활동 완료 화면에서 자기 이름 기준 저장 허용
- 허용 필드만 명시

예시 허용 필드:

```txt
schoolId, schoolName, grade, studentName, studentNameNormalized,
totalSessions,
listeningBestScore, listeningBestCorrectCount,
speakingBestScore, speakingBestCorrectCount,
matchingBestScore, matchingBestTime,
earnedBadges,
createdAt, updatedAt
```

- [ ] **Step 5: Verify progression helpers compile**

Run: `npm run build`  
Expected: build success

- [ ] **Step 6: Sanity-check progression helper behavior**

Run a Node one-off script that imports `src/utils/studentProgress.js` and checks:
- 첫 기록이면 `isNewBest === true`
- 더 낮은 점수면 기존 최고 유지
- 더 높은 점수면 새 최고 갱신
- badge 중복 획득 방지

Expected: console output showing expected summary values, no thrown error

- [ ] **Step 7: Commit**

```bash
git add src/constants/badges.js src/utils/studentProgress.js src/lib/firebase.js firestore.rules
git commit -m "Add student progression data model"
```

---

### Task 2: Build Shared Result Panel

**Files:**
- Create: `src/components/StudentProgressPanel.jsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Create shared result panel component**

`StudentProgressPanel.jsx`를 만든다.

Props 예시:

```jsx
<StudentProgressPanel
  comparison={comparison}
  newlyEarnedBadges={newlyEarnedBadges}
  disabledReason=""
  loading={false}
/>
```

구성:
- `내 성장 기록`
- 1~3줄 요약 메시지
- `이번에 얻은 배지`
- badge 칩 목록

- [ ] **Step 2: Add empty/disabled states**

다음 상태를 지원한다.
- Firebase 미연결
- 학생 이름 미입력
- 아직 저장 기록 없음
- 새 배지 없음

- [ ] **Step 3: Add styling**

`src/styles/global.css`에 아래 스타일 추가:
- progression card
- progress summary list
- badge chips
- warm success tone
- mobile stacking behavior

- [ ] **Step 4: Verify visual compile**

Run: `npm run build`  
Expected: build success, no missing import/class errors

- [ ] **Step 5: Commit**

```bash
git add src/components/StudentProgressPanel.jsx src/styles/global.css
git commit -m "Add shared student progression panel"
```

---

### Task 3: Apply Progression to Matching Game First

**Files:**
- Modify: `src/components/WordMatchingGame.jsx`
- Modify: `src/lib/firebase.js`
- Modify: `src/utils/studentProgress.js`

- [ ] **Step 1: Decouple progression identity from leaderboard opt-in**

현재 matching summary에는 leaderboard 저장 시 이름을 입력한다. progression은 리더보드와 독립이어야 하므로:
- 완료 화면에 `학생 이름` 입력 상태를 별도로 둔다
- 이름만 입력하면 progression 저장은 가능해야 한다
- 리더보드 참여 여부와 progression 저장 여부를 분리한다
- 이름 입력값은 이후 listening/speaking 완료 화면에서도 재사용 가능한 공통 student name draft의 seed가 된다

- [ ] **Step 2: Add progression-first save action**

`WordMatchingGame.jsx`의 summary 영역에 progression 저장 버튼 또는 progression 저장 진입 흐름을 추가한다.

요구사항:
- 학생 이름 입력
- `saveStudentProgress({ activityType: "matching", ... })` 호출
- 성공 시 `StudentProgressPanel` 즉시 갱신
- 리더보드 저장은 기존 버튼/흐름으로 별도 유지

즉, `progression 저장 -> 선택적으로 리더보드 저장`도 가능해야 한다.

- [ ] **Step 3: Show progression panel above leaderboard**

완료 화면 순서를 아래처럼 바꾼다.

1. 최종 점수
2. 개인 성장 피드백
3. 새 배지
4. 리더보드 등록

구현 메모:
- `StudentProgressPanel` 내부에서 `개인 성장 피드백`과 `새 배지`를 함께 렌더링한다
- 패널 자체는 리더보드 카드보다 위에 둔다

- [ ] **Step 4: Add matching-specific badge rules**

`studentProgress.js`에 최소 조건 추가:
- `first_challenge`: 첫 완료
- `matching_speed`: 45초 이내 완료
- `practice_keeper`: totalSessions 기준

숫자 기준은 파일 상수로 분리한다.

- [ ] **Step 5: Manual smoke-check matching flow**

로컬 브라우저에서:
- 짝 맞추기 완료
- 이름 입력
- progression 저장
- progression panel 메시지/배지 확인
- 리더보드 등록을 건너뛴 상태에서도 progression이 저장되는지 확인
- 이후 같은 이름으로 리더보드 저장까지 별도 확인
- 같은 이름으로 다시 플레이 후 최고 기록 비교 확인

Expected:
- 첫 플레이: 첫 기록 + 첫 배지
- 낮은 결과: 기존 최고 유지 메시지
- 높은 결과: 새 최고 갱신 메시지

- [ ] **Step 6: Commit**

```bash
git add src/components/WordMatchingGame.jsx src/lib/firebase.js src/utils/studentProgress.js
git commit -m "Add progression rewards to matching game"
```

---

### Task 4: Extend Progression to Listening and Speaking

**Files:**
- Modify: `src/components/ListeningQuiz.jsx`
- Modify: `src/components/SpeakingQuiz.jsx`
- Modify: `src/App.jsx`
- Modify: `src/hooks/useVocabularyLibrary.js`

- [ ] **Step 1: Expose progression context**

`useVocabularyLibrary`와 `App.jsx`에서 공통 progression 저장에 필요한 현재 문맥을 내려준다.

최소 필요값:
- `schoolId`
- `schoolName`
- `grade`
- 현재 teacher/unit context
- 공유 학생 이름 draft
- 학생 이름 draft setter

학생 이름 draft의 owner는 `useVocabularyLibrary`로 둔다. 이유:
- listening/speaking/matching 세 화면이 같은 student identity를 재사용할 수 있어야 함
- 결과 화면마다 이름을 반복 입력하게 하면 같은 학생 프로필이 쉽게 분절됨

- [ ] **Step 2: Add student name capture for listening**

듣기 퀴즈 완료 화면에:
- 학생 이름 입력
- progression 저장 버튼 또는 완료 시 저장 흐름

리더보드가 없는 활동이라도 학생 이름 기반 progression 저장이 가능해야 한다.

- [ ] **Step 3: Add student name capture for speaking**

말하기 완료 화면에도 같은 구조를 넣는다.

- [ ] **Step 4: Add activity-specific comparison logic**

`studentProgress.js`에서:
- listening: 최고 점수, 최고 정답 수
- speaking: 최고 점수, 최고 정답 수

를 비교하게 만든다.

- [ ] **Step 5: Add activity-specific badges**

이번 릴리스에서는 아래까지만 실제 shipping 한다.
- `first_challenge`
- `listening_star`
- `speaking_bravery`
- `matching_speed`
- `practice_keeper`

`unit_master`는 추후 확장으로 남긴다.

- [ ] **Step 6: Manual smoke-check listening and speaking**

각 활동에서:
- 첫 기록 저장
- 더 좋은 기록 저장
- 더 낮은 기록 저장

Expected:
- 개인 최고 메시지 정상
- 새 배지 조건이면 badge chip 표시
- matching에서 저장한 같은 학생 이름 draft가 listening/speaking에도 기본값으로 이어지는지 확인

- [ ] **Step 7: Commit**

```bash
git add src/components/ListeningQuiz.jsx src/components/SpeakingQuiz.jsx src/App.jsx src/hooks/useVocabularyLibrary.js src/utils/studentProgress.js
git commit -m "Extend student progression to listening and speaking"
```

---

### Task 5: Finalize Rules, Docs, and Versioned Release

**Files:**
- Modify: `src/constants/app.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `docs/superpowers/specs/2026-03-25-student-progression-design.md` (only if scope changed during implementation)

- [ ] **Step 1: Bump version to release target**

Set:
- `src/constants/app.js` top release entry -> `v1.5.0`
- `package.json` -> `1.5.0`
- `package-lock.json` -> `1.5.0`

- [ ] **Step 2: Add update history summary**

`src/constants/app.js`에 요약 추가:
- 개인 최고 기록 도입
- 배지 수집 도입
- 세 활동 공통 progression 저장

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run build
git diff --check
```

Expected:
- build success
- no whitespace or conflict issues

- [ ] **Step 4: Run browser smoke checks**

Verify:
- 짝 맞추기 완료 후 progression 표시
- 듣기 완료 후 progression 표시
- 말하기 완료 후 progression 표시
- 배지 중복 없이 누적 저장
- 리더보드를 건너뛴 상태에서도 progression 저장 가능
- 같은 학생 이름으로 세 활동이 같은 `studentProfiles/{profileId}`에 누적되는지 확인
- studentProfiles write가 허용되고, invalid/empty-name write는 UI에서 차단되는지 확인

- [ ] **Step 5: Review shipped scope vs spec**

If any badge is deferred, update the spec `Scope` or `Rollout Strategy` so docs stay truthful.

- [ ] **Step 6: Commit**

```bash
git add src/constants/app.js package.json package-lock.json docs/superpowers/specs/2026-03-25-student-progression-design.md
git commit -m "Release student progression rewards"
```

---

## Implementation Notes

- Keep the first shipped badge set intentionally small.
- Avoid adding extra student home dashboard work in the same release.
- Do not entangle progression storage with leaderboard storage; they serve different purposes.
- Reuse existing name normalization logic so leaderboard name and student profile name behave consistently.

## Verification Checklist

- 학생 이름을 입력하지 않으면 progression 저장이 시도되지 않는다.
- 같은 학생 이름으로 다시 플레이하면 이전 기록과 비교 메시지가 나온다.
- 낮은 점수는 최고 기록을 덮어쓰지 않는다.
- 새 배지는 한 번만 지급된다.
- Firebase 미연결 환경에서는 graceful fallback이 나온다.
- 리더보드 저장과 progression 저장이 서로 실패를 전파하지 않는다.

## Risks

- 학생 브라우저 직접 쓰기 구조라 완전한 위변조 방지는 어렵다.
- 동명이인은 같은 프로필로 합쳐질 수 있다.
- 결과 화면에 이름 입력 UI가 늘어나면 활동 종료 흐름이 무거워질 수 있다.

## Deferred Follow-ups

- 학생 홈의 `내 배지` 진열장
- 오늘의 도전 과제
- 반 전체 협동 목표
- `unit_master`를 위한 더 정교한 활동 완료 추적
