const compareSemver = (left, right) => {
  const leftParts = left.replace(/^v/, "").split(".").map(Number);
  const rightParts = right.replace(/^v/, "").split(".").map(Number);

  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart !== rightPart) {
      return leftPart - rightPart;
    }
  }

  return 0;
};

const compareUpdates = (left, right) => {
  const dateDifference = left.date.localeCompare(right.date);

  if (dateDifference !== 0) {
    return dateDifference;
  }

  return compareSemver(left.version, right.version);
};

const assertAppUpdatesOrdered = (updates) => {
  if (updates.length === 0) {
    throw new Error("APP_UPDATES must contain at least one release entry.");
  }

  for (let index = 1; index < updates.length; index += 1) {
    if (compareUpdates(updates[index - 1], updates[index]) < 0) {
      throw new Error("APP_UPDATES must be ordered newest-first with the current release first.");
    }
  }
};

// APP_UPDATES is the UI source of truth for the visible release history.
// package.json is release metadata for tooling and is not read by the UI.
export const APP_UPDATES = [
  {
    version: "v1.10.1",
    date: "2026-04-05",
    summary: [
      "영어 단어 타자 게임 완료 화면에 주간, 월간, 연간, 우리학교 전체 리더보드를 추가해 학생이 이름을 입력하고 점수를 저장할 수 있습니다.",
      "개인 성장 기록 패널과 교사 리더보드 관리에 `영어 타자` 활동을 연결해, 최고 기록 확인과 이름 수정·기록 삭제까지 기존 게임과 같은 흐름으로 관리할 수 있게 했습니다.",
    ],
  },
  {
    version: "v1.10.0",
    date: "2026-04-04",
    summary: [
      "학생 모드에 `영어 단어 타자 게임`을 추가해, 한국어 뜻과 영어 발음을 단서로 단원 핵심 단어를 직접 입력해 볼 수 있습니다.",
      "문제마다 발음을 자동으로 한 번 읽어 주고, 힌트·콤보·축하음·결과 요약까지 포함한 첫 버전 타자 연습 흐름을 정리했습니다.",
    ],
  },
  {
    version: "v1.9.9",
    date: "2026-04-02",
    summary: [
      "단어 낚시 완료 화면에도 주간, 월간, 연간, 우리학교 전체 리더보드를 추가해 짝 맞추기와 같은 방식으로 점수를 저장하고 바로 순위를 확인할 수 있습니다.",
      "교사 화면의 리더보드 관리는 카드 하나만 유지한 채 `짝 맞추기`와 `단어 낚시` 활동 탭을 넣어, 낚시 기록도 이름 수정과 기록 삭제를 같은 흐름에서 관리할 수 있게 정리했습니다.",
    ],
  },
  {
    version: "v1.9.7",
    date: "2026-03-30",
    summary: [
      "학급 빙고 교사 화면의 단어 선택 보드에서도 이미 부른 단어에 `호출 완료` 배지와 더 진한 표시를 넣어, 진행 중인 호출 내역을 한눈에 구분할 수 있게 했습니다.",
      "이미 호출된 단어도 다시 직접 선택할 수 있는 흐름은 유지하면서, 보드 위에서 사용 이력을 바로 확인할 수 있게 정리했습니다.",
    ],
  },
  {
    version: "v1.9.6",
    date: "2026-03-30",
    summary: [
      "학급 빙고 교사 화면이 호출 기록의 wordId를 제대로 읽도록 고쳐, 남은 단어 수와 호출 여부가 실제 세션 상태와 어긋나던 문제를 해결했습니다.",
      "단어 선택 보드에서는 이미 한 번 불렀던 단어도 선생님이 다시 직접 선택해 재호출할 수 있게 바꿨습니다.",
    ],
  },
  {
    version: "v1.9.5",
    date: "2026-03-30",
    summary: [
      "학급 빙고 학생 보드에서 현재 호출 단어를 wordId뿐 아니라 실제 영어 단어 텍스트 기준으로도 판정하도록 보강해, sixth처럼 맞는 단어를 눌러도 막히던 문제를 해결했습니다.",
      "학생 보드에서는 현재 호출 단어가 색으로 드러나지 않도록 강조 스타일을 제거하고, 학생이 직접 읽고 찾는 흐름만 남겼습니다.",
    ],
  },
  {
    version: "v1.9.4",
    date: "2026-03-30",
    summary: [
      "학생 빙고 보드에서 체크된 카드가 더 잘 보이도록 진한 외곽선, 배경 강조, 체크 완료 배지를 추가했습니다.",
      "이미 누른 빙고 칸을 수업 중에도 한눈에 구분할 수 있도록 표시 대비를 높였습니다.",
    ],
  },
  {
    version: "v1.9.3",
    date: "2026-03-30",
    summary: [
      "학급 빙고에서 학생 체크 저장이 계속 권한 오류에 막히던 문제를 해결하기 위해 Firestore rules를 실제 플레이 흐름 기준으로 더 단순하게 조정했습니다.",
      "학생 보드 체크는 유지하되, 세션 참여 학생이 현재 보드를 계속 누를 수 있도록 ready 상태 업데이트 검증을 안정화했습니다.",
    ],
  },
  {
    version: "v1.9.2",
    date: "2026-03-30",
    summary: [
      "학급 빙고에서 학생이 현재 부른 단어를 체크할 때 Firestore 권한 오류가 나던 저장 흐름을 실제 학생 클릭 payload에 맞게 바로잡았습니다.",
      "학생 빙고 화면의 입력과 칸 찾기 보조 UI를 제거하고, 이제 보드의 해당 칸을 직접 클릭하는 흐름만 남겼습니다.",
    ],
  },
  {
    version: "v1.9.1",
    date: "2026-03-30",
    summary: [
      "말하기 연습에서 오답과 음성 인식 실패를 합산해 3번 실패하면 다음 단어로 넘어갈 수 있게 정리했습니다.",
      "진행 팁 문구를 실제 수업 흐름에 맞게 다듬고, 학생 홈 화면의 활동 버튼 문구와 순서를 더 간결하게 정리했습니다.",
    ],
  },
  {
    version: "v1.9.0",
    date: "2026-03-29",
    summary: [
      "학급 빙고를 여러 단원을 함께 선택해 시작할 수 있게 바꾸고, 사용 단어 수와 빙고판 크기를 교사 화면에서 바로 확인할 수 있습니다.",
      "학생은 1분 안에 영단어 카드를 직접 빙고판에 배치하고, 시간이 지나면 남은 칸만 자동으로 채워진 뒤 플레이를 시작합니다.",
      "빙고 참여 안내와 보드 확정 흐름을 정리해 수업 중 실제 배치와 체크 단계가 더 분명해졌습니다.",
    ],
  },
  {
    version: "v1.8.1",
    date: "2026-03-29",
    summary: [
      "단어 낚시 시작 버튼을 눌렀을 때 즉시 게임 플레이 화면으로 넘어가도록 TTS 상태 리셋 흐름을 바로잡았습니다.",
      "TTS 훅 반환값을 안정화해서 같은 원인으로 화면이 다시 ready 상태로 되돌아가는 회귀를 막았습니다.",
    ],
  },
  {
    version: "v1.8.0",
    date: "2026-03-29",
    summary: [
      "학생 모드에 단어 낚시 게임을 추가해 TTS로 읽어주는 영어를 듣고 떠다니는 뜻 카드를 눌러 반응 속도를 겨룰 수 있습니다.",
      "단어 낚시는 문제당 10초, 총 10문제로 진행되고 학생 화면의 버튼은 단어 짝 맞추기와 학급 빙고 게임 사이에 배치했습니다.",
    ],
  },
  {
    version: "v1.7.1",
    date: "2026-03-28",
    summary: [
      "교사 빙고 호스트 화면의 세션 코드를 누르면 학생에게 보여주기 쉬운 큰 팝업으로 표시됩니다.",
      "단어 호출 기록을 Firestore 배열에 저장할 때 생기던 timestamp 저장 오류를 바로잡아, 학생이 아직 없어도 랜덤 뽑기와 TTS 호출이 정상 동작하게 했습니다.",
    ],
  },
  {
    version: "v1.7.0",
    date: "2026-03-28",
    summary: [
      "학급 빙고 게임을 학생 화면과 교사 화면에 연결해 수업용 실시간 참여 흐름을 추가했습니다.",
      "교사가 직접 고르거나 TTS와 랜덤 뽑기로 부른 단어도 학생이 빙고판 칸을 직접 눌러야만 체크되도록 고정했습니다.",
      "빙고 승리 기준을 3빙고로 두고, 교사가 종료하기 전까지 4빙고와 5빙고도 계속 이어갈 수 있게 했습니다.",
    ],
  },
  {
    version: "v1.6.1",
    date: "2026-03-26",
    summary: [
      "학생 학교 검색과 추천이 이제 실제 공개 단어세트가 있는 학교만 기준으로 보이도록 정리했습니다.",
      "개발 중 남은 테스트 학교 문서가 학생 검색 결과에 섞이지 않도록 학교 노출 기준을 통일했습니다.",
    ],
  },
  {
    version: "v1.6.0",
    date: "2026-03-26",
    summary: [
      "교사 모드에서 단어 추가, 수정, 삭제를 하면 자동 저장 상태를 보면서 바로 반영할 수 있습니다.",
      "단원 선택을 저장된 단원 드롭다운과 새 단원 만들기 흐름으로 바꾸고, 말하기 퀴즈는 3회 실패 또는 인식 실패 누적 시 다음 문제로 넘어갈 수 있게 했습니다.",
      "짝 맞추기 리더보드에 우리학교 전체 TOP 20 탭을 추가하고 학생 화면의 교사용 편집 버튼은 정리했습니다.",
    ],
  },
  {
    version: "v1.5.0",
    date: "2026-03-25",
    summary: [
      "듣기, 말하기, 짝 맞추기 활동 결과를 학생별 개인 최고 기록으로 저장할 수 있습니다.",
      "첫 도전, 듣기 스타, 말하기 용기상, 짝 맞추기 스피드왕, 꾸준한 연습왕 배지를 공통 보상으로 추가했습니다.",
      "같은 학생 이름을 세 활동에서 함께 이어 쓰도록 공통 학생 이름 흐름을 연결했습니다.",
    ],
  },
  {
    version: "v1.4.3",
    date: "2026-03-24",
    summary: [
      "교사 리더보드 이름 수정과 기록 삭제가 여러 기간을 함께 처리할 때도 안정적으로 동작하도록 트랜잭션 흐름을 바로잡았습니다.",
      "주간, 월간, 연간 기록을 한 번에 읽은 뒤 반영하도록 정리해 Firestore transaction 오류를 제거했습니다.",
    ],
  },
  {
    version: "v1.4.2",
    date: "2026-03-24",
    summary: [
      "교사 화면에서 현재 학년의 주간, 월간, 연간 리더보드를 직접 관리할 수 있습니다.",
      "학생 이름 수정과 기록 삭제를 교사 전용 확인 흐름으로 묶었습니다.",
    ],
  },
  {
    version: "v1.4.1",
    date: "2026-03-24",
    summary: [
      "매칭 리더보드 읽기와 저장 권한 규칙을 실제 브라우저 요청에 맞게 바로잡았습니다.",
      "점수 저장 중 발생하던 Missing or insufficient permissions 오류를 줄이도록 리더보드 rules를 조정했습니다.",
    ],
  },
  {
    version: "v1.4.0",
    date: "2026-03-24",
    summary: [
      "매칭 게임 완료 화면에서 학교와 학년 기준 리더보드를 바로 확인할 수 있습니다.",
      "학생 이름으로 점수를 저장하면 주간, 월간, 연간 탭이 즉시 새 기록으로 갱신됩니다.",
      "같은 이름의 기존 기록이 더 높으면 친절한 안내와 함께 기존 최고 점수를 유지합니다.",
    ],
  },
  {
    version: "v1.3.1",
    date: "2026-03-23",
    summary: [
      "엑셀 일괄 등록 카드에서도 같은 학년 출판사를 바로 선택할 수 있게 했습니다.",
      "출판사 카드 검색에 우리 학교 결과도 함께 표시해 비교와 점검이 쉬워졌습니다.",
    ],
  },
  {
    version: "v1.3.0",
    date: "2026-03-23",
    summary: [
      "교사 화면에 학년별 출판사 선택을 추가했습니다.",
      "엑셀 등록 아래에서 다른 학교 공개 단어카드를 출판사 기준으로 복사할 수 있습니다.",
      "교사 관리 화면의 단원 등록 섹션 순서를 새 흐름에 맞게 정리했습니다.",
    ],
  },
  {
    version: "v1.2.17",
    date: "2026-03-21",
    summary: [
      "선생님 프로필 수정 화면에 삭제 버튼과 확인 경고를 추가했습니다.",
    ],
  },
  {
    version: "v1.2.16",
    date: "2026-03-21",
    summary: [
      "학교 이름 수정 시 권한 오류가 나던 저장 흐름을 바로잡았습니다.",
    ],
  },
  {
    version: "v1.2.15",
    date: "2026-03-21",
    summary: [
      "업데이트 기록의 버전과 날짜 사이 간격을 더 읽기 좋게 정리했습니다.",
    ],
  },
  {
    version: "v1.2.14",
    date: "2026-03-21",
    summary: [
      "상단 버전 옆에 update info 버튼을 추가했습니다.",
      "v1.0.0부터의 업데이트 기록을 모달로 바로 확인할 수 있습니다.",
      "보이는 버전과 이력을 한 곳에서 함께 관리하도록 정리했습니다.",
    ],
  },
  {
    version: "v1.2.13",
    date: "2026-03-21",
    summary: [
      "인기 학교 5개를 먼저 보여줍니다.",
      "선생님 1명 학교는 자동 선택합니다.",
      "교사 정보 수정과 파일 초기화를 다듬었습니다.",
    ],
  },
  {
    version: "v1.2.8",
    date: "2026-03-20",
    summary: [
      "엑셀 가져오기 후 파일을 바로 초기화합니다.",
      "단원 병합과 재불러오기를 안정화했습니다.",
    ],
  },
  // Intentional gap: no shipped release entries were assigned for v1.2.9-v1.2.12
  // in the current repo state, so they are not represented here.
  {
    version: "v1.2.7",
    date: "2026-03-15",
    summary: ["매칭 게임 전환 중 페이드 타이밍을 자연스럽게 다듬었습니다."],
  },
  {
    version: "v1.2.6",
    date: "2026-03-15",
    summary: ["매칭 게임 완료 흐름에서 끊기는 부분을 수정했습니다."],
  },
  {
    version: "v1.2.5",
    date: "2026-03-15",
    summary: ["페이드 애니메이션 중에도 매칭 플레이를 이어갈 수 있게 했습니다."],
  },
  {
    version: "v1.2.3",
    date: "2026-03-15",
    summary: ["정답 카드 성공 연출을 더 또렷하게 했습니다."],
  },
  {
    version: "v1.2.2",
    date: "2026-03-15",
    summary: ["결과 화면의 다시 보기와 다음 행동 흐름을 정리했습니다."],
  },
  {
    version: "v1.2.1",
    date: "2026-03-15",
    summary: ["매칭 게임의 조작감과 테마를 한층 더 다듬었습니다."],
  },
  {
    version: "v1.2.0",
    date: "2026-03-15",
    summary: ["단어 매칭 게임 모드를 새로 추가했습니다."],
  },
  {
    version: "v1.0.2",
    date: "2026-03-14",
    summary: ["축하 음성을 더해 학습 마무리 감도를 높였습니다."],
  },
  {
    version: "v1.0.1",
    date: "2026-03-14",
    summary: ["Safari의 음성 인식 감지와 동작을 보완했습니다."],
  },
  {
    version: "v1.0.0",
    date: "2026-03-14",
    summary: [
      "가져오기 확인과 음성 동작을 안정화했습니다.",
      "기본 수업 흐름을 처음 공개했습니다.",
    ],
  },
];

assertAppUpdatesOrdered(APP_UPDATES);

// The first entry is the current release and therefore the app version.
export const APP_VERSION = APP_UPDATES[0].version;
