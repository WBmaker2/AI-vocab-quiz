# 영어 단어 타자 게임 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 학생 모드에 `영어 단어 타자 게임`을 추가해, 한국어 뜻과 영어 발음을 단서로 보고 단원 핵심 영어 단어를 직접 입력해 보는 활동을 제공한다.

**Architecture:** 현재 학생 단어 세트 로딩 흐름을 그대로 재사용하고, 첫 버전은 원격 저장 없이 로컬 상태 기반 게임으로 구현한다. `WordTypingGame` 컴포넌트가 문제 진행, 입력 시도, 콤보, 점수, 결과 화면을 관리하고, `wordTyping.js` 유틸이 출제 순서, 정답 정규화, 판정, 점수 계산을 담당한다. TTS는 기존 `useSpeechSynthesis`, 축하음은 기존 `useCelebrationAudio`를 그대로 재사용한다.

**Tech Stack:** React, Vite, existing student game routing, existing Web Speech API TTS hook, existing celebration audio hook, existing global.css styling system

---

## 파일 구조

### 새로 만들 파일

- `src/components/WordTypingGame.jsx`
  - 학생용 영어 단어 타자 게임 화면 전체
- `src/utils/wordTyping.js`
  - 문제 세트 정규화, 답안 비교, 점수 계산, 힌트 포맷 생성

### 수정할 파일

- `src/App.jsx`
  - 새 학생 게임 뷰 추가 및 라우팅 연결
- `src/components/ModeSelector.jsx`
  - 학생 활동 카드에 `영어 단어 타자 게임` 버튼 추가
- `src/styles/global.css`
  - 시작 화면, 플레이 화면, 입력 카드, 콤보/결과 화면 스타일 추가
- `src/constants/app.js`
  - 버전 및 update info 기록 추가
- `package.json`
  - 버전 반영

### 참고할 기존 파일

- `src/components/ListeningQuiz.jsx`
- `src/components/WordMatchingGame.jsx`
- `src/components/WordFishingGame.jsx`
- `src/hooks/useSpeechSynthesis.js`
- `src/hooks/useCelebrationAudio.js`
- `src/styles/global.css`

### 이번 계획에서 의도적으로 제외할 파일

- `src/hooks/useVocabularyLibrary.js`
  - 첫 버전은 현재 학생 단어 세트만 재사용하면 충분하므로 상태 구조를 넓히지 않는다.
- `src/lib/firebase.js`
  - 첫 버전은 결과 저장형이 아니라서 Firebase 스키마 변경을 넣지 않는다.

---

### Task 1: 단어 타자 유틸 정의

**Files:**
- Create: `src/utils/wordTyping.js`
- Test: `node --input-type=module`

- [ ] **Step 1: 타자 게임용 아이템 정규화 함수 작성**

예상 함수:

```js
export function normalizeTypingItems(items) {
  return [];
}
```

정규화 결과 예시:

```js
{
  id: "fourth__네 번째",
  word: "fourth",
  meaning: "네 번째",
  normalizedWord: "fourth",
  letterCount: 6,
}
```

- [ ] **Step 2: 답안 정규화 함수 작성**

예상 함수:

```js
export function normalizeTypingAnswer(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
```

규칙:
- 대소문자 무시
- 앞뒤 공백 무시
- 중간 다중 공백 1개로 축소

- [ ] **Step 3: 정답 판정 함수 작성**

예상 함수:

```js
export function isTypingAnswerCorrect(input, expectedWord) {
  return normalizeTypingAnswer(input) === normalizeTypingAnswer(expectedWord);
}
```

- [ ] **Step 4: 힌트 생성 함수 작성**

예상 함수:

```js
export function createTypingHint(word) {
  return "f _ _ _ _ h";
}
```

첫 버전 규칙:
- 첫 글자 고정 노출
- 마지막 글자 고정 노출
- 중간은 `_`
- 공백이 포함되면 공백은 유지

- [ ] **Step 5: 점수 계산 함수 작성**

예상 함수:

```js
export function calculateTypingScore({
  attemptsUsed,
  answerSeconds,
  usedHint,
  combo,
}) {
  return 0;
}
```

권장 규칙:
- 기본 정답 점수: `100`
- 시간 보너스: 최대 `20`
- 콤보 보너스: 최대 `+20`
- 힌트 사용: `-10`
- 3회 실패: `0`

- [ ] **Step 6: 유틸 단독 smoke check 실행**

Run:

```bash
node --input-type=module -e "import { normalizeTypingItems, createTypingHint, isTypingAnswerCorrect } from './src/utils/wordTyping.js'; const items = normalizeTypingItems([{ word: 'Fourth', meaning: '네 번째' }]); console.log(items[0].normalizedWord, createTypingHint(items[0].word), isTypingAnswerCorrect(' fourth ', 'Fourth'));"
```

Expected:
- `fourth`
- `f _ _ _ _ h`
- `true`

---

### Task 2: 앱 뷰와 진입 버튼 연결

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/ModeSelector.jsx`

- [ ] **Step 1: 새 앱 뷰 상수 추가**

`src/App.jsx`에 새 view를 추가한다.

예상 값:

```js
TYPING: "typing"
```

- [ ] **Step 2: ModeSelector props 설계 확인**

`ModeSelector`에 새 진입 핸들러 prop을 추가한다.

예상 prop:

```js
onOpenTyping
```

- [ ] **Step 3: 학생 활동 카드에 새 버튼 추가**

버튼 문구:

- `영어 단어 타자 게임`

권장 배치:
- `단어 낚시` 다음, `학급 빙고 게임` 앞 또는 뒤 중 현재 레이아웃과 가장 자연스러운 위치
- 구현 시 기존 버튼 간격과 카드 리듬을 깨지 않는 방향 우선

- [ ] **Step 4: 버튼 활성화 조건 연결**

규칙:
- 학생 단어 세트가 로드되어 있을 때만 활성화
- `hasVocabulary`가 false면 비활성화

- [ ] **Step 5: App에서 게임 화면 렌더링 연결**

`WordTypingGame`를 import하고, 뷰 전환 시 렌더링되도록 추가한다.

전달 props:
- `items={library.student.items}`
- `speech={speechSynthesis}`
- `celebration={celebrationAudio}`
- `onBack={() => navigateTo(APP_VIEWS.HOME)}`

---

### Task 3: WordTypingGame 기본 골격 작성

**Files:**
- Create: `src/components/WordTypingGame.jsx`
- Reference: `src/components/WordFishingGame.jsx`
- Reference: `src/components/WordMatchingGame.jsx`

- [ ] **Step 1: 게임 phase 상태 정의**

기본 phase:

```js
"ready" | "playing" | "complete"
```

- [ ] **Step 2: 핵심 상태 정의**

필수 상태:
- `questions`
- `questionIndex`
- `attemptCount`
- `score`
- `combo`
- `bestCombo`
- `usedHintIds`
- `currentInput`
- `feedbackTone`
- `feedbackMessage`
- `elapsedMs`
- `correctCount`
- `failedCount`

- [ ] **Step 3: 시작 화면 작성**

표시 요소:
- 게임 소개
- 총 문제 수
- `게임 시작`
- `홈으로`

- [ ] **Step 4: 플레이 화면 기본 구조 작성**

표시 요소:
- 현재 문제 번호 / 전체 문제 수
- 진행 바
- 한국어 뜻
- 입력창
- `입력 완료`
- `발음 듣기`
- `힌트 보기`
- 현재 콤보
- 피드백 문구

- [ ] **Step 5: 완료 화면 기본 구조 작성**

표시 요소:
- 최종 점수
- 맞힌 개수
- 실패 개수
- 힌트 사용 횟수
- 평균 입력 시간
- 최고 콤보
- `다시 하기`
- `홈으로`

---

### Task 4: TTS와 입력 흐름 구현

**Files:**
- Create: `src/components/WordTypingGame.jsx`
- Reference: `src/hooks/useSpeechSynthesis.js`

- [ ] **Step 1: 문제 시작 시 TTS 자동 1회 재생 구현**

규칙:
- 새 문제 진입 시에만 1회 재생
- 같은 문제에서 re-render 때문에 중복 재생되면 안 됨

- [ ] **Step 2: `발음 듣기` 버튼 연결**

규칙:
- 학생이 눌렀을 때만 재생
- 현재 단어 기준으로만 재생

- [ ] **Step 3: 입력창과 Enter 제출 연결**

규칙:
- 버튼 클릭 제출 가능
- Enter 키 제출 가능
- 빈 입력은 제출되지 않음

- [ ] **Step 4: 제출 시 정답/오답 판정 연결**

정답이면:
- 점수 반영
- 콤보 증가
- 짧은 축하음 재생
- 다음 문제로 이동 준비

오답이면:
- 시도 횟수 증가
- 피드백 표시
- 3회 미만이면 현재 문제 유지

- [ ] **Step 5: 3회 실패 처리 연결**

규칙:
- 3회 실패 시 정답을 짧게 보여줌
- 콤보 초기화
- 실패 개수 증가
- 짧은 지연 후 다음 문제 이동

---

### Task 5: 힌트와 피드백 연출 구현

**Files:**
- Create: `src/components/WordTypingGame.jsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: 힌트 사용 상태 구현**

규칙:
- 문제당 1회만 힌트 사용 가능
- 힌트 사용 여부를 상태로 기록
- 점수 계산에 반영

- [ ] **Step 2: 힌트 UI 연결**

예상 표시:
- `힌트: f _ _ _ _ h`
- `글자 수: 6`

- [ ] **Step 3: 피드백 tone 설계**

예상 tone:
- `idle`
- `correct`
- `wrong`
- `failed`

- [ ] **Step 4: 짧은 전환 타이밍 구현**

권장 규칙:
- 정답 후 `600ms ~ 900ms` 사이에 다음 문제로 이동
- 실패 후 정답을 보여주는 시간도 너무 길지 않게 유지

---

### Task 6: 점수/통계 집계와 완료 처리 구현

**Files:**
- Create: `src/components/WordTypingGame.jsx`
- Create: `src/utils/wordTyping.js`

- [ ] **Step 1: 누적 통계 집계 구현**

집계 항목:
- `score`
- `correctCount`
- `failedCount`
- `bestCombo`
- `hintUsedCount`
- `elapsedMs`

- [ ] **Step 2: 평균 입력 시간 계산 구현**

예상 값:

```js
Math.round(elapsedMs / Math.max(correctCount + failedCount, 1) / 1000)
```

- [ ] **Step 3: 마지막 문제 완료 시 complete phase 전환**

규칙:
- 모든 문제를 다 풀면 완료 화면 진입
- 긴 축하음 1회 재생

- [ ] **Step 4: 다시 하기 처리 구현**

규칙:
- 상태를 완전히 초기화
- 문제 순서를 다시 준비
- 첫 문제부터 다시 시작 가능

---

### Task 7: 스타일과 반응형 UI 마감

**Files:**
- Modify: `src/styles/global.css`
- Reference: `src/components/WordFishingGame.jsx`
- Reference: `src/components/WordMatchingGame.jsx`

- [ ] **Step 1: 타자 게임 전용 클래스 네이밍 추가**

예상 prefix:
- `.word-typing-*`

- [ ] **Step 2: 시작/플레이/완료 카드 스타일 작성**

필수 요소:
- 의미 카드
- 입력 카드
- 힌트 영역
- 콤보 배지
- 피드백 상태

- [ ] **Step 3: 입력창 가독성 강화**

규칙:
- 초등학생이 보기 쉽게 큰 글자
- 포커스 상태 명확히 표시
- 모바일에서도 입력이 쉬운 높이 유지

- [ ] **Step 4: 모바일 반응형 정리**

규칙:
- 좁은 화면에서 버튼이 줄바꿈돼도 깨지지 않음
- 입력창과 제출 버튼이 세로 배치로도 자연스러움

---

### Task 8: 버전 기록과 업데이트 정보 반영

**Files:**
- Modify: `src/constants/app.js`
- Modify: `package.json`

- [ ] **Step 1: 버전 번호 미세 조정**

규칙:
- 새 기능 추가에 맞춰 patch 또는 minor 증가
- UI에 표시되는 버전과 `package.json` 버전을 같이 맞춘다

- [ ] **Step 2: update info 기록 추가**

요약 항목:
- 영어 단어 타자 게임 추가
- 한국어 뜻 + 영어 발음 + 직접 입력 구조
- 콤보와 축하음, 결과 요약 제공

---

### Task 9: 검증과 마감

**Files:**
- Test: `npm run build`
- Smoke: local manual browser check

- [ ] **Step 1: 정적 검증 실행**

Run:

```bash
npm run build
```

Expected:
- 빌드 성공
- 새 게임 컴포넌트 import 오류 없음

- [ ] **Step 2: 수동 smoke check 수행**

확인 항목:
- 홈에서 `영어 단어 타자 게임` 버튼 노출
- 단어 세트 없으면 비활성화
- 시작 시 한국어 뜻 노출
- 문제 시작 시 TTS 자동 1회 재생
- Enter 제출 가능
- 정답 시 다음 문제로 이동
- 3회 실패 시 정답 노출 후 다음 문제 이동
- 완료 시 긴 축하음 재생

- [ ] **Step 3: diff 리뷰**

검토 포인트:
- 기존 듣기/말하기/짝 맞추기/낚시 흐름 훼손 여부
- speech cancel 타이밍이 다른 게임에 영향 없는지
- global.css에서 기존 클래스 충돌 없는지

- [ ] **Step 4: 커밋**

예상 커밋 메시지:

```bash
git add src/App.jsx src/components/ModeSelector.jsx src/components/WordTypingGame.jsx src/utils/wordTyping.js src/styles/global.css src/constants/app.js package.json
git commit -m "Add english vocabulary typing game"
```

---

## 구현 순서 제안

1. `Task 1` 유틸 작성
2. `Task 2` 뷰 연결
3. `Task 3` 기본 화면 골격
4. `Task 4` 입력/TTS 흐름
5. `Task 5` 힌트/피드백
6. `Task 6` 점수/완료 처리
7. `Task 7` 스타일 마감
8. `Task 8` 버전 반영
9. `Task 9` 검증 및 커밋

## 범위 메모

이 계획은 첫 버전 범위를 `학생용 플레이 가능한 타자 게임`까지로 제한한다. 아래는 후속 단계로 분리한다.

- 타자 게임 리더보드
- 학생 개인 성장 기록 저장
- 여러 단원 체크형 타자 게임
- 교사용 타자 게임 전용 관리 옵션
