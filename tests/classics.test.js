import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { CLASSICS, drawClassic, getZoomCamera } from "../src/classics.js";

function canvas() {
  const calls = [],
    images = [];
  const context = {};
  for (const method of [
    "save",
    "restore",
    "translate",
    "scale",
    "beginPath",
    "closePath",
    "moveTo",
    "lineTo",
    "stroke",
    "fill",
    "fillRect",
  ]) {
    context[method] = (...args) => {
      assert.ok(
        args.every(Number.isFinite),
        `${method} received a nonfinite coordinate`,
      );
      calls.push([method, ...args]);
    };
  }
  context.createLinearGradient = (...args) => {
    assert.ok(args.every(Number.isFinite));
    return { addColorStop() {} };
  };
  context.createImageData = (width, height) => ({
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  });
  context.putImageData = (image) => images.push(image);
  return { context, calls, images };
}

function render(id, depth, extra = {}) {
  const result = canvas();
  drawClassic(result.context, { id, depth, width: 32, height: 32, ...extra });
  return result;
}

test("every named construction renders finite geometry or opaque image data and respects its depth ceiling", () => {
  assert.equal(CLASSICS.length, 32);
  assert.equal(new Set(CLASSICS.map((item) => item.id)).size, CLASSICS.length);
  for (const item of CLASSICS) {
    assert.ok(item.defaultDepth <= item.maxDepth && item.defaultDepth > 0);
    assert.ok(new URL(item.source).protocol === "https:");
    for (const progress of [0, 0.43, 1]) {
      const result = render(item.id, item.defaultDepth, { progress });
      assert.ok(result.calls.length > 1);
      for (const image of result.images) {
        assert.ok(
          image.data.some((value, index) => index % 4 !== 3 && value > 0),
        );
        for (let i = 3; i < image.data.length; i += 4)
          assert.equal(image.data[i], 255);
      }
    }
    const capped = render(item.id, 1001),
      maximum = render(item.id, item.maxDepth);
    assert.equal(capped.calls.length, maximum.calls.length, item.name);
    if (maximum.images.length)
      assert.deepEqual(capped.images[0].data, maximum.images[0].data);
    const camera = getZoomCamera(item.id, 1);
    assert.ok(Object.values(camera).every(Number.isFinite));
    assert.ok(camera.zoom > 1);
    render(item.id, item.defaultDepth, { camera });
  }
});

test("recursive constructions obey their defining counts and growth changes the drawing", () => {
  const count = (id, depth, operation) =>
    render(id, depth).calls.filter(([name]) => name === operation).length;
  assert.equal(count("koch-snowflake", 0, "lineTo"), 3);
  assert.equal(count("koch-snowflake", 3, "lineTo"), 3 * 4 ** 3);
  assert.equal(count("sierpinski", 4, "fill"), 3 ** 4);
  assert.equal(count("carpet", 3, "fillRect") - 1, 8 ** 3);
  assert.equal(count("cantor-dust", 3, "fillRect") - 1, 4 ** 3);
  assert.equal(count("vicsek", 3, "fillRect") - 1, 5 ** 3);
  assert.equal(count("pentaflake", 3, "fill"), 6 ** 3);
  assert.equal(count("hexaflake", 3, "fill"), 7 ** 3);
  assert.equal(count("dragon", 10, "lineTo"), 2 ** 10);
  assert.equal(count("hilbert", 4, "lineTo"), 4 ** 4 - 1);
  assert.equal(count("peano", 3, "lineTo"), 9 ** 3 - 1);
  assert.equal(count("gosper", 3, "lineTo"), 7 ** 3);
  assert.equal(count("terdragon", 4, "lineTo"), 3 ** 4);
  assert.notDeepEqual(
    render("koch-curve", 4, { progress: 0.5 }).calls,
    render("koch-curve", 4).calls,
  );
  assert.notDeepEqual(
    render("sierpinski", 4, { progress: 0.5 }).calls,
    render("sierpinski", 4).calls,
  );
});

test("zoom recomputes complex-plane pixels, preserves the initial view, and handles invalid inputs", () => {
  for (const id of [
    "mandelbrot",
    "julia",
    "rabbit",
    "burning-ship",
    "tricorn",
    "multibrot",
    "newton",
  ]) {
    const ordinary = render(id, 120).images[0].data;
    assert.deepEqual(
      render(id, 120, { camera: getZoomCamera(id, 0) }).images[0].data,
      ordinary,
    );
    assert.notDeepEqual(
      render(id, 120, { camera: getZoomCamera(id, 0.5) }).images[0].data,
      ordinary,
    );
  }
  assert.equal(getZoomCamera("mandelbrot", 1).zoom, 1e8);
  const deepest = render("mandelbrot", 160, {
    camera: getZoomCamera("mandelbrot", 1),
  }).images[0];
  let unresolved = 0;
  for (let i = 0; i < deepest.data.length; i += 4) {
    if (
      deepest.data[i] === 16 &&
      deepest.data[i + 1] === 23 &&
      deepest.data[i + 2] === 25
    )
      unresolved++;
  }
  assert.ok(
    unresolved / (deepest.width * deepest.height) < 0.3,
    "deep zoom must resolve the seahorse detail",
  );
  const limited = render("mandelbrot", 120, {
    width: 320,
    height: 160,
    quality: 64,
  }).images[0];
  assert.equal(limited.width, 64);
  assert.equal(limited.height, 32);
  assert.throws(() => render("missing", 4), RangeError);
  assert.throws(() => render("mandelbrot", 4, { width: Infinity }), RangeError);
});

test("render worker transfers a bitmap with its request ID and reports invalid requests", () => {
  const messages = [];
  const self = {
    postMessage: (message, transfer) => messages.push({ message, transfer }),
  };
  class OffscreenCanvas {
    constructor(width, height) {
      this.width = width;
      this.height = height;
    }
    getContext() {
      return canvas().context;
    }
    transferToImageBitmap() {
      return { width: this.width, height: this.height };
    }
  }
  const source = readFileSync(
    new URL("../src/classic-worker.js", import.meta.url),
    "utf8",
  );
  runInNewContext(source.replace(/^import[^\n]+\n/, ""), {
    self,
    OffscreenCanvas,
    drawClassic,
  });
  self.onmessage({
    data: {
      requestId: 7,
      options: { id: "koch-snowflake", width: 100, height: 100, depth: 3 },
    },
  });
  assert.equal(messages[0].message.requestId, 7);
  assert.equal(messages[0].message.bitmap.width, 100);
  assert.equal(messages[0].transfer[0], messages[0].message.bitmap);
  self.onmessage({
    data: { requestId: 8, options: { width: -1, height: 100 } },
  });
  assert.equal(messages[1].message.requestId, 8);
  assert.match(messages[1].message.error, /dimensions/);
});
