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
