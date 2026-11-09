# 원어민 발음 강력 대책 구현 계획 (승인됨)

> 작성일: 2026-11-09 / 대상: talking-vocab-quiz / 원칙: 유료 API 없음, 브라우저 내장 + 무료 사전 MP3만 사용
> 사용자 승인: (1) MP3 우선 + TTS 폴백 (2) 소리 켜고 시작하기 게이트 도입

## 1. 문제 정의

- 듣기·말하기에서 원어민 영어 발음이 기기마다 다르게 들림. 특히 1번 문제 무음이 반복됨.
- 원인 3가지:
  1. `speechSynthesis.getVoices()` 비동기 로드보다 자동재생이 먼저 실행됨 (`ListeningQuiz.jsx`, `WordDictationGame.jsx`의 `voicesReady` 대기 + 1회성 `announcedRef` 소모 버그).
  2. `warmup()`이 사용자 제스처 없이 무음 발화로 실행돼 Chrome 자동재생 잠금이 해제되지 않음 (`useSpeechSynthesis.js`).
  3. 영어 음성팩이 없는 학교 PC에서는 한국어 음성으로 영어를 읽어서 알아들을 수 없음. 대체 MP3 경로가 없음.

## 2. 목표

- 학생이 학습할 때 원어민 영어 발음이 잘 들린다.
- 1번 문제부터 영어 듣기에 문제가 없다.
- 외부 차단·음성팩 없음·Safari 등에서도 깨지지 않고 TTS로 자동 폴백된다.

## 3. 아키텍처 (2층 발음 구조)

```
사용자 클릭(게이트)
  → AudioContext.resume + speechSynthesis.resume + ensureVoicesReady()
  → 단어 세트 MP3 예열 (dictionaryapi.dev, 상위 3개 즉시 + 나머지 백그라운드)
  → Q1 재생: MP3(HTMLAudio) 성공 시 종료, 실패 시 TTS(speakAsync) 폴백
  → 이후 문제: 캐시된 MP3 즉시 재생, 실패 시 TTS 1회 재시도
```

- 1순위 MP3: `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`의 `phonetics[].audio` 중 `us` 포함 우선, 없으면 첫 유효 URL.
- 2순위 TTS: 기존 `useSpeechSynthesis`를 `ensureVoicesReady()` + `speakAsync()` Promise 기반으로 강화. `cancel()` 후 100ms 대기 후 발화로 Chrome 잘림 방지.
- 유료 서버·키 없음. 네트워크 차단 시 전량 TTS로 자동 전환.

## 4. 파일 변경 목록

- 신규:
  - `src/utils/pronunciationAudio.js` (+ `src/utils/pronunciationAudio.test.js`)
  - `src/hooks/usePronunciation.js`
  - `src/components/SoundGateCard.jsx`
  - `docs/changes/2026-11-09-native-pronunciation-fix.md`
- 수정:
  - `src/hooks/useSpeechSynthesis.js` (ensureVoicesReady, speakAsync, warmup 경량화)
  - `src/components/ListeningQuiz.jsx` (게이트 + 예열 + playWord 경로)
  - `src/components/SpeakingQuiz.jsx` (원어민 듣기 버튼을 playWord 경로로)
  - `src/components/WordDictationGame.jsx` (게이트 + playWord 경로)
  - `src/components/WordTypingGame.jsx` (시작 버튼에서 unlock+예열)
  - `src/components/WordFishingGame.jsx` (시작 버튼에서 unlock+예열, 라운드 재생 playWord)
  - `src/components/WordMatchingGame.jsx` (카드 클릭 발음을 playWord 경로로)
  - `src/components/SpeechVoiceWarning.jsx` (MP3 모드일 때 경고 숨김)
  - `src/App.jsx` (빙고 TTS도 MP3 우선 시도)
  - `src/constants/app.js` + `package.json` (v1.20.0)
- 미변경: STT(`useSpeechRecognition`), 점수·리더보드·Firebase 규칙.

## 5. 동작 설계

### 5.1 pronunciationAudio.js (순수 함수 + DOM 분리)
- `normalizePronunciationWord(word)`: 소문자·trim·내부 공백 단일화.
- `buildDictionaryLookupUrl(word)`, `extractPronunciationAudioUrls(entries)`, `pickPronunciationAudioUrl(entries)`.
- `fetchPronunciationUrl(word, {fetchFn, cache})`: 메모리 Map 캐시, 실패 시 `""` 반환 (throw 금지).
- `preloadPronunciationUrls(words, {fetchFn, cache, limit=6})`: 동시 3개로 예열, 결과 Map 반환.
- `playPronunciationUrl(url, {volume, timeoutMs, AudioClass})`: HTML Audio Promise 재생.
- `unlockBrowserAudio()`: AudioContext resume + speechSynthesis.resume. 제스처 핸들러 안에서만 호출.

### 5.2 useSpeechSynthesis 강화 (하위 호환 유지)
- 기존 `speak/supported/speaking/voices/voicesReady/hasEnglishVoice/speakError/rate` 유지.
- 추가: `ensureVoicesReady(timeoutMs=2500): Promise<voices>`, `speakAsync(text, options): Promise<'ended'|'fallback'>`.
- `speakAsync` 내부: `cancel()` → `resume()` → 100ms 대기(이전 발화 잔재 제거) → `utterance` 생성(en-US 고정, 저장된 rate) → `onend/onerror`로 resolve/reject.
- `warmup()`은 가볍게 `resume()+getVoices()`만 수행 (무음 발화 큐 오염 제거).

### 5.3 usePronunciation(speech)
- `preloadWords(words)`: 상위 3개 즉시 + 나머지 백그라운드 예열.
- `unlock()`: `unlockBrowserAudio()` + `speech.ensureVoicesReady()` + 극도의 짧은 무음 unlock 발화 1회(제스처 안).
- `playWord(word, {rate, volume, retries=2})`: 캐시/조회 MP3 → `Audio.play()` 성공 시 `lastSource='mp3'`, 실패 시 `speech.speakAsync()` → `lastSource='tts'`. 모두 실패 시 `lastError` 기록 후 `false`.
- 상태: `preparing/ready/playing/lastSource/lastError`.

### 5.4 게이트 UX
- 듣기·말하기·받아쓰기: 문제 화면 대신 `SoundGateCard` 먼저 표시. 버튼 문구 `소리 켜고 시작하기 (gi-pulse)`. 클릭 후 `preparing` 동안 `준비 중...` 비활성화, 완료 후 Q1 자동재생.
- 타자·낚시: 기존 시작 카드의 `게임 시작` 버튼을 같은 unlock+예열 플로우로 교체 (별도 게이트 화면 추가 없음).
- `SpeechVoiceWarning`: `pronunciation.lastSource==='mp3'`이면 영어음성 없음 경고 숨김 + `원어민 음원으로 들려주는 중` 안내.
- 다음 단계 버튼 규칙 준수: 게이트 버튼·다시 듣기·다음 문제에 `gi-pulse` 유지.

## 6. 검증

- `npm test` (신규 10+ 케이스: 정규화·URL 추출·us 우선·캐시·프리로드·Audio 실패 폴백)
- `npx eslint . --max-warnings=0`, `npm run build`
- 수동: (1) 영어음성 없는 Windows Chrome 1번 자동재생 (2) 네트워크 차단 시 TTS 폴백 (3) Safari 폴백 문구 (4) 3~4학년 slow 유지
- Playwright 스모크는 기존 `game_component_smoke` 유지 (게이트 클릭 후 Q1 재생까지는 수동 체크)

## 7. 롤아웃·기록

- `APP_UPDATES` 맨 앞에 `v1.20.0` 항목 추가 + `package.json` 동일 버전.
- `docs/changes/2026-11-09-native-pronunciation-fix.md` 작성.
- 업데이트 내역 모달 자동 반영 확인.
