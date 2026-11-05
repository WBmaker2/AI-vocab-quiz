# 2026-11-05 듣기 TTS 기기별 편차 수정

- 릴리스: `v1.19.3`
- 증상: 듣기 퀴즈에서 영어가 잘 들리는 학생도 있고, 잘 안 들리는 학생도 있었습니다.
- 원인:
  - 첫 문제 자동 재생이 브라우저 음성 목록(`getVoices`) 로드보다 먼저 실행돼, 기기 기본(한국어) 음성으로 영어가 재생됐습니다.
  - 영어 음성팩이 없는 기기에서는 안내 없이 한국어 음성으로 대체됐습니다.
  - warmup이 한국어(`준비`) 경로라 영어 음성 언록이 안 됐습니다.
- 수정:
  - `src/hooks/useSpeechSynthesis.js`에 `voicesReady`·`hasEnglishVoice`·`speakError`를 추가하고, warmup을 영어(`hello`)로 바꿨습니다. volume 1 고정, 일시정지 해제, 에러 기록을 넣었습니다.
  - `src/components/ListeningQuiz.jsx`·`src/components/WordDictationGame.jsx`는 음성 준비 전에는 자동 재생하지 않고 준비 후 1회 재생합니다.
  - `src/components/SpeechVoiceWarning.jsx`를 새로 만들어 음성 준비 중 / 영어 음성 없음 안내를 듣기·복습·받아쓰기에 보여줍니다.
  - `src/utils/speechVoice.js`에 `isEnglishVoice`·`hasEnglishVoice`를 추가했습니다.
- 검증:
  - `npm test`: 224개 통과
  - `npx eslint . --max-warnings=0`: 통과
  - `npm run build`: 통과
