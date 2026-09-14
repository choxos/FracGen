import {
  generateFractal,
  generateGrowthFrame,
  getBounds,
  toPath,
} from "./fractal.js";

export function getAnimationOptions({
  animationMode = "smooth",
  animationFrames = 180,
} = {}) {
  if (!["smooth", "steps"].includes(animationMode))
    throw new RangeError("Choose smooth or step-by-step animation.");
  if (!Number.isFinite(animationFrames))
    throw new TypeError("Animation frames must be a finite number.");
  const frames = Math.max(1, Math.min(1000, Math.round(animationFrames)));
  return {
    mode: animationMode,
    frames,
    durationMs: (frames * 1000) / 30,
    holdMs: 1000,
  };
}

export function getMp4MimeType() {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof MediaRecorder.isTypeSupported !== "function"
  )
    return "";
  return (
    ["video/mp4;codecs=avc1", "video/mp4"].find((type) =>
      MediaRecorder.isTypeSupported(type),
    ) || ""
  );
}

export async function isMp4Supported() {
  if (getMp4MimeType()) return true;
  if (typeof VideoEncoder === "undefined") return false;
  const { canEncodeVideo, Quality } = await import("mediabunny");
  return canEncodeVideo("avc", {
    width: 1200,
    height: 1200,
    quality: new Quality({ bitrate: 8_000_000 }),
  });
}

function checkAbort(signal) {
  if (signal?.aborted) throw new DOMException("Export canceled.", "AbortError");
}

function makeCanvas(size, bounds, colors, background, renderFrame) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: size === 800 });
  if (!context)
    throw new Error(
      "Your browser could not create the image. Try another browser.",
    );
  if (renderFrame)
    return {
      canvas,
      context,
      draw: (progress) =>
        renderFrame(context, { width: size, height: size, progress }),
    };
  const scale = (size * 0.8) / Math.max(bounds.width, bounds.height, 0.001);
  const offsetX = size / 2 - ((bounds.minX + bounds.maxX) / 2) * scale;
  const offsetY = size / 2 - ((bounds.minY + bounds.maxY) / 2) * scale;
  const gradient = context.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(1, colors[1]);
  let previousPoints;
  let shape;
  function draw(points) {
    if (points !== previousPoints) {
      shape = new Path2D();
      points.forEach((point, index) => {
        const x = point.x * scale + offsetX;
        const y = point.y * scale + offsetY;
        if (index) shape.lineTo(x, y);
        else shape.moveTo(x, y);
      });
      previousPoints = points;
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = background;
    context.fillRect(0, 0, size, size);
    context.strokeStyle = gradient;
    context.lineWidth = size * 0.0015;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke(shape);
  }
  return { canvas, context, draw };
}

async function encodeMp4(canvas, draw, animation, onProgress, signal) {
  if (typeof VideoEncoder === "undefined") return null;
  const {
    Output,
    Mp4OutputFormat,
    BufferTarget,
    CanvasSource,
    Quality,
    canEncodeVideo,
  } = await import("mediabunny");
  const quality = new Quality({ bitrate: 8_000_000 });
  if (
    !(await canEncodeVideo("avc", {
      width: canvas.width,
      height: canvas.height,
      quality,
    }))
  )
    return null;
  checkAbort(signal);
  const output = new Output({
    format: new Mp4OutputFormat(),
    target: new BufferTarget(),
  });
  const source = new CanvasSource(canvas, { codec: "avc", quality });
  output.addVideoTrack(source, { frameRate: 30 });
  let cancelPromise;
  const abort = () => {
    cancelPromise = output.cancel();
    cancelPromise.catch(() => {});
  };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    checkAbort(signal);
    await output.start();
    const totalFrames =
      animation.frames + Math.round((animation.holdMs * 30) / 1000);
    for (let frame = 0; frame < totalFrames; frame += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      checkAbort(signal);
      if (frame < animation.frames)
        await draw(animation.frames === 1 ? 1 : frame / (animation.frames - 1));
      checkAbort(signal);
      await source.add(frame / 30, 1 / 30);
      onProgress(0.1 + (0.87 * (frame + 1)) / totalFrames);
    }
    source.close();
    await output.finalize();
    checkAbort(signal);
    const blob = new Blob([output.target.buffer], { type: "video/mp4" });
    onProgress(1);
    return blob;
  } catch (error) {
    if (output.state !== "finalized") await (cancelPromise || output.cancel());
    checkAbort(signal);
    throw error;
  } finally {
    signal?.removeEventListener("abort", abort);
  }
}

async function recordMp4(
  canvas,
  draw,
  animation,
  mimeType,
  onProgress,
  signal,
) {
  await draw(animation.frames === 1 ? 1 : 0);
  checkAbort(signal);
  return new Promise((resolve, reject) => {
    let recorder;
    let stream;
    let timer;
    let settled = false;
    let finished = false;
    const chunks = [];
    const abort = () =>
      fail(new DOMException("Export canceled.", "AbortError"));
    function cleanup() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      stream?.getTracks().forEach((track) => track.stop());
    }
    function fail(error) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    }
    try {
      if (typeof canvas.captureStream !== "function")
        throw new Error(
          "MP4 export is unavailable in this browser. Choose GIF for an animation.",
        );
      stream = canvas.captureStream(30);
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
      });
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () =>
        fail(
          new Error(
            "The browser could not finish the MP4. Try again, or choose GIF.",
          ),
        );
      recorder.onstop = () => {
        try {
          if (!finished)
            throw new Error(
              "The video recording was interrupted. Please try again.",
            );
          const blob = new Blob(chunks, {
            type: recorder.mimeType || mimeType,
          });
          if (!blob.size)
            throw new Error(
              "The browser created an empty video. Try again, or choose GIF.",
            );
          onProgress(1);
          settled = true;
          cleanup();
          resolve(blob);
        } catch (error) {
          fail(error);
        }
      };
      signal?.addEventListener("abort", abort, { once: true });
      checkAbort(signal);
      recorder.start();
      let frame = 1;
      const totalFrames =
        animation.frames + Math.round((animation.holdMs * 30) / 1000);
      const tick = async () => {
        try {
          checkAbort(signal);
          if (frame < animation.frames)
            await draw(frame / (animation.frames - 1));
          else {
            const context = canvas.getContext("2d");
            context.save();
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.drawImage(canvas, 0, 0);
            context.restore();
          }
          checkAbort(signal);
          onProgress(0.1 + (0.88 * (frame + 1)) / totalFrames);
          if (settled) return;
          frame += 1;
          if (frame >= totalFrames) {
            finished = true;
            recorder.stop();
          } else {
            timer = setTimeout(tick, 1000 / 30);
          }
        } catch (error) {
          fail(error);
        }
      };
      timer = setTimeout(tick, 1000 / 30);
    } catch (error) {
      fail(error);
    }
  });
}

export async function createExport(
  {
    format,
    seed,
    iterations,
    sides,
    colors,
    background,
    animationMode,
    animationFrames,
    renderFrame,
  },
  { onProgress = () => {}, signal } = {},
) {
  checkAbort(signal);
  if (!["png", "svg", "gif", "mp4"].includes(format))
    throw new RangeError("Choose PNG, SVG, GIF, or MP4.");
  if (renderFrame !== undefined && typeof renderFrame !== "function")
    throw new TypeError("The animation renderer must be a function.");
  if (renderFrame && format === "svg")
    throw new Error("This example exports as PNG, GIF, or MP4.");
  const animation = getAnimationOptions({ animationMode, animationFrames });
  const hex = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
  if (
    !Array.isArray(colors) ||
    colors.length !== 2 ||
    !colors.every((color) => typeof color === "string" && hex.test(color)) ||
    typeof background !== "string" ||
    !hex.test(background)
  ) {
    throw new TypeError(
      "Choose two valid hex colors and a solid background color.",
    );
  }
  const mimeType = format === "mp4" ? getMp4MimeType() : "";
  if (format === "mp4" && !mimeType && typeof VideoEncoder === "undefined")
    throw new Error(
      "MP4 export is unavailable in this browser. Choose GIF for an animation.",
    );
  onProgress(0);
  const final = renderFrame ? null : generateFractal(seed, iterations, sides);
  const levels = renderFrame
    ? []
    : Array.from({ length: final.iterations + 1 }, (_, level) =>
        level === final.iterations
          ? final
          : generateFractal(seed, level, sides),
      );
  const levelBounds = levels.map((level) => getBounds(level.points));
  const bounds = {
    minX: Math.min(...levelBounds.map((bound) => bound.minX)),
    minY: Math.min(...levelBounds.map((bound) => bound.minY)),
    maxX: Math.max(...levelBounds.map((bound) => bound.maxX)),
    maxY: Math.max(...levelBounds.map((bound) => bound.maxY)),
  };
  bounds.width = bounds.maxX - bounds.minX;
  bounds.height = bounds.maxY - bounds.minY;
  onProgress(0.1);
  checkAbort(signal);

  if (format === "svg") {
    const size = 2400;
    const scale = (size * 0.8) / Math.max(bounds.width, bounds.height, 0.001);
    const x = size / 2 - ((bounds.minX + bounds.maxX) / 2) * scale;
    const y = size / 2 - ((bounds.minY + bounds.maxY) / 2) * scale;
    const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><title>Fractal artwork</title><defs><linearGradient id="ink" gradientUnits="userSpaceOnUse" x1="${-x / scale}" y1="${-y / scale}" x2="${(size - x) / scale}" y2="${(size - y) / scale}"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><rect width="${size}" height="${size}" fill="${background}"/><path d="${toPath(final.points)}" transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="url(#ink)" stroke-width="${(size * 0.0015) / scale}" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    const blob = new Blob([markup], { type: "image/svg+xml" });
    onProgress(1);
    return blob;
  }

  const size = format === "png" ? 2400 : format === "gif" ? 800 : 1200;
  const { canvas, context, draw } = makeCanvas(
    size,
    bounds,
    colors,
    background,
    renderFrame,
  );
  const drawProgress = (progress) => {
    if (renderFrame) return draw(progress);
    if (progress === 1 || final.iterations === 0) return draw(final.points);
    if (animation.mode === "steps")
      return draw(levels[Math.floor(progress * final.iterations)].points);
    return draw(generateGrowthFrame(seed, progress, iterations, sides).points);
  };
  if (format === "png") {
    await drawProgress(1);
    checkAbort(signal);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    checkAbort(signal);
    if (!blob)
      throw new Error(
        "The browser could not create the PNG. Please try again.",
      );
    onProgress(1);
    return blob;
  }
  if (format === "gif") {
    const encoder = await import("gifenc");
    const { GIFEncoder, quantize, applyPalette } = encoder.GIFEncoder
      ? encoder
      : encoder.default;
    const gif = GIFEncoder();
    const timeline = [];
    for (let frame = 0; frame < animation.frames; frame += 1) {
      let progress =
        animation.frames === 1 ? 1 : frame / (animation.frames - 1);
      if (!renderFrame && animation.mode === "steps" && final.iterations)
        progress = Math.floor(progress * final.iterations) / final.iterations;
      if (!renderFrame && !final.iterations) progress = 1;
      const delay =
        (Math.round(((frame + 1) * 100) / 30) -
          Math.round((frame * 100) / 30)) *
        10;
      if (timeline.at(-1)?.progress === progress)
        timeline.at(-1).delay += delay;
      else timeline.push({ progress, delay });
    }
    timeline.at(-1).delay += animation.holdMs;
    for (let frame = 0; frame < timeline.length; frame += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      checkAbort(signal);
      await drawProgress(timeline[frame].progress);
      checkAbort(signal);
      const { data } = context.getImageData(0, 0, size, size);
      const palette = quantize(data, 256);
      const index = applyPalette(data, palette);
      gif.writeFrame(index, size, size, {
        palette,
        delay: timeline[frame].delay,
        repeat: 0,
      });
      onProgress(0.1 + (0.88 * (frame + 1)) / timeline.length);
    }
    checkAbort(signal);
    gif.finish();
    const blob = new Blob([gif.bytes()], { type: "image/gif" });
    onProgress(1);
    return blob;
  }
  const encoded = await encodeMp4(
    canvas,
    drawProgress,
    animation,
    onProgress,
    signal,
  );
  if (encoded) return encoded;
  if (!mimeType)
    throw new Error(
      "MP4 export is unavailable in this browser. Choose GIF for an animation.",
    );
  return recordMp4(
    canvas,
    drawProgress,
    animation,
    mimeType,
    onProgress,
    signal,
  );
}
