const LEADERBOARD_TIME_ZONE = "Asia/Seoul";
const LEADERBOARD_WEEKDAY_MS = 7 * 24 * 60 * 60 * 1000;

export const LEADERBOARD_PERIOD_DEFINITIONS = [
  {
    type: "week",
    label: "이 주의 영단어 왕",
  },
  {
    type: "month",
    label: "이 달의 영단어 왕",
  },
  {
    type: "year",
    label: "올해의 영단어 왕",
  },
  {
    type: "school_all",
    label: "우리학교 단어 왕",
  },
];

function toMillis(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (value.seconds != null) {
    return Number(value.seconds) * 1000;
  }

  return 0;
}

function getKoreanCalendarParts(now) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: LEADERBOARD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now).reduce((result, part) => {
    if (part.type !== "literal") {
      result[part.type] = part.value;
    }

    return result;
  }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function createIsoWeekKey({ year, month, day }) {
  const normalizedDate = new Date(Date.UTC(year, month - 1, day));
  const weekdayOffset = (normalizedDate.getUTCDay() + 6) % 7;
  normalizedDate.setUTCDate(normalizedDate.getUTCDate() - weekdayOffset + 3);

  const isoYear = normalizedDate.getUTCFullYear();
  const firstWeekThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstWeekOffset = (firstWeekThursday.getUTCDay() + 6) % 7;
  firstWeekThursday.setUTCDate(firstWeekThursday.getUTCDate() - firstWeekOffset + 3);

  const weekNumber = 1 + Math.round((normalizedDate - firstWeekThursday) / LEADERBOARD_WEEKDAY_MS);

  return `${isoYear}-W${String(weekNumber).padStart(2, "0")}`;
}

export function createLeaderboardPeriodKeys(now = new Date()) {
  const { year, month, day } = getKoreanCalendarParts(now);

  return {
    week: createIsoWeekKey({ year, month, day }),
    month: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`,
    year: String(year),
    school_all: "all-time",
  };
}

export function createMatchingLeaderboardGradeScope(periodType, grade) {
  if (String(periodType ?? "").trim() === "school_all") {
    return "all";
  }

  return String(grade ?? "").trim();
}

export function pickBetterMatchingLeaderboardEntry(left, right) {
  if (!left) {
    return right ?? null;
  }

  if (!right) {
    return left;
  }

  const leftScore = Number(left.score ?? 0);
  const rightScore = Number(right.score ?? 0);

  if (leftScore !== rightScore) {
    return rightScore > leftScore ? right : left;
  }

  const leftElapsed = Number(left.elapsedSeconds ?? Number.POSITIVE_INFINITY);
  const rightElapsed = Number(right.elapsedSeconds ?? Number.POSITIVE_INFINITY);

  if (leftElapsed !== rightElapsed) {
    return rightElapsed < leftElapsed ? right : left;
  }

  const leftUpdatedAt = toMillis(left.updatedAt) || toMillis(left.createdAt);
  const rightUpdatedAt = toMillis(right.updatedAt) || toMillis(right.createdAt);

  if (leftUpdatedAt !== rightUpdatedAt) {
    return rightUpdatedAt > leftUpdatedAt ? right : left;
  }

  return left;
}

export function normalizeStudentName(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeStudentNameKey(value) {
  return normalizeStudentName(value)
    .toLowerCase()
    .replaceAll("/", "_")
    .replaceAll("__", "_");
}

export function createMatchingLeaderboardScopeKey({
  schoolId,
  grade,
  periodType,
  periodKey,
}) {
  return [
    String(schoolId ?? "").trim(),
    String(grade ?? "").trim(),
    String(periodType ?? "").trim(),
    String(periodKey ?? "").trim(),
  ].join("__");
}

export function createMatchingLeaderboardId({
  schoolId,
  grade,
  periodType,
  periodKey,
  studentName,
}) {
  return `${createMatchingLeaderboardScopeKey({
    schoolId,
    grade,
    periodType,
    periodKey,
  })}__${normalizeStudentNameKey(studentName)}`;
}

export function pickBetterLeaderboardEntry(left, right) {
  return pickBetterMatchingLeaderboardEntry(left, right);
}
