import { drawClassic } from "./classics.js";

self.onmessage = ({ data }) => {
  const { requestId, options } = data;
  try {
    if (
      !Number.isInteger(options?.width) ||
      !Number.isInteger(options?.height) ||
      options.width < 1 ||
      options.height < 1 ||
      options.width > 8192 ||
      options.height > 8192
    ) {
      throw new RangeError(
        "Image dimensions must be whole numbers from 1 to 8192.",
      );
    }
    const canvas = new OffscreenCanvas(options.width, options.height);
    drawClassic(canvas.getContext("2d"), options);
    const bitmap = canvas.transferToImageBitmap();
    self.postMessage({ requestId, bitmap }, [bitmap]);
  } catch (error) {
    self.postMessage({
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
