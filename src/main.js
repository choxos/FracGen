import {
  MAX_ITERATIONS,
  PRESETS,
  generateFractal,
  generateGrowthFrame,
  getBounds,
  levelsWithinBudget,
  toPath,
} from "./fractal.js";
import {
  FPS,
  createExport,
  frameMoment,
  getMp4MimeType,
  isMp4Supported,
} from "./export.js";
import { drawSeedZoom, getSeedZoomPace } from "./seed-zoom.js";
import { initGallery } from "./gallery.js";
import { getZoomCamera, getZoomPace } from "./classics.js";
import { classicExporter, createPainter } from "./classic-renderer.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const icons = {
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .3c0 1.8-2.5 1.8-2.5 3.7m0 3h.01"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2.5 9M3 4v6h6"/>',
  cursor: '<path d="m5 3 14 10-7 1-3 7Z"/>',
  pencil: '<path d="m4 16 12-12 4 4L8 20H4Zm9-9 4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  undo: '<path d="M4 9h9a7 7 0 0 1 0 14M4 9l5-5M4 9l5 5" transform="translate(0 -2)"/>',
  line: '<path d="M4 12h16"/>',
  triangle: '<path d="m12 3 10 17H2Z"/>',
  square: '<rect x="4" y="4" width="16" height="16" rx="1"/>',
  hexagon: '<path d="m7 3 10 0 5 9-5 9H7l-5-9Z"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  sparkle:
    '<path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3Z"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="1"/>',
  moon: '<path d="M20.5 13a9 9 0 0 1-9.5-9.5A9 9 0 1 0 20.5 13Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>',
  fit: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  "arrow-down": '<path d="M12 4v16m-5-5 5 5 5-5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  keyboard:
    '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.1m3.9 0h.1m3.9 0h.1m3.9 0h.1M6 12h.1m3.9 0h.1m3.9 0h.1m3.9 0h.1M7 15h10"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.sparkle}</svg>`;
$$("[data-icon]").forEach((element) => {
  element.innerHTML = icon(element.dataset.icon);
});

const palettes = {
  lagoon: { name: "Lagoon", colors: ["#159f9b", "#8070cb"] },
  violet: { name: "Violet", colors: ["#6d50ca", "#c276c2"] },
  sunset: { name: "Sunset", colors: ["#dc6745", "#b83e88"] },
  ocean: { name: "Ocean", colors: ["#2571bd", "#38a6b8"] },
  ink: { name: "Ink", colors: ["#323c4b", "#7d899a"] },
};
const presetOrigin = (preset) => ({
  id: preset.id,
  title: `The ${preset.name.toLowerCase()}`,
  seed: preset.seed,
  sides: preset.sides,
});
const state = {
  seed: structuredClone(PRESETS[0].seed),
  iterations: 5,
  sides: 3,
  palette: "lagoon",
  // Where the current line came from: a starter or a line-based library fractal.
  origin: presetOrigin(PRESETS[0]),
  custom: false,
  zoom: 1,
  dark: false,
  // A library fractal without a line ({ item, depth }), shown instead of the line.
  classic: null,
};
let mode = "edit";
let history = [];
let result;
let animationTimer;
let animationFrameIndex = 0;
let animationPaused = false;
let activeExportClassic = null;
const motion = { animationMode: "smooth", animationFrames: 180, type: "zoom" };
let animationLevel = null;
let animationBounds = null;
let classicMoment = null;
let dragIndex = null;
let dragUndoPending = false;
let drawPoints = null;
let renderFrame;
let toastTimer;
let exportController;
let exportUrl;
let mp4Supported;

const background = () => (state.dark ? "#18232d" : "#fcfdfd");
const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const formatZoom = (zoom) =>
  zoom < 10_000
    ? Math.round(zoom).toLocaleString("en")
    : compactNumber.format(zoom);
const lineLevels = () =>
  Math.min(
    state.iterations,
    levelsWithinBudget(state.seed.length - 1, state.sides),
  );
const settings = () => ({
  ...motion,
  colors: [...palettes[state.palette].colors],
  background: background(),
});
const stagePaint = createPainter(
  $("#animation-canvas").getContext("2d"),
  (error) => {
    if (error.name !== "AbortError") notify(error.message);
  },
);

const notify = (message) => {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    $("#toast").hidden = true;
  }, 3500);
};
function remember() {
  history.push({ seed: structuredClone(state.seed), custom: state.custom });
  if (history.length > 30) history.shift();
  $("#undo").disabled = false;
}
function renderEditor(focusIndex) {
  $("#seed-path").setAttribute(
    "d",
    state.seed
      .map((p, i) => `${i ? "L" : "M"}${30 + p.x * 240},${130 + p.y * 240}`)
      .join(""),
  );
  $("#seed-handles").innerHTML = state.seed
    .map((point, index) => {
      const fixed = index === 0 || index === state.seed.length - 1;
      const x = 30 + point.x * 240;
      const y = 130 + point.y * 240;
      return `${fixed ? "" : `<circle class="point-hit" cx="${x}" cy="${y}" r="15" data-point="${index}"/>`}<circle class="seed-point${fixed ? " fixed" : ""}" cx="${x}" cy="${y}" r="${fixed ? 4.5 : 5.5}" ${fixed ? 'aria-hidden="true"' : `data-point="${index}" tabindex="0" role="button" aria-label="Point ${index + 1}, horizontal ${Math.round(point.x * 100)} percent, height ${Math.round(-point.y * 100)}. Arrow keys move; Delete removes."`}/>`;
    })
    .join("");
  $("#point-count").textContent =
    `${state.seed.length} points. Your starting spark.`;
  $("#add-point").disabled = state.seed.length >= 12;
  if (focusIndex !== undefined)
    $(`.seed-point[data-point="${focusIndex}"]`)?.focus({
      preventScroll: true,
    });
}
function showCanvas(visible) {
  $("#animation-canvas").hidden = !visible;
  $("#fractal-canvas").toggleAttribute("hidden", visible);
}
function setDetailSlider(min, max, value) {
  Object.assign($("#detail"), { min, max, value });
  $("#detail-value").value = value.toLocaleString("en");
}
function classicOptions() {
  if (!state.classic) return null;
  const options = {
    id: state.classic.item.id,
    depth: state.classic.depth,
    width: 900,
    height: 660,
    colors: palettes[state.palette].colors,
    background: background(),
    quality: animationTimer ? 360 : 900,
  };
  if (classicMoment) return { ...options, ...classicMoment };
  if (state.zoom !== 1) options.camera = { zoom: state.zoom };
  return options;
}
function renderClassic() {
  const { item, depth } = state.classic;
  showCanvas(true);
  stagePaint(classicOptions);
  $("#animation-canvas").setAttribute(
    "aria-label",
    `${item.name}, ${item.family.toLowerCase()} fractal`,
  );
  $("#detail-label").textContent = "Detail";
  setDetailSlider(item.family === "Escape-time" ? 20 : 1, item.maxDepth, depth);
  $("#design-name").textContent = item.name;
  $("#stage-subtitle").textContent = `${item.family} fractal from the library.`;
  $("#segment-count").textContent = item.family;
  $("#iteration-count").textContent = `Detail ${depth.toLocaleString("en")}`;
  $("#limit-message").hidden = true;
}
function renderFractal() {
  const colors = palettes[state.palette].colors;
  $("#gradient-start").setAttribute("stop-color", colors[0]);
  $("#gradient-end").setAttribute("stop-color", colors[1]);
  $("#zoom-value").value = `${Math.round(state.zoom * 100)}%`;
  $("#zoom-out").disabled = state.zoom <= 0.5;
  $("#zoom-in").disabled = state.zoom >= 3;
  $$(".preset-card").forEach((b) =>
    b.setAttribute(
      "aria-pressed",
      String(
        !state.classic && !state.custom && state.origin.id === b.dataset.preset,
      ),
    ),
  );
  updateAnimationNote();
  if (state.classic) {
    renderClassic();
    return;
  }
  const depth = state.iterations;
  showCanvas(false);
  result =
    animationLevel === null
      ? generateFractal(state.seed, depth, state.sides)
      : generateGrowthFrame(state.seed, animationLevel, depth, state.sides);
  const bounds = animationBounds || getBounds(result.points);
  const scale =
    Math.min(
      665 / Math.max(bounds.width, 0.1),
      450 / Math.max(bounds.height, 0.1),
    ) * state.zoom;
  const x = 450 - ((bounds.minX + bounds.maxX) / 2) * scale;
  const y = 326 - ((bounds.minY + bounds.maxY) / 2) * scale;
  $("#fractal-path").setAttribute("d", toPath(result.points));
  $("#fractal-position").setAttribute(
    "transform",
    `translate(${x} ${y}) scale(${scale})`,
  );
  $("#fractal-path").setAttribute(
    "stroke-width",
    state.sides === 1 ? "1.65" : "1.25",
  );
  $("#segment-count").textContent =
    `${result.segments.toLocaleString()} segments`;
  $("#iteration-count").textContent =
    `${result.iterations} repetition${result.iterations === 1 ? "" : "s"}`;
  $("#detail-label").textContent = "Repetitions";
  // The slider stops at the deepest complete level this line can draw.
  setDetailSlider(
    0,
    levelsWithinBudget(state.seed.length - 1, state.sides),
    lineLevels(),
  );
  const name = state.custom ? "Your own creation" : state.origin.title;
  $("#design-name").textContent = name;
  $("#stage-subtitle").textContent = "One small shape, repeated.";
  $("#fractal-title").textContent = name;
  $("#fractal-description").textContent =
    `Your shape repeated ${result.iterations} times, creating ${result.segments.toLocaleString()} line segments. ${palettes[state.palette].name} colors.`;
  $("#limit-message").hidden = !result.limited;
  $("#limit-message").textContent =
    `Showing ${result.iterations} repetitions to keep your canvas responsive. Remove some points to explore more repetitions.`;
}
function scheduleRender() {
  cancelAnimationFrame(renderFrame);
  renderFrame = requestAnimationFrame(renderFractal);
}
function setAnimateButton(iconName, label, pressed) {
  $("#animate-label").textContent = label;
  $("#animate-button [data-icon]").innerHTML = icon(iconName);
  $("#animate-button").setAttribute("aria-pressed", String(pressed));
}
function stopAnimation() {
  cancelAnimationFrame(animationTimer);
  animationTimer = null;
  animationLevel = null;
  animationBounds = null;
  classicMoment = null;
  animationPaused = false;
  animationFrameIndex = 0;
  showCanvas(Boolean(state.classic));
  $("#animation-timeline").hidden = true;
  setAnimateButton(
    "play",
    motion.type === "zoom" ? "Watch it zoom" : "Watch it grow",
    false,
  );
}
function editShape(focusIndex) {
  stopAnimation();
  state.custom = true;
  renderEditor(focusIndex);
  scheduleRender();
}
function setMode(next) {
  mode = next;
  $("#edit-mode").classList.toggle("selected", next === "edit");
  $("#draw-mode").classList.toggle("selected", next === "draw");
  $("#edit-mode").setAttribute("aria-pressed", String(next === "edit"));
  $("#draw-mode").setAttribute("aria-pressed", String(next === "draw"));
  $("#shape-editor").classList.toggle("draw-active", next === "draw");
  $("#editor-hint").textContent =
    next === "draw"
      ? "Draw from start to end. Keep it simple."
      : "Drag the dots. See what happens.";
}
function editorPoint(event) {
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    $("#shape-editor").getScreenCTM().inverse(),
  );
  return {
    x: Math.max(0, Math.min(1, (point.x - 30) / 240)),
    y: Math.max(-0.5, Math.min(0.3, (point.y - 130) / 240)),
  };
}
function sampledLine(points) {
  const interior = points.filter((p) => p.x > 0.025 && p.x < 0.975);
  const count = Math.min(8, interior.length);
  return [
    { x: 0, y: 0 },
    ...Array.from(
      { length: count },
      (_, i) =>
        interior[
          Math.round((i * (interior.length - 1)) / Math.max(count - 1, 1))
        ],
    ),
    { x: 1, y: 0 },
  ];
}
$("#shape-editor").addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  const target = event.target.closest("[data-point]");
  if (mode === "draw") {
    remember();
    drawPoints = [editorPoint(event)];
    state.seed = sampledLine(drawPoints);
    editShape();
  } else if (target) {
    // Save an undo step on the first move, so a click alone leaves no empty step.
    dragUndoPending = true;
    dragIndex = Number(target.dataset.point);
    $(`.seed-point[data-point="${dragIndex}"]`)?.focus({ preventScroll: true });
  } else return;
  $("#shape-editor").setPointerCapture(event.pointerId);
  event.preventDefault();
});
$("#shape-editor").addEventListener("pointermove", (event) => {
  if (drawPoints) {
    const point = editorPoint(event);
    const last = drawPoints.at(-1);
    if (Math.hypot(point.x - last.x, point.y - last.y) > 0.025) {
      drawPoints.push(point);
      state.seed = sampledLine(drawPoints);
      editShape();
    }
  } else if (dragIndex !== null) {
    if (dragUndoPending) remember();
    dragUndoPending = false;
    state.seed[dragIndex] = editorPoint(event);
    editShape();
  }
});
function endPointer() {
  if (drawPoints) {
    drawPoints = null;
    setMode("edit");
    notify("Your line is now a fractal. Try moving a dot.");
  }
  if (dragIndex !== null) renderEditor(dragIndex);
  dragIndex = null;
  dragUndoPending = false;
}
$("#shape-editor").addEventListener("pointerup", endPointer);
$("#shape-editor").addEventListener("pointercancel", endPointer);
$("#shape-editor").addEventListener("lostpointercapture", endPointer);
$("#shape-editor").addEventListener("keydown", (event) => {
  const target = event.target.closest(".seed-point[data-point]");
  if (
    !target ||
    ![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Delete",
      "Backspace",
    ].includes(event.key)
  )
    return;
  event.preventDefault();
  const index = Number(target.dataset.point);
  remember();
  if (event.key === "Delete" || event.key === "Backspace") {
    state.seed.splice(index, 1);
    editShape(Math.min(index, state.seed.length - 2));
    if (state.seed.length === 2) $("#add-point").focus();
    return;
  }
  const step = event.shiftKey ? 0.05 : 0.01;
  const point = state.seed[index];
  point.x = Math.max(
    0,
    Math.min(
      1,
      point.x +
        (event.key === "ArrowRight"
          ? step
          : event.key === "ArrowLeft"
            ? -step
            : 0),
    ),
  );
  point.y = Math.max(
    -0.5,
    Math.min(
      0.3,
      point.y +
        (event.key === "ArrowDown"
          ? step
          : event.key === "ArrowUp"
            ? -step
            : 0),
    ),
  );
  editShape(index);
});
$("#edit-mode").addEventListener("click", () => setMode("edit"));
$("#draw-mode").addEventListener("click", () => setMode("draw"));
$("#add-point").addEventListener("click", () => {
  if (state.seed.length >= 12) return;
  remember();
  let longest = 0;
  let insertAt = 1;
  for (let i = 1; i < state.seed.length; i++) {
    const distance = Math.hypot(
      state.seed[i].x - state.seed[i - 1].x,
      state.seed[i].y - state.seed[i - 1].y,
    );
    if (distance > longest) {
      longest = distance;
      insertAt = i;
    }
  }
  const a = state.seed[insertAt - 1];
  const b = state.seed[insertAt];
  state.seed.splice(insertAt, 0, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  setMode("edit");
  editShape(insertAt);
});
function undo() {
  if (!history.length) return;
  stopAnimation();
  Object.assign(state, history.pop());
  $("#undo").disabled = !history.length;
  renderEditor();
  renderFractal();
}
$("#undo").addEventListener("click", undo);
$("#reset-shape").addEventListener("click", () => {
  remember();
  stopAnimation();
  state.seed = structuredClone(state.origin.seed);
  state.custom = false;
  setMode("edit");
  renderEditor();
  renderFractal();
  notify("Shape reset. A fresh starting point.");
});
$("#detail").addEventListener("input", (event) => {
  stopAnimation();
  const value = Number(event.target.value);
  if (state.classic) state.classic.depth = value;
  else state.iterations = value;
  renderFractal();
});
$$("[data-sides]").forEach((button) =>
  button.addEventListener("click", () => {
    stopAnimation();
    state.sides = Number(button.dataset.sides);
    state.zoom = 1;
    updateBase();
    renderFractal();
  }),
);
function updateBase() {
  $$("[data-sides]").forEach((button) => {
    button.classList.toggle(
      "selected",
      Number(button.dataset.sides) === state.sides,
    );
    button.setAttribute(
      "aria-pressed",
      String(Number(button.dataset.sides) === state.sides),
    );
  });
}
$$("[data-palette]").forEach((button) =>
  button.addEventListener("click", () => {
    stopAnimation();
    state.palette = button.dataset.palette;
    $$("[data-palette]").forEach((b) => {
      b.classList.toggle("selected", b === button);
      b.setAttribute("aria-pressed", String(b === button));
    });
    $("#palette-name").textContent = palettes[state.palette].name;
    renderFractal();
  }),
);
$("#zoom-in").addEventListener("click", () => {
  stopAnimation();
  state.zoom = Math.min(3, state.zoom + 0.25);
  renderFractal();
});
$("#zoom-out").addEventListener("click", () => {
  stopAnimation();
  state.zoom = Math.max(0.5, state.zoom - 0.25);
  renderFractal();
});
$("#fit-view").addEventListener("click", () => {
  stopAnimation();
  state.zoom = 1;
  renderFractal();
});
$("#background-button").addEventListener("click", () => {
  stopAnimation();
  state.dark = !state.dark;
  renderFractal();
  $("#fractal-stage").classList.toggle("dark", state.dark);
  $("#background-button").setAttribute("aria-pressed", String(state.dark));
  $("#background-button").setAttribute(
    "aria-label",
    `Switch to ${state.dark ? "light" : "dark"} canvas`,
  );
  $("#background-button").innerHTML = icon(state.dark ? "sun" : "moon");
});
function toggleExpanded(force) {
  const expanded = force ?? !$(".preview-panel").classList.contains("expanded");
  $(".preview-panel").classList.toggle("expanded", expanded);
  $("#fullscreen-button").setAttribute("aria-pressed", String(expanded));
  $("#fullscreen-button").setAttribute(
    "aria-label",
    expanded ? "Close expanded preview" : "Expand preview",
  );
  document.body.style.overflow = expanded ? "hidden" : "";
  $("#fullscreen-button").innerHTML = icon(expanded ? "close" : "expand");
  document
    .querySelectorAll(
      "body > :not(main), main > :not(.studio-layout), .control-panel",
    )
    .forEach((el) => {
      if (!el.matches("dialog, script, .toast")) el.inert = expanded;
    });
}
$("#fullscreen-button").addEventListener("click", () => toggleExpanded());
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    $(".preview-panel").classList.contains("expanded")
  )
    toggleExpanded(false);
  if (
    (event.metaKey || event.ctrlKey) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === "z" &&
    !event.target.closest?.("input, select, textarea") &&
    !document.querySelector("dialog[open]") &&
    !state.classic &&
    history.length
  ) {
    event.preventDefault();
    undo();
  }
});
function drawAnimationFrame(index) {
  const timing = { frames: motion.animationFrames, mode: motion.animationMode };
  if (state.classic) {
    const { progress, time } = frameMoment(index, timing);
    classicMoment =
      motion.type === "zoom"
        ? { camera: getZoomCamera(state.classic.item.id, time) }
        : { progress };
    stagePaint(classicOptions);
    if (classicMoment.camera)
      $("#zoom-value").value = `${formatZoom(classicMoment.camera.zoom)}×`;
  } else if (motion.type === "zoom") {
    showCanvas(true);
    const { zoom } = drawSeedZoom($("#animation-canvas").getContext("2d"), {
      seed: state.seed,
      sides: state.sides,
      iterations: state.iterations,
      width: 900,
      height: 660,
      colors: palettes[state.palette].colors,
      background: background(),
      time: frameMoment(index, timing).time,
    });
    $("#zoom-value").value = `${formatZoom(zoom)}×`;
  } else {
    animationLevel = frameMoment(index, timing, lineLevels()).progress;
    renderFractal();
  }
  $("#animation-scrub").value = index;
  $("#animation-frame-label").textContent =
    `${index + 1} / ${motion.animationFrames} frames`;
}
function startPlayback() {
  animationPaused = false;
  setAnimateButton("pause", "Pause", true);
  $("#animation-timeline").hidden = false;
  $("#animation-scrub").max = Math.max(1, motion.animationFrames - 1);
  const started = performance.now() - (animationFrameIndex * 1000) / FPS;
  let last = -1;
  const tick = (now) => {
    const frame = Math.min(
      motion.animationFrames - 1,
      Math.floor((now - started) / (1000 / FPS)),
    );
    if (frame !== last) {
      drawAnimationFrame(frame);
      last = frame;
      animationFrameIndex = frame;
    }
    if (frame >= motion.animationFrames - 1) {
      animationTimer = null;
      animationPaused = false;
      setAnimateButton("reset", "Replay", false);
      // Redraw the last library frame at full quality.
      if (state.classic) stagePaint(classicOptions);
    } else animationTimer = requestAnimationFrame(tick);
  };
  animationTimer = requestAnimationFrame(tick);
}
$("#animate-button").addEventListener("click", () => {
  if (animationTimer) {
    cancelAnimationFrame(animationTimer);
    animationTimer = null;
    animationPaused = true;
    setAnimateButton("play", "Resume", false);
    if (state.classic) stagePaint(classicOptions);
    return;
  }
  if (!animationPaused) animationFrameIndex = 0;
  if (!state.classic && motion.type === "growth") {
    // Frame every level of the growth the same way, so the view holds still.
    animationBounds = getBounds(
      Array.from(
        { length: lineLevels() + 1 },
        (_, i) => generateFractal(state.seed, i, state.sides).points,
      ).flat(),
    );
  }
  startPlayback();
});
$("#animation-scrub").addEventListener("input", (event) => {
  cancelAnimationFrame(animationTimer);
  animationTimer = null;
  animationPaused = true;
  animationFrameIndex = Number(event.target.value);
  drawAnimationFrame(animationFrameIndex);
  setAnimateButton("play", "Resume", false);
});
function updateAnimationNote() {
  const seconds = motion.animationFrames / FPS;
  let note;
  if (motion.type === "growth") {
    note = state.classic
      ? `Builds the pattern over ${seconds} seconds.`
      : `Builds ${lineLevels()} repetitions over ${seconds} seconds.`;
  } else {
    const { rate, limit } = state.classic
      ? getZoomPace(state.classic.item.id)
      : getSeedZoomPace(state.seed);
    const deepest = rate ** seconds;
    note =
      deepest >= limit
        ? `Reaches its ${formatZoom(limit)}× detail limit after ${(Math.log(limit) / Math.log(rate)).toFixed(1)} seconds, then holds.`
        : `Zooms ${formatZoom(deepest)}× deep. Longer animations go deeper at the same speed.`;
  }
  $("#animation-depth").textContent = note;
}
function updateMotion() {
  stopAnimation();
  renderFractal();
  const seconds = motion.animationFrames / FPS;
  $("#animation-seconds").value = seconds;
  $("#animation-seconds-number").value = seconds;
  $("#animation-duration").textContent =
    `${motion.animationFrames.toLocaleString("en")} frames at ${FPS} frames per second.`;
  $("#animation-summary").textContent =
    `${motion.animationMode === "smooth" ? "Smooth" : "Stepped"} ${motion.type === "zoom" ? "zoom" : "growth"}`;
}
function setSeconds(value) {
  motion.animationFrames = Math.max(1, Math.min(30, Math.round(value))) * FPS;
  updateMotion();
}
$("#animation-type").addEventListener("change", (event) => {
  motion.type = event.target.value;
  updateMotion();
});
$$("[data-motion]").forEach((button) =>
  button.addEventListener("click", () => {
    motion.animationMode = button.dataset.motion;
    $$("[data-motion]").forEach((b) => {
      b.classList.toggle("selected", b === button);
      b.setAttribute("aria-pressed", String(b === button));
    });
    updateMotion();
  }),
);
$("#animation-seconds").addEventListener("input", (event) =>
  setSeconds(Number(event.target.value)),
);
$("#animation-seconds-number").addEventListener("change", (event) => {
  if (!event.target.validity.valid || event.target.value === "") {
    event.target.value = motion.animationFrames / FPS;
  }
});
$("#animation-seconds-number").addEventListener("input", (event) => {
  if (!event.target.validity.valid || event.target.value === "") return;
  setSeconds(Number(event.target.value));
});

const presetStyles = [
  {
    color: "#3f9b99",
    bg: "#eff8f7",
    description: "A classic, with a little wonder",
  },
  {
    color: "#8a79bb",
    bg: "#f4f1fa",
    description: "Tiny steps. Intricate edges.",
  },
  { color: "#c98572", bg: "#fbf3ef", description: "Find your own rhythm" },
  { color: "#679389", bg: "#f0f6f2", description: "A beautifully wild line" },
];
$("#preset-grid").innerHTML = PRESETS.map((preset, index) => {
  const preview = generateFractal(preset.seed, 3, preset.sides);
  const b = getBounds(preview.points);
  const scale = Math.min(
    48 / Math.max(b.width, 0.1),
    47 / Math.max(b.height, 0.1),
  );
  const style = presetStyles[index];
  return `<button class="preset-card" data-preset="${preset.id}" aria-pressed="${index === 0}" aria-label="Start with ${preset.name}"><span class="preset-preview" style="--preset-bg:${style.bg}"><svg viewBox="0 0 67 64" aria-hidden="true"><path d="${toPath(preview.points)}" transform="translate(${33.5 - ((b.minX + b.maxX) / 2) * scale},${32 - ((b.minY + b.maxY) / 2) * scale}) scale(${scale})" fill="none" stroke="${style.color}" stroke-width=".75" vector-effect="non-scaling-stroke"/></svg></span><span class="preset-copy"><strong>${preset.name}</strong><small>${style.description}</small></span><span class="preset-check">${icon("check")}</span></button>`;
}).join("");
function updateLibraryMode() {
  const item = state.classic?.item;
  $(".control-panel").classList.toggle("library-mode", Boolean(item));
  $("#library-note").hidden = !item;
  if (item) $("#library-note-name").textContent = item.name;
}
function loadSeed(origin, iterations) {
  stopAnimation();
  state.classic = null;
  state.origin = origin;
  state.seed = structuredClone(origin.seed);
  state.sides = origin.sides;
  if (iterations !== undefined) state.iterations = iterations;
  state.custom = false;
  state.zoom = 1;
  history = [];
  $("#undo").disabled = true;
  setMode("edit");
  updateBase();
  updateLibraryMode();
  renderEditor();
  renderFractal();
}
$$("[data-preset]").forEach((button) =>
  button.addEventListener("click", () => {
    const preset = PRESETS.find((p) => p.id === button.dataset.preset);
    loadSeed(presetOrigin(preset));
    notify(`${preset.name} loaded. Make it your own.`);
  }),
);
function importClassic(item, depth) {
  if (item.studio) {
    loadSeed(
      { id: item.id, title: item.name, ...item.studio },
      Math.min(depth, MAX_ITERATIONS),
    );
  } else {
    stopAnimation();
    state.classic = { item, depth };
    state.zoom = 1;
    updateLibraryMode();
    renderFractal();
  }
  $("#studio").scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
  (item.studio ? $("#shape-editor") : $("#animate-button")).focus({
    preventScroll: true,
  });
  notify(
    item.studio
      ? `${item.name} is in the studio. Drag its points to reshape it.`
      : `${item.name} is in the studio. Change its detail, color, zoom, or animation.`,
  );
}
$("#back-to-shape").addEventListener("click", () => {
  stopAnimation();
  state.classic = null;
  state.zoom = 1;
  updateLibraryMode();
  renderEditor();
  renderFractal();
  $("#shape-editor").focus({ preventScroll: true });
});

$("#help-button").addEventListener("click", () =>
  $("#help-dialog").showModal(),
);
$$(".close-dialog").forEach((button) =>
  button.addEventListener("click", () => button.closest("dialog").close()),
);
$$("dialog").forEach((dialog) =>
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  }),
);

function openDownload() {
  const svg = $("input[value=svg]");
  svg.closest("label").hidden = Boolean(activeExportClassic);
  if (activeExportClassic && svg.checked) $("input[value=png]").checked = true;
  $("#download-dialog").showModal();
  checkMp4();
  updateExportFormat();
}
$("#download-button").addEventListener("click", () => {
  stopAnimation();
  renderFractal();
  activeExportClassic = state.classic
    ? classicExporter(state.classic.item.id, state.classic.depth, settings())
    : null;
  openDownload();
});
// MediaRecorder MP4 is known right away; WebCodecs encoding needs an async check.
function checkMp4() {
  if (mp4Supported !== undefined) return;
  if (getMp4MimeType()) {
    mp4Supported = true;
    return;
  }
  mp4Supported = null;
  isMp4Supported()
    .then(
      (supported) => {
        mp4Supported = supported;
      },
      () => {
        mp4Supported = false;
      },
    )
    .finally(syncMp4);
}
function syncMp4() {
  const mp4 = $('input[name="format"]:checked').value === "mp4";
  $("#save-download").disabled =
    Boolean(exportController) || (mp4 && mp4Supported !== true);
  $("#mp4-support-note").hidden = !mp4 || mp4Supported !== false;
}
function resetExportResult() {
  if (exportUrl) URL.revokeObjectURL(exportUrl);
  exportUrl = null;
  $("#export-result").hidden = true;
  $("#export-result").replaceChildren();
  $("#export-error").hidden = true;
  $("#save-download").hidden = false;
}
function updateExportFormat() {
  resetExportResult();
  const format = $('input[name="format"]:checked').value;
  const animated = ["gif", "mp4"].includes(format);
  const seconds = motion.animationFrames / FPS;
  $("#export-animation-note").hidden = !animated;
  $("#save-download").innerHTML =
    `${icon(animated ? "play" : "download")}${animated ? "Create animation" : "Download creation"}`;
  if (animated)
    $("#export-animation-note").textContent =
      `${motion.animationMode === "smooth" ? "Smooth" : "Step-by-step"} ${motion.type === "zoom" ? "zoom journey" : "pattern growth"}, ${seconds} second${seconds === 1 ? "" : "s"} (${motion.animationFrames} frames), plus a final pause. Preview before saving.${seconds > 15 ? " Longer animations can take a while to create." : ""}`;
  syncMp4();
}
$$('input[name="format"]').forEach((input) =>
  input.addEventListener("change", updateExportFormat),
);
function saveBlob(blob, format) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fracgen-${activeExportClassic?.id || (state.custom ? "my-creation" : state.origin.id)}.${format}`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
$("#save-download").addEventListener("click", async () => {
  const format = $('input[name="format"]:checked').value;
  exportController = new AbortController();
  const controller = exportController;
  const signal = controller.signal;
  $("#save-download").disabled = true;
  $(".export-options").disabled = true;
  $("#export-progress").hidden = false;
  $("#export-progress-bar").value = 0;
  $("#export-progress-label").textContent = "Preparing your creation…";
  $("#export-error").hidden = true;
  try {
    const animated = ["gif", "mp4"].includes(format);
    const snapshot = {
      seed: structuredClone(state.seed),
      sides: state.sides,
      iterations: state.iterations,
      colors: [...palettes[state.palette].colors],
      background: background(),
    };
    const classicRenderer =
      activeExportClassic &&
      (animated
        ? activeExportClassic.renderFrame
        : activeExportClassic.renderStill);
    const drawFrame = classicRenderer
      ? (context, frame) => classicRenderer(context, frame, signal)
      : animated && motion.type === "zoom"
        ? (context, frame) => drawSeedZoom(context, { ...snapshot, ...frame })
        : undefined;
    const blob = await createExport(
      {
        format,
        ...snapshot,
        animationMode: motion.animationMode,
        animationFrames: motion.animationFrames,
        renderFrame: drawFrame,
      },
      {
        signal,
        onProgress: (progress) => {
          $("#export-progress-bar").value = progress;
          $("#export-progress-label").textContent =
            `Creating ${format.toUpperCase()}… ${Math.round(progress * 100)}%${format === "mp4" ? " · Keep this tab open" : ""}`;
        },
      },
    );
    if (signal.aborted) return;
    if (animated) {
      exportUrl = URL.createObjectURL(blob);
      const preview = document.createElement(
        format === "mp4" ? "video" : "img",
      );
      preview.className = "export-preview";
      preview.setAttribute("aria-label", "Preview of your fractal animation");
      preview.src = exportUrl;
      if (format === "mp4") {
        preview.controls = true;
        preview.playsInline = true;
        preview.loop = true;
        preview.muted = true;
      } else preview.alt = "Preview of your fractal animation.";
      const save = document.createElement("button");
      save.className = "button button-primary full-width";
      save.innerHTML = `${icon("download")}Save ${format.toUpperCase()}`;
      save.addEventListener("click", () => {
        saveBlob(blob, format);
        notify(`${format.toUpperCase()} download started.`);
      });
      $("#export-result").replaceChildren(preview, save);
      $("#export-result").hidden = false;
      $("#save-download").hidden = true;
      if (format === "mp4") preview.play().catch(() => {});
    } else {
      saveBlob(blob, format);
      notify(`${format.toUpperCase()} download started.`);
      $("#download-dialog").close();
    }
  } catch (error) {
    if (!signal.aborted) {
      $("#export-error").textContent =
        error.message ||
        "Could not create your file. Try again with fewer repetitions.";
      $("#export-error").hidden = false;
    }
  } finally {
    if (exportController === controller) {
      exportController = null;
      $("#export-progress").hidden = true;
      $(".export-options").disabled = false;
      syncMp4();
    }
  }
});
$("#download-dialog").addEventListener("close", () => {
  exportController?.abort();
  exportController = null;
  $("#export-progress").hidden = true;
  $(".export-options").disabled = false;
  $("#export-result video")?.pause();
  resetExportResult();
  syncMp4();
});
$("#cancel-export").addEventListener("click", () => {
  exportController?.abort();
});

initGallery({
  onOpen: () => {
    stopAnimation();
    renderFractal();
  },
  getSettings: settings,
  onExport: (classic) => {
    activeExportClassic = classic;
    openDownload();
  },
  onImport: importClassic,
});
renderEditor();
updateMotion();
