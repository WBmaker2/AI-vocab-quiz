import { useActivityProgression } from "../progression/useActivityProgression.js";

export function useSpeakingProgression(options) {
  return useActivityProgression({
    activityType: "speaking",
    activityNoun: "말하기",
    extraResult: { completed: true },
    ...options,
  });
}
