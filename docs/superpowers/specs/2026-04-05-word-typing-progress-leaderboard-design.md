# English Vocabulary Typing Progress and Leaderboard Extension Design

## Summary

이미 구현된 `영어 단어 타자 게임`을 `리더보드`와 `개인 성장 기록`까지 확장한다. 목표는 타자 게임 결과를 단순한 일회성 점수 화면으로 끝내지 않고, 학생이 같은 학교와 학년 안에서 순위를 확인하고, 자신의 최고 기록과 성장 흐름을 계속 이어서 볼 수 있게 만드는 것이다.

이번 설계는 현재 프로젝트에 이미 들어가 있는 `짝 맞추기 리더보드`, `단어 낚시 리더보드`, `studentProfiles` 기반 성장 기록 구조를 최대한 재사용하는 방향으로 정리한다. 즉, 타자 게임만을 위한 완전히 새로운 저장 체계를 만들기보다, `활동 타입 하나를 추가하는 방식`으로 시스템을 확장한다.

추천 방향은 `하이브리드형`이다.

- 리더보드는 기존 활동 리더보드 패턴을 그대로 재사용한다.
- 개인 성장 기록은 기존 `studentProfiles` 집계 필드를 확장한다.
- 이후 성장 차트와 오답 분석에 대비해 세션 히스토리 서브컬렉션을 함께 저장할 수 있게 설계한다.

## Goals

- 타자 게임 완료 후 학생이 점수를 리더보드에 저장할 수 있게 한다.
- 같은 학교, 같은 학년 기준으로 `주간`, `월간`, `연간`, `우리학교 전체` 타자 리더보드를 제공한다.
- 학생 이름 기준으로 개인 최고 기록을 누적하고, 타자 게임 성장 요약을 보여준다.
- 교사 화면에서도 타자 게임 리더보드를 다른 활동과 같은 방식으로 조회, 이름 수정, 기록 삭제할 수 있게 한다.
- 이후 성장 차트, 최근 플레이 히스토리, 자주 틀린 단어 분석으로 확장 가능한 저장 구조를 마련한다.

## Non-Goals

- 이번 설계에서 단어별 상세 오답 분석 UI까지 바로 구현하지 않는다.
- 이번 설계에서 학부모용 리포트나 외부 공유 기능은 넣지 않는다.
- 타자 게임 리더보드와 다른 게임 리더보드를 합쳐 하나의 통합 점수판으로 만들지 않는다.
- 분당 타수(WPM) 중심의 전문 타자 훈련 앱처럼 설계하지 않는다.

## Existing System Context

현재 프로젝트에는 다음 구조가 이미 존재한다.

- 활동별 리더보드 정의: `matching`, `fishing`
- 활동별 리더보드 컬렉션:
  - `matchingLeaderboards`
  - `fishingLeaderboards`
- 개인 성장 기록 문서:
  - `studentProfiles/{schoolId__grade__studentName}`
- 교사 전용 리더보드 관리:
  - 활동 탭
  - 기간 탭
  - 이름 수정
  - 기록 삭제
- 학생 결과 화면 공통 리더보드 패널:
  - `GameLeaderboardPanel`

이 구조를 보면 타자 게임은 `typing` 활동 타입만 추가하면 비교적 자연스럽게 들어갈 수 있다.

## Chosen Approach

이번 문서는 `타자 게임을 기존 활동 리더보드/성장 기록 체계 안으로 편입하는 방식`을 채택한다.

핵심 원칙은 다음과 같다.

1. 활동 타입을 늘려도 UI와 저장 API는 공통 흐름을 유지한다.
2. 타자 게임만의 중요한 지표는 저장하되, 구조는 기존 활동과 비슷하게 맞춘다.
3. 지금 필요한 기능과 이후 확장 기능을 분리해, 1차 구현은 안전하고 작게 가져간다.

## Alternatives Considered

### 1. 최고 점수만 저장하는 최소형

- 장점: 구현이 가장 빠르다.
- 장점: 기존 짝 맞추기 리더보드 패턴과 거의 동일하게 만들 수 있다.
- 단점: 정확도, 힌트 사용, 콤보 같은 타자 게임 특성이 성장 기록에 잘 남지 않는다.
- 단점: 나중에 성장 차트나 약점 단어 분석으로 확장하기 어렵다.

### 2. 리더보드 + 집계 프로필 + 세션 히스토리 하이브리드형

- 장점: 지금 필요한 리더보드와 개인 최고 기록을 모두 지원한다.
- 장점: 이후 최근 기록, 성장 추세, 오답 분석으로 확장하기 쉽다.
- 장점: 기존 시스템을 크게 깨지 않고 단계적으로 넣을 수 있다.
- 단점: 최소형보다는 저장 구조가 조금 더 복잡하다.

### 3. 모든 결과를 이벤트 로그로만 저장하는 분석 우선형

- 장점: 가장 유연하고 분석 친화적이다.
- 장점: 다양한 후처리 리포트를 만들기 좋다.
- 단점: 현재 프로젝트 규모에는 과하다.
- 단점: 조회 성능과 집계 로직을 따로 더 만들어야 한다.

이번 문서에서는 `2. 하이브리드형`을 채택한다.

## Data Model

### 1. Activity type extension

`typing`을 새로운 활동 타입으로 추가한다.

추가 대상:

- 활동 리더보드 정의
- 학생 성장 비교 함수 분기
- 교사 리더보드 탭
- 결과 화면 공통 리더보드 패널 핸들러

이렇게 하면 `짝 맞추기`, `단어 낚시`, `영어 타자`가 같은 공통 틀 안에서 동작한다.

### 2. Typing leaderboard collection

새 컬렉션:

- `typingLeaderboards/{scopeKey}/entries/{studentKey}`

`scopeKey`는 기존과 같은 규칙을 그대로 사용한다.

- 학교
- 학년 또는 전체 범위
- 기간 타입
- 기간 키

문서 필드:

- `schoolId`
- `schoolName`
- `grade`
- `studentName`
- `studentNameNormalized`
- `periodType`
- `periodKey`
- `score`
- `elapsedSeconds`
- `correctCount`
- `questionCount`
- `accuracy`
- `hintUsedCount`
- `bestCombo`
- `createdAt`
- `updatedAt`

### 3. Typing leaderboard ranking rules

타자 게임은 단순 점수 외에도 교육적인 지표가 있으므로, 순위 판정은 다음 우선순위를 사용한다.

1. `score` 높은 순
2. `accuracy` 높은 순
3. `elapsedSeconds` 짧은 순
4. `updatedAt` 빠른 순

이 기준을 쓰면 다음 장점이 있다.

- 기본적으로는 게임 점수 체계를 따른다.
- 점수가 같을 때는 정확하게 쓴 학생이 우선한다.
- 정확도도 같다면 더 빠르게 끝낸 학생이 우선한다.

### 4. Student profile aggregate fields

기존 `studentProfiles` 문서에 타자 게임 집계 필드를 추가한다.

추가 필드:

- `typingSessions`
- `typingBestScore`
- `typingBestCorrectCount`
- `typingBestAccuracy`
- `typingBestCombo`
- `typingFastestClearSeconds`
- `typingLastPlayedAt`

이 집계 필드는 학생 패널에서 바로 쓸 수 있는 `빠른 조회용 정보` 역할을 한다.

### 5. Activity session history

미래 확장에 대비해 세션 히스토리 서브컬렉션을 함께 둔다.

경로:

- `studentProfiles/{profileId}/activitySessions/{sessionId}`

문서 필드:

- `activityType: "typing"`
- `score`
- `correctCount`
- `questionCount`
- `accuracy`
- `elapsedSeconds`
- `hintUsedCount`
- `bestCombo`
- `attemptCount`
- `completed`
- `playedAt`
- `wrongWords`

`wrongWords`는 이번 단계에서 꼭 화면에 쓰지 않아도 되지만, 미래의 `자주 틀린 단어` 기능을 위해 저장 가치가 높다.

## Progress Comparison Rules

타자 게임의 개인 최고 기록 판정은 다음 순서로 비교한다.

1. `score`가 더 높으면 새 최고 기록
2. 점수가 같으면 `accuracy`가 더 높으면 새 최고 기록
3. 점수와 정확도가 같으면 `elapsedSeconds`가 더 짧으면 새 최고 기록
4. 모두 같으면 `bestCombo`가 더 높으면 새 최고 기록

비교 결과에서 학생에게 보여줄 요약은 아래 방향으로 만든다.

- 첫 기록인지
- 최고 기록을 갱신했는지
- 이번 기록과 이전 최고 기록이 어떻게 다른지
- 다음 도전 목표가 무엇인지

예시:

- `영어 타자 최고 기록 갱신!`
- `정확도가 82%에서 91%로 올라갔어요.`
- `다음에는 1초만 더 줄여 보세요.`

## Badge Direction

이번 확장에서는 배지 시스템을 과도하게 넓히지 않는다.

1차 권장:

- 기존 공통 배지 흐름 유지
- 타자 전용 신규 배지는 선택 사항으로 둔다

추가 후보:

- `typing_accuracy` : 정확도 100%로 완료
- `typing_combo` : 특정 콤보 달성
- `typing_streak` : 일정 횟수 이상 플레이

하지만 첫 구현에서는 `리더보드 + 성장 기록`에 집중하고, 배지는 후속으로 미뤄도 된다.

## UI Impact

### 1. Student result screen

`WordTypingGame` 완료 화면에 다음 요소를 추가한다.

- `GameLeaderboardPanel`
- `StudentProgressPanel`

흐름은 짝 맞추기와 비슷하게 맞춘다.

1. 학생이 게임 완료
2. 리더보드 등록 여부 질문
3. 이름 입력 후 저장
4. 기간별 리더보드 표시
5. 개인 성장 기록 표시

### 2. Teacher leaderboard management

교사 화면의 리더보드 관리 카드는 늘리지 않는다.

기존 활동 탭:

- `짝 맞추기`
- `단어 낚시`

여기에 추가:

- `영어 타자`

그 아래 기간 탭과 목록, 이름 수정, 기록 삭제 UI는 그대로 재사용한다.

이 접근이 가장 중요한 이유는 `교사 화면 복잡도 증가를 최소화`하기 때문이다.

## API Direction

필요한 Firestore API 방향은 다음과 같다.

- `saveTypingLeaderboardScore`
- `fetchTypingLeaderboards`
- `renameTeacherTypingLeaderboardStudent`
- `deleteTeacherTypingLeaderboardStudent`

기존 공통 분기 API도 확장한다.

- `fetchTeacherActivityLeaderboards`
- `renameTeacherActivityLeaderboardStudent`
- `deleteTeacherActivityLeaderboardStudent`

개인 성장 기록 쪽은 다음 두 방향 중 하나를 쓴다.

- 기존 `saveStudentProgress`를 `typing`까지 확장
- 또는 `saveTypingStudentProgress`를 만든 뒤 내부에서 공통 함수를 재사용

이번 설계에서는 `saveStudentProgress` 확장 쪽을 추천한다. 이유는 학생 활동 기록의 공통 축을 유지하기 좋기 때문이다.

## Firestore Rules Direction

보안 규칙에도 다음 확장이 필요하다.

- `typingLeaderboards` 읽기/쓰기 규칙
- 교사 이름 수정/기록 삭제 규칙
- `studentProfiles`에서 `typing` 활동 저장 허용
- `activitySessions` 서브컬렉션 쓰기 허용

권한 수준은 기존 `matchingLeaderboards`, `fishingLeaderboards`와 동일하게 맞춘다.

## Migration Strategy

이번 확장은 신규 활동 타입 추가이므로 기존 데이터 마이그레이션은 거의 필요 없다.

필수 작업:

- 새 컬렉션 `typingLeaderboards` 추가
- 기존 `studentProfiles`는 필드가 없어도 정상 동작하도록 기본값 처리

즉, 과거 학생 문서에 `typing*` 필드가 없어도 읽기에서 0 또는 기본값으로 해석되면 된다.

## Recommended Rollout

### Phase 1

- 타자 리더보드 저장/조회
- 타자 개인 최고 기록 집계
- 학생 완료 화면 연결
- 교사 화면 탭 추가

### Phase 2

- `activitySessions` 세션 히스토리 저장
- 성장 패널 문구 정교화
- 타자 전용 배지 검토

### Phase 3

- 최근 5회 평균
- 정확도 추세
- 자주 틀린 단어
- 학생 개인 성장 차트

## Risks and Mitigations

### 1. 활동 타입 분기 누락 위험

리더보드와 성장 기록은 여러 파일에서 활동 타입을 나눠 처리하고 있으므로, `typing` 분기 누락이 발생하기 쉽다.

대응:

- 활동 타입 상수화
- 공통 핸들러 함수 재사용
- teacher/student 두 경로 모두 smoke check

### 2. 리더보드 정렬 기준 불일치 위험

저장 시 최고 기록 판정과 조회 시 정렬 기준이 다르면 혼란이 생긴다.

대응:

- 최고 기록 비교 규칙과 조회 정렬 규칙을 같은 우선순위로 통일

### 3. studentProfiles 문서 비대화 위험

활동이 계속 늘어나면 단일 프로필 문서가 커질 수 있다.

대응:

- 집계 필드는 최소한으로 유지
- 세부 히스토리는 `activitySessions`로 분리

## Decision

영어 타자 게임은 `typing` 활동 타입을 추가해 기존 활동 리더보드와 학생 성장 기록 시스템 안으로 편입한다.

1차 구현은 다음 네 가지를 목표로 한다.

- `typingLeaderboards` 추가
- `studentProfiles` 타자 집계 필드 추가
- 타자 게임 완료 화면에 리더보드/성장 기록 연결
- 교사 리더보드 관리 탭에 `영어 타자` 추가

세션 히스토리 저장은 구조까지는 포함하되, 구현 단계에서는 2차 범위로 두는 것이 가장 안전하다.
