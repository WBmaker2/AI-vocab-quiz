export const WORD_MISS_TOP_LIMIT = 10;

function normalizeMissKey(word) {
  return String(word ?? "").trim().toLowerCase();
}

export function aggregateWordMissReports(reports, limit = WORD_MISS_TOP_LIMIT) {
  const byWord = new Map();

  for (const report of Array.isArray(reports) ? reports : []) {
    const key = normalizeMissKey(report?.word);

    if (!key) {
      continue;
    }

    const entry = byWord.get(key) ?? {
      word: String(report?.word ?? "").trim(),
      meaning: String(report?.meaning ?? "").trim(),
      count: 0,
    };
    entry.count += 1;

    if (!entry.meaning && report?.meaning) {
      entry.meaning = String(report.meaning).trim();
    }

    byWord.set(key, entry);
  }

  const ranked = Array.from(byWord.values());
  ranked.sort((left, right) => right.count - left.count || left.word.localeCompare(right.word));
  const safeLimit = Math.max(1, Number(limit) || WORD_MISS_TOP_LIMIT);
  return ranked.slice(0, safeLimit);
}

export function filterWordMissReports(reports, { grade = "", activityType = "" } = {}) {
  return (Array.isArray(reports) ? reports : []).filter((report) => {
    if (grade && String(report?.grade ?? "") !== grade) {
      return false;
    }

    if (activityType && String(report?.activityType ?? "") !== activityType) {
      return false;
    }

    return true;
  });
}
