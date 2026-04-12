import { spawnSync } from "node:child_process";
import path from "node:path";

const projectRoot = process.cwd();
const testFilePath = path.resolve(projectRoot, "tests/firestore.rules.test.js");
const HOMEBREW_JAVA_CANDIDATES = [
  "/opt/homebrew/opt/openjdk/bin/java",
  "/usr/local/opt/openjdk/bin/java",
];

function exitWithChildStatus(result) {
  if (typeof result.status === "number") {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }

  process.exit(1);
}

function resolveJavaCommand() {
  const systemJavaCheck = spawnSync("java", ["-version"], {
    stdio: "ignore",
  });

  if (systemJavaCheck.status === 0) {
    return {
      javaCommand: "java",
      extraPathEntries: [],
    };
  }

  for (const javaPath of HOMEBREW_JAVA_CANDIDATES) {
    const javaCheck = spawnSync(javaPath, ["-version"], {
      stdio: "ignore",
    });

    if (javaCheck.status === 0) {
      return {
        javaCommand: javaPath,
        extraPathEntries: [path.dirname(javaPath)],
      };
    }
  }

  return null;
}

if (process.env.FIRESTORE_EMULATOR_HOST) {
  const result = spawnSync(process.execPath, ["--test", testFilePath], {
    stdio: "inherit",
  });

  exitWithChildStatus(result);
}

const javaRuntime = resolveJavaCommand();

if (!javaRuntime) {
  console.error(
    "Java runtime is required for Firestore emulator tests. Install Java, then rerun `npm run test:rules`.",
  );
  process.exit(1);
}

const firebaseCliPath = path.resolve(
  projectRoot,
  "node_modules",
  "firebase-tools",
  "lib",
  "bin",
  "firebase.js",
);

const command = `${JSON.stringify(process.execPath)} --test ${JSON.stringify(testFilePath)}`;
const result = spawnSync(
  process.execPath,
  [
    firebaseCliPath,
    "emulators:exec",
    "--only",
    "firestore",
    "--project",
    "talking-vocab-quiz-rules",
    command,
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      JAVA_HOME:
        javaRuntime.javaCommand === "java"
          ? process.env.JAVA_HOME
          : path.resolve(
              path.dirname(javaRuntime.javaCommand),
              "..",
            ),
      PATH: [
        ...javaRuntime.extraPathEntries,
        process.env.PATH ?? "",
      ]
        .filter(Boolean)
        .join(":"),
    },
  },
);

exitWithChildStatus(result);
