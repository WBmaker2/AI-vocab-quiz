const HOME_LAYOUT = {
  heroVariant: "full",
  showSupportNotice: true,
  eyebrow: "Elementary English Classroom App",
  title: "AI 원어민 단어 퀴즈 쇼",
  subtitle:
    "오늘의 단어를 불러오면 듣기·말하기·게임 활동을 바로 시작할 수 있습니다.",
  focusLabel: "학생 활동 선택",
};

const COMPACT_LAYOUTS = {
  teacher: {
    eyebrow: "Teacher Workspace",
    title: "교사 관리",
    subtitle: "단어 세트와 수업 활동을 준비하세요.",
    focusLabel: "교사 관리 화면",
  },
  listening: {
    eyebrow: "Listening Quiz",
    title: "듣기 퀴즈",
    subtitle: "소리를 듣고 알맞은 뜻을 골라보세요.",
    focusLabel: "듣기 퀴즈 화면",
  },
  speaking: {
    eyebrow: "Speaking Practice",
    title: "말하기 연습",
    subtitle: "영어 단어를 듣고 또렷하게 말해보세요.",
    focusLabel: "말하기 연습 화면",
  },
  matching: {
    eyebrow: "Word Matching",
    title: "단어 짝 맞추기",
    subtitle: "영단어와 뜻을 빠르게 연결해보세요.",
    focusLabel: "단어 짝 맞추기 화면",
  },
  fishing: {
    eyebrow: "Word Fishing",
    title: "단어 낚시",
    subtitle: "소리를 듣고 알맞은 뜻 카드를 낚아보세요.",
    focusLabel: "단어 낚시 화면",
  },
  typing: {
    eyebrow: "Word Typing",
    title: "영어 단어 타자",
    subtitle: "뜻을 보고 영어 단어를 정확하게 입력해보세요.",
    focusLabel: "영어 단어 타자 화면",
  },
  "bingo-host": {
    eyebrow: "Class Bingo Host",
    title: "학급 빙고 진행",
    subtitle: "단어를 부르고 학생들의 빙고 현황을 확인하세요.",
    focusLabel: "학급 빙고 진행 화면",
  },
  "bingo-join": {
    eyebrow: "Class Bingo",
    title: "빙고 참여",
    subtitle: "참여 코드를 입력하고 학급 빙고에 들어가세요.",
    focusLabel: "빙고 참여 화면",
  },
  "bingo-board": {
    eyebrow: "Class Bingo",
    title: "빙고 보드",
    subtitle: "불린 단어를 확인하며 빙고판을 완성하세요.",
    focusLabel: "빙고 보드 화면",
  },
};

export function getAppChromeLayout(view) {
  const compactLayout = COMPACT_LAYOUTS[view];
  if (!compactLayout) {
    return { ...HOME_LAYOUT };
  }

  return {
    ...compactLayout,
    heroVariant: "compact",
    showSupportNotice: false,
  };
}
