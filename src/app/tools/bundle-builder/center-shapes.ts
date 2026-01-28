import type { CenterShapeId } from "./types";

export interface ShapeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ShapeDrawFn = (
  ctx: CanvasRenderingContext2D,
  rect: ShapeRect,
  fillColor: string
) => void;

function drawRectangle(ctx: CanvasRenderingContext2D, rect: ShapeRect, fillColor: string): void {
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.fill();
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, rect: ShapeRect, fillColor: string): void {
  const r = Math.min(rect.width, rect.height) * 0.12;
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, r);
  ctx.fill();
}

function drawPill(ctx: CanvasRenderingContext2D, rect: ShapeRect, fillColor: string): void {
  const r = Math.min(rect.width, rect.height) / 2;
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, r);
  ctx.fill();
}

function drawBadge(ctx: CanvasRenderingContext2D, rect: ShapeRect, fillColor: string): void {
  const { x, y, width, height } = rect;
  const tab = Math.min(width * 0.15, height * 0.2);
  const r = Math.min(width, height) * 0.08;
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r - tab);
  ctx.quadraticCurveTo(x + width, y + height - tab, x + width - r, y + height - tab);
  ctx.lineTo(x + width / 2 + tab, y + height - tab);
  ctx.lineTo(x + width / 2, y + height);
  ctx.lineTo(x + width / 2 - tab, y + height - tab);
  ctx.lineTo(x + r, y + height - tab);
  ctx.quadraticCurveTo(x, y + height - tab, x, y + height - tab - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function drawBanner(ctx: CanvasRenderingContext2D, rect: ShapeRect, fillColor: string): void {
  const { x, y, width, height } = rect;
  const slant = height * 0.12;
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(x + slant, y);
  ctx.lineTo(x + width - slant, y);
  ctx.lineTo(x + width, y + height / 2);
  ctx.lineTo(x + width - slant, y + height);
  ctx.lineTo(x + slant, y + height);
  ctx.lineTo(x, y + height / 2);
  ctx.closePath();
  ctx.fill();
}

function drawBannerRibbon(ctx: CanvasRenderingContext2D, rect: ShapeRect, fillColor: string): void {
  const { x, y, width, height } = rect;
  const fold = Math.min(width * 0.08, height * 0.15);
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(x + fold, y);
  ctx.lineTo(x + width - fold, y);
  ctx.lineTo(x + width, y + fold);
  ctx.lineTo(x + width, y + height - fold);
  ctx.lineTo(x + width - fold, y + height);
  ctx.lineTo(x + fold, y + height);
  ctx.lineTo(x, y + height - fold);
  ctx.lineTo(x, y + fold);
  ctx.closePath();
  ctx.fill();
}

export const CENTER_SHAPES: { id: CenterShapeId; label: string; draw: ShapeDrawFn }[] = [
  { id: "rectangle", label: "Rectangle", draw: drawRectangle },
  { id: "roundedRect", label: "Rounded rectangle", draw: drawRoundedRect },
  { id: "pill", label: "Pill", draw: drawPill },
  { id: "badge", label: "Badge", draw: drawBadge },
  { id: "banner", label: "Banner", draw: drawBanner },
  { id: "bannerRibbon", label: "Banner ribbon", draw: drawBannerRibbon }
];

const drawMap = new Map<CenterShapeId, ShapeDrawFn>(
  CENTER_SHAPES.map((s) => [s.id, s.draw])
);

export function drawCenterShape(
  ctx: CanvasRenderingContext2D,
  shapeId: CenterShapeId,
  rect: ShapeRect,
  fillColor: string
): void {
  const draw = drawMap.get(shapeId) ?? drawRectangle;
  draw(ctx, rect, fillColor);
}
