import { readSheet as readBrowserSheet } from "read-excel-file/browser";

export const MAX_VOCABULARY_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_VOCABULARY_IMPORT_ROWS = 5_000;

const HEADER_ALIASES = {
  unit: ["Lesson", "Unit", "단원", "레슨"],
  word: ["English", "Word", "영어", "영단어", "단어"],
  meaning: ["Korean", "Meaning", "뜻", "의미", "한국어", "해석"],
  imageHint: ["ImageHint", "Hint", "이미지힌트", "이미지 힌트", "힌트"],
  exampleSentence: [
    "ExampleSentence",
    "Sentence",
    "Example",
    "예문",
    "예시문장",
    "문장",
  ],
};

function normalizeHeader(header) {
  return String(header ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function normalizeCell(value) {
  return String(value ?? "").trim();
}

function getFileExtension(file) {
  const fileName = String(file?.name ?? "").trim();
  const extensionMatch = fileName.match(/\.[^.]+$/);

  return extensionMatch ? extensionMatch[0].toLowerCase() : "";
}

function findColumnIndex(headers, aliases) {
  const normalizedAliases = new Set(aliases.map(normalizeHeader));
  return headers.findIndex((header) => normalizedAliases.has(normalizeHeader(header)));
}

function getRequiredColumns(headers) {
  const columns = {
    unit: findColumnIndex(headers, HEADER_ALIASES.unit),
    word: findColumnIndex(headers, HEADER_ALIASES.word),
    meaning: findColumnIndex(headers, HEADER_ALIASES.meaning),
    imageHint: findColumnIndex(headers, HEADER_ALIASES.imageHint),
    exampleSentence: findColumnIndex(headers, HEADER_ALIASES.exampleSentence),
  };

  const missing = [
    ["Lesson/Unit", columns.unit],
    ["English/Word", columns.word],
    ["Korean/Meaning", columns.meaning],
  ]
    .filter(([, index]) => index < 0)
    .map(([label]) => label);

  if (missing.length > 0) {
    throw new Error(
      `필수 열(${missing.join(", ")})을 찾지 못했습니다. 첫 행의 열 이름을 확인하세요.`,
    );
  }

  return columns;
}

function getCell(row, columnIndex) {
  return columnIndex < 0 ? "" : normalizeCell(row[columnIndex]);
}

function isBlankRow(row) {
  return row.every((value) => !normalizeCell(value));
}

function getMissingRequiredFields(item) {
  return [
    ["Lesson/Unit", item.unit],
    ["English/Word", item.word],
    ["Korean/Meaning", item.meaning],
  ]
    .filter(([, value]) => !value)
    .map(([label]) => label);
}

export async function parseVocabularyWorkbook(file, { readSheet = readBrowserSheet } = {}) {
  if (!file) {
    throw new Error("업로드할 엑셀 파일을 선택하세요.");
  }

  const extension = getFileExtension(file);
  if (extension !== ".xlsx") {
    throw new Error(
      "이 파일은 지원하지 않습니다. Excel에서 파일을 다시 열어 .xlsx 형식으로 저장한 뒤 업로드하세요.",
    );
  }

  if (Number(file.size) > MAX_VOCABULARY_IMPORT_BYTES) {
    throw new Error("엑셀 파일은 5 MiB 이하만 업로드할 수 있습니다.");
  }

  let rows;
  try {
    // readSheet defaults to the first worksheet, matching the existing import behavior.
    rows = await readSheet(file);
  } catch {
    throw new Error(
      "엑셀 파일을 읽지 못했습니다. 파일이 손상되었거나 올바른 .xlsx 형식이 아닙니다. Excel에서 다시 열어 .xlsx 형식으로 저장한 뒤 업로드하세요.",
    );
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("엑셀 파일에서 첫 번째 시트를 읽지 못했습니다.");
  }

  const headers = rows[0];
  if (!Array.isArray(headers)) {
    throw new Error("엑셀 파일의 첫 행에서 열 이름을 읽지 못했습니다.");
  }

  const dataRows = rows.slice(1);
  if (dataRows.length > MAX_VOCABULARY_IMPORT_ROWS) {
    throw new Error("엑셀 파일은 단어 행을 최대 5,000개까지 가져올 수 있습니다.");
  }

  const columns = getRequiredColumns(headers);
  const itemsByUnit = new Map();
  let rowCount = 0;

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (!Array.isArray(row)) {
      throw new Error(`${rowNumber}행의 형식이 올바르지 않습니다.`);
    }

    if (isBlankRow(row)) {
      return;
    }

    const item = {
      unit: getCell(row, columns.unit),
      word: getCell(row, columns.word),
      meaning: getCell(row, columns.meaning),
      imageHint: getCell(row, columns.imageHint),
      exampleSentence: getCell(row, columns.exampleSentence),
    };
    const missing = getMissingRequiredFields(item);

    if (missing.length > 0) {
      throw new Error(
        `${rowNumber}행의 필수 열(${missing.join(", ")})이 비어 있습니다. 값을 채운 뒤 다시 업로드하세요.`,
      );
    }

    const unitItems = itemsByUnit.get(item.unit) ?? [];
    unitItems.push({
      word: item.word,
      meaning: item.meaning,
      imageHint: item.imageHint,
      exampleSentence: item.exampleSentence,
    });
    itemsByUnit.set(item.unit, unitItems);
    rowCount += 1;
  });

  if (rowCount === 0) {
    throw new Error("첫 번째 시트에 가져올 단어 행이 없습니다.");
  }

  return {
    units: Array.from(itemsByUnit, ([unit, items]) => ({ unit, items })),
    rowCount,
  };
}
