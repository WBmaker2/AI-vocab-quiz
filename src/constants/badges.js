export const BADGE_DEFINITIONS = Object.freeze({
  first_challenge: Object.freeze({
    label: "첫 도전",
    description: "첫 활동을 완료했어요.",
    criteria: Object.freeze({
      type: "first_session",
    }),
  }),
  listening_star: Object.freeze({
    label: "듣기 스타",
    description: "듣기 퀴즈에서 높은 점수를 달성했어요.",
    criteria: Object.freeze({
      type: "new_best",
      activityType: "listening",
    }),
  }),
  speaking_bravery: Object.freeze({
    label: "말하기 용기상",
    description: "말하기 연습을 끝까지 완료했어요.",
    criteria: Object.freeze({
      type: "completion",
      activityType: "speaking",
    }),
  }),
  matching_speed: Object.freeze({
    label: "짝 맞추기 스피드왕",
    description: "짝 맞추기를 빠르게 완료했어요.",
    criteria: Object.freeze({
      type: "time_limit",
      activityType: "matching",
      maxSeconds: 45,
    }),
  }),
  practice_keeper: Object.freeze({
    label: "꾸준한 연습왕",
    description: "여러 번 반복해서 연습했어요.",
    criteria: Object.freeze({
      type: "session_count",
      minSessions: 3,
    }),
  }),
});

export const BADGE_IDS = Object.freeze(Object.keys(BADGE_DEFINITIONS));
export const SHIPPING_BADGE_IDS = BADGE_IDS;
