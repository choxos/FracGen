import { drawClassic, getZoomCamera } from "./classics.js";

let worker;
let nextId = 0;
const pending = new Map();

function cancelWorker(error) {
  worker?.terminate();
  worker = null;
  for (const request of pending.values()) request.reject(error);
  pending.clear();
}

export async function drawClassicAsync(context, options, signal) {
  if (signal?.aborted) throw new DOMException("Export canceled.", "AbortError");
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
    drawClassic(context, options);
    return;
  }
  if (!worker) {
    worker = new Worker(new URL("./classic-worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      const request = pending.get(data.requestId);
      if (!request) {
        data.bitmap?.close();
        return;
      }
      pending.delete(data.requestId);
      if (data.error) request.reject(new Error(data.error));
      else request.resolve(data.bitmap);
    };
    worker.onerror = () =>
      cancelWorker(
        new Error("The preview could not render. Try a lower detail setting."),
      );
  }
  const id = ++nextId;
  const abort = () =>
    cancelWorker(new DOMException("Export canceled.", "AbortError"));
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const bitmap = await new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ requestId: id, options });
    });
    if (!signal?.aborted)
      context.drawImage(bitmap, 0, 0, options.width, options.height);
    bitmap.close();
  } finally {
    signal?.removeEventListener("abort", abort);
  }
}

/**
 * Interactive redraws where only the latest request matters: while one render
 * runs, newer requests replace each other and the last one renders next.
 * `getOptions` is read when its render starts, so it sees current settings.
 */
export function createPainter(context, onError) {
  let busy = false;
  let next = null;
  return function paint(getOptions) {
    next = getOptions;
    if (busy) return;
    busy = true;
    (async () => {
      while (next) {
        const current = next;
        next = null;
        const options = current();
        if (!options) continue;
        try {
          await drawClassicAsync(context, options);
        } catch (error) {
          onError(error);
        }
      }
      busy = false;
    })();
  };
}

/** Export renderers for a library fractal, fixed to the settings at the time of the call. */
export function classicExporter(id, depth, { colors, background, type }) {
  const draw = (context, options, signal) =>
    drawClassicAsync(
      context,
      {
        id,
        depth,
        colors,
        background,
        quality: Math.max(options.width, options.height),
        ...options,
      },
      signal,
    );
  return {
    id,
    renderStill: (context, { width, height }, signal) =>
      draw(context, { width, height }, signal),
    renderFrame: (context, { width, height, progress, time }, signal) =>
      draw(
        context,
        type === "zoom"
          ? { width, height, camera: getZoomCamera(id, time) }
          : { width, height, progress },
        signal,
      ),
  };
}
