# Project Handoff

## 1. 문서 목적

이 문서는 새 스레드에서 이 프로젝트를 빠르게 이해하고 바로 작업을 이어가기 위한 요약 문서입니다.
초기 `README.md`와 `docs/prd.md`는 MVP 기준 설명이 많아서, 현재 제품 상태는 이 문서를 먼저 보는 편이 더 정확합니다.
반복 운영 선호는 `docs/agent-memory.md`에 함께 누적합니다.

## 2. 프로젝트 한 줄 요약

**AI 원어민 단어퀴즈 쇼**는 초등 영어 수업용 웹앱입니다. 선생님이 학교/학년/단원 기준으로 단어 세트를 관리하고, 학생은 공개된 단어 세트를 불러와 듣기, 말하기, 짝 맞추기, 단어 낚시, 학급 빙고, 영어 타자 활동을 진행합니다.

## 3. 현재 제품 핵심 구조

### 3.1 사용자 역할

- **교사**
  - Google 로그인 후 학교와 선생님 정보를 등록합니다.
  - 자기 학교/자기 계정 기준 단어 세트를 관리합니다.
  - 학생 공개 여부를 제어합니다.
  - 학급 빙고를 시작하고 리더보드를 관리합니다.
- **학생**
  - 학교 -> 선생님 -> 학년 -> 단원 순서로 공개 단어 세트를 선택합니다.
  - 개별 게임 활동 또는 학급 활동에 참여합니다.

### 3.2 홈 화면 구조

- 상단 Hero + `업데이트 내역` 모달
- 브라우저 안내 영역
- 학생 활동 시작 카드
- 선생님 단어 세트 관리 카드

최근 홈 화면은 **학생 시작 동선이 먼저 보이도록** 정리되어 있습니다.
단어 세트를 불러오면 **학년·단원·단어 수 준비 완료 배너**가 나타나고,
활동 버튼은 `기본 학습`과 `게임 활동`으로 나뉩니다.

### 3.3 교사 관리 화면 구조

현재 교사 관리 화면은 **축약된 상단 정보 + 4개 탭 구조**입니다.

- 교사와 모든 학생 활동 화면은 홈 화면용 큰 Hero 대신
  **화면별 compact 헤더**를 사용하고, 화면 전환 시 새 작업 영역으로
  키보드 초점과 스크롤을 이동합니다.
- 신규 교사는 프로필 생성 직후 승인 대기 화면을 보며, 관리 기능은
  프로젝트 관리자가 `isActive: true`로 승인한 뒤 사용할 수 있습니다.
- 학교/선생님 정보는 기본 상태에서 **얇은 프로필 스트립**으로 보이고, `정보 수정`을 누를 때만 전체 수정 카드가 펼쳐집니다.
- 등록 단어 / 예문 포함 / 공개 상태는 큰 카드 대신 **요약 칩**으로 압축되어 탭 위 공간을 덜 차지합니다.

- **기본 관리**
  - 학년과 단원 선택
  - 새 단어 추가
  - 등록된 단어 조회
- **일괄 등록**
  - 엑셀로 단원 일괄 등록
  - 다른 학교 단어카드 복사
- **학급 빙고**
  - 학급 빙고 단원 선택
  - 학생 공개/빙고 시작 관련 카드
- **리더보드**
  - 활동별 리더보드 관리

상단 공통 영역에는 아래 정보가 유지됩니다.

- 학교/선생님 현재 정보
- 정보 수정 진입 버튼
- 현재 단어 세트 요약 칩

### 3.4 최근 구조 분리 상태

2026-04-12 기준으로 큰 파일이던 교사/학생 상태 로직은 아래처럼 분리되어 있습니다.

- `src/hooks/useVocabularyLibrary.js`
  - 최상위 조립 허브 역할
- `src/hooks/teacher/useTeacherSetManager.js`
  - 교사 기본 단어 세트 관리
- `src/hooks/teacher/useTeacherLeaderboards.js`
  - 교사 리더보드 상태와 동작
- `src/hooks/teacher/useTeacherBingoPreparation.js`
  - 교사 빙고 준비 상태와 동작
- `src/hooks/student/useStudentSetLoader.js`
  - 학생 학교/선생님/학년/단원 선택과 세트 로딩

교사 UI도 탭별로 나뉘어 있습니다.

- `src/components/teacher/TeacherManageTab.jsx`
- `src/components/teacher/TeacherBulkTab.jsx`
- `src/components/teacher/TeacherBingoTab.jsx`
- `src/components/teacher/TeacherLeaderboardTab.jsx`

## 4. 핵심 기능 목록

### 4.1 교사 기능

- 학교/선생님 등록 및 수정, 삭제
- 단어 세트 저장, 불러오기, 삭제
- 학년별 출판사 선택 및 저장
- 단어 자동 저장 흐름
- 엑셀 일괄 등록
- 현재 학년 전체 초기화
- 다른 학교 단어카드 복사
- 학급 빙고 세션 시작
- 리더보드 이름 수정 / 기록 삭제

### 4.2 학생 기능

- 공개 단어 세트 불러오기
- 듣기 퀴즈
- 말하기 연습
- 단어 짝 맞추기
- 단어 낚시
- 학급 빙고 참여
- 영어 단어 타자 게임
- 철자 완성 게임
- 활동별 결과 화면, 축하음, 일부 활동의 리더보드/개인 성장 기록

## 5. 활동별 상태 요약

### 5.1 듣기 퀴즈

- TTS 기반 발음 재생
- 정답/완료 축하음 반영
- 결과 화면에서 **세션 직후 오답 복습 CTA**를 붙일 수 있는 구조가 들어갔고, 틀린 문제 최대 3개를 바로 다시 풀 수 있도록 로컬 review state가 준비되어 있습니다.
- 학생용 활동 버튼은 간결한 라벨로 정리되어 있음

### 5.2 말하기 연습

- STT 기반 발화 인식
- 오답과 인식 실패를 합산해 3회 실패 시 다음 단어 이동 가능
- 같은 단어를 여러 번 잘못 말해도 review 목록에는 1번만 들어가고, **문제를 실제로 종료할 때만** 세션 오답 복습 대상으로 기록되도록 설계되어 있습니다.
- 진행 팁 문구 정리 완료

### 5.3 단어 짝 맞추기

- 여러 단원 선택 가능
- 정답 카드 페이드 아웃 애니메이션
- 게임 완료 후 점수, 리더보드, 결과 재시작 흐름 포함
- 학생/교사 동선 분리 정리 완료

### 5.4 단어 낚시

- TTS 전용 개인 플레이
- 제한 시간 안에 뜻 카드를 눌러 진행
- 낚시 게임도 전용 리더보드 연결 완료

### 5.5 학급 빙고

- 교사는 여러 단원을 선택해 세션 시작 가능
- 학생은 직접 빙고판을 배치하거나 랜덤 배치 가능
- 학생은 교사가 부른 단어를 직접 찾아 클릭해야 체크됨
- 교사 호스트 화면에는 현재 호출 단어, 빙고 현황, 단어 선택 보드가 있음
- 최근에는 교사 화면 상태 표시와 학생 화면 레이아웃이 계속 다듬어졌음

### 5.6 영어 단어 타자 게임

- 한국어 뜻 + 영어 발음(TTS)을 보고 단어를 직접 입력
- 힌트, 콤보, 축하음, 결과 요약 포함
- 메인 점수와 분리된 **타자 오답 복습 phase**를 붙일 수 있는 구조가 들어가 있어, 3번 모두 틀린 단어만 결과 화면에서 다시 입력 복습할 수 있습니다.
- 타자 게임 리더보드와 개인 성장 기록 저장 연결 완료

### 5.7 철자 완성 게임

- 단어 길이에 따라 일부 중간 철자 단서를 랜덤으로 보여주고 영어 단어 전체를 입력
- 문제마다 최대 3회 시도하며 정답 점수는 100·70·40점, 세 번 모두 틀려 정답을 공개하면 10점
- 철자 결과는 `spellingLeaderboards` 컬렉션에 독립적으로 저장하며 정답 수, 문제 수, 정확도, 공개 횟수, 총 시도 횟수를 함께 기록
- 3~4글자는 1개, 5~7글자는 2개, 8~10글자는 처음·끝·내부 1개, 11글자 이상은 처음·끝·내부 2개를 단서로 표시
- 같은 단어를 다시 출제할 때는 사용한 mask signature를 피하고 가능한 다른 내부 단서 위치를 선택

## 6. 데이터 / 백엔드 구조 요약

백엔드는 Firebase 중심입니다.

- **Firebase Auth**
  - 교사 Google 로그인
- **Cloud Firestore**
  - 학교, 교사, 단어 세트, 리더보드, 빙고 세션, 학생 진행 기록 저장

핵심 개념은 아래와 같습니다.

- 학생은 **공개된 단어 세트만** 읽을 수 있음
- 교사는 **승인된 자기 학교/계정 기준 데이터만** 관리함
- 활동별 리더보드는 게임 종류별로 나뉘어 관리됨
- 개인 성장 기록은 브라우저에만 저장된 무작위 capability로 보호되며,
  같은 이름만으로 다른 기기에서 기존 기록을 읽을 수 없음

자세한 구조는 아래 문서를 같이 보면 좋습니다.

- `docs/firebase-architecture.md`
- `src/lib/firebase.js`
- `firestore.rules`

## 7. 주요 변경 흐름

아래는 현재 제품이 어떻게 확장되어 왔는지 큰 흐름만 압축한 것입니다.
세부 버전 로그는 `src/constants/app.js`의 `APP_UPDATES`가 기준입니다.

### 7.1 초기 단계

- 교사용 단어 CRUD
- 듣기 퀴즈 / 말하기 연습
- Firebase 기반 공유 저장 구조 정착

### 7.2 교사 데이터 관리 강화

- 학교/선생님 등록, 수정, 삭제
- 학년/단원/출판사 기준 관리
- 엑셀 일괄 등록과 현재 학년 초기화
- 다른 학교 단어카드 복사 기능 추가

### 7.3 게임형 활동 확장

- 단어 짝 맞추기 추가
- 학급 빙고 추가
- 단어 낚시 추가
- 영어 단어 타자 게임 추가

### 7.4 학생 피드백/보상 강화

- 정답 축하음, 완료 축하음
- 개인 최고 기록 및 배지
- 활동 결과 요약 고도화

### 7.5 리더보드 확장

- 짝 맞추기 리더보드
- 단어 낚시 리더보드
- 영어 타자 리더보드
- 교사 전용 리더보드 편집 화면
- 우리학교 전체 순위 흐름 추가

### 7.6 학급 빙고 고도화

- 다중 단원 선택
- 학생 직접 배치 + 랜덤 배치
- 체크 권한/Firestore 규칙 안정화
- 교사 호스트 화면 상태 표시 개선
- 학생 화면 카드 체크 가시성 개선

### 7.7 최근 UI 정리

- 홈 랜딩을 학생 우선 구조로 정리
- 교사 관리화면을 4개 탭 구조로 재구성
- 교사 관리화면의 상단 Hero/프로필/요약 영역을 더 작게 압축
- `업데이트 내역` 버튼/버전 기록 체계 유지

## 8. 현재 버전 기준 핵심 상태

- 현재 반영 버전: **v1.12.0**
- 배포 대상: **Vercel production**
- 라이브 주소: <https://talking-vacab-quiz.vercel.app>

### 8.0 2026-08-09 작업 기록

1. **철자 완성 게임 UI와 릴리스 준비**
   - 학생 홈의 단어 낚시와 영어 단어 타자 게임 사이에 철자 완성 게임을 배치하고, 철자 전용 단서·입력·피드백·결과 UI와 모바일 반응형 규칙을 추가
   - 게임 시작, 입력 확인, 다음 문제, 점수 저장 버튼에 `gi-pulse`를 적용하고 reduced-motion에서는 애니메이션을 끔
   - `npm test`, `npm run build`, `npm run test:rules`, `npm run test:smoke`를 실행해 결과를 릴리스 커밋 보고서에 기록

### 8.1 2026-07-12 작업 기록

1. **권한과 개인 기록 보호**
   - 신규 교사는 승인 대기로 생성하고, 활성 교사만 자기 학교 ID와
     학교 이름에 맞는 자료를 관리하도록 Firestore 규칙 강화
   - 학생 성장 기록은 기기 전용 32자리 무작위 capability 문서로 전환
   - 짝 맞추기·낚시·타자 리더보드의 문항 수와 점수 관계 검증 추가
2. **데이터 유실과 가져오기 방지**
   - 자동·수동 저장, 빙고 준비, 삭제, 초기화, 가져오기를 직렬 큐로 통합
   - `.xlsx`만 5 MiB/5,000행까지 전체 검증 후 한 Firestore batch로 저장
   - 학생 학교/교사/단원/세트 로딩에 generation gate와 공유 로드 잠금 적용
3. **UI·접근성·성능**
   - 활동별 compact 헤더, 준비 완료 배너, 기본 학습/게임 그룹 추가
   - 초점 이동, live status, 대비, 44px 터치 영역, reduced-motion 보강
   - 활동 화면 lazy loading과 Firebase/React/스프레드시트 청크 분리

자세한 변경과 운영 주의사항은
`docs/changes/2026-07-12-core-security-ui-hardening.md`를 참고합니다.

### 8.2 2026-04-23 작업 기록

오늘 한 작업은 아래 1개 축으로 정리됩니다.

1. **말하기 퀴즈 실패 시도 합산 안정화**
   - 발음 오답과 음성인식 실패를 `failedAttempts` 하나로 합산해 총 3회 실패하면 `다음 단어` 버튼이 활성화되도록 기준을 명확히 정리
   - `no-speech`뿐 아니라 결과 없이 종료된 인식, `no-match`, `aborted`, 일반 STT 오류도 실패 시도 1회로 계산
   - 권한 거부, 마이크 없음, STT 서비스 불가 같은 설정 오류는 기존처럼 즉시 다음으로 넘어갈 수 있는 blocking 상태로 유지
   - 공통 규칙은 `src/utils/speakingAttempts.js`, 회귀 테스트는 `src/utils/speakingAttempts.test.js`에 추가

### 8.3 2026-04-20 작업 기록

오늘 한 작업은 아래 1개 축으로 정리됩니다.

1. **듣기 퀴즈 다시 듣기 버튼 안정화**
   - 메인 듣기 퀴즈의 `다시 듣기` 버튼이 React 클릭 이벤트를 문제 객체처럼 받아 음성이 재생되지 않을 수 있던 원인을 수정
   - 버튼 클릭 시 현재 문제를 명시적으로 전달하고, 이벤트 객체가 들어와도 현재 문제 단어로 fallback 되도록 `src/utils/listeningQuiz.js`에 안전장치 추가
   - 회귀 테스트는 `src/utils/listeningQuiz.test.js`에 추가하고 `npm test`에 포함

### 8.4 2026-04-13 작업 기록

오늘 한 작업은 아래 2개 축으로 정리됩니다.

1. **결과 화면 기록 저장 흐름 통합**
   - `단어 짝 맞추기`와 `영어 단어 타자 게임` 결과 화면에서 학생 이름을 한 번만 입력하면 개인 성장 기록과 리더보드 점수를 함께 저장하도록 통합
   - 공통 저장 흐름은 `src/utils/studentResultSave.js`로 분리해 이름 정규화, 순차 저장, 부분 실패 메시지를 재사용 가능하게 정리
   - 아래 리더보드 패널은 결과 저장 후 최신 순위가 다시 보이도록 읽기 중심 패널로 전환

2. **오답 복습 카드 위치 조정**
   - `듣기 / 말하기 / 영어 단어 타자 게임` 결과 화면에서 개인 기록 저장 블록을 먼저 보여주고, 그 아래에 오답 복습 시작 카드를 배치
   - 학생이 학습 직후 이름 기록과 저장을 마친 뒤 바로 복습을 이어가는 흐름으로 정리

### 8.5 2026-04-12 작업 기록

오늘 한 작업은 아래 6개 축으로 정리됩니다.

1. **영어 타자 게임 규칙 조정**
   - 같은 단어/뜻 조합도 수업 세트에 들어온 순서대로 유지
   - 3번째 시도 정답에도 점수 부여
   - 콤보 보너스는 연속 2개부터 시작

2. **Firestore rules 정합성 수정**
   - `studentProfiles`의 타자 최고 기록 갱신 규칙을 프런트 최고 기록 계산 기준과 맞춤
   - 불필요한 `firestore (1).rules` 복사본 제거

3. **Firestore 규칙 테스트 자동화**
   - Firestore Emulator 기반 계약 테스트 추가
   - `studentProfiles`, `matchingLeaderboards`, `fishingLeaderboards`, `typingLeaderboards`, `bingoSessions/players` 핵심 흐름 검증
   - GitHub Actions CI에서 `npm test`, `npm run test:rules`, `npm run build` 자동 실행

4. **학생 최근 선택 복원**
   - 학생이 같은 학교/선생님으로 돌아오면 최근에 사용한 학년/단원을 자동 복원
   - `localStorage`에 학교 + 선생님 기준으로 저장
   - 저장된 단원이 더 이상 없으면 학년만 복원하고 단원은 비워서 재선택 가능

5. **교사 관리 화면 상단 압축**
   - 교사 모드에서는 큰 Hero 대신 compact 헤더 사용
   - 브라우저 안내 카드는 teacher 화면에서 숨김
   - Teacher Profile은 기본 상태에서 스트립으로 축소
   - 요약 카드 3개는 작은 칩으로 압축
   - 실제 조작 탭이 화면에 더 빨리 보이도록 정리

6. **세션 직후 오답 복습 추가**
   - `듣기 / 말하기 / 영어 단어 타자 게임` 결과 화면에서 방금 틀린 문제만 최대 3개까지 바로 다시 풀 수 있는 복습 CTA 추가
   - 공통 오답 누적/정렬 규칙은 `src/utils/sessionReview.js`로 분리
   - 듣기는 전체 문제 풀을 distractor로 재사용해 1개만 틀려도 선택지가 충분히 나오도록 조정
   - 말하기는 같은 단어를 여러 번 잘못 인식해도 문제 종료 시점에만 1번 기록되도록 정리
   - 타자는 메인 점수와 복습 정답 수를 분리해 결과 요약이 흔들리지 않도록 phase를 확장

### 8.6 오늘 추가되거나 중요해진 파일

- `src/utils/appChrome.js`
- `src/utils/appChrome.test.js`
- `src/components/teacher/teacherWorkspaceView.js`
- `src/components/teacher/teacherWorkspaceView.test.js`
- `src/utils/studentRecentSelection.js`
- `src/utils/studentRecentSelection.test.js`
- `src/utils/sessionReview.js`
- `src/utils/sessionReview.test.js`
- `src/utils/listeningQuiz.js`
- `src/utils/listeningQuiz.test.js`
- `src/utils/speakingAttempts.js`
- `src/utils/speakingAttempts.test.js`
- `src/utils/studentResultSave.js`
- `src/utils/studentResultSave.test.js`
- `src/utils/quiz.test.js`
- `tests/firestore.rules.test.js`
- `.github/workflows/ci.yml`

버전 기록은 아래 파일이 기준입니다.

- `src/constants/app.js`
- `package.json`

## 9. 새 스레드에서 먼저 읽으면 좋은 파일

### 필수

- `README.md`
- `src/constants/app.js`
- `src/components/TeacherWorkspace.jsx`
- `src/App.jsx`
- `src/hooks/useVocabularyLibrary.js`
- `src/lib/firebase.js`
- `firestore.rules`

### 기능별 참고

- `src/hooks/teacher/useTeacherSetManager.js`
- `src/hooks/teacher/useTeacherLeaderboards.js`
- `src/hooks/teacher/useTeacherBingoPreparation.js`
- `src/hooks/student/useStudentSetLoader.js`
- `docs/firebase-architecture.md`
- `docs/deployment-policy.md`
- `docs/superpowers/specs/2026-03-28-word-bingo-design.md`
- `docs/superpowers/specs/2026-03-29-word-fishing-design.md`
- `docs/superpowers/specs/2026-04-04-word-typing-game-design.md`
- `docs/superpowers/specs/2026-04-05-word-typing-progress-leaderboard-design.md`

## 10. 작업 시 주의할 점

- 학생 화면과 교사 화면은 동선이 완전히 다르므로, 버튼 노출 위치를 섞지 않는 것이 중요합니다.
- Firestore rules와 프런트 저장 payload는 함께 봐야 합니다. 권한 오류는 UI보다 규칙/경로 불일치에서 자주 발생했습니다.
- Firestore 저장 관련 회귀는 `npm test`보다 `npm run test:rules`가 더 직접적으로 잡아줍니다. 에뮬레이터가 가능하면 이 명령을 우선 확인하는 편이 안전합니다.
- 학급 빙고는 실시간 상태, 교사 호스트 화면, 학생 보드, Firestore rules가 함께 얽혀 있으므로 작은 수정도 전체 흐름을 같이 확인해야 합니다.
- 버전 번호와 update info 기록은 사용자에게 실제로 보이므로, 사용자-visible 변경이 있으면 같이 올려주는 것이 좋습니다.
- 교사 화면 상단은 최근에 compact 구조로 줄였으므로, 상단 카드/안내를 다시 키우는 변경은 teacher 화면의 세로 공간에 직접 영향을 줍니다.
- 배포는 Vercel 기준으로 운영하고, 로컬 확인 후 push -> production deploy 순서를 지키는 편이 안전합니다.

## 11. 추천 사용 방식

새 스레드에서 작업을 시작할 때는 아래 순서가 가장 효율적입니다.

1. 이 문서 읽기
2. `src/constants/app.js`에서 최근 업데이트 흐름 확인
3. 변경 대상 화면의 컴포넌트 파일 확인
4. 필요하면 관련 spec/plan 문서 확인
5. Firestore 저장이 연관되면 `src/lib/firebase.js`와 `firestore.rules`를 같이 확인

---

이 문서는 **새 스레드 핸드오프용 요약 문서**입니다.
세부 릴리스 로그는 `APP_UPDATES`, 상세 설계 의도는 `docs/superpowers/specs`와 `docs/superpowers/plans`를 기준으로 확인하시면 됩니다.
