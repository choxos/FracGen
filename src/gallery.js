import { CLASSICS, drawClassic, getZoomCamera } from "./classics.js";
import { drawClassicAsync } from "./classic-renderer.js";

export function initGallery({ getSettings, onExport, onOpen }) {
  const $ = (selector) => document.querySelector(selector);
  let expanded = false;
  let selected;
  let depth;
  let timer;
  let playing = false;
  let pausedFrame = 0;
  let lastProgress = null;
  let animationSettings;
  let renderController;
  const canvas = $("#classic-canvas");
  const context = canvas.getContext("2d");
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

  function renderLibrary() {
    observer.disconnect();
    const query = $("#library-search").value.trim().toLocaleLowerCase();
    const family = $("#library-family").value;
    const matches = CLASSICS.filter(
      (item) =>
        (family === "all" || item.family === family) &&
        `${item.name} ${item.family} ${item.description}`
          .toLocaleLowerCase()
          .includes(query),
    );
    const visible =
      expanded || query || family !== "all" ? matches : matches.slice(0, 8);
    $("#library-grid").replaceChildren();
    for (const classic of visible) {
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
    }
    $("#library-count").textContent = `${matches.length} named fractals`;
    $("#library-empty").hidden = matches.length > 0;
    $("#show-all-classics").hidden =
      matches.length <= 8 || Boolean(query) || family !== "all";
    $("#show-all-classics").textContent = expanded
      ? "Show fewer fractals"
      : `Explore all ${CLASSICS.length} fractals`;
  }
  function stop() {
    cancelAnimationFrame(timer);
    renderController?.abort();
    renderController = null;
    timer = null;
    playing = false;
    $("#classic-animate span:last-child").textContent =
      lastProgress === null
        ? "Watch it zoom"
        : lastProgress >= 1
          ? "Replay zoom"
          : "Resume zoom";
  }
  async function draw(progress = null, settings = getSettings()) {
    const base = {
      id: selected.id,
      depth,
      width: canvas.width,
      height: canvas.height,
      colors: settings.colors,
      background: settings.background,
    };
    if (progress !== null) {
      const position =
        settings.animationMode === "steps"
          ? Math.floor(progress * 12) / 12
          : progress;
      if (settings.type === "zoom")
        base.camera = getZoomCamera(selected.id, position);
      else base.progress = position;
    }
    if (progress !== null) base.quality = progress === 1 ? 650 : 160;
    renderController = new AbortController();
    const signal = renderController.signal;
    await drawClassicAsync(context, base, signal);
    if (signal.aborted) return;
    lastProgress = progress;
    canvas.setAttribute(
      "aria-label",
      `${selected.name}${progress === null ? "" : `, animation ${Math.round(progress * 100)} percent complete`}`,
    );
  }
  function openClassic(classic) {
    onOpen();
    stop();
    selected = classic;
    depth = classic.defaultDepth;
    pausedFrame = 0;
    lastProgress = null;
    $("#classic-title").textContent = classic.name;
    $("#classic-family").textContent = classic.family;
    $("#classic-description").textContent = classic.description;
    $("#classic-source").href = classic.source;
    for (const input of [$("#classic-depth"), $("#classic-depth-number")]) {
      input.min = classic.family === "Escape-time" ? 20 : 1;
      input.max = classic.maxDepth;
      input.step = 1;
      input.value = depth;
    }
    $("#classic-animate span:last-child").textContent =
      getSettings().type === "zoom" ? "Watch it zoom" : "Watch it grow";
    $("#classic-dialog").showModal();
    draw().catch(showRenderError);
  }
  function changeDepth(value) {
    stop();
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
    pausedFrame = 0;
    draw().catch(showRenderError);
  }
  $("#classic-depth").addEventListener("input", (event) =>
    changeDepth(event.target.value),
  );
  $("#classic-depth-number").addEventListener("change", (event) =>
    changeDepth(event.target.value),
  );
  $("#classic-animate").addEventListener("click", () => {
    if (playing) {
      stop();
      return;
    }
    if (lastProgress === null || lastProgress >= 1) pausedFrame = 0;
    animationSettings = getSettings();
    playing = true;
    $("#classic-animate span:last-child").textContent = "Pause";
    const started = performance.now() - (pausedFrame * 1000) / 30;
    let lastFrame = -1;
    const tick = async (now) => {
      const frame = Math.min(
        animationSettings.animationFrames - 1,
        Math.floor((now - started) / (1000 / 30)),
      );
      if (frame !== lastFrame) {
        try {
          await draw(
            animationSettings.animationFrames === 1
              ? 1
              : frame / (animationSettings.animationFrames - 1),
            animationSettings,
          );
        } catch (error) {
          showRenderError(error);
          return;
        }
        if (!playing) return;
        lastFrame = frame;
        pausedFrame = frame;
      }
      if (frame >= animationSettings.animationFrames - 1) stop();
      else timer = requestAnimationFrame(tick);
    };
    timer = requestAnimationFrame(tick);
  });
  $("#classic-download").addEventListener("click", () => {
    stop();
    const classic = selected;
    const settings = getSettings();
    const exportDepth = depth;
    onExport({
      id: classic.id,
      renderFrame: (ctx, { width, height, progress }, signal) => {
        const position =
          settings.animationMode === "steps"
            ? Math.floor(progress * 12) / 12
            : progress;
        const animation =
          settings.type === "zoom"
            ? { camera: getZoomCamera(classic.id, position) }
            : { progress: position };
        return drawClassicAsync(
          ctx,
          {
            id: classic.id,
            depth: exportDepth,
            width,
            height,
            colors: settings.colors,
            background: settings.background,
            ...animation,
          },
          signal,
        );
      },
      renderStill: (ctx, { width, height }, signal) =>
        drawClassicAsync(
          ctx,
          {
            id: classic.id,
            depth: exportDepth,
            width,
            height,
            colors: settings.colors,
            background: settings.background,
          },
          signal,
        ),
    });
  });
  function showRenderError(error) {
    if (error.name === "AbortError") return;
    stop();
    $("#classic-description").textContent = error.message;
  }
  $("#classic-dialog").addEventListener("close", stop);
  $("#library-search").addEventListener("input", renderLibrary);
  $("#library-family").addEventListener("change", renderLibrary);
  $("#show-all-classics").addEventListener("click", () => {
    expanded = !expanded;
    renderLibrary();
  });
  renderLibrary();
}
