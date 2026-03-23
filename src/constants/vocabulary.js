export const GRADE_OPTIONS = [
  { value: "3", label: "3학년" },
  { value: "4", label: "4학년" },
  { value: "5", label: "5학년" },
  { value: "6", label: "6학년" },
];

export const PUBLISHER_OPTIONS = [
  "동아출판 윤여범",
  "미래엔 강정진",
  "아이스크림미디어 박유미",
  "와이비엠 김혜리",
  "와이비엠 최희경",
  "천재교과서 함순애",
  "천재교과서 김태은",
  "천재교육 이동환",
  "동아출판 정은숙",
  "비상교육 우길주",
];

export const DEFAULT_TEACHER_SELECTION = {
  grade: "3",
  unit: "1",
};

export const DEFAULT_STUDENT_SELECTION = {
  grade: "3",
  unit: "",
};

export function createDraftVocabularyItem(item, index) {
  return {
    id: crypto.randomUUID(),
    order: index + 1,
    word: item.word?.trim() ?? "",
    meaning: item.meaning?.trim() ?? "",
    imageHint: item.imageHint?.trim() ?? "",
    exampleSentence: item.exampleSentence?.trim() ?? "",
    createdAt: new Date().toISOString(),
  };
}

export function normalizeDraftVocabulary(items) {
  return items.map((item, index) => createDraftVocabularyItem(item, index));
}

export function getUnitsForGrade(catalog, grade) {
  return catalog
    .filter((entry) => entry.grade === grade)
    .map((entry) => entry.unit)
    .sort((left, right) =>
      left.localeCompare(right, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
}

export function formatSetLabel(selection) {
  if (!selection.grade || !selection.unit) {
    return "";
  }

  return `${selection.grade}학년 ${selection.unit}단원`;
}
