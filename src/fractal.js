const MAX_SEGMENTS = 100_000;

export const PRESETS = [
  {
    id: "snowflake",
    name: "Snowflake",
    description: "A tiny peak becomes a delicate snowflake.",
    seed: [
      { x: 0, y: 0 },
      { x: 1 / 3, y: 0 },
      { x: 1 / 2, y: -Math.sqrt(3) / 6 },
      { x: 2 / 3, y: 0 },
      { x: 1, y: 0 },
    ],
    sides: 3,
  },
  {
    id: "crystal",
    name: "Crystal",
    description: "A simple step grows into intricate geometric edges.",
    seed: [
      { x: 0, y: 0 },
      { x: 1 / 3, y: 0 },
      { x: 1 / 3, y: -1 / 3 },
      { x: 2 / 3, y: -1 / 3 },
      { x: 2 / 3, y: 0 },
      { x: 1, y: 0 },
    ],
    sides: 4,
  },
  {
    id: "wave",
    name: "Wave",
    description: "A little zigzag ripples into a rhythmic pattern.",
    seed: [
      { x: 0, y: 0 },
      { x: 0.25, y: -0.18 },
      { x: 0.5, y: 0.18 },
      { x: 0.75, y: -0.18 },
      { x: 1, y: 0 },
    ],
    sides: 6,
  },
  {
    id: "coast",
    name: "Coast",
    description: "Uneven peaks unfold into a wild, detailed coastline.",
    seed: [
      { x: 0, y: 0 },
      { x: 0.18, y: -0.06 },
      { x: 0.28, y: -0.24 },
      { x: 0.47, y: 0.1 },
      { x: 0.62, y: -0.17 },
      { x: 0.79, y: 0.07 },
      { x: 1, y: 0 },
    ],
    sides: 1,
  },
];

function buildFractal(seed, requestedIterations, sides, progress) {
  if (
    !Array.isArray(seed) ||
    seed.length < 2 ||
    seed.length > 12 ||
    seed.some(
      (point) =>
        !point ||
        !Number.isFinite(point.x) ||
        !Number.isFinite(point.y) ||
        point.x < 0 ||
        point.x > 1 ||
        point.y < -0.75 ||
        point.y > 0.75,
    ) ||
    seed[0].x !== 0 ||
    seed[0].y !== 0 ||
    seed.at(-1).x !== 1 ||
    seed.at(-1).y !== 0
  ) {
    throw new TypeError(
      "Use 2–12 finite points, starting at (0, 0) and ending at (1, 0), with x between 0 and 1 and y between -0.75 and 0.75.",
    );
  }
  if (
    !Number.isInteger(requestedIterations) ||
    requestedIterations < 0 ||
    requestedIterations > 6
  ) {
    throw new RangeError("Iterations must be a whole number from 0 to 6.");
  }
  if (![1, 3, 4, 6].includes(sides)) {
    throw new RangeError("Choose a line or a polygon with 3, 4, or 6 sides.");
  }

  let points =
    sides === 1
      ? [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ]
      : Array.from({ length: sides }, (_, index) => {
          const angle = -Math.PI / 2 + (index * 2 * Math.PI) / sides;
          return {
            x: 0.5 + 0.5 * Math.cos(angle),
            y: 0.5 + 0.5 * Math.sin(angle),
          };
        });
  if (sides !== 1) points.push({ ...points[0] });

  const parts = seed.length - 1;
  let effectiveIterations = 0;
  let segments = sides;
  // ponytail: cap complete levels at 100k segments; use a worker for larger drawings.
  while (
    effectiveIterations < requestedIterations &&
    segments * parts <= MAX_SEGMENTS
  ) {
    segments *= parts;
    effectiveIterations += 1;
  }
  const iterations = progress * effectiveIterations;
  for (let level = 0; level < Math.ceil(iterations); level += 1) {
    const amount = Math.min(1, iterations - level);
    const next = [];
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      for (let part = 0; part < parts; part += 1) {
        const point = seed[part];
        const x =
          amount === 1
            ? point.x
            : part / parts + (point.x - part / parts) * amount;
        const y = point.y * amount;
        next.push({
          x: start.x + x * dx - y * dy,
          y: start.y + x * dy + y * dx,
        });
      }
    }
    next.push({ ...points.at(-1) });
    points = next;
  }
  return {
    points,
    iterations,
    segments: points.length - 1,
    limited: effectiveIterations < requestedIterations,
  };
}

export function generateFractal(seed, requestedIterations, sides = 3) {
  return buildFractal(seed, requestedIterations, sides, 1);
}

export function generateGrowthFrame(seed, progress, iterations, sides = 3) {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new RangeError("Growth progress must be a number from 0 to 1.");
  }
  return buildFractal(seed, iterations, sides, progress);
}

export function getBounds(points) {
  if (!points.length)
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function toPath(points) {
  return points
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${Number(point.x.toFixed(5))},${Number(point.y.toFixed(5))}`,
    )
    .join("");
}
