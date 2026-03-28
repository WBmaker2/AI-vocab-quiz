# 단어 빙고 게임 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교사 호스트형 실시간 단어 빙고 게임을 추가해, 교사가 선택하거나 랜덤/TTS로 호출한 단어를 기준으로 학급 전체가 동시에 빙고를 진행할 수 있게 한다.

**Architecture:** 현재 Firebase/React 구조를 유지하면서 `bingoSessions`와 하위 `players` 컬렉션을 추가한다. 교사는 Teacher Mode에서 현재 불러온 단어 세트로 빙고 세션을 시작하고, 학생은 참여 코드로 세션에 들어와 랜덤 빙고판을 받는다. 교사가 단어를 클릭하거나 랜덤 뽑기로 호출하면 세션의 현재 호출 단어가 갱신되고, 학생 보드는 그 단어에 해당하는 칸만 직접 눌러 체크할 수 있게 만든다.

**Tech Stack:** React, Vite, Firebase Firestore realtime listeners, existing Web Speech API TTS hook, existing Firebase auth/profile flow

---

## 파일 구조

### 새로 만들 파일

- `src/components/TeacherBingoHost.jsx`
  - 교사 세션 시작/호스트 화면
- `src/components/StudentBingoJoin.jsx`
  - 학생 이름 + 참여 코드 입력 UI
- `src/components/StudentBingoBoard.jsx`
  - 학생 빙고판 UI
- `src/hooks/useBingoSession.js`
  - 빙고 세션 상태, 실시간 구독, 참여/체크 로직
- `src/utils/bingo.js`
  - 빙고판 생성, 빙고 판정, 호출 단어 검증

### 수정할 파일

- `src/App.jsx`
  - 새 뷰 추가, 교사/학생 빙고 진입 연결
- `src/components/TeacherWorkspace.jsx`
  - 현재 불러온 세트 기준 `단어 빙고 수업 시작` 버튼 추가
- `src/components/ModeSelector.jsx`
  - 학생 `학급 빙고 게임` 진입 버튼 추가
- `src/lib/firebase.js`
  - 세션 생성/참여/호출/학생 체크/승자 갱신 API 추가
- `src/styles/global.css`
  - 교사 호스트와 학생 빙고판 UI 스타일
- `firestore.rules`
  - `bingoSessions`와 `players` 권한 규칙 추가
- `src/constants/app.js`
  - 버전 및 업데이트 기록 반영
- `package.json`
  - 버전 반영

### 참고할 기존 파일

- `src/hooks/useVocabularyLibrary.js`
- `src/components/WordMatchingGame.jsx`
- `src/hooks/useSpeechSynthesis.js`
- `src/constants/vocabulary.js`

---

### Task 1: 빙고 데이터 모델과 유틸 정의

**Files:**
- Create: `src/utils/bingo.js`
- Modify: `src/lib/firebase.js`
- Test: Node one-off checks via `node --input-type=module`

- [ ] **Step 1: 빙고 보드 규칙 정리**

`src/utils/bingo.js`에 아래 순수 함수 시그니처를 먼저 정의한다.

- `determineBingoBoardSize(itemCount)`
- `createBingoBoard(items, boardSize)`
- `canMarkBingoCell({ activeWordId, cellWordId, alreadyMarked })`
- `computeBingoLines(markedWordIds, boardCells, boardSize)`

- [ ] **Step 2: 단어 수 기준 판 크기 함수 작성**

규칙:

- 16개 이상: `4`
- 9개 이상: `3`
- 9개 미만: 예외 throw

- [ ] **Step 3: 랜덤 빙고판 생성 함수 작성**

학생별 랜덤 보드에 아래 형태의 셀 배열을 만든다.

```js
{
  index: 0,
  wordId: "apple__사과",
  word: "apple",
}
```

첫 버전 학생 빙고판은 영어 단어 표시만 사용한다. `meaning`은 미래의 뜻 보기/혼합 보드 확장을 위해 필요할 때만 포함한다.

- [ ] **Step 4: 빙고 판정 함수 작성**

행, 열, 대각선 기준으로 현재 몇 줄 완성됐는지 계산한다.

- [ ] **Step 5: 간단 회귀 체크 실행**

Run:

```bash
node --input-type=module -e "import { determineBingoBoardSize } from './src/utils/bingo.js'; console.log(determineBingoBoardSize(16));"
```

Expected: `4`

---

### Task 2: Firebase 세션 API 추가

**Files:**
- Modify: `src/lib/firebase.js`
- Modify: `firestore.rules`

- [ ] **Step 1: 세션 문서 shape 정의**

`bingoSessions/{sessionId}` 저장 필드를 helper로 정리한다.

핵심 필드:

- `sessionCode`
- `teacherUserId`
- `schoolId`
- `schoolName`
- `grade`
- `unit`
- `publisher`
- `mode`
- `boardSize`
- `status`
- `activeWordId`
- `activeWordText`
- `callSequence`
- `calledWordIds`

- [ ] **Step 2: 교사용 세션 생성 함수 추가**

예상 함수:

- `createBingoSession({ teacherProfile, selection, items, mode })`

동작:

- 현재 불러온 단어 세트에서 판 크기 계산
- 세션 코드 생성
- 세션 문서 저장

- [ ] **Step 3: 학생 참여 함수 추가**

예상 함수:

- `joinBingoSession({ sessionCode, studentName })`

동작:

- 코드로 세션 찾기
- 진행 중 세션인지 확인
- player 문서 생성
- 학생 랜덤 보드 생성

- [ ] **Step 4: 교사 호출 함수 추가**

예상 함수:

- `callBingoWord({ sessionId, item })`

동작:

- `activeWordId`, `activeWordText`, `callSequence`, `calledWordIds` 갱신

- [ ] **Step 5: 학생 체크 함수 추가**

예상 함수:

- `markBingoCell({ sessionId, playerId, cellWordId })`

동작:

- 현재 세션의 `activeWordId`와 일치할 때만 반영
- player 문서 `markedWordIds`, `bingoLines`, `hasBingo` 갱신

- [ ] **Step 6: Firestore rules 추가**

규칙 초안:

- 교사만 세션 메타데이터 생성/수정 가능
- 학생은 자기 player 문서만 생성/수정 가능
- 학생 수정은 현재 호출 단어와 일치하는 셀만 허용하는 방향으로 제한
- 세션/플레이어 읽기는 참여자에게 허용

---

### Task 3: 교사 호스트 UI

**Files:**
- Create: `src/components/TeacherBingoHost.jsx`
- Modify: `src/components/TeacherWorkspace.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: App view 상수 추가**

`src/App.jsx`에 `BINGO_TEACHER`, `BINGO_STUDENT` 또는 유사 뷰를 추가한다.

- [ ] **Step 2: TeacherWorkspace에 진입 버튼 추가**

조건:

- 현재 단어 세트가 로드되어 있을 때만 활성화

버튼 예시:

- `단어 빙고 수업 시작`

- [ ] **Step 3: 호스트 설정 UI 작성**

필수 설정:

- 읽기 방식: `직접 읽기` / `TTS 읽기`
- 판 크기 안내
- 참여 코드 발급

- [ ] **Step 4: 호출 단어 보드 작성**

단어 목록을 카드/리스트로 보여주고, 교사가 클릭하면 현재 호출 단어가 된다.

`TTS` 모드면 클릭 직후 기존 speech hook으로 읽어준다.

- [ ] **Step 5: 학생 현황 UI 작성**

현재 참가 학생의 `1빙고`, `2빙고`, `3+빙고` 현황과 개인별 빙고 수를 표시한다.

---

### Task 4: 학생 참여/빙고판 UI

**Files:**
- Create: `src/components/StudentBingoJoin.jsx`
- Create: `src/components/StudentBingoBoard.jsx`
- Modify: `src/components/ModeSelector.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: 학생 진입 버튼 추가**

학생 카드에 새 버튼 추가:

- `학급 빙고 게임`

- [ ] **Step 2: 참여 화면 작성**

입력 항목:

- 학생 이름
- 참여 코드

버튼:

- `빙고판 받기`

- [ ] **Step 3: 학생 빙고판 UI 작성**

화면 요소:

- 현재 호출 단어
- 영어 단어 빙고판
- 상태 메시지
- 승자 현황 요약

- [ ] **Step 4: 클릭 제한 적용**

학생은 현재 호출 단어와 연결된 칸만 클릭 가능하게 한다.
교사가 단어를 선택하거나 TTS로 읽어도 자동 체크는 되지 않고, 학생이 칸을 직접 눌러야만 반영되게 한다.

비활성 칸은 스타일로 명확히 구분한다.

- [ ] **Step 5: 빙고 달성 연출 추가**

3빙고 완성 시:

- 축하 문구
- 짧은 효과음(기존 celebration hook 재사용 가능)

---

### Task 5: 상태 관리 훅 구성

**Files:**
- Create: `src/hooks/useBingoSession.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: 교사/학생 공통 세션 상태 설계**

훅에서 관리할 상태:

- 세션 메타데이터
- 참여자 목록
- 현재 호출 단어
- 내 player 문서
- loading/error/status

- [ ] **Step 2: 교사 흐름 함수 연결**

- 세션 생성
- 단어 호출
- 세션 종료

- [ ] **Step 3: 학생 흐름 함수 연결**

- 세션 참여
- 셀 체크
- 실시간 승자 보기

- [ ] **Step 4: snapshot 정리**

세션 이동 시 unsubscribe가 누수되지 않도록 정리한다.

---

### Task 6: 스타일 및 반응형 레이아웃

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: 교사 호스트 카드 스타일 추가**

- 참여 코드
- 현재 호출 단어
- 단어 호출 보드
- 승자 패널

- [ ] **Step 2: 학생 빙고판 스타일 추가**

- 셀 기본
- 활성 셀
- 체크 완료 셀
- 비활성 셀
- 빙고 달성 강조

- [ ] **Step 3: 모바일/태블릿 반응형 정리**

학생 기기 기준으로 세로형 화면에서도 보드가 깨지지 않게 한다.

---

### Task 7: 검증 및 마무리

**Files:**
- Modify: `src/constants/app.js`
- Modify: `package.json`

- [ ] **Step 1: 버전 및 업데이트 기록 반영**

버전 `v1.7.0`을 목표로 업데이트 기록을 추가한다.

- [ ] **Step 2: 빌드 확인**

Run:

```bash
npm run build
```

Expected: build success

- [ ] **Step 3: 포맷/패치 검증**

Run:

```bash
git diff --check
```

Expected: no output

- [ ] **Step 4: 브라우저 스모크 체크**

검증 흐름:

- 교사 세션 생성
- 학생 참여
- 교사 단어 호출
- 학생이 해당 칸만 체크 가능
- 빙고 완성
- 승자 반영

---

## 구현 메모

- 첫 구현은 `현재 불러온 단원 1개` 기준이 가장 안전하다.
- 교사가 직접 읽는 모드에서도 반드시 단어 클릭을 요구해야 한다.
- 학생 체크는 교사 선택 단어 기준으로 잠겨야 한다.
- 리더보드 영구 저장은 첫 버전에서 제외한다.
- 보안상 완전한 무결성이 필요하면 이후 Cloud Functions로 승격한다.
- 이 구조는 이후 `학생 랜덤 발표 모드`를 붙일 수 있도록 영어 단어 보드를 기본으로 유지한다.

## 완료 조건

아래가 모두 되면 첫 버전 완료로 본다.

- 교사가 단어 빙고 세션을 시작할 수 있다
- 학생이 참여 코드로 세션에 들어올 수 있다
- 학생별 랜덤 빙고판이 생긴다
- 교사가 단어를 클릭하면 학생 보드가 그 단어 기준으로 반응한다
- 직접 읽기/TTS 두 방식이 모두 동작한다
- 학생이 다른 칸을 실수로 체크할 수 없다
- 3빙고 이후에도 교사가 종료하기 전까지 계속 진행된다
- 교사 화면에서 학생별 1빙고, 2빙고, 3+빙고 현황이 보인다
