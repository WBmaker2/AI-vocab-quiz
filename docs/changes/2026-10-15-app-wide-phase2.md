# 2순위 완료: 강조 확대 + 500줄 분할

- `gi-pulse` 확대: 듣기 다시듣기·다음 문제, 말하기 다음 단어, 낚시·타자 게임 시작, 짝맞추기 단원 선택, 빙고판 배치 완료 버튼(활성 상태에서만 깜빡임).
- 파일 분할(괄호 안은 변경 전→후): SpeakingQuiz 976→485(문제/복습/결과/진행기록/채점 훅 분리), ListeningQuiz 785→406, WordTypingGame 1086→492(시작/결과/플레이 카드), WordFishingGame 603→452, WordMatchingGame 717→471, StudentBingoBoard 844→472(설치판/헤더/보드 유틸), TeacherWorkspace 789→482(게이트/프로필 분리), TeacherBingoHost 608→458(요약/뷰헬퍼), studentProgress 605→185(활동 비교 분리), bingo.js 501→270(설치 로직 분리).
- 공용화: `useActivityProgression`/`ActivityProgressionBlock`(듣기·말하기 공유), `WordImage`(URL·이모지).
- 전체 194개 통과, 빌드 정상.
- 백엔드 추가 분할: `firebase.js` 4454줄→파사드 182줄 + 영역 모듈 13개(`firebaseCore`·리더보드 5종·학교·어휘·진행·빙고 3종·오답보고), 모두 500줄 이하.
- 보류 2개(`useTeacherSetManager` 1172줄·`useStudentSetLoader` 809줄): 교사 저장·자동저장 상태가 훅 안에 얽혀 있고 훅 단위 동작 테스트가 없어, 기계적 분리 시 수업 데이터 저장 흐름이 조용히 깨질 수 있다. 선행 조건(훅 동작 테스트 추가) 후 기능별 서브훅 분리를 권장한다.
- 전체 204개 통과, 빌드 정상.
