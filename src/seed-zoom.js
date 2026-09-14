import { generateFractal, getBounds } from "./fractal.js";

let cachedKey;
let cachedShape;

export function drawSeedZoom(
  context,
  { seed, sides = 3, iterations, width, height, colors, background, progress },
) {
  if (
    !Number.isFinite(progress) ||
    progress < 0 ||
    progress > 1 ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new RangeError(
      "Use a positive canvas size and zoom progress from 0 to 1.",
    );
  }
  const key = JSON.stringify([seed, sides, iterations]);
  if (key !== cachedKey) {
    const final = generateFractal(seed, iterations, sides);
    const base = generateFractal(seed, 0, sides).points;
    let contraction = 0;
    let radius = 0;
    seed.forEach((point, index) => {
      radius = Math.max(radius, Math.hypot(point.x, point.y));
      if (index)
        contraction = Math.max(
          contraction,
          Math.hypot(point.x - seed[index - 1].x, point.y - seed[index - 1].y),
        );
    });
    const bounds = getBounds(final.points);
    cachedShape = {
      base,
      bounds,
      contraction,
      radius,
      iterations: final.iterations,
    };
    cachedKey = key;
  }
  const { base, bounds, contraction, radius } = cachedShape;
  const adaptive = contraction < 0.95;
  const maxDepth = adaptive ? 20 : cachedShape.iterations;
  const zoom = 4096 ** progress;
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
  context.beginPath();

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
    if (depth >= maxDepth || length * scale < 0.5) {
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

  for (let index = 1; index < base.length; index += 1)
    visit(base[index - 1], base[index], 0);
  context.stroke();
  return {
    zoom,
    segments,
    depth: deepest,
    adaptive,
    limited: segments >= 100_000,
  };
}
