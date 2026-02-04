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
  centerWidthScale: number;
  centerHeightScale: number;
  centerXOffset: number;
  centerYOffset: number;
  titleText?: string;
  subtitleText?: string;
  titleFont: string;
  subtitleFont: string;
  titleBold: boolean;
  subtitleBold: boolean;
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
  centerWidthScale: number,
  centerHeightScale: number,
  centerXOffset: number,
  centerYOffset: number
) {
  const width = textSafeRect.width * centerWidthScale;
  const height = textSafeRect.height * centerHeightScale;
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
  fontWeight: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
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
  fontWeight: number,
  wrapText: boolean,
  maxWidth: number,
  maxHeight: number
): number {
  if (!text) return clampSize(base);
  let size = CENTER_TEXT_FONT_SIZE_MAX;
  while (size >= CENTER_TEXT_FONT_SIZE_MIN) {
    ctx.font = `${fontWeight} ${size}px "${fontFamily}", sans-serif`;
    if (!wrapText) {
      const width = ctx.measureText(text).width;
      if (width <= maxWidth) break;
    } else {
      const lines = wrapIntoLines(ctx, text, maxWidth, fontFamily, size, fontWeight);
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
    centerWidthScale,
    centerHeightScale,
    centerXOffset,
    centerYOffset,
    titleText = "",
    subtitleText = "",
    titleFont,
    subtitleFont,
    titleBold,
    subtitleBold,
    titleFontSize,
    subtitleFontSize,
    titleFontSizeAuto,
    subtitleFontSizeAuto,
    wrapText
  } = opts;

  const titleWeight = titleBold ? 700 : 600;
  const subtitleWeight = subtitleBold ? 700 : 400;

  const textSafeRect = getTextSafeRect(canvasWidth, canvasHeight, textSafeAreaPercent);
  const shapeRect = computeShapeRect(
    canvasWidth,
    canvasHeight,
    textSafeRect,
    centerWidthScale,
    centerHeightScale,
    centerXOffset,
    centerYOffset
  );

  // When Auto is selected, always use single-line mode and fit to width with padding
  // When not Auto, respect the wrapText setting
  const maxTextWidth = shapeRect.width * 0.85; // Reasonable padding (15% on each side)
  const maxTextHeight = shapeRect.height * 0.9;

  const tSize = titleFontSizeAuto
    ? computeAutoSize(
        ctx,
        titleText,
        titleFont,
        titleFontSize,
        titleWeight,
        false, // Auto always uses single-line mode
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
        subtitleWeight,
        false, // Auto always uses single-line mode
        maxTextWidth,
        maxTextHeight
      )
    : clampSize(subtitleFontSize);

  const localCenterY = shapeRect.height / 2;

  // Calculate actual heights of title and subtitle blocks (accounting for wrapping)
  const titleShouldWrap = titleText && !titleFontSizeAuto && wrapText;
  const titleLinesArray = titleShouldWrap
    ? wrapIntoLines(ctx, titleText, maxTextWidth, titleFont, tSize, titleWeight)
    : titleText ? [titleText] : [];
  const titleLineHeight = tSize * 1.2;
  const titleTotalHeight = titleLinesArray.length * titleLineHeight;

  const subtitleShouldWrap = subtitleText && !subtitleFontSizeAuto && wrapText;
  const subtitleLinesArray = subtitleShouldWrap
    ? wrapIntoLines(ctx, subtitleText, maxTextWidth, subtitleFont, sSize, subtitleWeight)
    : subtitleText ? [subtitleText] : [];
  const subtitleLineHeight = sSize * 1.2;
  const subtitleTotalHeight = subtitleLinesArray.length * subtitleLineHeight;

  // Calculate center Y positions (matching original logic when no wrapping)
  const titleCenterY =
    titleText && subtitleText
      ? localCenterY - (tSize + sSize) * 0.35
      : localCenterY;
  const subtitleCenterY =
    titleText && subtitleText
      ? localCenterY + (tSize + sSize) * 0.35
      : localCenterY;

  // When title wraps, adjust subtitle position to add extra space
  // Calculate the bottom of the title block and add spacing
  const titleBottomY = titleCenterY + titleTotalHeight / 2;
  const baseSubtitleTopY = subtitleCenterY - subtitleTotalHeight / 2;
  
  // Original spacing when no wrap: subtitleTop - titleBottom = (tSize + sSize) * 0.2
  // When title wraps, ensure minimum spacing
  const minSpacing = (tSize + sSize) * 0.2;
  const actualSpacing = baseSubtitleTopY - titleBottomY;
  const adjustedSubtitleCenterY = actualSpacing < minSpacing
    ? titleBottomY + minSpacing + subtitleTotalHeight / 2
    : subtitleCenterY;

  const titleLines: CenterTextLayoutLine[] = [];
  const subtitleLines: CenterTextLayoutLine[] = [];

  if (titleText) {
    const startY = titleCenterY - (titleTotalHeight - titleLineHeight) / 2;
    titleLinesArray.forEach((line, idx) => {
      const yLocal = startY + idx * titleLineHeight;
      titleLines.push({
        text: line,
        x: shapeRect.x + shapeRect.width / 2,
        y: shapeRect.y + yLocal,
        fontFamily: titleFont,
        fontWeight: titleWeight,
        fontSize: tSize
      });
    });
  }

  if (subtitleText) {
    const startY = adjustedSubtitleCenterY - (subtitleTotalHeight - subtitleLineHeight) / 2;
    subtitleLinesArray.forEach((line, idx) => {
      const yLocal = startY + idx * subtitleLineHeight;
      subtitleLines.push({
        text: line,
        x: shapeRect.x + shapeRect.width / 2,
        y: shapeRect.y + yLocal,
        fontFamily: subtitleFont,
        fontWeight: subtitleWeight,
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

