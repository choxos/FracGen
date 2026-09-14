import { CLASSICS, drawClassic, getZoomCamera } from "./classics.js";
import { classicExporter, createPainter } from "./classic-renderer.js";
import { FPS, frameMoment } from "./export.js";

export function initGallery({ getSettings, onExport, onImport, onOpen }) {
  const $ = (selector) => document.querySelector(selector);
  let expanded = false;
  let selected;
  let depth;
  let settings;
  let frame = null;
  let playing = false;
  let timer;
  const canvas = $("#classic-canvas");
  const paint = createPainter(canvas.getContext("2d"), (error) => {
    if (error.name === "AbortError") return;
    pause();
    $("#classic-description").textContent = error.message;
  });
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const preview = entry.target;
        const classic = CLASSICS.find(
          (item) => item.id === preview.dataset.classic,
        );
        try {
          drawClassic(preview.getContext("2d"), {
            id: classic.id,
            depth: Math.min(
              classic.defaultDepth,
              classic.family === "Escape-time" ? 120 : classic.maxDepth,
            ),
            width: preview.width,
            height: preview.height,
            colors: ["#249e99", "#7f65c5"],
            background: "#f5f8fa",
          });
        } catch {
          preview.setAttribute(
            "aria-label",
            `${classic.name} preview unavailable`,
          );
        }
        observer.unobserve(preview);
      }
    },
    { rootMargin: "100px" },
  );

  // Cards are built once; filtering only hides them, so thumbnails draw once.
  const cards = CLASSICS.map((classic) => {
    const button = document.createElement("button");
    button.className = "library-card";
    button.setAttribute("aria-label", `Explore ${classic.name}`);
    const thumbnail = document.createElement("canvas");
    thumbnail.width = 210;
    thumbnail.height = 145;
    thumbnail.dataset.classic = classic.id;
    thumbnail.setAttribute("aria-hidden", "true");
    const name = document.createElement("strong");
    name.textContent = classic.name;
    const category = document.createElement("span");
    category.textContent = classic.family;
    button.append(thumbnail, name, category);
    button.addEventListener("click", () => openClassic(classic));
    $("#library-grid").append(button);
    observer.observe(thumbnail);
    return { classic, button };
  });

  function renderLibrary() {
    const query = $("#library-search").value.trim().toLocaleLowerCase();
    const family = $("#library-family").value;
    const filtered = Boolean(query) || family !== "all";
    let matches = 0;
    for (const { classic, button } of cards) {
      const match =
        (family === "all" || classic.family === family) &&
        `${classic.name} ${classic.family} ${classic.description}`
          .toLocaleLowerCase()
          .includes(query);
      button.hidden = !match || (!filtered && !expanded && matches >= 8);
      if (match) matches += 1;
    }
    $("#library-count").textContent = `${matches} named fractals`;
    $("#library-empty").hidden = matches > 0;
    $("#show-all-classics").hidden = matches <= 8 || filtered;
    $("#show-all-classics").textContent = expanded
      ? "Show fewer fractals"
      : `Explore all ${CLASSICS.length} fractals`;
  }

  function options() {
    const base = {
      id: selected.id,
      depth,
      width: canvas.width,
      height: canvas.height,
      colors: settings.colors,
      background: settings.background,
    };
    if (frame === null) return base;
    const { progress, time } = frameMoment(frame, {
      frames: settings.animationFrames,
      mode: settings.animationMode,
    });
    if (settings.type === "zoom")
      base.camera = getZoomCamera(selected.id, time);
    else base.progress = progress;
    base.quality = playing ? 160 : 650;
    return base;
  }
  function render() {
    paint(options);
    canvas.setAttribute(
      "aria-label",
      frame === null
        ? selected.name
        : `${selected.name}, animation ${Math.round(((frame + 1) / settings.animationFrames) * 100)} percent complete`,
    );
  }
  function updateLabel() {
    const zoom = settings.type === "zoom";
    $("#classic-animate span:last-child").textContent = playing
      ? "Pause"
      : frame === null
        ? `Watch it ${zoom ? "zoom" : "grow"}`
        : `${frame >= settings.animationFrames - 1 ? "Replay" : "Resume"} ${zoom ? "zoom" : "growth"}`;
  }
  function halt() {
    cancelAnimationFrame(timer);
    playing = false;
  }
  function pause() {
    const wasPlaying = playing;
    halt();
    // Redraw the paused frame at full quality.
    if (wasPlaying) render();
    updateLabel();
  }
  function openClassic(classic) {
    onOpen();
    halt();
    selected = classic;
    depth = classic.defaultDepth;
    frame = null;
    settings = getSettings();
    $("#classic-title").textContent = classic.name;
    $("#classic-family").textContent = classic.family;
    $("#classic-description").textContent = classic.description;
    $("#classic-source").href = classic.source;
    $("#classic-hint").textContent = classic.studio
      ? "Watch and Export use your studio settings. Open in studio to reshape its line."
      : "Watch and Export use your studio settings. Open in studio to control its detail, color, zoom, and animation.";
    for (const input of [$("#classic-depth"), $("#classic-depth-number")]) {
      input.min = classic.family === "Escape-time" ? 20 : 1;
      input.max = classic.maxDepth;
      input.step = 1;
      input.value = depth;
    }
    updateLabel();
    $("#classic-dialog").showModal();
    render();
  }
  function changeDepth(value) {
    halt();
    const input = $("#classic-depth");
    depth = Math.max(
      Number(input.min),
      Math.min(
        selected.maxDepth,
        Math.round(Number(value) || selected.defaultDepth),
      ),
    );
    $("#classic-depth").value = depth;
    $("#classic-depth-number").value = depth;
    frame = null;
    settings = getSettings();
    updateLabel();
    render();
  }
  $("#classic-depth").addEventListener("input", (event) =>
    changeDepth(event.target.value),
  );
  $("#classic-depth-number").addEventListener("change", (event) =>
    changeDepth(event.target.value),
  );
  $("#classic-animate").addEventListener("click", () => {
    if (playing) {
      pause();
      return;
    }
    settings = getSettings();
    const frames = settings.animationFrames;
    if (frame === null || frame >= frames - 1) frame = 0;
    playing = true;
    updateLabel();
    const started = performance.now() - (frame * 1000) / FPS;
    const tick = (now) => {
      frame = Math.min(frames - 1, Math.floor(((now - started) * FPS) / 1000));
      render();
      if (frame >= frames - 1) pause();
      else timer = requestAnimationFrame(tick);
    };
    timer = requestAnimationFrame(tick);
  });
  $("#classic-download").addEventListener("click", () => {
    pause();
    onExport(classicExporter(selected.id, depth, getSettings()));
  });
  $("#classic-import").addEventListener("click", () => {
    halt();
    $("#classic-dialog").close();
    onImport(selected, depth);
  });
  $("#classic-dialog").addEventListener("close", halt);
  $("#library-search").addEventListener("input", renderLibrary);
  $("#library-family").addEventListener("change", renderLibrary);
  $("#show-all-classics").addEventListener("click", () => {
    expanded = !expanded;
    renderLibrary();
  });
  renderLibrary();
}
