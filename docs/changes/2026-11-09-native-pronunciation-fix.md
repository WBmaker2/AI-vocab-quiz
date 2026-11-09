# 2026-11-09 원어민 발음 강력 대책

- 릴리스: `v1.20.0`
- 증상: 듣기·말하기에서 원어민 영어 발음이 기기마다 다르게 들리고, 1번 문제가 무음으로 시작하는 경우가 있었습니다.
- 원인:
  - `getVoices()` 비동기 로드보다 자동재생이 먼저 실행돼 한국어 음성으로 영어가 재생됐습니다.
  - `warmup()`이 사용자 제스처 없이 실행돼 Chrome 자동재생 잠금이 해제되지 않았습니다.
  - 영어 음성팩이 없는 학교 PC에서는 대체 음원이 없었습니다.
- 수정:
  - `src/utils/pronunciationAudio.js`를 새로 만들어 무료 사전 MP3를 먼저 재생하고, 실패 시 TTS로 자동 폴백합니다.
  - `src/hooks/usePronunciation.js`로 예열·잠금해제·재생을 한 곳에서 관리합니다.
  - `src/hooks/useSpeechSynthesis.js`에 `ensureVoicesReady()`·`speakAsync()`를 추가하고, `cancel()` 직후 100ms 대기 후 발화해 Chrome 잘림을 막았습니다.
  - 듣기·말하기·받아쓰기에 `소리 켜고 시작하기` 게이트(`SoundGateCard.jsx`)를 넣어 제스처 안에서 음성 잠금을 풀고 1번부터 자동재생합니다.
  - 타자·낚시는 기존 시작 버튼에서 잠금해제+예열을 함께 수행합니다. 짝맞추기·빙고 호출도 MP3 우선 경로로 바꿨습니다.
  - `SpeechVoiceWarning.jsx`는 MP3 재생 중일 때 영어음성 경고를 숨기고, 없을 때만 원어민 MP3 안내를 보여줍니다.
- 검증:
  - `npm test`: 231개 통과
  - `npx eslint . --max-warnings=0`: 통과
  - `npm run build`: 통과 예정 확인 필요
  - 수동: 영어음성 없는 Windows Chrome 1번 자동재생, 네트워크 차단 시 TTS 폴백, Safari 폴백 문구 확인 필요
