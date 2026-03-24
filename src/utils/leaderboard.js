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
];

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
  };
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
