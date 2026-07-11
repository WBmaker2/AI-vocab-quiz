import test from "node:test";
import assert from "node:assert/strict";
import { parseVocabularyWorkbook } from "./xlsxImport.js";

const MAX_VOCABULARY_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_VOCABULARY_IMPORT_ROWS = 5_000;

function createFile(size = 1024) {
  return new Blob([new Uint8Array(size)]);
}

function createNamedFile(name, size = 1024) {
  const file = createFile(size);
  Object.defineProperty(file, "name", { value: name });
  return file;
}

function createWorkbookRows(dataRows) {
  return [
    ["Lesson", "English", "Korean", "ImageHint", "ExampleSentence"],
    ...dataRows,
  ];
}

function parseRows(rows, onRemoteWrite = () => {}) {
  return parseVocabularyWorkbook(createNamedFile("vocabulary.xlsx"), {
    readSheet: async () => rows,
  });
}

test("accepts a workbook exactly 5 MiB", async () => {
  let readerCalled = false;
  const result = await parseVocabularyWorkbook(
    createNamedFile("vocabulary.xlsx", MAX_VOCABULARY_IMPORT_BYTES),
    {
      readSheet: async () => {
        readerCalled = true;
        return createWorkbookRows([["1", "apple", "사과", "", ""]]);
      },
    },
  );

  assert.equal(readerCalled, true);
  assert.equal(result.rowCount, 1);
});

test("rejects workbook files larger than 5 MiB before reading them", async () => {
  const oversizedFile = createNamedFile(
    "vocabulary.xlsx",
    MAX_VOCABULARY_IMPORT_BYTES + 1,
  );
  const result = await parseVocabularyWorkbook(oversizedFile, {
    readSheet: async () => {
      throw new Error("The reader must not run for an oversized workbook.");
    },
  }).catch((error) => error);

  assert.match(result?.message ?? "", /5\s*MiB/);
});

test("rejects legacy .xls files before invoking the workbook reader", async () => {
  let readerCalled = false;
  const result = await parseVocabularyWorkbook(createNamedFile("vocabulary.xls"), {
    readSheet: async () => {
      readerCalled = true;
      return [];
    },
  }).catch((error) => error);

  assert.match(result?.message ?? "", /Excel.*\.xlsx/);
  assert.equal(readerCalled, false);
});

test("rejects extensionless files before invoking the workbook reader", async () => {
  let readerCalled = false;
  const result = await parseVocabularyWorkbook(createNamedFile("vocabulary"), {
    readSheet: async () => {
      readerCalled = true;
      return [];
    },
  }).catch((error) => error);

  assert.match(result?.message ?? "", /\.xlsx/);
  assert.equal(readerCalled, false);
});

test("rejects non-xlsx extensions before invoking the workbook reader", async () => {
  let readerCalled = false;
  const result = await parseVocabularyWorkbook(createNamedFile("vocabulary.csv"), {
    readSheet: async () => {
      readerCalled = true;
      return [];
    },
  }).catch((error) => error);

  assert.match(result?.message ?? "", /\.xlsx/);
  assert.equal(readerCalled, false);
});

test("accepts workbooks with exactly 5,000 parsed data rows", async () => {
  const result = await parseRows(
    createWorkbookRows(
      Array.from({ length: MAX_VOCABULARY_IMPORT_ROWS }, (_, index) => [
        "1",
        `word-${index + 1}`,
        `뜻-${index + 1}`,
        "",
        "",
      ]),
    ),
  );

  assert.equal(result.rowCount, MAX_VOCABULARY_IMPORT_ROWS);
});

test("rejects workbooks with 5,001 parsed data rows", async () => {
  const result = await parseRows(
    createWorkbookRows(
      Array.from({ length: MAX_VOCABULARY_IMPORT_ROWS + 1 }, (_, index) => [
        "1",
        `word-${index + 1}`,
        `뜻-${index + 1}`,
        "",
        "",
      ]),
    ),
  ).catch((error) => error);

  assert.match(result?.message ?? "", /5,?000/);
});

test("rejects a partially filled vocabulary row instead of silently skipping it", async () => {
  const result = await parseRows(
    createWorkbookRows([
      ["1", "apple", "사과", "fruit", "I eat an apple."],
      ["1", "banana", "", "fruit", ""],
    ]),
  ).catch((error) => error);

  assert.match(result?.message ?? "", /3행.*Korean/);
});

test("merges duplicate unit rows into one complete unit in the import plan", async () => {
  const result = await parseRows(
    createWorkbookRows([
      ["1", "apple", "사과", "fruit", "I eat an apple."],
      ["2", "book", "책", "school", "This is a book."],
      ["1", "banana", "바나나", "fruit", "I eat a banana."],
    ]),
  ).catch(() => null);

  assert.deepEqual(result?.units, [
    {
      unit: "1",
      items: [
        {
          word: "apple",
          meaning: "사과",
          imageHint: "fruit",
          exampleSentence: "I eat an apple.",
        },
        {
          word: "banana",
          meaning: "바나나",
          imageHint: "fruit",
          exampleSentence: "I eat a banana.",
        },
      ],
    },
    {
      unit: "2",
      items: [
        {
          word: "book",
          meaning: "책",
          imageHint: "school",
          exampleSentence: "This is a book.",
        },
      ],
    },
  ]);
});

test("returns a fully validated import plan", async () => {
  const result = await parseRows(
    [
      ["단원", "영어", "뜻", "이미지 힌트", "예문"],
      ["1", "apple", "사과", "fruit", "I eat an apple."],
    ],
  );

  assert.deepEqual(result, {
    units: [
      {
        unit: "1",
        items: [
          {
            word: "apple",
            meaning: "사과",
            imageHint: "fruit",
            exampleSentence: "I eat an apple.",
          },
        ],
      },
    ],
    rowCount: 1,
  });
});

test("wraps workbook reader failures in actionable Korean guidance", async () => {
  const result = await parseVocabularyWorkbook(createNamedFile("broken.xlsx"), {
    readSheet: async () => {
      throw new Error("unexpected zip failure");
    },
  }).catch((error) => error);

  assert.match(result?.message ?? "", /손상.*\.xlsx/);
  assert.doesNotMatch(result?.message ?? "", /unexpected zip failure/);
});
