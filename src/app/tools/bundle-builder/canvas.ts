import type { AspectRatio, Background, CanvasDimensions } from "./types";

/**
 * Get canvas dimensions based on aspect ratio
 */
export const getCanvasDimensions = (aspectRatio: AspectRatio): CanvasDimensions => {
  if (aspectRatio === "4:3") {
    // 4:3 aspect ratio: 2667px wide by 2000px tall
    return { width: 2667, height: 2000 };
  }
  if (aspectRatio === "1:1") {
    // 1:1 aspect ratio: 2048px wide by 2048px tall
    return { width: 2048, height: 2048 };
  }
  // Default to 4:3
  return { width: 2667, height: 2000 };
};

/**
 * Create a base canvas with the specified dimensions and background
 */
export const createBaseCanvas = (
  aspectRatio: AspectRatio,
  background: Background
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
  const { width, height } = getCanvasDimensions(aspectRatio);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  if (background === "transparent") {
    // Transparent background – just clear
    ctx.clearRect(0, 0, width, height);
  } else {
    // Solid color background
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }

  return { canvas, ctx };
};