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


export const CENTER_SHAPES: { id: CenterShapeId; label: string; draw: ShapeDrawFn }[] = [
  { id: "rectangle", label: "Rectangle", draw: drawRectangle },
  { id: "roundedRect", label: "Rounded rectangle", draw: drawRoundedRect },
  { id: "pill", label: "Pill", draw: drawPill }
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
