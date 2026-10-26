import { chromium } from "playwright";
import { createServer } from "vite";

const REQUIRED_UI_TIMEOUT_MS = 10000;
const RESTRICTED_LAUNCH_ARGS = Object.freeze([
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--single-process",
  "--no-zygote",
  "--disable-crash-reporter",
  "--disable-hang-monitor",
]);

function getLaunchOptions() {
  const restricted =
    process.env.PLAYWRIGHT_RESTRICTED_ENV === "1" ||
    process.env.CI === "true";

  return {
    headless: true,
    ...(restricted ? { args: RESTRICTED_LAUNCH_ARGS } : {}),
  };
}

function formatError(error) {
  return error instanceof Error ? error.stack ?? error.message : String(error);
}

function isIgnorableConsoleError(text) {
  return /favicon\.ico|Failed to load resource/i.test(text);
}

async function runCase(baseUrl, { name, game, action }) {
  const browser = await chromium.launch(getLaunchOptions());
  const page = await browser.newPage();
  const diagnostics = [];

  page.on("pageerror", (error) => {
    diagnostics.push(`pageerror: ${formatError(error)}`);
  });
  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    const text = message.text();
    if (!isIgnorableConsoleError(text)) {
      diagnostics.push(`console: ${text}`);
    }
  });

  try {
    await page.goto(`${baseUrl}/tests/game-smoke.html?game=${game}`, {
      timeout: REQUIRED_UI_TIMEOUT_MS,
      waitUntil: "domcontentloaded",
    });
    await action(page);

    if (diagnostics.length > 0) {
      throw new Error(`Critical browser diagnostics detected:\n${diagnostics.join("\n")}`);
    }

    console.log(`game component smoke: ${name}: ok`);
  } catch (error) {
    const diagnosticText =
      diagnostics.length > 0 ? `\n${diagnostics.join("\n")}` : "";
    throw new Error(`${formatError(error)}${diagnosticText}`);
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function run() {
  const server = await createServer({
    server: {
      host: "127.0.0.1",
      port: 0,
    },
    logLevel: "silent",
  });
  try {
    await server.listen();
    const address = server.httpServer.address();
    const port = typeof address === "object" && address ? address.port : 0;

    if (!port) {
      throw new Error("Could not determine the Vite dev server port.");
    }

    const baseUrl = `http://127.0.0.1:${port}`;
    const failures = [];

    const cases = [
      {
        name: "fishing",
        game: "fishing",
        action: async (page) => {
          await page.getByText("단어 낚시", { exact: false }).waitFor({
            state: "visible",
            timeout: REQUIRED_UI_TIMEOUT_MS,
          });
          await page.getByRole("button", { name: "게임 시작" }).click();
          await page.getByText("지금 읽은 영어 단어", { exact: false }).waitFor({
            state: "visible",
            timeout: REQUIRED_UI_TIMEOUT_MS,
          });
          const candidateCount = await page.locator(".word-fishing-card").count();

          if (candidateCount < 2) {
            throw new Error(`Expected fishing candidates, found ${candidateCount}.`);
          }
        },
      },
      {
        name: "typing",
        game: "typing",
        action: async (page) => {
          await page.getByText("영어 단어 타자 게임", { exact: false }).waitFor({
            state: "visible",
            timeout: REQUIRED_UI_TIMEOUT_MS,
          });
          await page.getByRole("button", { name: "게임 시작" }).click();
          const input = page.getByPlaceholder("영어 단어를 입력하세요");
          await input.waitFor({
            state: "visible",
            timeout: REQUIRED_UI_TIMEOUT_MS,
          });
          await input.fill("apple");
          await page.getByRole("button", { name: "입력 완료" }).click();
          await page.getByText("정답입니다!", { exact: false }).waitFor({
            state: "visible",
            timeout: REQUIRED_UI_TIMEOUT_MS,
          });
        },
      },
    ];

    for (const testCase of cases) {
      try {
        await runCase(baseUrl, testCase);
      } catch (error) {
        failures.push(`${testCase.name}: ${formatError(error)}`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Game component smoke failed:\n${failures.join("\n\n")}`);
    }

    console.log("game component smoke: ok");
  } finally {
    await server.close();
  }
}

run().catch((error) => {
  console.error("game component smoke: failed");
  console.error(error);
  process.exitCode = 1;
});
