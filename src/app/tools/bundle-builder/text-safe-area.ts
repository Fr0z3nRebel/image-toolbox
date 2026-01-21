import type { TextSafeRect } from "./types";

/**
 * Calculate the text-safe central rectangle for a given canvas size
 */
export const getTextSafeRect = (
  canvasWidth: number,
  canvasHeight: number,
  percentOfHeight: number = 20
): TextSafeRect => {
  // Use a central rectangle occupying specified percentage of height and fixed 50% width
  const safeHeight = canvasHeight * (percentOfHeight / 100);
  const safeWidth = canvasWidth * 0.50; // Fixed 50% width for text
  const x = (canvasWidth - safeWidth) / 2;
  const y = (canvasHeight - safeHeight) / 2;

  return { x, y, width: safeWidth, height: safeHeight };
};