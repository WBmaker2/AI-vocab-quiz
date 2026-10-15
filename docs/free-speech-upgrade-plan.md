# 무료 음성 고도화 구현 계획 (STT·TTS, 유료 API 없음)

> 작성일: 2026-10-15 / 대상: talking-vacab-quiz / 원칙: 브라우저 내장 API만 사용, 유료 클라우드 미사용, VoiceOver 검증 제외

## 1. 목표

- TTS: 기기마다 다른 영어 목소리를 고정하고 학년별 속도 프리셋(보통/천천히)을 제공한다.
- STT: 그날 단어 세트로 인식 문법을 편향시켜 짧은 단어 인식률을 올리고, 말하는 동안 마이크 입력 크기를 보여준다.
- 500줄 규칙을 지키기 위해 새로 만드는 코드와 공용 UI는 새 파일에 둔다.

## 2. 범위

- 포함: `useSpeechSynthesis` 음성 고정·프리셋, `useSpeechRecognition` 문법 편향·중간 결과, 마이크 레벨 미터, 속도 토글 UI, 말하기 버튼 `gi-pulse` 강조.
- 제외: 유료 TTS/STT, 기기 내 Whisper 탑재, 녹음 다시듣기, 받아쓰기 모드(이상 후속 단계).

## 3. 파일 변경 목록

- 신규: `src/utils/speechVoice.js`(+테스트), `src/utils/speechGrammar.js`(+테스트), `src/utils/microphoneLevel.js`(+테스트), `src/hooks/useMicrophoneLevel.js`, `src/components/SpeechRateToggle.jsx`, `src/components/speaking/MicLevelMeter.jsx`, `src/components/speaking/speakingMessages.js`(기존 안내 문구 이전).
- 수정: `src/hooks/useSpeechSynthesis.js`, `src/hooks/useSpeechRecognition.js`, `src/components/SpeakingQuiz.jsx`, `src/components/ListeningQuiz.jsx`, `src/App.jsx`(학년 전달), `src/styles/global.css`(미터·토글样式 최소 추가), `src/constants/app.js`+`package.json`(v1.17.0), `docs/changes/2026-10-15-free-speech-upgrades.md`.

## 4. 동작 설계

- 음성 선택: `getVoices()`에서 영어 음성을 점수화해 `Google US English` 계열 우선, 선택값을 `localStorage`에 기억. 3~4학년은 첫 진입 시 `천천히(0.7)` 자동 제안, 이후 수동 선택을 기억.
- 문법 편향: 단어 세트로 JSGF 문법을 만들어 `SpeechGrammarList`가 있는 브라우저에만 부착, 없으면 기존 인식 그대로 동작.
- 마이크 레벨: 인식 중일 때만 `getUserMedia`+`AnalyserNode`로 입력 크기를 막대로 표시, 종료 시 스트림 즉시 해제.

## 5. 검증

- `npm test` 전체 통과, `npm run build` 통과.
- 수동: Chrome에서 단어 세트 불러오기 → 듣기 자동 재생 목소리 확인 → 속도 토글 → 말하기 인식·중간 결과·레벨 미터 확인 → Safari/Firefox 폴백 문구 확인.
- VoiceOver 검증은 제외한다.
