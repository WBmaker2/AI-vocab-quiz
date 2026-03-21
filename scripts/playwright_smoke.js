import http from "node:http";
import { existsSync, createReadStream } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";

const rootDir = resolve("dist");
const port = 4175;

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
    server.listen(port, "127.0.0.1", () => resolveServer(server));
  });
}

async function assertVisible(page, text) {
  await page.getByText(text, { exact: false }).waitFor({ state: "visible" });
}

async function assertHidden(page, text) {
  await page.getByText(text, { exact: false }).waitFor({ state: "hidden" });
}

async function run() {
  const browser = await chromium.launch();
  const server = await startStaticServer();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: "networkidle" });

    const updateInfoButton = page.getByRole("button", { name: "update info" });
    const currentVersion = (await page.locator(".app-version").textContent())?.trim();

    if (!currentVersion) {
      throw new Error("Missing current app version in the header.");
    }

    await assertVisible(page, "AI 원어민 단어 퀴즈 쇼");
    await updateInfoButton.waitFor({ state: "visible" });

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
