import http from "node:http";
import { existsSync, createReadStream } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";

const rootDir = resolve("dist");
const host = "127.0.0.1";
const REQUIRED_UI_TIMEOUT_MS = 10000;
// Only used by isolated CI/local smoke runs when the host restricts Chromium.
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

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

function startStaticServer() {
  const server = http.createServer((request, response) => {
    const urlPath = request.url === "/" ? "/index.html" : request.url;
    const filePath = join(rootDir, urlPath);

    if (!existsSync(filePath)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type":
        contentTypes[extname(filePath)] ?? "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  });

  return new Promise((resolveServer) => {
    server.listen(0, host, () => {
      const address = server.address();
      resolveServer({
        server,
        port: typeof address === "object" && address ? address.port : 0,
      });
    });
  });
}

async function assertVisible(page, text) {
  await page.getByText(text, { exact: false }).waitFor({
    state: "visible",
    timeout: REQUIRED_UI_TIMEOUT_MS,
  });
}

async function assertHidden(page, text) {
  await page.getByText(text, { exact: false }).waitFor({
    state: "hidden",
    timeout: REQUIRED_UI_TIMEOUT_MS,
  });
}

function isRestrictedLaunchEnabled() {
  return (
    process.env.PLAYWRIGHT_RESTRICTED_ENV === "1" ||
    process.env.CI === "true"
  );
}

function getLaunchOptions(restricted = isRestrictedLaunchEnabled()) {
  return {
    headless: true,
    ...(restricted ? { args: RESTRICTED_LAUNCH_ARGS } : {}),
  };
}

function formatError(error) {
  return error instanceof Error ? error.stack ?? error.message : String(error);
}

function isLaunchRestrictionError(error) {
  return /Permission denied \(1100\)|bootstrap_check_in/i.test(formatError(error));
}

async function launchBrowser() {
  const restricted = isRestrictedLaunchEnabled();

  try {
    return await chromium.launch(getLaunchOptions(restricted));
  } catch (error) {
    if (restricted || !isLaunchRestrictionError(error)) {
      throw error;
    }

    console.warn(
      "playwright smoke: retrying Chromium with restricted-environment options after a host permission error",
    );
    return chromium.launch(getLaunchOptions(true));
  }
}

function collectPageDiagnostics(page) {
  const pageErrors = [];
  const requestFailures = [];
  const responseFailures = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error);
  });
  page.on("requestfailed", (request) => {
    requestFailures.push({
      errorText: request.failure()?.errorText ?? "unknown request failure",
      url: request.url(),
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      responseFailures.push({
        status: response.status(),
        url: response.url(),
      });
    }
  });

  return { pageErrors, requestFailures, responseFailures };
}

function assertNoCriticalPageDiagnostics(diagnostics, baseUrl) {
  const localRequestFailures = diagnostics.requestFailures.filter(({ url }) =>
    url.startsWith(baseUrl),
  );
  const localResponseFailures = diagnostics.responseFailures.filter(({ url }) =>
    url.startsWith(baseUrl),
  );
  const messages = diagnostics.pageErrors.map(
    (error) => `pageerror: ${formatError(error)}`,
  );

  messages.push(
    ...localRequestFailures.map(
      ({ errorText, url }) => `requestfailed: ${errorText} (${url})`,
    ),
  );
  messages.push(
    ...localResponseFailures.map(
      ({ status, url }) => `response ${status}: ${url}`,
    ),
  );

  if (messages.length > 0) {
    throw new Error(`Critical browser diagnostics detected:\n${messages.join("\n")}`);
  }
}

async function waitForSmokeReady(page) {
  await Promise.all([
    page.getByText("AI 원어민 단어 퀴즈 쇼", { exact: false }).waitFor({
      state: "visible",
      timeout: REQUIRED_UI_TIMEOUT_MS,
    }),
    page.getByRole("button", { name: "업데이트 내역" }).waitFor({
      state: "visible",
      timeout: REQUIRED_UI_TIMEOUT_MS,
    }),
    page.locator(".app-version").waitFor({
      state: "visible",
      timeout: REQUIRED_UI_TIMEOUT_MS,
    }),
  ]);
}

async function assertNoHorizontalOverflow(page, width, height) {
  await page.setViewportSize({ width, height });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );

  if (overflow > 1) {
    throw new Error(`Horizontal overflow at ${width}px: ${overflow}px`);
  }
}

async function run() {
  let browser;
  let context;
  let server;

  try {
    const startedServer = await startStaticServer();
    server = startedServer.server;
    const baseUrl = `http://${host}:${startedServer.port}`;
    browser = await launchBrowser();
    context = await browser.newContext();
    const page = await context.newPage();
    const diagnostics = collectPageDiagnostics(page);

    const response = await page.goto(baseUrl, {
      timeout: REQUIRED_UI_TIMEOUT_MS,
      waitUntil: "domcontentloaded",
    });
    if (!response || response.status() >= 400) {
      throw new Error(
        `Smoke page failed to load: ${response?.status() ?? "no response"}`,
      );
    }
    await waitForSmokeReady(page);
    assertNoCriticalPageDiagnostics(diagnostics, baseUrl);

    const updateInfoButton = page.getByRole("button", { name: "업데이트 내역" });
    const currentVersion = (await page.locator(".app-version").textContent())?.trim();

    if (!currentVersion) {
      throw new Error("Missing current app version in the header.");
    }

    await assertVisible(page, "AI 원어민 단어 퀴즈 쇼");
    await updateInfoButton.waitFor({
      state: "visible",
      timeout: REQUIRED_UI_TIMEOUT_MS,
    });

    const activityButtons = await page
      .locator('section[aria-labelledby="game-activity-label"] button')
      .allTextContents();
    const normalizedButtons = activityButtons.map((text) => text.trim());
    const fishingIndex = normalizedButtons.indexOf("단어 낚시");
    const spellingIndex = normalizedButtons.indexOf("철자 완성 게임");
    const typingIndex = normalizedButtons.indexOf("영어 단어 타자 게임");

    if (
      fishingIndex === -1 ||
      spellingIndex === -1 ||
      typingIndex === -1 ||
      fishingIndex >= spellingIndex ||
      spellingIndex >= typingIndex
    ) {
      throw new Error("Spelling activity button order is incorrect.");
    }

    for (const viewport of [
      { width: 360, height: 800 },
      { width: 768, height: 900 },
      { width: 1280, height: 900 },
    ]) {
      await assertNoHorizontalOverflow(page, viewport.width, viewport.height);
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    const schoolSearchForm = page.locator("form.school-search-form");
    const schoolSearchInput = schoolSearchForm.getByRole("textbox", {
      name: "학교 이름",
    });
    const schoolSearchButton = schoolSearchForm.getByRole("button", {
      name: "학교 검색",
    });
    if ((await schoolSearchButton.getAttribute("type")) !== "submit") {
      throw new Error("School search must use a submit button.");
    }
    const remoteConfigured = !(await schoolSearchInput.isDisabled());
    await schoolSearchForm.evaluate((form) => {
      const input = form.querySelector('input[name="schoolName"]');
      const submitButton = form.querySelector('button[type="submit"]');

      window.__schoolSearchSubmitCount = 0;
      form.addEventListener(
        "submit",
        () => {
          window.__schoolSearchSubmitCount += 1;
        },
        { capture: true },
      );
      input.disabled = false;
      submitButton.disabled = false;
    });
    await schoolSearchInput.focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.__schoolSearchSubmitCount === 1);
    await page.waitForTimeout(50);
    const submitCount = await page.evaluate(
      () => window.__schoolSearchSubmitCount,
    );
    if (submitCount !== 1) {
      throw new Error(`School search submitted ${submitCount} times.`);
    }
    if (!remoteConfigured) {
      await assertVisible(page, "Firebase 설정이 필요합니다.");
    }

    await updateInfoButton.focus();
    if (!(await updateInfoButton.evaluate((button) => document.activeElement === button))) {
      throw new Error("Keyboard focus did not reach the update history button.");
    }

    const updateDialogHeading = page.getByRole("heading", {
      name: "업데이트 기록",
      exact: true,
    });
    await updateInfoButton.click();
    await updateDialogHeading.waitFor({
      state: "visible",
      timeout: REQUIRED_UI_TIMEOUT_MS,
    });
    const dialog = page.getByRole("dialog");
    await dialog.getByText(currentVersion, { exact: true }).waitFor({
      state: "visible",
      timeout: REQUIRED_UI_TIMEOUT_MS,
    });
    await dialog.getByText("v1.0.0", { exact: true }).waitFor({
      state: "visible",
      timeout: REQUIRED_UI_TIMEOUT_MS,
    });

    await page.keyboard.press("Escape");
    await updateDialogHeading.waitFor({
      state: "hidden",
      timeout: REQUIRED_UI_TIMEOUT_MS,
    });
    await updateInfoButton.waitFor({
      state: "visible",
      timeout: REQUIRED_UI_TIMEOUT_MS,
    });

    await updateInfoButton.click();
    await updateDialogHeading.waitFor({
      state: "visible",
      timeout: REQUIRED_UI_TIMEOUT_MS,
    });
    await page.locator(".update-modal-backdrop").click({ position: { x: 8, y: 8 } });
    await updateDialogHeading.waitFor({
      state: "hidden",
      timeout: REQUIRED_UI_TIMEOUT_MS,
    });
    await updateInfoButton.waitFor({
      state: "visible",
      timeout: REQUIRED_UI_TIMEOUT_MS,
    });

    await updateInfoButton.click();
    await updateDialogHeading.waitFor({
      state: "visible",
      timeout: REQUIRED_UI_TIMEOUT_MS,
    });
    await page.getByRole("button", { name: "닫기" }).click();
    await updateDialogHeading.waitFor({
      state: "hidden",
      timeout: REQUIRED_UI_TIMEOUT_MS,
    });
    await updateInfoButton.waitFor({
      state: "visible",
      timeout: REQUIRED_UI_TIMEOUT_MS,
    });

    await page.getByRole("button", { name: "Google 로그인 후 시작" }).click();
    await assertVisible(page, "교사 관리");
    await assertHidden(page, "브라우저 안내");
    const teacherView = page.locator(
      '.view-content[aria-label="교사 관리 화면"]',
    );
    await teacherView.waitFor({
      state: "visible",
      timeout: REQUIRED_UI_TIMEOUT_MS,
    });
    await page.waitForFunction(
      () =>
        document.activeElement?.getAttribute("aria-label") ===
        "교사 관리 화면",
    );
    await assertNoHorizontalOverflow(page, 360, 800);
    assertNoCriticalPageDiagnostics(diagnostics, baseUrl);

    console.log("playwright smoke: ok");
  } finally {
    await context?.close();
    await browser?.close();
    if (server?.listening) {
      await new Promise((resolveClose) => server.close(resolveClose));
    }
  }
}

run().catch((error) => {
  console.error("playwright smoke: failed");
  console.error(error);
  process.exitCode = 1;
});
