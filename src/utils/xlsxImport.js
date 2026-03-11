function normalizeHeader(header) {
  return String(header ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function readCell(row, keys) {
  for (const key of keys) {
    const match = Object.keys(row).find(
      (candidate) => normalizeHeader(candidate) === normalizeHeader(key),
    );
    if (match) {
      return row[match];
    }
  }

  return "";
}

export async function parseVocabularyWorkbook(file) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("엑셀 파일에서 시트를 찾지 못했습니다.");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const grouped = new Map();

  rows.forEach((row) => {
    const unit = String(readCell(row, ["Lesson", "Unit"])).trim();
    const word = String(readCell(row, ["English", "Word"])).trim();
    const meaning = String(readCell(row, ["Korean", "Meaning"])).trim();
    const imageHint = String(readCell(row, ["ImageHint", "Hint"])).trim();
    const exampleSentence = String(
      readCell(row, ["ExampleSentence", "Sentence", "Example"]),
    ).trim();

    if (!unit || !word || !meaning) {
      return;
    }

    const nextItems = grouped.get(unit) ?? [];
    nextItems.push({
      word,
      meaning,
      imageHint,
      exampleSentence,
    });
    grouped.set(unit, nextItems);
  });

  if (grouped.size === 0) {
    throw new Error("지원되는 열(Lesson, English, Korean)을 가진 단어가 없습니다.");
  }

  return Array.from(grouped.entries()).map(([unit, items]) => ({
    unit,
    items,
  }));
}
