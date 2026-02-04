/**
 * Shared types for image manipulation (drag, resize, rotate, selection)
 */

export interface DragState {
  itemId: string; // The item being directly manipulated
  type: "drag" | "resize" | "rotate";
  handle?: string;
  startX: number;
  startY: number;
  itemX: number;
  itemY: number;
  itemWidth: number;
  itemHeight: number;
  itemRotation: number;
  aspectRatio: number;
  selectedItems: Array<{
    itemId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    mirrorHorizontal?: boolean;
    mirrorVertical?: boolean;
  }>; // Initial state of all selected items
  hasMoved: boolean; // Track if mouse moved during drag
}

export interface DragSelection {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
  itemId: string;
}

export interface PositionUpdate {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  mirrorHorizontal?: boolean;
  mirrorVertical?: boolean;
}

export type HandleType = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";
