# Task 6 Report: 학생 홈과 App view에 게임 연결

## Status

구현 완료 및 검증 완료.

## 구현 내용

- `App.jsx`에 `WordSpellingGame` lazy import를 `WordFishingGame`과 `WordTypingGame` 사이에 추가했습니다.
- `APP_VIEWS.SPELLING`을 `spelling`으로 추가했습니다.
- 학생 홈에서 `onOpenSpelling`을 spelling view로 연결했습니다.
- `fishing`과 `typing` 사이에 spelling view를 렌더링했습니다.
- spelling 게임에는 다음 reviewed props만 전달했습니다.
  - `items`
  - `celebration`
  - `leaderboardContext`
  - `remoteConfigured`
  - `studentNameDraft`
  - `onStudentNameDraftChange`
  - `onBack`
- `ModeSelector`에 `onOpenSpelling` prop과 `철자 완성 게임` ghost button을 추가했습니다.
- 학생 게임 활동 순서를 다음과 같이 유지했습니다.
  - 단어 짝 맞추기
  - 단어 낚시
  - 철자 완성 게임
  - 영어 단어 타자 게임
  - 학급 빙고 게임
- 단어 세트가 없을 때 spelling 버튼은 기존 활동 버튼과 동일하게 disabled 처리했습니다.
- spelling view를 기존 compact app chrome 계약에 추가하고 회귀 테스트를 보강했습니다.

## 변경 파일

- `src/App.jsx`
- `src/components/ModeSelector.jsx`
- `src/utils/appChrome.js`
- `src/utils/appChrome.test.js`

## 검증

### 집중 테스트

명령: `node --test src/utils/appChrome.test.js`

결과: PASS, 11개 테스트 통과.

spelling compact layout의 eyebrow, 제목, 설명, focus label을 포함해 기존 home 및 compact view 계약을 확인했습니다.

### 빌드

명령: `npm run build`

결과: PASS.

Vite production build가 완료되었고 `WordSpellingGame` lazy chunk가 생성되었습니다. unresolved import는 없었습니다.

### 자체 리뷰

- spelling route는 fishing과 typing 사이에 배치했습니다.
- spelling 컴포넌트에 `speech`와 `progressionContext`를 전달하지 않았습니다.
- 기존 게임 로직, Firebase 코드, CSS는 변경하지 않았습니다.
- `git diff --check`를 통과했습니다.

## Concerns

- Task 6은 라우팅 연결 범위이므로 실제 브라우저에서 학생 세트를 불러온 뒤 spelling 버튼을 클릭하는 E2E 검증은 수행하지 않았습니다. production build에서 lazy import와 chunk 생성은 확인했습니다.
