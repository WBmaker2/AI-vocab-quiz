# Teacher Autosave And School Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교사 모드 자동 저장과 단원 드롭다운을 추가하고, 말하기 퀴즈의 막힘을 줄이며, 짝 맞추기 리더보드에 학교 전체 통합 탭을 붙인다.

**Architecture:** 기존 교사/학생 흐름을 유지한 채 상태 관리와 Firebase 저장 경로를 확장한다. 교사 편집은 autosave effect로 묶고, 매칭 리더보드는 기존 저장 함수에 `school_all` scope를 추가하며, 학생 화면 정리는 컴포넌트 조건 분기로 처리한다.

**Tech Stack:** React, Vite, Firebase Firestore, existing matching leaderboard utilities

---

### Task 1: Teacher unit selection and autosave state

**Files:**
- Modify: `src/hooks/useVocabularyLibrary.js`
- Modify: `src/components/TeacherWorkspace.jsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add state for teacher autosave**

추가 state:
- `teacherAutosaveState` (`idle`, `saving`, `saved`, `error`)
- `teacherCustomUnitDraft`
- `teacherUnitMode` (`existing`, `new`)

- [ ] **Step 2: Compute selectable units for current grade**

현재 catalog 기반 저장 단원 목록을 current grade 기준으로 정렬한다.

- [ ] **Step 3: Replace direct unit input with dropdown flow**

Teacher UI에서:
- 저장된 단원 옵션
- `+ 새 단원 만들기`
- 새 단원 선택 시 숫자 입력 보조 필드

- [ ] **Step 4: Add autosave effect**

조건:
- 로그인/remoteConfigured
- 현재 selection이 유효
- `dirty === true`

동작:
- debounce 후 `saveTeacherVocabularySet` 실행
- 성공 시 autosave state를 `saved`
- 실패 시 autosave state를 `error`

- [ ] **Step 5: Keep manual save as fallback**

기존 `현재 단원 저장`은 유지하고 autosave와 충돌하지 않게 정리한다.

### Task 2: Speaking quiz failure escape hatch

**Files:**
- Modify: `src/components/SpeakingQuiz.jsx`

- [ ] **Step 1: Add per-question failure counters**

State:
- `incorrectAttempts`
- `noSpeechAttempts`

- [ ] **Step 2: Increment counters on failure paths**

오답이면 `incorrectAttempts += 1`
`no-speech`면 `noSpeechAttempts += 1`
설정 오류면 즉시 `canAdvance` true

- [ ] **Step 3: Update next-button activation**

`다음 문제` 활성 조건:
- 정답
- incorrectAttempts >= 3
- noSpeechAttempts >= 3
- configuration error state

- [ ] **Step 4: Reset counters when question advances**

정답, 다음 문제, 다시 시작 시 모두 초기화

### Task 3: School-wide matching leaderboard

**Files:**
- Modify: `src/lib/firebase.js`
- Modify: `src/utils/leaderboard.js`
- Modify: `src/components/WordMatchingGame.jsx`
- Modify: `firestore.rules`

- [ ] **Step 1: Extend leaderboard period definitions**

`school_all` periodType 추가
UI label: `우리학교 단어 왕`

- [ ] **Step 2: Define school-wide scope helpers**

별도 scope key 생성 규칙:
- schoolId + `all` + `school_all` + `all-time`

- [ ] **Step 3: Save school-wide score during matching submission**

`saveMatchingLeaderboardScore` 안에서:
- 기존 week/month/year upsert
- school-wide upsert 추가

- [ ] **Step 4: Fetch school-wide board**

`fetchMatchingLeaderboards`가 school-wide도 함께 반환하도록 수정

- [ ] **Step 5: Render school-wide tab**

매칭 결과 화면 탭에 추가
학교 전체 보드에서는 학생 이름 옆에 학년 표시

- [ ] **Step 6: Update rules**

`school_all` periodType 허용
기존 저장/조회 규칙과 정합성 확인

### Task 4: Remove teacher-only edit actions from student screens

**Files:**
- Modify: `src/components/WordMatchingGame.jsx`
- Modify: `src/components/ListeningQuiz.jsx`
- Modify: `src/components/SpeakingQuiz.jsx`
- Modify: `src/components/ResultSummary.jsx`

- [ ] **Step 1: Audit current student-only actions**

학생 화면에서 교사 편집으로 이어지는 버튼 위치를 확인

- [ ] **Step 2: Remove teacher edit buttons from student flows**

학생 결과 화면에는 학습 관련 버튼만 남긴다.

- [ ] **Step 3: Keep teacher navigation only inside teacher mode**

교사 관리로 가는 버튼은 교사 화면 안에만 남긴다.

### Task 5: Version and release notes

**Files:**
- Modify: `src/constants/app.js`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Bump visible version**

다음 버전으로 미세 조정

- [ ] **Step 2: Add concise update summary**

자동 저장, 단원 드롭다운, 말하기 탈출 버튼, 학교 전체 리더보드, 학생 편집 버튼 제거를 요약한다.

### Task 6: Verification

**Files:**
- No code changes required if green

- [ ] **Step 1: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 2: Run diff hygiene**

Run: `git diff --check`
Expected: no output

- [ ] **Step 3: Browser smoke check**

확인 항목:
- 교사 자동 저장
- 단원 드롭다운
- 말하기 3회 실패 후 다음 문제 활성
- 매칭 결과의 `우리학교 단어 왕` 탭
- 학생 화면 편집 버튼 제거

- [ ] **Step 4: Review diff for regressions**

저장 흐름, 리더보드 저장, 학생 결과 화면 액션을 다시 점검한다.

