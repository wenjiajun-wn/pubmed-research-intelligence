import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve("../.impeccable/review");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.screenshot({
  path: resolve(output, "home-desktop.png"),
  fullPage: true,
});
await page.getByRole("button", { name: "CRISPR", exact: true }).click();
if (
  (await page.getByRole("textbox", { name: "Research topic" }).inputValue()) !==
  "CRISPR"
)
  throw new Error("Suggested topic did not populate search");
const started = Date.now();
await page.getByRole("button", { name: /Open sample demo/ }).click();
await page
  .locator(".analysis-complete")
  .filter({ hasText: "Analysis complete" })
  .waitFor({ timeout: 20000 });
await page.getByRole("heading", { name: /AI Research Brief/ }).waitFor();
await page.locator("canvas").first().waitFor();
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: resolve(output, "desktop-fold.png") });
await page.screenshot({ path: resolve(output, "desktop.png"), fullPage: true });
const demoMs = Date.now() - started;
const dashboardUrl = page.url();
const initialRows = await page.locator(".papers-table tbody tr").count();
if (initialRows !== 10)
  throw new Error(`Expected 10 initial papers, found ${initialRows}`);
await page.getByRole("button", { name: /View top 100/i }).click();
if ((await page.locator(".papers-table tbody tr").count()) !== 100)
  throw new Error("Top 100 expansion failed");
await page.getByLabel("Sort by").selectOption("year");
const years = await page.locator(".journal-cell > span").allTextContents();
if (years.some((y, i) => i && Number(y) > Number(years[i - 1])))
  throw new Error("Year sorting failed");
await page.getByLabel("Sort by").selectOption("journal");
await page.getByRole("button", { name: "Show top 10" }).click();
await page.getByLabel("Sort by").selectOption("impact_factor");
await page.locator(".abstract-details summary").first().click();
if (!(await page.locator(".abstract-details[open] p").first().isVisible()))
  throw new Error("Abstract expansion failed");
await page.locator(".abstract-details summary").first().click();
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Export brief" }).click();
await (await downloadPromise).saveAs(resolve(output, "exported-brief.md"));
await page.getByRole("link", { name: "View data sources" }).click();
await page.getByRole("heading", { name: "Retrieval record" }).waitFor();
await page.screenshot({
  path: resolve(output, "sources-desktop.png"),
  fullPage: true,
});
await page.goto(dashboardUrl, { waitUntil: "networkidle" });
await page.setViewportSize({ width: 390, height: 844 });
await page
  .locator(".analysis-complete")
  .filter({ hasText: "Analysis complete" })
  .waitFor();
await page.waitForFunction(
  () => document.documentElement.scrollWidth <= window.innerWidth,
  { timeout: 5000 },
);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: resolve(output, "mobile-fold.png") });
await page.screenshot({ path: resolve(output, "mobile.png"), fullPage: true });
const mobileOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth,
);
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.screenshot({
  path: resolve(output, "home-mobile.png"),
  fullPage: true,
});
await page.route("**/api/analyses", (route) =>
  route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({
      detail: "Test: upstream unavailable. Please retry.",
    }),
  }),
);
await page.getByRole("textbox", { name: "Research topic" }).fill("CRISPR");
await page.getByRole("button", { name: "Analyze", exact: true }).click();
await page.getByRole("alert").waitFor();
if (
  !(await page
    .getByRole("alert")
    .innerText()
    .then((t) => t.includes("upstream unavailable")))
)
  throw new Error("Error state not shown");
await page.unroute("**/api/analyses");
await browser.close();
const report = {
  dashboardUrl,
  demoMs,
  initialRows,
  expandedRows: 100,
  mobileOverflow,
  browserErrors: errors,
  checks: [
    "suggested topic",
    "demo analysis",
    "all chart canvases",
    "paper expansion",
    "year sort",
    "journal sort",
    "abstract",
    "brief export",
    "source page",
    "mobile layout",
    "network error",
  ],
};
await writeFile(
  resolve(output, "browser-report.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
if (errors.length || mobileOverflow) process.exitCode = 1;
