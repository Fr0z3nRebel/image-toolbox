import { getTextSafeRect } from "./text-safe-area";
import { CENTER_TEXT_FONT_SIZE_MIN, CENTER_TEXT_FONT_SIZE_MAX } from "./types";
import type { TextSafeRect } from "./types";

export interface CenterTextLayoutLine {
  text: string;
  x: number;
  y: number;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
}

export interface CenterTextLayoutBlock {
  lines: CenterTextLayoutLine[];
}

export interface CenterTextLayout {
  shapeRect: { x: number; y: number; width: number; height: number };
  title: CenterTextLayoutBlock;
  subtitle: CenterTextLayoutBlock;
}

export interface CenterTextLayoutOptions {
  canvasWidth: number;
  canvasHeight: number;
  textSafeAreaPercent: number;
  centerScale: number;
  centerXOffset: number;
  centerYOffset: number;
  titleText?: string;
  subtitleText?: string;
  titleFont: string;
  subtitleFont: string;
  titleFontSize: number;
  subtitleFontSize: number;
  titleFontSizeAuto: boolean;
  subtitleFontSizeAuto: boolean;
  wrapText: boolean;
}

function clampSize(n: number): number {
  return Math.min(CENTER_TEXT_FONT_SIZE_MAX, Math.max(CENTER_TEXT_FONT_SIZE_MIN, n));
}

function computeShapeRect(
  canvasWidth: number,
  canvasHeight: number,
  textSafeRect: TextSafeRect,
  centerScale: number,
  centerXOffset: number,
  centerYOffset: number
) {
  const width = textSafeRect.width * centerScale;
  const height = textSafeRect.height * centerScale;
  const offsetX = (canvasWidth * centerXOffset) / 100;
  const offsetY = (canvasHeight * centerYOffset) / 100;
  const x = (canvasWidth - width) / 2 + offsetX;
  const y = (canvasHeight - height) / 2 + offsetY;
  return { x, y, width, height };
}

function wrapIntoLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontFamily: string,
  fontSize: number,
  isTitle: boolean
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  ctx.font = `${isTitle ? 600 : 400} ${fontSize}px "${fontFamily}", sans-serif`;
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const w = ctx.measureText(test).width;
    if (w <= maxWidth || !current) {
      current = test;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function computeAutoSize(
  ctx: CanvasRenderingContext2D,
  text: string | undefined,
  fontFamily: string,
  base: number,
  isTitle: boolean,
  wrapText: boolean,
  maxWidth: number,
  maxHeight: number
): number {
  if (!text) return clampSize(base);
  let size = CENTER_TEXT_FONT_SIZE_MAX;
  while (size >= CENTER_TEXT_FONT_SIZE_MIN) {
    ctx.font = `${isTitle ? 600 : 400} ${size}px "${fontFamily}", sans-serif`;
    if (!wrapText) {
      const width = ctx.measureText(text).width;
      if (width <= maxWidth) break;
    } else {
      const lines = wrapIntoLines(ctx, text, maxWidth, fontFamily, size, isTitle);
      const lineHeight = size * 1.2;
      const totalHeight = lines.length * lineHeight;
      const anyTooWide = lines.some((line) => ctx.measureText(line).width > maxWidth);
      if (!anyTooWide && totalHeight <= maxHeight) break;
    }
    size -= 2;
  }
  return clampSize(size);
}

export function layoutCenterText(
  opts: CenterTextLayoutOptions,
  ctx: CanvasRenderingContext2D
): CenterTextLayout {
  const {
    canvasWidth,
    canvasHeight,
    textSafeAreaPercent,
    centerScale,
    centerXOffset,
    centerYOffset,
    titleText = "",
    subtitleText = "",
    titleFont,
    subtitleFont,
    titleFontSize,
    subtitleFontSize,
    titleFontSizeAuto,
    subtitleFontSizeAuto,
    wrapText
  } = opts;

  const textSafeRect = getTextSafeRect(canvasWidth, canvasHeight, textSafeAreaPercent);
  const shapeRect = computeShapeRect(
    canvasWidth,
    canvasHeight,
    textSafeRect,
    centerScale,
    centerXOffset,
    centerYOffset
  );

  const maxTextWidth = shapeRect.width * 0.9;
  const maxTextHeight = shapeRect.height * 0.9;

  const tSize = titleFontSizeAuto
    ? computeAutoSize(
        ctx,
        titleText,
        titleFont,
        titleFontSize,
        true,
        wrapText,
        maxTextWidth,
        maxTextHeight
      )
    : clampSize(titleFontSize);

  const sSize = subtitleFontSizeAuto
    ? computeAutoSize(
        ctx,
        subtitleText,
        subtitleFont,
        subtitleFontSize,
        false,
        wrapText,
        maxTextWidth,
        maxTextHeight
      )
    : clampSize(subtitleFontSize);

  const localCenterY = shapeRect.height / 2;
  const titleCenterY =
    titleText && subtitleText
      ? localCenterY - (tSize + sSize) * 0.35
      : localCenterY;
  const subtitleCenterY =
    titleText && subtitleText
      ? localCenterY + (tSize + sSize) * 0.35
      : localCenterY;

  const titleLines: CenterTextLayoutLine[] = [];
  const subtitleLines: CenterTextLayoutLine[] = [];

  if (titleText) {
    const lines = wrapText
      ? wrapIntoLines(ctx, titleText, maxTextWidth, titleFont, tSize, true)
      : [titleText];
    const lineHeight = tSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = titleCenterY - (totalHeight - lineHeight) / 2;
    lines.forEach((line, idx) => {
      const yLocal = startY + idx * lineHeight;
      titleLines.push({
        text: line,
        x: shapeRect.x + shapeRect.width / 2,
        y: shapeRect.y + yLocal,
        fontFamily: titleFont,
        fontWeight: 600,
        fontSize: tSize
      });
    });
  }

  if (subtitleText) {
    const lines = wrapText
      ? wrapIntoLines(ctx, subtitleText, maxTextWidth, subtitleFont, sSize, false)
      : [subtitleText];
    const lineHeight = sSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = subtitleCenterY - (totalHeight - lineHeight) / 2;
    lines.forEach((line, idx) => {
      const yLocal = startY + idx * lineHeight;
      subtitleLines.push({
        text: line,
        x: shapeRect.x + shapeRect.width / 2,
        y: shapeRect.y + yLocal,
        fontFamily: subtitleFont,
        fontWeight: 400,
        fontSize: sSize
      });
    });
  }

  return {
    shapeRect,
    title: { lines: titleLines },
    subtitle: { lines: subtitleLines }
  };
}

