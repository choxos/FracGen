import assert from "node:assert/strict";
import test from "node:test";
import {
  PRESETS,
  generateFractal,
  generateGrowthFrame,
  getBounds,
  levelsWithinBudget,
  toPath,
} from "../src/fractal.js";
import { drawSeedZoom, getSeedZoomPace } from "../src/seed-zoom.js";
import { frameMoment, getAnimationOptions } from "../src/export.js";

test("recursive motifs preserve geometry, fit bounds, and stop at complete safe levels", () => {
  const snowflake = PRESETS.find((preset) => preset.id === "snowflake");
  const original = structuredClone(snowflake.seed);
  for (let level = 0; level <= 6; level += 1) {
    const result = generateFractal(snowflake.seed, level, 3);
    assert.equal(result.segments, 3 * 4 ** level);
    assert.equal(result.points.length, result.segments + 1);
    assert.equal(result.iterations, level);
    assert.equal(result.limited, false);
    assert.deepEqual(result.points[0], result.points.at(-1));
  }
  assert.deepEqual(snowflake.seed, original);

  const line = generateFractal(snowflake.seed, 1, 1);
  assert.deepEqual(line.points, snowflake.seed);
  const recursiveLine = generateFractal(snowflake.seed, 2, 1);
  assert.deepEqual(recursiveLine.points[0], { x: 0, y: 0 });
  assert.deepEqual(recursiveLine.points.at(-1), { x: 1, y: 0 });
  for (let index = 0; index < line.points.length; index += 1) {
    assert.deepEqual(recursiveLine.points[index * 4], line.points[index]);
  }
  const bounds = getBounds(line.points);
  assert.deepEqual(bounds, {
    minX: 0,
    minY: -Math.sqrt(3) / 6,
    maxX: 1,
    maxY: 0,
    width: 1,
    height: Math.sqrt(3) / 6,
  });
  assert.equal(
    toPath([
      { x: 0, y: 0 },
      { x: 1 / 3, y: -1 / 3 },
      { x: 1, y: 0 },
    ]),
    "M0,0L0.33333,-0.33333L1,0",
  );

  const denseSeed = Array.from({ length: 12 }, (_, index) => ({
    x: index / 11,
    y: index === 0 || index === 11 ? 0 : 0.1,
  }));
  const limited = generateFractal(denseSeed, 6, 6);
  assert.equal(limited.iterations, 4);
  assert.equal(limited.segments, 6 * 11 ** 4);
  assert.equal(limited.limited, true);
  assert.ok(limited.segments <= 100_000);
  assert.ok(
    limited.points.every(
      (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
    ),
  );
  assert.deepEqual(generateFractal(denseSeed, 4, 6).points, limited.points);

  assert.deepEqual(
    generateGrowthFrame(snowflake.seed, 0, 4, 3),
    generateFractal(snowflake.seed, 0, 3),
  );
  assert.deepEqual(
    generateGrowthFrame(snowflake.seed, 1, 4, 3),
    generateFractal(snowflake.seed, 4, 3),
  );
  assert.deepEqual(generateGrowthFrame(snowflake.seed, 0.5, 2, 1), line);
  const halfway = generateGrowthFrame(snowflake.seed, 0.5, 1, 1);
  assert.equal(halfway.iterations, 0.5);
  assert.equal(halfway.segments, 4);
  halfway.points.forEach((point, index) => {
    assert.equal(
      point.x,
      index / 4 + (snowflake.seed[index].x - index / 4) * 0.5,
    );
    assert.equal(point.y, snowflake.seed[index].y * 0.5);
  });
  const cappedGrowth = generateGrowthFrame(denseSeed, 0.95, 6, 6);
  assert.equal(cappedGrowth.limited, true);
  assert.ok(cappedGrowth.segments <= 100_000);
  assert.ok(
    cappedGrowth.points.every(
      (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
    ),
  );
  assert.deepEqual(cappedGrowth.points[0], cappedGrowth.points.at(-1));
  assert.deepEqual(generateGrowthFrame(denseSeed, 1, 6, 6), limited);
  assert.deepEqual(
    generateGrowthFrame(snowflake.seed, 0.4, 0, 1),
    generateFractal(snowflake.seed, 0, 1),
  );
  for (const progress of [-0.1, 1.1, NaN, "0.5"])
    assert.throws(
      () => generateGrowthFrame(snowflake.seed, progress, 2),
      RangeError,
    );

  const context = {
    setTransform() {},
    fillRect() {},
    beginPath() {},
    stroke() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    moveTo(x, y) {
      assert.ok(Number.isFinite(x) && Number.isFinite(y));
    },
    lineTo(x, y) {
      assert.ok(Number.isFinite(x) && Number.isFinite(y));
    },
  };
  const zoomOptions = {
    seed: snowflake.seed,
    iterations: 5,
    sides: 3,
    width: 800,
    height: 800,
    colors: ["#00aaaa", "#6666ee"],
    background: "#fff",
  };
  const zoomStart = drawSeedZoom(context, { ...zoomOptions, time: 0 });
  const zoomFinish = drawSeedZoom(context, { ...zoomOptions, time: 6 });
  assert.equal(zoomFinish.zoom, 4096);
  assert.ok(zoomFinish.depth > zoomStart.depth);
  assert.ok(zoomFinish.segments > 0 && zoomFinish.segments <= 100_000);
  // Zoom speed is fixed, so a longer animation goes deeper until the detail limit.
  const deepZoom = drawSeedZoom(context, { ...zoomOptions, time: 30 });
  assert.equal(deepZoom.zoom, getSeedZoomPace(snowflake.seed).limit);
  assert.ok(deepZoom.depth > zoomFinish.depth);
  assert.ok(deepZoom.segments > 0 && deepZoom.segments <= 100_000);
  assert.throws(
    () => drawSeedZoom(context, { ...zoomOptions, time: -1 }),
    RangeError,
  );
  const straightZoom = drawSeedZoom(context, {
    ...zoomOptions,
    seed: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
    sides: 1,
    time: 6,
  });
  assert.equal(straightZoom.adaptive, false);
  assert.equal(straightZoom.segments, 1);
  assert.deepEqual(frameMoment(0, { frames: 180, mode: "smooth" }), {
    progress: 0,
    time: 0,
  });
  assert.deepEqual(frameMoment(179, { frames: 180, mode: "smooth" }), {
    progress: 1,
    time: 6,
  });
  assert.deepEqual(frameMoment(100, { frames: 180, mode: "steps" }, 5), {
    progress: 0.4,
    time: 3,
  });
  assert.equal(levelsWithinBudget(4, 3), 7);
  assert.equal(levelsWithinBudget(2, 1), 16);
  assert.equal(generateFractal(snowflake.seed, 16, 3).iterations, 7);
  assert.deepEqual(getAnimationOptions(), {
    mode: "smooth",
    frames: 180,
    durationMs: 6000,
    holdMs: 1000,
  });
  assert.equal(getAnimationOptions({ animationFrames: 1500 }).frames, 1000);
  assert.equal(getAnimationOptions({ animationFrames: -1 }).frames, 1);
  assert.throws(() => getAnimationOptions({ animationFrames: NaN }), TypeError);

  for (const preset of PRESETS) {
    const result = generateFractal(preset.seed, 3, preset.sides);
    assert.equal(result.segments, preset.sides * (preset.seed.length - 1) ** 3);
    assert.ok(getBounds(result.points).width > 0);
  }
  for (const seed of [
    [],
    null,
    [{ x: 0, y: 0 }],
    [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: NaN, y: 0 },
      { x: 1, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: 0.5, y: 1 },
      { x: 1, y: 0 },
    ],
  ]) {
    assert.throws(() => generateFractal(seed, 2), TypeError);
  }
  for (const level of [-1, 1.5, 17, NaN, "3"])
    assert.throws(() => generateFractal(snowflake.seed, level), RangeError);
  assert.throws(() => generateFractal(snowflake.seed, 2, 5), RangeError);
});
