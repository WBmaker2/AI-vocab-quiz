# 2026-09-07 초등학생 학습 흐름 개선

## 변경 내용

- 철자 완성 게임의 오답·결과 피드백 모달을 `document.body` 포털로 분리했습니다.
- 모달이 열린 동안 Tab/Shift+Tab 포커스가 배경으로 빠지지 않게 했고, 모달이 닫히면 현재 문제 입력창으로 돌아가도록 했습니다.
- 좁은 화면에서 모달 내부를 스크롤할 수 있고 하단 행동 버튼을 계속 찾을 수 있도록 조정했습니다.
- 진행 중 정확도는 현재까지 완료한 문제를 분모로 사용합니다. 완료 화면의 전체 정확도는 전체 문제 수를 사용합니다.
- 힌트를 사용해 맞힌 문제를 `hintUsedCount`로 기록하고, 세 번 오답으로 자동 공개된 `revealedCount`와 구분했습니다.
- 리더보드 조회·표시는 새 필드가 없는 이전 기록을 `0`으로 처리하고, 새 저장과 Firestore 규칙은 `0 <= hintUsedCount <= correctCount`를 검증합니다.
- 빈 입력은 기회와 점수를 바꾸지 않고 입력창 아래에 다시 쓸 안내를 보여줍니다.

## 검증

- `node --test src/utils/wordSpelling.test.js src/lib/firebase.test.js` 통과
- `npm test` 통과: 167개 통과, Firestore 에뮬레이터 전용 79개 건너뜀
- `npm run test:rules` 통과: 79개 통과
- `npm run build` 및 `git diff --check` 통과
- ego-browser 로컬 회귀: 빈 입력 안내, 포털 모달, Tab 포커스 순환, 힌트 11문제 결과 집계 확인. 320×800과 375×800에서 버튼 하단이 각각 789.0px·787.8px로 viewport 안에 있었고, 1280×800에서도 모달·버튼이 viewport 안에 있었습니다.
- Playwright smoke는 로컬 Chromium 실행 파일이 없어 실행하지 못했습니다.

이번 변경은 로컬 구현 단계입니다. 커밋·푸시·배포는 수행하지 않았습니다.
