/**
 * Shared utility functions for image manipulation operations
 */

/**
 * Calculate selection box bounds from drag selection
 */
export function calculateSelectionBox(
  dragSelection: { startX: number; startY: number; currentX: number; currentY: number } | null,
  container: HTMLElement | null
) {
  if (!dragSelection || !container) return null;

  return {
    left: Math.min(dragSelection.startX, dragSelection.currentX),
    top: Math.min(dragSelection.startY, dragSelection.currentY),
    width: Math.abs(dragSelection.currentX - dragSelection.startX),
    height: Math.abs(dragSelection.currentY - dragSelection.startY),
    containerWidth: container.clientWidth,
    containerHeight: container.clientHeight
  };
}

/**
 * Check if a point is within a rectangle
 */
export function isPointInRect(
  x: number,
  y: number,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

/**
 * Calculate intersection between two rectangles
 */
export function rectIntersects(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}
