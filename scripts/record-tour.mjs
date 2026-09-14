#!/usr/bin/env node
/**
 * Record the studio tour used in the README and on social media.
 *
 * Playwright drives the real production build and records it, so every
 * fractal, zoom and dialog in the video is the one a visitor gets. The page is
 * loaded once for the tour and moved by clicking, dragging and scrolling; a
 * reload flashes white and reads as a stutter.
 *
 * The screencast never draws the mouse, so a small cursor is drawn for the
 * recording only. It follows real input events and nothing is added to the app.
 *
 * Usage:
 *   npm run build && npx vite preview --port 4173 &
 *   npm run tour -- http://localhost:4173
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

// vite preview listens on localhost, which may not answer on 127.0.0.1.
const base = process.argv[2] ?? "http://localhost:4173";
const outDir = "documentation";
const raw = join(outDir, ".tour-raw");
const webm = join(outDir, ".tour.webm");
const mp4 = join(outDir, "tour.mp4");
const gif = join(outDir, "tour.gif");

mkdirSync(outDir, { recursive: true });
rmSync(raw, { recursive: true, force: true });
mkdirSync(raw, { recursive: true });

const browser = await chromium.launch({
  args: ["--force-device-scale-factor=1"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: raw, size: { width: 1280, height: 720 } },
  colorScheme: "light",
});

// Modal dialogs sit in the top layer, above any z-index, so the cursor is a
// popover and is raised again whenever a dialog opens.
await context.addInitScript(() => {
  addEventListener("DOMContentLoaded", () => {
    const cursor = document.createElement("div");
    cursor.popover = "manual";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M5 2.5 19.5 13l-7.2 1.1-3.4 7.4Z" fill="#282d39" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>';
    cursor.style.cssText =
      "inset:auto;left:0;top:0;margin:0;padding:0;border:0;background:none;overflow:visible;width:24px;height:24px;pointer-events:none;transform:translate(-60px,-60px);transition:scale .12s";
    document.body.append(cursor);
    const raise = () => {
      if (cursor.matches(":popover-open")) cursor.hidePopover();
      cursor.showPopover();
    };
    raise();
    new MutationObserver(raise).observe(document.body, {
      attributes: true,
      attributeFilter: ["open"],
      subtree: true,
    });
    addEventListener(
      "pointermove",
      (event) => {
        cursor.style.transform = `translate(${event.clientX - 5}px, ${event.clientY - 3}px)`;
      },
      true,
    );
    addEventListener("pointerdown", () => (cursor.style.scale = "0.82"), true);
    addEventListener("pointerup", () => (cursor.style.scale = "1"), true);
  });
});

const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

const startedAt = Date.now();
const marks = {};
const mark = (name) => {
  marks[name] = (Date.now() - startedAt) / 1000;
};
const beat = (ms) => page.waitForTimeout(ms);
let pointer = { x: 640, y: 360 };

/** A tour that skipped a step looks exactly like one that did not, so say so. */
async function expect(description, check) {
  const ok = await page.evaluate(check).catch(() => false);
  if (!ok) console.warn(`record-tour: WARNING ${description}`);
}

async function ready() {
  await page.locator("#fractal-path[d]").waitFor({ state: "attached" });
  await page.evaluate(() => document.fonts.ready);
  await beat(500);
}

/** Move the mouse at a readable speed instead of jumping. */
async function glide(x, y, ms = 450) {
  const steps = Math.max(2, Math.round(ms / 16));
  const from = pointer;
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const eased = t * t * (3 - 2 * t);
    await page.mouse.move(
      from.x + (x - from.x) * eased,
      from.y + (y - from.y) * eased,
    );
    await beat(16);
  }
  pointer = { x, y };
}

async function center(target) {
  const locator = typeof target === "string" ? page.locator(target) : target;
  await locator.first().scrollIntoViewIfNeeded();
  const box = await locator.first().boundingBox();
  if (!box) throw new Error(`record-tour: nothing to point at for ${target}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function press(target, hold = 700) {
  const { x, y } = await center(target);
  await glide(x, y);
  await beat(160);
  await page.mouse.click(x, y);
  await beat(hold);
}

async function scrollTo(selector, offset = 12) {
  await page.evaluate(
    ({ selector, offset }) =>
      window.scrollTo({
        top:
          document.querySelector(selector).getBoundingClientRect().top +
          window.scrollY -
          offset,
        behavior: "smooth",
      }),
    { selector, offset },
  );
  await beat(1100);
}

/** Editor coordinates: seed x from 0 to 1 along the baseline, y downward. */
async function editorPoint(x, y) {
  const box = await page.locator("#shape-editor").boundingBox();
  const scale = box.width / 300;
  return { x: box.x + (30 + x * 240) * scale, y: box.y + (130 + y * 240) * scale };
}

/** Drag a point of the line through seed coordinates, slowly enough to watch. */
async function dragPoint(selector, path) {
  const start = await center(selector);
  await glide(start.x, start.y);
  await beat(250);
  await page.mouse.down();
  for (const [x, y] of path) {
    const target = await editorPoint(x, y);
    await glide(target.x, target.y, 900);
    await beat(250);
  }
  await page.mouse.up();
  await beat(500);
}

async function watchExpanded(seconds) {
  // Scroll smoothly first; pressing an offscreen button would jump the page.
  await scrollTo(".studio-layout");
  await press("#fullscreen-button", 900);
  await press("#animate-button", 0);
  await page.mouse.move(1180, 690);
  pointer = { x: 1180, y: 690 };
  await beat(seconds * 1000 + 900);
}

async function collapse() {
  await page.keyboard.press("Escape");
  await beat(900);
}

async function openFromLibrary(query) {
  await scrollTo("#library", 20);
  const search = page.locator("#library-search");
  await press(search, 200);
  await search.fill("");
  await search.pressSequentially(query, { delay: 110 });
  await beat(700);
  await press(page.locator(".library-card:not([hidden])"), 2200);
  await press("#classic-import", 1600);
}

// ------------------------------------------------------------ Warm the caches
// Recorded too, and trimmed off afterwards from mark("open").
await page.goto(`${base}/`);
await ready();
await page.evaluate(() => document.querySelector("#library").scrollIntoView());
await beat(800);
await page.locator(".library-card").first().click();
await beat(1500);
await page.keyboard.press("Escape");
await page.goto(`${base}/`);
await ready();
await page.mouse.move(pointer.x, pointer.y);

// ---------------------------------------------------------- 1. The first look
mark("open");
await glide(900, 300, 900);
await beat(1300);

// ---------------------------------------- 2. Drag the dots, add one, drag it
await scrollTo(".studio-layout");
mark("gifStart");
await dragPoint('.seed-point[data-point="2"]', [
  [0.5, -0.46],
  [0.5, 0.22],
  [0.5, -0.38],
]);
await press("#add-point", 600);
await dragPoint(".seed-point:focus", [[0.2, -0.24]]);
mark("gifEnd");
await expect("the edited line did not become a custom design", () =>
  document.querySelector("#design-name").textContent.includes("own creation"),
);

// -------------------------------------------------- 3. Repetitions, one by one
await glide(...Object.values(await center("#detail")));
await page.locator("#detail").focus();
for (let i = 0; i < 4; i += 1) {
  await page.keyboard.press("ArrowLeft");
  await beat(380);
}
for (let i = 0; i < 5; i += 1) {
  await page.keyboard.press("ArrowRight");
  await beat(520);
}

// ------------------------------------------- 4. Outline, colors and the canvas
await press('[data-sides="4"]', 1100);
await press('[data-sides="6"]', 1100);
await press('[data-palette="sunset"]', 900);
await press('[data-palette="violet"]', 900);
await press("#background-button", 1000);

// ------------------------------------------------------ 5. Zoom into the detail
await watchExpanded(6);
await expect("the zoom did not reach 4,096x", () =>
  document.querySelector("#zoom-value").value.startsWith("4,096"),
);
await collapse();

// -------------------------------------------------------------- 6. Draw a line
await press("#draw-mode", 500);
const stroke = [
  [0.02, 0],
  [0.16, -0.26],
  [0.3, 0.08],
  [0.46, -0.34],
  [0.62, 0.1],
  [0.78, -0.22],
  [0.97, 0],
];
const first = await editorPoint(...stroke[0]);
await glide(first.x, first.y);
await page.mouse.down();
for (const point of stroke.slice(1)) {
  const target = await editorPoint(...point);
  await glide(target.x, target.y, 280);
}
await page.mouse.up();
await beat(1800);

// ------------------------------------------------------ 7. Watch the pattern grow
// Leave room below the summary for the settings it opens.
await scrollTo(".animation-settings", 470);
await press(".animation-settings summary", 800);
await page.locator("#animation-type").selectOption("growth");
await beat(900);
await watchExpanded(6);
await collapse();
await page.locator("#animation-type").selectOption("zoom");
await beat(500);
// Longer animations zoom deeper at the same speed; the note under the length says how deep.
const length = page.locator("#animation-seconds-number");
await press(length, 200);
await length.fill("");
await length.pressSequentially("8", { delay: 150 });
await beat(1800);
await expect("the eight second length did not reach 65,536x", () =>
  document.querySelector("#animation-depth").textContent.includes("65.5K"),
);

// ------------------------------- 8. A library fractal, controlled from the studio
await openFromLibrary("mandel");
await expect("Mandelbrot did not open in the studio", () =>
  document.querySelector(".control-panel").classList.contains("library-mode"),
);
await press('[data-palette="ocean"]', 900);
await watchExpanded(8);
await collapse();

// -------------------------------- 9. A line based library fractal, reshaped
await openFromLibrary("lévy");
await expect("the Levy C curve did not open as three points", () =>
  document.querySelector("#point-count").textContent.startsWith("3 points"),
);
await dragPoint('.seed-point[data-point="1"]', [
  [0.36, -0.36],
  [0.56, -0.44],
]);
await watchExpanded(8);
mark("end");

await context.close();
await browser.close();

const recorded = readdirSync(raw).find((file) => file.endsWith(".webm"));
if (!recorded) {
  console.error("record-tour: playwright wrote no video");
  process.exit(1);
}
renameSync(join(raw, recorded), webm);
rmSync(raw, { recursive: true, force: true });

const trim = Math.max(0, marks.open - 0.3);
console.log(
  `record-tour: trimming ${trim.toFixed(1)}s of warm-up, tour runs ` +
    `${(marks.end - marks.open).toFixed(1)}s`,
);

// No fps filter. The screencast is variable rate, and resampling it to a fixed
// rate duplicates frames unevenly, which shows as judder during zooms.
execFileSync(
  "ffmpeg",
  [
    "-y", "-ss", trim.toFixed(2), "-to", (marks.end + 0.2).toFixed(2), "-i", webm,
    "-vf", "scale=1280:720:flags=lanczos,format=yuv420p",
    "-fps_mode", "passthrough",
    "-c:v", "libx264", "-preset", "slow", "-crf", "20",
    "-profile:v", "high", "-level", "4.1",
    "-movflags", "+faststart", "-an", mp4,
  ],
  { stdio: ["ignore", "ignore", "inherit"] },
);

// The gif shows the shape editor only: a whole tour at gif frame rates runs to
// tens of megabytes.
const gifFrom = Math.max(0, marks.gifStart - marks.open);
const gifLen = Math.min(10, marks.gifEnd - marks.gifStart);
const palette = join(outDir, ".palette.png");
const gifFilter = "fps=12,scale=640:-1:flags=lanczos";
execFileSync(
  "ffmpeg",
  [
    "-y", "-ss", gifFrom.toFixed(2), "-t", gifLen.toFixed(2), "-i", mp4,
    "-vf", `${gifFilter},palettegen=stats_mode=diff:max_colors=128`, palette,
  ],
  { stdio: ["ignore", "ignore", "inherit"] },
);
execFileSync(
  "ffmpeg",
  [
    "-y", "-ss", gifFrom.toFixed(2), "-t", gifLen.toFixed(2), "-i", mp4, "-i", palette,
    "-lavfi", `${gifFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4`, gif,
  ],
  { stdio: ["ignore", "ignore", "inherit"] },
);
rmSync(palette, { force: true });

const mb = (path) => (statSync(path).size / 1e6).toFixed(1);
console.log(
  `record-tour: tour.mp4 ${mb(mp4)} MB, tour.gif ${mb(gif)} MB (${gifLen.toFixed(1)}s)`,
);
if (errors.length) {
  console.error(`record-tour: the page threw ${errors.length} errors:`);
  for (const message of errors) console.error(`  ${message}`);
  process.exitCode = 1;
}
