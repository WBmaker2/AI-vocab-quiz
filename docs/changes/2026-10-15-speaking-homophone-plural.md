# 2026-10-15 말하기 동음이의어·복수형 허용 (v1.17.1)

- `normalize.js`에 동음이의어 28쌍(`hasSpeechHomophoneMatch`)과 복수형 변형(`hasPluralSpeechVariant`, -s/-es/-ies) 허용을 추가하고 `isSpeechMatch`에 연결.
- `wear`→`Where`, `T-shirt`→`t-shirts` 정답 인정 확인, `three/tree` 등 보호 혼동쌍과 `glass/class` 오인 방지는 회귀 테스트로 유지.
- `normalize.test.js`에 동음이의어·복수형 테스트 2건 추가, 전체 188개 통과.
