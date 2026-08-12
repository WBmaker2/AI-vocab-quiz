# Task 5 Report: 독립 철자 완성 게임 화면

## 구현 상태

- `WordSpellingStartCard.jsx`를 추가했습니다.
  - `Spelling Completion` 모드 라벨과 `철자 완성 게임` 제목을 표시합니다.
  - 현재 문제 수, 세 번의 입력 기회, 일부 철자 공개 방식, 점수 규칙을 안내합니다.
  - 데이터가 없을 때 시작 버튼을 비활성화하고, 시작 버튼에 `gi-pulse`를 적용했습니다.
- `WordSpellingResultCard.jsx`를 추가했습니다.
  - 최종 점수, 정답 문제 수, 정확도, 정답 공개 횟수, 총 시도 횟수, 걸린 시간을 표시합니다.
  - `GameLeaderboardPanel`에 `activityType="spelling"`과 요구된 철자 지표를 전달합니다.
- `WordSpellingGame.jsx`를 추가했습니다.
  - `ready`, `playing`, `complete` 세 phase와 문제 전환 상태를 관리합니다.
  - `normalizeSpellingItems` 결과의 순서와 중복을 유지하고, 같은 단어의 마스크 signature만 회피합니다.
  - 빈 입력은 시도로 세지 않으며, 정답 입력과 세 번째 오답의 점수·공개 처리를 분리했습니다.
  - Enter 제출, 명확한 입력 label, 문제 카드 aria-label, `aria-live` 피드백을 제공합니다.
  - 정답마다 `playSuccess`, 전체 완료마다 `playCompletion`을 호출합니다.
  - 완료 전 다음 문제 버튼을 비활성화하고 완료 후 `gi-pulse`를 적용합니다.
  - items 변경과 unmount 시 timeout, interval, 게임 상태를 정리합니다.

## 검사 결과

- 세 파일 줄 수: `63`, `89`, `360`줄로 모두 500줄 미만입니다.
- `git diff --check`: 통과
- `npm test`: 152개 통과, 79개 스킵, 실패 0개
- `npm run build`: 통과

## 범위 확인

- `App`, `ModeSelector`, 전역 CSS, Firebase, 기존 관련 컴포넌트는 수정하지 않았습니다.
- Task 6의 App 라우트 연결 전 단계이므로 새 게임 화면의 실제 브라우저 라우팅 QA는 아직 수행하지 않았습니다.
- Firestore emulator가 실행되지 않아 emulator 의존 테스트 79개는 저장소 기존 테스트 설정에 따라 스킵되었습니다.
