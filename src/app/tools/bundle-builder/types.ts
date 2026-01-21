export type LayoutStyle = "dividedGrid" | "dividedGrid2" | "grid";

export type AspectRatio = "4:3";

// "transparent" leaves the canvas clear; any other string is treated as a CSS color (e.g. "#ffffff").
export type Background = "transparent" | string;

export type ExportFormat = "png" | "webp";

export interface CanvasDimensions {
  width: number;
  height: number;
}

export interface TextSafeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface ComposeOptions {
  aspectRatio: AspectRatio;
  layoutStyle: LayoutStyle;
  background: Background;
  exportFormat: ExportFormat;
  textSafeAreaPercent?: number; // Percentage of height for central text-safe area (default: 20)
  imagesPerRow?: number; // Number of images per row (default: auto-calculated) - only used for grid layouts
  centerImageFile?: File; // Optional image to place in the center safe area (divided grid layouts)
  backgroundImageFile?: File; // Optional image to draw behind everything, sized to cover the full canvas
}

export interface ComposeResult {
  blob: Blob;
  url: string;
  canvas: CanvasDimensions;
}