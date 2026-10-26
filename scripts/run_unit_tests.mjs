import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const searchRoots = ["src", "tests"];
const excludedFiles = new Set([
  path.resolve(projectRoot, "tests/firestore.rules.test.js"),
]);

async function collectTestFiles(directory) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) {
        continue;
      }

      files.push(...await collectTestFiles(entryPath));
      continue;
    }

    if (
      entry.isFile() &&
      entry.name.endsWith(".test.js") &&
      !excludedFiles.has(path.resolve(entryPath))
    ) {
      files.push(entryPath);
    }
  }

  return files;
}

const testFiles = (
  await Promise.all(
    searchRoots.map((root) => collectTestFiles(path.resolve(projectRoot, root))),
  )
).flat().sort();

if (testFiles.length === 0) {
  console.error("No unit test files found.");
  process.exit(1);
}

console.log(`Running ${testFiles.length} unit test files...`);

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  stdio: "inherit",
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

if (result.error) {
  throw result.error;
}

process.exit(1);
