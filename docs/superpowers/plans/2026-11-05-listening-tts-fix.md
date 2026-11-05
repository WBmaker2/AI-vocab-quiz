# Listening TTS Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 듣기/받아쓰기 자동 재생이 기기마다 다르게 들리는 문제를 고친다.

**Architecture:** 음성 목록이 로드되기 전에는 자동 재생을 미루고, 영어 음성이 없으면 안내를 보여주고, warmup과 재생 설정을 영어 경로로 통일한다. 호출부(Listening/Dictation)는 훅이 주는 준비 상태만 믿고 동작한다.

**Tech Stack:** React, Web Speech API (speechSynthesis), node:test

**Spec:** 사용자 보고 "영어가 잘 들리는 학생도 있고 안 들리는 학생도 있음" + 코드 진단 3건 (음성 레이스, 영어팩 없음 + 무안내, 자동재생 차단)

## Global Constraints

- 기존 `speech.speak(text, options)` 호출 시그니처를 유지한다 (boolean 반환).
- `localStorage` 키(`ttsRatePreset.v1`, `ttsPreferredVoice.v1`)를 바꾸지 않는다.
- 정답 단어를 화면 텍스트로 노출하지 않는다 (듣기 취지 유지).
- 커밋/푸시/배포는 사용자가 요청할 때만 한다.

---

### Task 1: 음성 판별 헬퍼 추가

**Files:**
- Modify: `src/utils/speechVoice.js`
- Test: `src/utils/speechVoice.test.js`

**Interfaces:**
- Consumes: 기존 `pickPreferredSpeechVoice`, `resolvePreferredSpeechVoice`
- Produces: `isEnglishVoice(voice) -> boolean`, `hasEnglishVoice(voices) -> boolean`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { hasEnglishVoice, isEnglishVoice } from "./speechVoice.js";

test("detects english voices", () => {
  assert.equal(isEnglishVoice({ lang: "en-US" }), true);
  assert.equal(isEnglishVoice({ lang: "ko-KR" }), false);
  assert.equal(hasEnglishVoice([{ lang: "ko-KR" }]), false);
  assert.equal(hasEnglishVoice([{ lang: "en-GB" }]), true);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test src/utils/speechVoice.test.js`
Expected: FAIL (`isEnglishVoice is not a function`)

- [ ] **Step 3: 최소 구현**

```js
export function isEnglishVoice(voice) {
  return /^en/i.test(String(voice?.lang ?? ""));
}

export function hasEnglishVoice(voices) {
  return Array.isArray(voices) && voices.some(isEnglishVoice);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test src/utils/speechVoice.test.js`
Expected: PASS

---

### Task 2: useSpeechSynthesis 준비 상태 + 영어 경로 통일

**Files:**
- Modify: `src/hooks/useSpeechSynthesis.js:1-172`
- Test: `node --test src/utils/speechVoice.test.js` (훅은 기존 단위 테스트 없음, 수동 검증으로 대체)

**Interfaces:**
- Consumes: `hasEnglishVoice` (Task 1), `resolvePreferredSpeechVoice`, `resolveSpeechRate`
- Produces (반환 객체에 추가, 기존 키 유지): `voicesReady: boolean`, `hasEnglishVoice: boolean`, `speakError: string`

- [ ] **Step 1: 상태 추가**

```js
const [voicesReady, setVoicesReady] = useState(() => voices.length > 0);
const [speakError, setSpeakError] = useState("");
```

초기 `voices`는 기존 `useState` 초기값을 재사용한다.

- [ ] **Step 2: loadVoices 수정**

```js
const loadVoices = () => {
  const nextVoices = synthesis.getVoices();
  if (nextVoices.length === 0) {
    return;
  }
  voicesRef.current = nextVoices;
  setVoices(nextVoices);
  setVoicesReady(true);
  // ...기존 resolve/save 로직 유지
};
loadVoices();
synthesis.onvoiceschanged = loadVoices;
const fallbackTimer = window.setTimeout(() => {
  if (voicesRef.current.length > 0) {
    setVoicesReady(true);
  } else {
    // 음성이 끝내 없으면 기본 시도로라도 재생되게 준비 완료 처리
    setVoicesReady(true);
  }
}, 1500);
return () => {
  window.clearTimeout(fallbackTimer);
  synthesis.onvoiceschanged = null;
  synthesisRef.current?.cancel();
};
```

- [ ] **Step 3: warmup을 영어 경로로 변경**

```js
const utterance = new SpeechSynthesisUtterance("hello");
utterance.lang = "en-US";
utterance.volume = 0;
utterance.rate = 1;
```

기존 `"준비"` + `ko-KR`을 교체한다. 한국어 채널이 영어 재생을 가로채는 문제를 막는다.

- [ ] **Step 4: speak 수정 (volume 명시 + 일시정지 해제 + 에러 기록)**

```js
if (synthesis.paused) {
  try { synthesis.resume(); } catch { /* 무시 */ }
}
const utterance = new SpeechSynthesisUtterance(text);
utterance.lang = options.lang ?? "en-US";
utterance.volume = options.volume ?? 1;
utterance.rate = options.rate ?? resolveSpeechRate(ratePresetRef.current);
utterance.pitch = options.pitch ?? 1;
// ...기존 voice 선택 유지
utterance.onend = () => { setSpeaking(false); options.onEnd?.(); };
utterance.onerror = (event) => {
  setSpeaking(false);
  setSpeakError(event?.error ?? "error");
  options.onError?.(event);
};
```

`speak` 시작 시 `setSpeakError("")`로 초기화한다. 반환값 boolean은 유지한다.

- [ ] **Step 5: 반환 객체에 추가**

```js
const hasEnglishVoiceValue = useMemo(() => hasEnglishVoice(voices), [voices]);
// 반환: voicesReady, hasEnglishVoice: hasEnglishVoiceValue, speakError
```

`speak` mock이 없는 기존 호출부(`TeacherWorkspace.previewWord` 등)가 깨지지 않게, 새 키는 전부 읽기 전용 추가분으로만 둔다.

- [ ] **Step 6: 수동 검증**

Run: `npm run test:smoke` (없으면 생략하고 단위 테스트만)
Expected: 기존 테스트 전부 PASS, 콘솔 에러 없음

---

### Task 3: 영어 음성 없음 안내 컴포넌트

**Files:**
- Create: `src/components/SpeechVoiceWarning.jsx`
- Modify: `src/components/listening/ListeningQuestionCard.jsx` (임포트만, 렌더는 Task 4에서)

**Interfaces:**
- Consumes: `speech = { supported, voicesReady, hasEnglishVoice, speakError }`
- Produces: `<SpeechVoiceWarning speech={speech} />` (조건부 null 또는 안내 카드)

- [ ] **Step 1: 컴포넌트 생성**

```jsx
export function SpeechVoiceWarning({ speech }) {
  if (!speech?.supported) {
    return (
      <article className="notice-card" role="note">
        <strong>소리가 안 나면</strong>
        <p>이 브라우저는 음성 읽기를 지원하지 않습니다. Chrome 또는 Edge에서 열어주세요.</p>
      </article>
    );
  }
  if (!speech.voicesReady) {
    return (
      <article className="notice-card" role="status">
        <p>영어 음성을 준비하는 중입니다. 잠시 후 자동으로 읽어줍니다.</p>
      </article>
    );
  }
  if (speech.hasEnglishVoice && !speech.speakError) {
    return null;
  }
  return (
    <article className="notice-card" role="note">
      <strong>영어 음성이 없어서 한국어 음성으로 들릴 수 있어요</strong>
      <p>잘 안 들리면 아래 순서로 확인하세요: 1) Chrome·Edge 사용 2) 기기 설정에서 영어 음성 설치 3) 아래 다시 듣기 버튼 누르기</p>
    </article>
  );
}
```

정답 단어를 출력하지 않는다. CSS는 기존 `notice-card` 재사용, 신규 스타일 없음.

- [ ] **Step 2: 렌더 확인**

Run: `npx eslint src/components/SpeechVoiceWarning.jsx`
Expected: PASS (warn 0)

---

### Task 4: 듣기 퀴즈 자동 재생을 음성 준비 후로 연기

**Files:**
- Modify: `src/components/ListeningQuiz.jsx:110-158`
- Modify: `src/components/listening/ListeningQuestionCard.jsx` (경고 렌더)
- Test: 수동 시나리오 (아래 검증표)

**Interfaces:**
- Consumes: `speech.voicesReady`, `speech.speak()` boolean 반환
- Produces: 변경 없음 (동일한 문제 진행 플로우)

- [ ] **Step 1: 자동 재생 effect 수정**

```js
const voicesReady = speech.voicesReady ?? true;

useEffect(() => {
  const targetQuestion = isReviewPlaying ? reviewQuestion : question;
  if (!targetQuestion || isComplete || isReviewComplete) {
    return;
  }
  if (!voicesReady) {
    return; // 음성 목록 전에는 announced로 표시하지 않는다
  }
  const announcementKey = `${isReviewPlaying ? "review" : "main"}:${targetQuestion.id}`;
  if (announcedQuestionIdRef.current === announcementKey) {
    return;
  }
  announcedQuestionIdRef.current = announcementKey;
  announceQuestion(targetQuestion);
}, [isComplete, isReviewComplete, isReviewPlaying, question, reviewQuestion, voicesReady]);
```

`handleNext`/`handleStartReview`의 `announcedQuestionIdRef.current = ""` 초기화는 그대로 둔다.

- [ ] **Step 2: 경고 렌더 추가**

`ListeningQuestionCard`의 `SpeechRateToggle` 아래에 `<SpeechVoiceWarning speech={speech} />`를 넣는다. 리뷰 카드(`ListeningReviewCard`)가 같은 토글을 쓰면 같은 위치에 추가한다.

- [ ] **Step 3: 수동 검증**

1. 첫 문제 진입 → "음성을 준비하는 중" → 자동 재생 1회
2. 네트워크 느림/음성 늦음 시뮬레이션에서도 첫 단어 유실 없음
3. 영어 음성 삭제 환경에서 경고 노출 + 다시 듣기 동작

---

### Task 5: 받아쓰기에도 동일 패턴 적용

**Files:**
- Modify: `src/components/WordDictationGame.jsx:59-103`

**Interfaces:**
- Consumes: `speech.voicesReady` (Task 2)
- Produces: 변경 없음

- [ ] **Step 1: warmup/wait 로직을 Task 4와 동일하게 적용**

```js
const voicesReady = speech.voicesReady ?? true;
// announce effect 초반에:
if (!voicesReady) {
  return;
}
// deps에 voicesReady 추가
```

`renderQuestionCard`의 리플레이 버튼 영역 위에 `<SpeechVoiceWarning speech={speech} />` 추가.

- [ ] **Step 2: 전체 테스트 + 린트**

Run: `npm test`
Expected: PASS

Run: `npx eslint src/hooks/useSpeechSynthesis.js src/components/ListeningQuiz.jsx src/components/WordDictationGame.jsx src/components/SpeechVoiceWarning.jsx src/utils/speechVoice.js --max-warnings=0`
Expected: PASS

---

## Self-Review

- [x] 진단 1 (음성 레이스) → Task 2 + Task 4/5에서 voicesReady 대기로 해결
- [x] 진단 2 (영어팩 없음 + 무안내) → Task 1 + Task 3 경고 UI로 해결
- [x] 진단 3 (자동재생 차단) → Task 2 warmup 영어화 + Task 4 재시도 구조로 완화 (완전 차단은 브라우저 정책상 불가, 다시 듣기 버튼이 최종 폴백)
- [x] Placeholder 없음 (모든 단계에 실제 코드 포함)
- [x] 타입 일관성: `speech.voicesReady ?? true` 폴백으로 구 mock과 호환
