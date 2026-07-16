export function normalizeBingoRank(value) {
  if (value == null || (typeof value === "string" && value.trim() === "")) {
    return null;
  }

  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const rank = Number(value);

  return Number.isSafeInteger(rank) && rank > 0 ? rank : null;
}

function normalizeCompletedLineKeys(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

export function mergeBingoCompletedLineKeys(previousKeys, completedKeys) {
  const preservedKeys = normalizeCompletedLineKeys(previousKeys);
  const preservedKeySet = new Set(preservedKeys);
  const newlyCompletedKeys = normalizeCompletedLineKeys(completedKeys).filter(
    (key) => !preservedKeySet.has(key),
  );

  return [...preservedKeys, ...newlyCompletedKeys];
}
