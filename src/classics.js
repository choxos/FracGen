import { PRESETS } from "./fractal.js";

const BOTANY = "https://algorithmicbotany.org/papers/abop/abop.pdf";
const MATHWORLD = "https://mathworld.wolfram.com/";
const MINKOWSKI_SEED = [
  [0, 0],
  [0.25, 0],
  [0.25, -0.25],
  [0.5, -0.25],
  [0.5, 0],
  [0.5, 0.25],
  [0.75, 0.25],
  [0.75, 0],
  [1, 0],
].map(([x, y]) => ({ x, y }));
/** Single-rule edge replacements that the studio's line editor reproduces exactly. */
const STUDIO_SEEDS = {
  "koch-snowflake": { seed: PRESETS[0].seed, sides: 3 },
  "koch-curve": { seed: PRESETS[0].seed, sides: 1 },
  minkowski: { seed: MINKOWSKI_SEED, sides: 1 },
  "koch-island": { seed: MINKOWSKI_SEED, sides: 4 },
  levy: {
    seed: [
      { x: 0, y: 0 },
      { x: 0.5, y: -0.5 },
      { x: 1, y: 0 },
    ],
    sides: 1,
  },
  terdragon: {
    seed: [
      { x: 0, y: 0 },
      { x: 0.5, y: -Math.sqrt(3) / 6 },
      { x: 0.5, y: Math.sqrt(3) / 6 },
      { x: 1, y: 0 },
    ],
    sides: 1,
  },
};

export const CLASSICS = [
  [
    "mandelbrot",
    "Mandelbrot set",
    "Escape-time",
    "Square a complex number, add its starting point, and find the boundary between escape and stability.",
    1000,
    160,
    `${MATHWORLD}MandelbrotSet.html`,
  ],
  [
    "julia",
    "Julia set",
    "Escape-time",
    "Explore the filled quadratic Julia set for c = −0.8 + 0.156i.",
    1000,
    160,
    `${MATHWORLD}JuliaSet.html`,
  ],
  [
    "rabbit",
    "Douady rabbit",
    "Escape-time",
    "A quadratic Julia set with three connected lobes, using the period-three rabbit parameter.",
    1000,
    160,
    `${MATHWORLD}DouadyRabbit.html`,
  ],
  [
    "burning-ship",
    "Burning Ship",
    "Escape-time",
    "Taking absolute values before squaring creates a jagged, ship-like escape boundary.",
    1000,
    140,
    "https://doi.org/10.1016/0097-8493(92)90032-Q",
  ],
  [
    "tricorn",
    "Tricorn",
    "Escape-time",
    "Complex conjugation turns the Mandelbrot rule into a three-cornered parameter set.",
    1000,
    160,
    "https://arxiv.org/abs/1605.08061",
  ],
  [
    "multibrot",
    "Cubic Multibrot",
    "Escape-time",
    "Cube instead of square: z becomes z³ + c, creating a two-lobed parameter set.",
    1000,
    160,
    `${MATHWORLD}MultibrotSet.html`,
  ],
  [
    "newton",
    "Newton basins",
    "Escape-time",
    "Color starting points by the cube root of one reached by Newton’s method.",
    1000,
    48,
    "https://web.ncf.ca/fs039/mp/documents/3newton.pdf",
  ],
  [
    "koch-snowflake",
    "Koch snowflake",
    "Curves",
    "Replace each triangle edge with four smaller edges to grow a snowflake.",
    7,
    4,
    `${MATHWORLD}KochSnowflake.html`,
  ],
  [
    "koch-curve",
    "Koch curve",
    "Curves",
    "A single line sprouts a triangular bump, then every new edge repeats the rule.",
    8,
    5,
    `${MATHWORLD}KochSnowflake.html`,
  ],
  [
    "minkowski",
    "Minkowski curve",
    "Curves",
    "Eight right-angle segments replace every line segment, forming a winding square-grid curve.",
    5,
    3,
    `${MATHWORLD}MinkowskiSausage.html`,
  ],
  [
    "koch-island",
    "Quadratic Koch island",
    "Curves",
    "Apply the eight-segment square-grid Koch rule around a closed square.",
    4,
    3,
    BOTANY,
  ],
  [
    "dragon",
    "Heighway dragon",
    "Curves",
    "Repeated right-angle paper folds unfold into the interlocking dragon curve.",
    16,
    12,
    BOTANY,
  ],
  [
    "levy",
    "Lévy C curve",
    "Curves",
    "Replace each segment with two sides of an isosceles right triangle.",
    16,
    12,
    `${MATHWORLD}LevyFractal.html`,
  ],
  [
    "hilbert",
    "Hilbert curve",
    "Curves",
    "Four rotated copies weave a continuous path through an increasingly fine square grid.",
    8,
    5,
    BOTANY,
  ],
  [
    "peano",
    "Peano curve",
    "Curves",
    "A continuous path snakes through nine smaller squares at each refinement.",
    5,
    3,
    "https://graphicsinterface.org/wp-content/uploads/2015/03/gi1986-44.pdf",
  ],
  [
    "gosper",
    "Gosper curve",
    "Curves",
    "Seven smaller curves wind across a hexagonal grid to form the flowsnake.",
    5,
    3,
    BOTANY,
  ],
  [
    "arrowhead",
    "Sierpiński arrowhead",
    "Curves",
    "A continuous triangular path approaches the Sierpiński gasket as it repeats.",
    10,
    6,
    BOTANY,
  ],
  [
    "terdragon",
    "Terdragon",
    "Curves",
    "Three segments with 120-degree turns fold into a triangular dragon curve.",
    10,
    6,
    "https://www.jjj.de/pub/arndt-curve-search-arxiv-2018.pdf",
  ],
  [
    "moore",
    "Moore curve",
    "Curves",
    "Four connected Hilbert curves form a closed loop that fills a square in the limit.",
    7,
    4,
    "https://escholarship.org/content/qt25p5476t/qt25p5476t_noSplash_0cef0d8fe7ee8bbfdf357ca88d902f64.pdf",
  ],
  [
    "sierpinski",
    "Sierpiński triangle",
    "Geometric",
    "Remove the middle triangle, then repeat inside each of the three remaining triangles.",
    9,
    6,
    `${MATHWORLD}SierpinskiSieve.html`,
  ],
  [
    "carpet",
    "Sierpiński carpet",
    "Geometric",
    "Divide a square into nine parts and repeatedly remove the middle one.",
    5,
    4,
    `${MATHWORLD}SierpinskiCarpet.html`,
  ],
  [
    "cantor",
    "Cantor set",
    "Geometric",
    "Remove the middle third of every interval. Each row shows the next construction step.",
    9,
    6,
    `${MATHWORLD}CantorSet.html`,
  ],
  [
    "cantor-dust",
    "Cantor dust",
    "Geometric",
    "Keep the four corner squares: the two-dimensional product of the Cantor set.",
    7,
    4,
    `${MATHWORLD}CantorDust.html`,
  ],
  [
    "vicsek",
    "Vicsek fractal",
    "Geometric",
    "Keep a square’s center and four corners, then repeat this five-square pattern.",
    6,
    4,
    `${MATHWORLD}BoxFractal.html`,
  ],
  [
    "t-square",
    "T-square",
    "Geometric",
    "Add half-size squares at every corner, keeping all earlier squares in the growing union.",
    7,
    5,
    "https://www.wolframalpha.com/calculators/mathematics-iterated-objects-shape-replacement-rules",
  ],
  [
    "h-tree",
    "H-tree",
    "Geometric",
    "Attach a half-size H at each of the four endpoints of the previous H.",
    7,
    5,
    `${MATHWORLD}H-Fractal.html`,
  ],
  [
    "pythagoras",
    "Pythagoras tree",
    "Geometric",
    "Build two smaller squares on a right triangle above every parent square.",
    12,
    9,
    `${MATHWORLD}PythagorasTree.html`,
  ],
  [
    "pentaflake",
    "Pentaflake",
    "Geometric",
    "Five small pentagons surround a reversed central pentagon, repeating at the golden-ratio scale.",
    5,
    3,
    `${MATHWORLD}Pentaflake.html`,
  ],
  [
    "hexaflake",
    "Hexaflake",
    "Geometric",
    "Replace a hexagon with six corner hexagons and one center hexagon, each one-third size.",
    5,
    3,
    "https://www.cs.cornell.edu/courses/cs1110/2023fa/assignments/a4/",
  ],
  [
    "binary-tree",
    "Binary fractal tree",
    "Nature",
    "Every branch splits into two shorter branches at fixed angles.",
    13,
    9,
    BOTANY,
  ],
  [
    "fern",
    "Barnsley fern",
    "Nature",
    "Four weighted affine transformations scatter points into a fern, using the original fern coefficients.",
    10,
    6,
    `${MATHWORLD}BarnsleysFern.html`,
  ],
  [
    "plant",
    "L-system plant",
    "Nature",
    "A branching rewrite rule grows a plant with repeated stems and paired shoots.",
    6,
    5,
    BOTANY,
  ],
].map(([id, name, family, description, maxDepth, defaultDepth, source]) => ({
  id,
  name,
  family,
  description,
  maxDepth,
  defaultDepth,
  source,
  studio: STUDIO_SEEDS[id],
}));

const CURVES = {
  "koch-snowflake": ["F--F--F", { F: "F+F--F+F" }, 60, "F"],
  "koch-curve": ["F", { F: "F+F--F+F" }, 60, "F"],
  minkowski: ["F", { F: "F+F-F-FF+F+F-F" }, 90, "F"],
  "koch-island": ["F+F+F+F", { F: "F+F-F-FF+F+F-F" }, 90, "F"],
  dragon: ["FX", { X: "X+YF+", Y: "-FX-Y" }, 90, "F"],
  levy: ["F", { F: "+F--F+" }, 45, "F"],
  hilbert: ["A", { A: "+BF-AFA-FB+", B: "-AF+BFB+FA-" }, 90, "F"],
  peano: [
    "X",
    { X: "XFYFX+F+YFXFY-F-XFYFX", Y: "YFXFY-F-XFYFX+F+YFXFY" },
    90,
    "F",
  ],
  gosper: ["A", { A: "A-B--B+A++AA+B-", B: "+A-BB--B-A++A+B" }, 60, "AB"],
  arrowhead: ["A", { A: "B-A-B", B: "A+B+A" }, 60, "AB"],
  terdragon: ["F", { F: "F+F-F" }, 120, "F"],
  moore: ["LFL+F+LFL", { L: "-RF+LFL+FR-", R: "+LF-RFR-FL+" }, 90, "F"],
  plant: ["X", { X: "F+[[X]-X]-F[-FX]+X", F: "FF" }, 25, "F"],
};
const geometryCache = new Map();
const rasterCache = new Map();
const clamp = (value, low, high) =>
  Math.max(low, Math.min(high, Number.isFinite(value) ? value : low));

function remember(cache, key, value, limit) {
  if (cache.size >= limit) cache.delete(cache.keys().next().value);
  cache.set(key, value);
  return value;
}

function geometry(id, depth) {
  const key = `${id}:${depth}`;
  if (geometryCache.has(key)) return geometryCache.get(key);
  const result = { paths: [], polygons: [], rects: [], dots: [] };
  if (CURVES[id]) {
    const [axiom, rules, angle, forward] = CURVES[id];
    let x = 0,
      y = 0,
      heading = id === "plant" ? -Math.PI / 2 : 0;
    if (id === "arrowhead" && depth % 2) heading = Math.PI / 3;
    let path = [[x, y]];
    const stack = [];
    function walk(word, level) {
      for (const symbol of word) {
        if (level > 0 && rules[symbol]) walk(rules[symbol], level - 1);
        else if (forward.includes(symbol)) {
          x += Math.cos(heading);
          y += Math.sin(heading);
          path.push([x, y]);
        } else if (symbol === "+") heading += (angle * Math.PI) / 180;
        else if (symbol === "-") heading -= (angle * Math.PI) / 180;
        else if (symbol === "[") stack.push([x, y, heading]);
        else if (symbol === "]") {
          result.paths.push(path);
          [x, y, heading] = stack.pop();
          path = [[x, y]];
        }
      }
    }
    walk(axiom, depth);
    if (id === "moore") path.push(path[0]);
    result.paths.push(path);
  } else if (id === "sierpinski") {
    function triangle(a, b, c, n) {
      if (!n) result.polygons.push([a, b, c]);
      else {
        const ab = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const bc = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
        const ca = [(c[0] + a[0]) / 2, (c[1] + a[1]) / 2];
        triangle(a, ab, ca, n - 1);
        triangle(ab, b, bc, n - 1);
        triangle(ca, bc, c, n - 1);
      }
    }
    triangle([0.5, 0], [1, Math.sqrt(3) / 2], [0, Math.sqrt(3) / 2], depth);
  } else if (["carpet", "cantor-dust", "vicsek"].includes(id)) {
    function square(x, y, size, n) {
      if (!n) result.rects.push([x, y, size, size]);
      else
        for (let row = 0; row < 3; row++)
          for (let col = 0; col < 3; col++) {
            const corner = row !== 1 && col !== 1;
            if (
              id === "carpet"
                ? row !== 1 || col !== 1
                : corner || (id === "vicsek" && row === 1 && col === 1)
            ) {
              square(
                x + (col * size) / 3,
                y + (row * size) / 3,
                size / 3,
                n - 1,
              );
            }
          }
    }
    square(0, 0, 1, depth);
  } else if (id === "cantor") {
    function interval(x, size, level) {
      result.rects.push([x, level * 0.1, size, 0.04]);
      if (level < depth) {
        interval(x, size / 3, level + 1);
        interval(x + (2 * size) / 3, size / 3, level + 1);
      }
    }
    interval(0, 1, 0);
  } else if (id === "t-square") {
    function square(x, y, size, n) {
      result.rects.push([x - size / 2, y - size / 2, size, size]);
      if (n)
        for (const dx of [-1, 1])
          for (const dy of [-1, 1])
            square(x + (dx * size) / 2, y + (dy * size) / 2, size / 2, n - 1);
    }
    square(0, 0, 1, depth);
  } else if (id === "h-tree") {
    function h(x, y, size, n) {
      result.paths.push([
        [x - size / 2, y],
        [x + size / 2, y],
      ]);
      for (const dx of [-1, 1])
        result.paths.push([
          [x + (dx * size) / 2, y - size / 2],
          [x + (dx * size) / 2, y + size / 2],
        ]);
      if (n)
        for (const dx of [-1, 1])
          for (const dy of [-1, 1])
            h(x + (dx * size) / 2, y + (dy * size) / 2, size / 2, n - 1);
    }
    h(0, 0, 1, depth);
  } else if (id === "pythagoras") {
    function square(a, b, n) {
      const dx = b[0] - a[0],
        dy = b[1] - a[1];
      const c = [b[0] + dy, b[1] - dx],
        d = [a[0] + dy, a[1] - dx];
      result.polygons.push([a, b, c, d]);
      if (n) {
        const top = [(c[0] + d[0] + dy) / 2, (c[1] + d[1] - dx) / 2];
        square(d, top, n - 1);
        square(top, c, n - 1);
      }
    }
    square([0, 0], [1, 0], depth);
  } else if (id === "pentaflake" || id === "hexaflake") {
    const sides = id === "pentaflake" ? 5 : 6;
    const ratio = sides === 5 ? 2 / (3 + Math.sqrt(5)) : 1 / 3;
    function flake(x, y, radius, heading, n) {
      if (!n) {
        result.polygons.push(
          Array.from({ length: sides }, (_, i) => [
            x + radius * Math.cos(heading + (i * 2 * Math.PI) / sides),
            y + radius * Math.sin(heading + (i * 2 * Math.PI) / sides),
          ]),
        );
      } else {
        flake(
          x,
          y,
          radius * ratio,
          heading + (sides === 5 ? Math.PI : 0),
          n - 1,
        );
        for (let i = 0; i < sides; i++) {
          const angle = heading + (i * 2 * Math.PI) / sides;
          flake(
            x + radius * (1 - ratio) * Math.cos(angle),
            y + radius * (1 - ratio) * Math.sin(angle),
            radius * ratio,
            heading,
            n - 1,
          );
        }
      }
    }
    flake(0, 0, 1, -Math.PI / 2, depth);
  } else if (id === "binary-tree") {
    function branch(x, y, length, heading, n) {
      const tip = [
        x + length * Math.cos(heading),
        y + length * Math.sin(heading),
      ];
      result.paths.push([[x, y], tip]);
      if (n)
        for (const turn of [-1, 1])
          branch(...tip, length * 0.7, heading + (turn * Math.PI) / 6, n - 1);
    }
    branch(0, 0, 1, -Math.PI / 2, depth);
  } else if (id === "fern") {
    let seed = 42,
      x = 0,
      y = 0;
    for (let i = 0; i < 4000 + depth * 7000; i++) {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      const r = seed / 4294967296;
      if (r < 0.01) {
        x = 0;
        y *= 0.16;
      } else if (r < 0.86)
        [x, y] = [0.85 * x + 0.04 * y, -0.04 * x + 0.85 * y + 1.6];
      else if (r < 0.93)
        [x, y] = [0.2 * x - 0.26 * y, 0.23 * x + 0.22 * y + 1.6];
      else [x, y] = [-0.15 * x + 0.28 * y, 0.26 * x + 0.24 * y + 0.44];
      if (i > 20) result.dots.push([x, -y]);
    }
  }
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  function include(x, y) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  for (const paths of [result.paths, result.polygons])
    for (const path of paths) for (const point of path) include(...point);
  for (const [x, y, w, h] of result.rects) {
    include(x, y);
    include(x + w, y + h);
  }
  for (const point of result.dots) include(...point);
  result.bounds = Number.isFinite(minX)
    ? { minX, minY, maxX, maxY }
    : { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  return remember(geometryCache, key, result, 40);
}

const JULIA = {
  julia: [-0.8, 0.156],
  rabbit: [-0.122561166876, 0.744861766619],
};
const ESCAPE_VIEWS = {
  mandelbrot: [-0.55, 0, 3.4],
  julia: [0, 0, 3.4],
  rabbit: [0, 0, 3.4],
  "burning-ship": [-0.35, -0.4, 3.5],
  tricorn: [-0.25, 0, 3.4],
  multibrot: [0, 0, 3.2],
  newton: [0, 0, 3.5],
};
// Deepest zooms that still resolve detail at each target, measured by rendering each decade.
const ESCAPE_LIMITS = {
  mandelbrot: 1e11,
  julia: 1e12,
  rabbit: 1e12,
  "burning-ship": 1e4,
  tricorn: 1e4,
  multibrot: 1e12,
  newton: 1e5,
};

function zoomTarget(id) {
  const item = CLASSICS.find((entry) => entry.id === id);
  const scene = geometry(id, item.maxDepth);
  const path = scene.paths[Math.floor(scene.paths.length * 0.4)];
  const polygon = scene.polygons[Math.floor(scene.polygons.length * 0.4)];
  const rect = scene.rects[Math.floor(scene.rects.length * 0.4)];
  const dot = scene.dots[Math.floor(scene.dots.length / 2)];
  const index = path ? Math.floor(path.length * 0.4) : 0;
  const point = path?.[index] || polygon?.[0] || dot || rect;
  let feature = 0;
  if (path?.length > 1) {
    const at = Math.max(1, index);
    feature = Math.hypot(
      path[at][0] - path[at - 1][0],
      path[at][1] - path[at - 1][1],
    );
  } else if (polygon)
    feature = Math.hypot(
      polygon[1][0] - polygon[0][0],
      polygon[1][1] - polygon[0][1],
    );
  else if (!dot && rect) feature = Math.min(rect[2], rect[3]);
  return { scene, point, feature };
}

/**
 * Zoom speed as a factor per second, and the deepest zoom that still adds
 * detail: floating-point precision for escape-time sets, and the point where
 * the finest stored piece would span about 24 preview pixels for geometry.
 */
export function getZoomPace(id) {
  if (!CLASSICS.some((item) => item.id === id))
    throw new RangeError(`Unknown fractal: ${id}`);
  if (ESCAPE_VIEWS[id]) return { rate: 4, limit: ESCAPE_LIMITS[id] };
  const { scene, feature } = zoomTarget(id);
  const { minX, minY, maxX, maxY } = scene.bounds;
  const extent = Math.max(maxX - minX, maxY - minY);
  return {
    rate: 16 ** (1 / 6),
    limit: feature ? clamp(extent / (22 * feature), 16, 256) : 16,
  };
}

/** Escape cameras use complex coordinates; other cameras use normalized geometry bounds. */
export function getZoomCamera(id, seconds) {
  const { rate, limit } = getZoomPace(id);
  const time = clamp(seconds, 0, 3600);
  const zoom = Math.min(limit, rate ** time);
  if (ESCAPE_VIEWS[id]) {
    const [baseX, baseY] = ESCAPE_VIEWS[id];
    if (time === 0) return { zoom: 1, centerX: baseX, centerY: baseY };
    let target =
      id === "mandelbrot"
        ? [-0.743643887037151, 0.13182590420533]
        : id === "burning-ship"
          ? [-1.7443359375, -0.017451171875]
          : id === "multibrot"
            ? [
                Math.sqrt((Math.sqrt(3) - 1.5) / 2),
                Math.sqrt((Math.sqrt(3) + 1.5) / 2),
              ]
            : id === "tricorn"
              ? [0.25, 0]
              : [0, 0];
    if (JULIA[id]) {
      const [cr, ci] = JULIA[id],
        a = 1 - 4 * cr,
        b = -4 * ci,
        radius = Math.hypot(a, b);
      target = [
        (1 + Math.sqrt((radius + a) / 2)) / 2,
        (Math.sign(b) * Math.sqrt((radius - a) / 2)) / 2,
      ];
    }
    return {
      zoom,
      centerX: target[0] + (baseX - target[0]) / zoom,
      centerY: target[1] + (baseY - target[1]) / zoom,
    };
  }
  const { scene, point } = zoomTarget(id);
  const { minX, minY, maxX, maxY } = scene.bounds;
  const x = (point[0] - minX) / Math.max(maxX - minX, 1e-9),
    y = (point[1] - minY) / Math.max(maxY - minY, 1e-9);
  return { zoom, centerX: x + (0.5 - x) / zoom, centerY: y + (0.5 - y) / zoom };
}

function rgb(hex) {
  const value = hex.replace("#", "");
  const full =
    value.length === 3 ? [...value].map((c) => c + c).join("") : value;
  return [0, 2, 4].map(
    (start) => Number.parseInt(full.slice(start, start + 2), 16) || 0,
  );
}

function escapeRaster(
  context,
  id,
  depth,
  width,
  height,
  colors,
  background,
  camera,
  quality,
) {
  const [defaultX, defaultY, span] = ESCAPE_VIEWS[id];
  const zoom = clamp(camera?.zoom ?? 1, 0.25, 1e12);
  const centerX = Number.isFinite(camera?.centerX) ? camera.centerX : defaultX;
  const centerY = Number.isFinite(camera?.centerY) ? camera.centerY : defaultY;
  const iterations = Math.min(
    2000,
    Math.max(1, Math.round(depth + 230 * Math.log10(zoom))),
  );
  // ponytail: bound sampling to 4096 pixels per side; use tiled rendering for larger native exports.
  const factor = Math.min(
    1,
    clamp(quality, 32, 4096) / Math.max(width, height),
  );
  const w = Math.max(1, Math.round(width * factor)),
    h = Math.max(1, Math.round(height * factor));
  const key = [
    id,
    iterations,
    w,
    h,
    ...colors,
    background,
    zoom,
    centerX,
    centerY,
  ].join(":");
  if (rasterCache.has(key)) return rasterCache.get(key);
  const image = context.createImageData(w, h),
    data = image.data,
    [first, second, bg] = [...colors, background].map(rgb);
  const roots = [
    first,
    second,
    first.map((channel, c) => Math.round((channel + second[c]) / 2)),
  ];
  const julia = JULIA[id];
  const startAtPixel = Boolean(julia) || id === "newton";
  const flip = id === "burning-ship" ? -1 : 1;
  const rootY = Math.sqrt(3) / 2;
  const units = span / Math.min(w, h) / zoom;
  const stops = [[8, 17, 34], first, [249, 250, 253], second, [8, 17, 34]];
  const palette = Array.from({ length: 256 }, (_, index) => {
    const position = (index / 255) * 4;
    const segment = Math.min(3, Math.floor(position));
    const fraction = position - segment;
    const t = fraction * fraction * (3 - 2 * fraction);
    return stops[segment].map((channel, c) =>
      Math.round(channel * (1 - t) + stops[segment + 1][c] * t),
    );
  });
  for (let py = 0; py < h; py++)
    for (let px = 0; px < w; px++) {
      const real = centerX + (px + 0.5 - w / 2) * units;
      const imaginary = centerY + (h / 2 - py - 0.5) * units * flip;
      let x = startAtPixel ? real : 0,
        y = startAtPixel ? imaginary : 0;
      const cr = julia?.[0] ?? real,
        ci = julia?.[1] ?? imaginary;
      let count = 0,
        basin = -1;
      if (id === "newton") {
        while (count < iterations) {
          const squareReal = x * x - y * y,
            squareImag = 2 * x * y;
          const denominator =
            3 * (squareReal * squareReal + squareImag * squareImag);
          if (denominator < 1e-24 || !Number.isFinite(denominator)) break;
          x = (2 * x) / 3 + squareReal / denominator;
          y = (2 * y) / 3 - squareImag / denominator;
          count++;
          // Squared distances below 1e-10 match a root within 1e-5.
          const left = (x + 0.5) * (x + 0.5);
          if ((x - 1) * (x - 1) + y * y < 1e-10) {
            basin = 0;
            break;
          }
          if (left + (y - rootY) * (y - rootY) < 1e-10) {
            basin = 1;
            break;
          }
          if (left + (y + rootY) * (y + rootY) < 1e-10) {
            basin = 2;
            break;
          }
        }
      } else {
        const q = (cr - 0.25) ** 2 + ci * ci;
        if (
          id === "mandelbrot" &&
          (q * (q + cr - 0.25) < (ci * ci) / 4 ||
            (cr + 1) ** 2 + ci * ci < 0.0625)
        )
          count = iterations;
        while (count < iterations && x * x + y * y <= 4) {
          const oldX = x,
            xx = x * x,
            yy = y * y;
          if (id === "multibrot") {
            x = oldX * (xx - 3 * yy) + cr;
            y = y * (3 * xx - yy) + ci;
          } else {
            x = xx - yy + cr;
            y =
              (id === "burning-ship"
                ? Math.abs(2 * oldX * y)
                : (id === "tricorn" ? -2 : 2) * oldX * y) + ci;
          }
          count++;
        }
      }
      let color = bg,
        mix = 0;
      if (id === "newton" && basin >= 0) {
        color = roots[basin];
        mix = 0.42 + 0.58 * Math.exp(-count / 18);
      } else if (id !== "newton" && count < iterations) {
        const smooth =
          count + 1 - Math.log2(Math.max(1, 0.5 * Math.log2(x * x + y * y)));
        color = palette[Math.round(((Math.sin(smooth * 0.11) + 1) / 2) * 255)];
        mix = Math.min(1, 0.06 + count / 14);
      }
      const offset = (py * w + px) * 4;
      for (let c = 0; c < 3; c++)
        data[offset + c] = Math.round(bg[c] * (1 - mix) + color[c] * mix);
      data[offset + 3] = 255;
    }
  let canvas;
  if (typeof OffscreenCanvas !== "undefined")
    canvas = new OffscreenCanvas(w, h);
  else if (context.canvas?.ownerDocument) {
    canvas = context.canvas.ownerDocument.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
  }
  if (canvas) canvas.getContext("2d").putImageData(image, 0, 0);
  // Keep only one copy of the pixels: the canvas when there is one.
  return remember(
    rasterCache,
    key,
    canvas ? { canvas, width: w, height: h } : { image, width: w, height: h },
    4,
  );
}

function drawGeometry(
  context,
  scene,
  width,
  height,
  colors,
  progress,
  camera,
  referenceBounds = scene.bounds,
) {
  const { minX, minY, maxX, maxY } = referenceBounds;
  const extentX = Math.max(maxX - minX, 1e-9),
    extentY = Math.max(maxY - minY, 1e-9);
  const zoom = clamp(camera?.zoom ?? 1, 0.25, 1e8);
  const scale =
    Math.min((width * 0.82) / extentX, (height * 0.82) / extentY) * zoom;
  const cx = minX + clamp(camera?.centerX ?? 0.5, 0, 1) * extentX;
  const cy = minY + clamp(camera?.centerY ?? 0.5, 0, 1) * extentY;
  const gradient = context.createLinearGradient(0, height, width, 0);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  context.fillStyle = gradient;
  context.strokeStyle = gradient;
  context.save();
  context.translate(width / 2, height / 2);
  context.scale(scale, scale);
  context.translate(-cx, -cy);
  context.lineWidth = Math.max(0.8, Math.min(width, height) / 480) / scale;
  context.lineJoin = "round";
  context.lineCap = "round";
  let remaining =
    scene.paths.reduce((sum, path) => sum + Math.max(0, path.length - 1), 0) *
    progress;
  context.beginPath();
  for (const path of scene.paths) {
    if (remaining <= 0 || path.length < 2) continue;
    context.moveTo(...path[0]);
    for (let i = 1; i < path.length && remaining > 0; i++, remaining--) {
      const part = Math.min(1, remaining),
        previous = path[i - 1],
        point = path[i];
      context.lineTo(
        previous[0] + (point[0] - previous[0]) * part,
        previous[1] + (point[1] - previous[1]) * part,
      );
    }
  }
  context.stroke();
  for (const polygon of scene.polygons) {
    context.beginPath();
    context.moveTo(...polygon[0]);
    for (let i = 1; i < polygon.length; i++) context.lineTo(...polygon[i]);
    context.closePath();
    context.fill();
  }
  for (const rect of scene.rects) context.fillRect(...rect);
  const dotSize = Math.max(0.8, Math.min(width, height) / 600) / scale;
  for (let i = 0; i < Math.floor(scene.dots.length * progress); i++)
    context.fillRect(...scene.dots[i], dotSize, dotSize);
  context.restore();
}

export function drawClassic(
  context,
  {
    id,
    depth,
    width,
    height,
    colors = ["#26a99a", "#8777d9"],
    background = "#101719",
    progress = 1,
    camera,
    quality = 768,
  } = {},
) {
  const item = CLASSICS.find((entry) => entry.id === id);
  if (!item) throw new RangeError(`Unknown fractal: ${id}`);
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  )
    throw new RangeError("Canvas dimensions must be positive finite numbers.");
  const detail = Math.floor(
    clamp(depth ?? item.defaultDepth, 0, item.maxDepth),
  );
  const p = clamp(progress, 0, 1);
  context.save();
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  if (item.family === "Escape-time") {
    if (p > 0) {
      const raster = escapeRaster(
        context,
        id,
        detail,
        width,
        height,
        colors,
        background,
        camera,
        quality,
      );
      const rows = Math.max(1, Math.floor(raster.height * p));
      if (raster.canvas)
        context.drawImage(
          raster.canvas,
          0,
          0,
          raster.width,
          rows,
          0,
          0,
          width,
          (height * rows) / raster.height,
        );
      else context.putImageData(raster.image, 0, 0, 0, 0, raster.width, rows);
    }
  } else {
    // Zoom animations (cameras with a center) reveal full detail; a plain zoom keeps the chosen detail.
    const targetDepth =
      camera?.centerX !== undefined ? item.maxDepth : detail;
    const target = geometry(id, targetDepth);
    if (item.family === "Geometric" && id !== "h-tree" && !camera) {
      const level = p * targetDepth,
        whole = Math.floor(level),
        fraction = level - whole;
      const current = geometry(id, whole);
      if (fraction > 0) {
        context.globalAlpha = 1 - fraction;
        drawGeometry(
          context,
          current,
          width,
          height,
          colors,
          1,
          camera,
          target.bounds,
        );
        context.globalAlpha = 1;
        drawGeometry(
          context,
          geometry(id, whole + 1),
          width,
          height,
          colors,
          1,
          camera,
          target.bounds,
        );
      } else
        drawGeometry(
          context,
          current,
          width,
          height,
          colors,
          1,
          camera,
          target.bounds,
        );
    } else drawGeometry(context, target, width, height, colors, p, camera);
  }
  context.restore();
}
