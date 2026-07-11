import http from "node:http";
import { existsSync, createReadStream } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";

const rootDir = resolve("dist");
const host = "127.0.0.1";

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
  await page.getByText(text, { exact: false }).waitFor({ state: "visible" });
}

async function assertHidden(page, text) {
  await page.getByText(text, { exact: false }).waitFor({ state: "hidden" });
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
  const browser = await chromium.launch();
  const { server, port } = await startStaticServer();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle" });

    const updateInfoButton = page.getByRole("button", { name: "업데이트 내역" });
    const currentVersion = (await page.locator(".app-version").textContent())?.trim();

    if (!currentVersion) {
      throw new Error("Missing current app version in the header.");
    }

    await assertVisible(page, "AI 원어민 단어 퀴즈 쇼");
    await updateInfoButton.waitFor({ state: "visible" });

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
    await schoolSearchInput.evaluate((input) => {
      input.disabled = false;
    });
    await schoolSearchInput.focus();
    await page.keyboard.press("Enter");
    await assertVisible(page, "Firebase 설정이 필요합니다.");

    await updateInfoButton.focus();
    if (!(await updateInfoButton.evaluate((button) => document.activeElement === button))) {
      throw new Error("Keyboard focus did not reach the update history button.");
    }

    await updateInfoButton.click();
    await assertVisible(page, "업데이트 기록");
    const dialog = page.getByRole("dialog");
    await dialog.getByText(currentVersion, { exact: true }).waitFor({ state: "visible" });
    await dialog.getByText("v1.0.0", { exact: true }).waitFor({ state: "visible" });

    await page.keyboard.press("Escape");
    await assertHidden(page, "업데이트 기록");
    await updateInfoButton.waitFor({ state: "visible" });

    await updateInfoButton.click();
    await assertVisible(page, "업데이트 기록");
    await page.locator(".update-modal-backdrop").click({ position: { x: 8, y: 8 } });
    await assertHidden(page, "업데이트 기록");
    await updateInfoButton.waitFor({ state: "visible" });

    await updateInfoButton.click();
    await assertVisible(page, "업데이트 기록");
    await page.getByRole("button", { name: "닫기" }).click();
    await assertHidden(page, "업데이트 기록");
    await updateInfoButton.waitFor({ state: "visible" });

    await page.getByRole("button", { name: "Google 로그인 후 시작" }).click();
    await assertVisible(page, "교사 관리");
    await assertHidden(page, "브라우저 안내");
    const teacherView = page.locator(
      '.view-content[aria-label="교사 관리 화면"]',
    );
    await teacherView.waitFor({ state: "visible" });
    await page.waitForFunction(
      () =>
        document.activeElement?.getAttribute("aria-label") ===
        "교사 관리 화면",
    );
    await assertNoHorizontalOverflow(page, 360, 800);

    console.log("playwright smoke: ok");
  } finally {
    await browser.close();
    await new Promise((resolveClose) => server.close(resolveClose));
  }
}

run().catch((error) => {
  console.error("playwright smoke: failed");
  console.error(error);
  process.exitCode = 1;
});
