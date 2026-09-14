import { generateFractal, getBounds } from "./fractal.js";

const SEED_ZOOM_RATE = 4;
const MAX_ZOOM_DEPTH = 200;
let cachedKey;
let cachedShape;

function longestPart(seed) {
  let longest = 0;
  for (let index = 1; index < seed.length; index += 1)
    longest = Math.max(
      longest,
      Math.hypot(
        seed[index].x - seed[index - 1].x,
        seed[index].y - seed[index - 1].y,
      ),
    );
  return longest;
}

/**
 * Zoom speed as a factor per second, and the deepest zoom that still adds
 * detail. Contracting lines are redrawn until their deepest level spans about
 * 2 pixels or floating-point precision runs out; lines with a nearly
 * full-length part cannot add detail, so they stop early.
 */
export function getSeedZoomPace(seed) {
  const part = longestPart(seed);
  return {
    rate: SEED_ZOOM_RATE,
    limit:
      part < 0.95
        ? Math.min(1e12, Math.max(4096, 2 / (800 * part ** MAX_ZOOM_DEPTH)))
        : 4096,
  };
}

export function drawSeedZoom(
  context,
  { seed, sides = 3, iterations, width, height, colors, background, time },
) {
  if (
    !Number.isFinite(time) ||
    time < 0 ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new RangeError(
      "Use a positive canvas size and a zoom time of zero seconds or more.",
    );
  }
  const key = JSON.stringify([seed, sides, iterations]);
  if (key !== cachedKey) {
    const final = generateFractal(seed, iterations, sides);
    const base = generateFractal(seed, 0, sides).points;
    let radius = 0;
    seed.forEach((point) => {
      radius = Math.max(radius, Math.hypot(point.x, point.y));
    });
    cachedShape = {
      base,
      bounds: getBounds(final.points),
      contraction: longestPart(seed),
      radius,
      iterations: final.iterations,
      ...getSeedZoomPace(seed),
    };
    cachedKey = key;
  }
  const { base, bounds, contraction, radius, rate, limit } = cachedShape;
  const adaptive = contraction < 0.95;
  const maxDepth = adaptive ? MAX_ZOOM_DEPTH : cachedShape.iterations;
  const zoom = Math.min(limit, rate ** time);
  const scale =
    ((Math.min(width, height) * 0.8) /
      Math.max(bounds.width, bounds.height, 0.001)) *
    zoom;
  const centerX =
    base[0].x + ((bounds.minX + bounds.maxX) / 2 - base[0].x) / zoom;
  const centerY =
    base[0].y + ((bounds.minY + bounds.maxY) / 2 - base[0].y) / zoom;
  const minX = centerX - width / (2 * scale);
  const maxX = centerX + width / (2 * scale);
  const minY = centerY - height / (2 * scale);
  const maxY = centerY + height / (2 * scale);
  const reachFactor = adaptive ? radius / (1 - contraction) : Infinity;
  let segments = 0;
  let deepest = 0;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  context.strokeStyle = gradient;
  context.lineWidth = Math.max(1, Math.min(width, height) * 0.0015);
  context.lineJoin = "round";
  context.lineCap = "round";
  // Smallest drawn segment in pixels; grows when the view needs too many segments.
  let threshold = 0.5;

  function visit(start, end, depth) {
    if (segments >= 100_000) return;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (adaptive) {
      const reach = length * reachFactor + 2 / scale;
      if (
        start.x + reach < minX ||
        start.x - reach > maxX ||
        start.y + reach < minY ||
        start.y - reach > maxY
      )
        return;
    }
    if (depth >= maxDepth || length * scale < threshold) {
      context.moveTo(
        width / 2 + (start.x - centerX) * scale,
        height / 2 + (start.y - centerY) * scale,
      );
      context.lineTo(
        width / 2 + (end.x - centerX) * scale,
        height / 2 + (end.y - centerY) * scale,
      );
      segments += 1;
      deepest = Math.max(deepest, depth);
      return;
    }
    let previous = start;
    for (let part = 1; part < seed.length; part += 1) {
      const point = seed[part];
      const next = {
        x: start.x + point.x * dx - point.y * dy,
        y: start.y + point.x * dy + point.y * dx,
      };
      visit(previous, next, depth + 1);
      previous = next;
    }
  }

  // Dense lines (like the Lévy C curve) would run out of budget partway along
  // and lose their far end, so coarsen the whole view evenly instead.
  for (;;) {
    segments = 0;
    deepest = 0;
    context.beginPath();
    for (let index = 1; index < base.length; index += 1)
      visit(base[index - 1], base[index], 0);
    if (segments < 100_000 || threshold >= 64) break;
    threshold *= 2;
  }
  context.stroke();
  return {
    zoom,
    segments,
    depth: deepest,
    adaptive,
    limited: segments >= 100_000,
  };
}
