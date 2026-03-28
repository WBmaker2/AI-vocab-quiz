# 단어 낚시 게임 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생 모드에 `단어 낚시` 게임을 추가해, TTS로 읽어주는 영어 단어를 듣고 화면을 떠다니는 뜻 카드 중 정답만 빠르게 눌러 점수를 얻는 반응형 활동을 만든다.

**Architecture:** 현재 학생 모드의 단어 세트 로딩 흐름을 그대로 재사용하고, 원격 동기화 없이 로컬 상태 기반 반응형 게임으로 구현한다. `WordFishingGame` 컴포넌트가 라운드, 점수, 10초 타이머, 카드 움직임을 관리하고, `wordFishing.js` 유틸이 문제 구성과 점수 계산을 담당한다. TTS는 기존 `useSpeechSynthesis`를 재사용하며, 시작 시 자동 재생과 `다시 듣기`만 제공한다.

**Tech Stack:** React, Vite, existing student game routing, existing Web Speech API TTS hook, CSS animations

---

## 파일 구조

### 새로 만들 파일

- `src/components/WordFishingGame.jsx`
  - 학생용 단어 낚시 게임 화면
- `src/utils/wordFishing.js`
  - 라운드 구성, 카드 풀 생성, 점수 계산, 시간 계산

### 수정할 파일

- `src/App.jsx`
  - 새 뷰 추가, 학생 진입 연결
- `src/components/ModeSelector.jsx`
  - 학생 게임 버튼 영역에 `단어 낚시` 버튼 추가 (`단어 짝 맞추기`와 `학급 빙고 게임` 사이)
- `src/styles/global.css`
  - 낚시 카드 움직임, 반응형 레이아웃, 결과 화면 스타일
- `src/constants/app.js`
  - 버전 및 update info 기록 반영
- `package.json`
  - 버전 반영

### 참고할 기존 파일

- `src/components/ListeningQuiz.jsx`
- `src/components/WordMatchingGame.jsx`
- `src/hooks/useSpeechSynthesis.js`
- `src/hooks/useCelebrationAudio.js`

---

### Task 1: 단어 낚시 유틸 정의

**Files:**
- Create: `src/utils/wordFishing.js`
- Test: `node --input-type=module`

- [ ] **Step 1: 단어 정규화 helper 작성**

단어 세트 아이템을 낚시 게임용으로 정규화한다.

예상 shape:

```js
{
  id: "apple__사과",
  word: "apple",
  meaning: "사과",
}
```

- [ ] **Step 2: 라운드 후보 생성 함수 작성**

예상 함수:

- `createFishingRound(items, usedWordIds, candidateCount = 6)`

규칙:

- 정답 1개
- 오답 5개
- 같은 라운드 중복 없음

- [ ] **Step 3: 점수 계산 함수 작성**

예상 함수:

- `calculateFishingScore({ isCorrect, reactionMs })`

규칙:

- 정답 기본 `100`
- 2초 이내 `+40`
- 4초 이내 `+20`
- 오답 `-30`
- 시간 초과 `0`

- [ ] **Step 4: 기본 회귀 체크 실행**

Run:

```bash
node --input-type=module -e "import { createFishingRound } from './src/utils/wordFishing.js'; const items = Array.from({ length: 8 }, (_, i) => ({ word: 'word' + i, meaning: '뜻' + i })); const round = createFishingRound(items, []); console.log(round.candidates.length, round.answer.word);"
```

Expected:
- `6`
- 정답 단어 1개가 출력

---

### Task 2: 학생 게임 화면 뷰 연결

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/ModeSelector.jsx`

- [ ] **Step 1: 새 view 상수 추가**

`src/App.jsx`에 새 뷰를 추가한다.

예상 값:

- `FISHING: "fishing"`

- [ ] **Step 2: 학생 버튼 추가**

`ModeSelector` 학생 버튼 영역에 `단어 낚시` 버튼을 추가한다.

조건:

- 현재 단어 세트가 로드되어 있을 때만 활성화
- 배치는 `단어 짝 맞추기`와 `학급 빙고 게임` 사이

- [ ] **Step 3: App 라우팅 연결**

학생이 버튼을 누르면 `WordFishingGame` 화면으로 이동하도록 연결한다.

---

### Task 3: WordFishingGame MVP 화면 작성

**Files:**
- Create: `src/components/WordFishingGame.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: 기본 상태 정의**

컴포넌트 상태:

- `roundIndex`
- `score`
- `timeLeft`
- `round`
- `status`
- `resultSummary`

- [ ] **Step 2: 시작 화면 작성**

필수 UI:

- 게임 설명
- `게임 시작`

- [ ] **Step 3: 라운드 화면 작성**

표시 요소:

- 현재 문제 번호 / 전체 문제 수
- 현재 점수
- 남은 시간
- 목표 단어 영역
- `다시 듣기` 버튼
- 떠다니는 뜻 카드 영역

- [ ] **Step 4: 결과 화면 작성**

결과 요소:

- 최종 점수
- 맞춘 문제 수
- 평균 반응 시간 또는 전체 소요 시간
- `다시 하기`
- `홈으로`

---

### Task 4: 카드 움직임과 클릭 처리

**Files:**
- Create: `src/components/WordFishingGame.jsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: 카드 배치 전략 작성**

한 라운드에 6개 카드가 보이도록 하고, CSS 커스텀 속성으로 각 카드의:

- 시작 위치
- 이동 속도
- 지연 시간

을 다르게 준다.

- [ ] **Step 2: 카드 클릭 로직 작성**

규칙:

- 정답 클릭 시 성공 처리
- 오답 클릭 시 페널티 처리
- 같은 라운드가 끝나면 추가 클릭 무시

- [ ] **Step 3: 시간 초과 처리 작성**

라운드 시작 후 10초 안에 정답이 없으면 `놓침` 처리하고 다음 라운드로 이동한다.

- [ ] **Step 4: reduced motion 대응**

애니메이션을 완전히 끄지는 않더라도, `prefers-reduced-motion`에서는 속도와 흔들림을 줄인다.

---

### Task 5: TTS 읽기 처리

**Files:**
- Create: `src/components/WordFishingGame.jsx`
- Reference: `src/hooks/useSpeechSynthesis.js`

- [ ] **Step 1: TTS 읽기 모드 구현**

규칙:

- 라운드 시작 시 자동 재생
- `다시 듣기` 버튼 제공

- [ ] **Step 2: 자동 재생 반복 방지 점검**

같은 라운드에서 effect 재실행 때문에 TTS가 여러 번 겹쳐 재생되지 않게 한다.

---

### Task 6: 점수, 연출, 완료 흐름 정리

**Files:**
- Create: `src/components/WordFishingGame.jsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: 성공/오답/놓침 피드백 추가**

간단한 상태 문구:

- `정답!`
- `아쉬워요!`
- `놓쳤어요!`

- [ ] **Step 2: 짧은 성공 연출 연결**

이미 있는 축하음 훅을 재사용할지 검토하고, 과하면 생략한다.

- [ ] **Step 3: 라운드 종료 후 다음 문제 전환 정리**

정답/오답/시간초과 후 600~900ms 안에 다음 라운드로 자연스럽게 넘어가게 한다.

---

### Task 7: 스타일과 반응형 마감

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: 학생용 낚시 화면 레이아웃 스타일 추가**

필요 클래스:

- 전체 패널
- 게임 정보 헤더
- 떠다니는 카드 영역
- 카드 버튼
- 결과 패널

- [ ] **Step 2: 모바일 세로 / 태블릿 가로 / PC 대응**

확인 포인트:

- 카드 영역이 너무 좁지 않은지
- 카드가 겹쳐 클릭 불가 상태가 되지 않는지
- 버튼이 손가락으로 누르기 쉬운지

---

### Task 8: 버전과 문서 반영

**Files:**
- Modify: `src/constants/app.js`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: 버전 업데이트**

권장:

- `v1.8.0`

- [ ] **Step 2: update info 이력 추가**

요약 예시:

- 학생 모드에 단어 낚시 게임 추가
- TTS로 읽는 영어 단어를 듣고 움직이는 뜻 카드를 눌러 반응 속도를 겨루는 새 활동 도입
- 학생 버튼 배치를 `단어 짝 맞추기`와 `학급 빙고 게임` 사이로 정리

---

### Task 9: 검증

**Files:**
- Test: local browser smoke check

- [ ] **Step 1: 빌드 검증**

Run:

```bash
npm run build
```

Expected:
- build 성공

- [ ] **Step 2: 정적 점검**

Run:

```bash
git diff --check
```

Expected:
- 출력 없음

- [ ] **Step 3: 브라우저 스모크 체크**

확인 항목:

- 학생 화면에 `단어 낚시` 버튼 표시
- 현재 세트 로드 후 게임 시작 가능
- 라운드 시작 시 영어 단어가 TTS로 읽힘
- 카드가 떠다니는 동안 클릭 가능
- 정답/오답/시간 초과 처리 정상
- 10문제 후 결과 화면 표시

---

## 구현 순서 추천

1. `wordFishing.js` 유틸
2. `WordFishingGame.jsx` 기본 흐름
3. `App.jsx` / `ModeSelector.jsx` 연결
4. 카드 애니메이션과 점수 연출
5. 반응형과 polish
6. 버전 및 update info 반영

## 참고 메모

- 첫 버전은 Firebase를 쓰지 않는 게 좋다. 움직임 기반 게임은 클라이언트 상태로 먼저 안정화하는 편이 안전하다.
- 첫 버전은 TTS 전용으로 두고, 별도 교사 진행 모드는 이후 확장 항목으로 미룬다.
- 이후 리더보드나 studentProfiles 연동이 필요하면 결과 화면 단계에서 추가하는 편이 가장 자연스럽다.
