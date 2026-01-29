export type LayoutStyle = "dividedGrid" | "dividedGrid2" | "grid";

export type AspectRatio = "4:3" | "1:1";

export type CenterMode = "image" | "text";

export type CenterShapeId = "rectangle" | "roundedRect" | "pill";

/** Shared font-size range (px) for title and subtitle. */
export const CENTER_TEXT_FONT_SIZE_MIN = 12;
export const CENTER_TEXT_FONT_SIZE_MAX = 120;

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
  imageSpacingPercent?: number; // Percentage of frame size for padding around images (default: 5)
  centerImageFile?: File; // Optional image to place in the center safe area (divided grid layouts)
  backgroundImageFile?: File; // Optional image to draw behind everything, sized to cover the full canvas
  centerMode?: CenterMode;
  centerShape?: CenterShapeId;
  titleText?: string;
  subtitleText?: string;
  titleFont?: string;
  subtitleFont?: string;
  titleBold?: boolean;
  subtitleBold?: boolean;
  titleFontSizeAuto?: boolean;
  subtitleFontSizeAuto?: boolean;
  titleFontSize?: number;
  subtitleFontSize?: number;
  shapeColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  wrapText?: boolean;
}

export interface ComposeResult {
  blob: Blob;
  url: string;
  canvas: CanvasDimensions;
}