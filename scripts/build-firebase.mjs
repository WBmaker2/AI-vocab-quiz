import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const viteBin = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const authDomain = String(
  process.env.FIREBASE_HOSTING_AUTH_DOMAIN || "talking-vocab-quiz.web.app",
).trim();

const result = spawnSync(
  process.execPath,
  [viteBin, "build", "--configLoader", "runner"],
  {
    env: {
      ...process.env,
      VITE_FIREBASE_AUTH_DOMAIN: authDomain,
    },
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
