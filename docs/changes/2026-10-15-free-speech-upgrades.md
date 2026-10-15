# 2026-10-15 무료 음성 고도화 (v1.17.0)

- TTS: `useSpeechSynthesis`가 영어 음성을 점수화해 고정하고(`speechVoice.js`), 보통/천천히 프리셋과 `localStorage` 기억, 진입 시 무음 예열을 수행.
- STT: 단어 세트 JSGF 문법 편향(`speechGrammar.js`, 미지원 브라우저는 기존 동작), 최종 확정 전 중간 인식 결과 표시.
- 말하기 화면: 인식 중 마이크 입력 크기 미터(`useMicrophoneLevel`+`MicLevelMeter`), 시작 버튼 `gi-pulse` 강조, 안내 문구 분리(`speakingMessages.js`).
- 듣기/말하기 화면에 읽기 속도 토글 추가, 3~4학년은 천천히 자동 제안. 유료 API·서버 변경 없음.
