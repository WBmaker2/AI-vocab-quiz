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
