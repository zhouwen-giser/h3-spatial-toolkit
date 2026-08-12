import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const severeImpacts = new Set(["critical", "serious"]);

async function expectNoSevereAccessibilityViolations(page: Page, testInfo: TestInfo, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const severeViolations = results.violations.filter((violation) =>
    violation.impact ? severeImpacts.has(violation.impact) : false
  );

  expect(
    severeViolations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target)
    }))
  ).toEqual([]);

  await testInfo.attach(`${label}-axe.json`, {
    body: Buffer.from(
      JSON.stringify({
        testEngine: results.testEngine,
        testEnvironment: results.testEnvironment,
        url: results.url,
        severeViolationCount: severeViolations.length,
        violations: results.violations.map(({ id, impact, help, nodes }) => ({
          id,
          impact,
          help,
          targets: nodes.map((node) => node.target)
        })),
        incompleteRuleIds: results.incomplete.map(({ id }) => id),
        passedRuleCount: results.passes.length
      })
    ),
    contentType: "application/json"
  });
}

async function saveScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await page.screenshot({ path: testInfo.outputPath(name), fullPage: true });
}

test("normal renderer exercises WebGL when available or its controlled fallback", async ({
  browser,
  browserName,
  page
}, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const webglAvailable = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  });
  const renderer = page.getByTestId("renderer");
  if (webglAvailable) {
    await expect(renderer).toHaveText("deck.gl");
    await expect(renderer).toHaveAttribute("data-renderer-source", "webgl");
    await expect(page.locator(".map canvas")).toBeVisible();
  } else {
    await expect(renderer).toHaveText("SVG fallback");
    await expect(renderer).toHaveAttribute("data-renderer-source", "webgl-unavailable");
    await expect(page.locator(".map canvas")).toHaveCount(0);
    await expect(page.locator(".map svg")).toBeVisible();
  }
  const rendererName = (await renderer.textContent()) ?? "unknown";
  const rendererSource = await renderer.getAttribute("data-renderer-source");

  await expectNoSevereAccessibilityViolations(page, testInfo, "normal-renderer");
  expect(pageErrors).toEqual([]);
  await testInfo.attach("runtime.json", {
    body: Buffer.from(
      JSON.stringify({
        browserName,
        browserVersion: browser.version(),
        webglAvailable,
        rendererName,
        rendererSource
      })
    ),
    contentType: "application/json"
  });
  await saveScreenshot(page, testInfo, `${browserName}-normal-renderer.png`);
});

test("forced no-WebGL path supports keyboard, focus, resolution, clear and reset", async ({
  browserName,
  page
}, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/?testRenderer=svg");
  const renderer = page.getByTestId("renderer");
  await expect(renderer).toHaveText("SVG fallback");
  await expect(renderer).toHaveAttribute("data-renderer-source", "forced-no-webgl");
  await expect(page.locator(".map canvas")).toHaveCount(0);
  await expect(page.locator(".map svg")).toBeVisible();

  const resolution = page.getByRole("slider", { name: "Resolution" });
  await page.keyboard.press("Tab");
  await expect(resolution).toBeFocused();
  await expect(resolution).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("ArrowRight");
  await expect(resolution).toHaveValue("10");
  await expect(page.locator("output[for=resolution]")).toHaveText("10");

  const reset = page.getByRole("button", { name: "恢复东京样例" });
  const clear = page.getByRole("button", { name: "清空" });
  await page.keyboard.press("Tab");
  await expect(reset).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(clear).toBeFocused();
  await expect(clear).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("cell-count")).toHaveText("0");

  await page.keyboard.press("Shift+Tab");
  await expect(reset).toBeFocused();
  await page.keyboard.press("Enter");
  await expect
    .poll(async () => Number((await page.getByTestId("cell-count").textContent())?.replaceAll(",", "")))
    .toBeGreaterThan(0);
  await expect(page.locator(".map svg polygon").first()).toBeVisible();

  await expectNoSevereAccessibilityViolations(page, testInfo, "forced-svg");
  expect(pageErrors).toEqual([]);
  await saveScreenshot(page, testInfo, `${browserName}-forced-svg.png`);
});

test("200 percent zoom equivalent reflows without horizontal page scrolling", async ({
  browserName,
  page
}, testInfo) => {
  await page.setViewportSize({ width: 640, height: 900 });
  await page.goto("/?testRenderer=svg");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth))
    .toBe(true);
  await expect(page.getByRole("button", { name: "清空" })).toBeVisible();
  await expectNoSevereAccessibilityViolations(page, testInfo, "zoom-200-reflow");
  await saveScreenshot(page, testInfo, `${browserName}-zoom-200-reflow.png`);
});
