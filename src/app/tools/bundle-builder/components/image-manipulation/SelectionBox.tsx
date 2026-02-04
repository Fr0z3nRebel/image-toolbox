"use client";

import type { DragSelection } from "../../types/imageManipulation";

interface SelectionBoxProps {
  dragSelection: DragSelection | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function SelectionBox({ dragSelection, containerRef }: SelectionBoxProps) {
  if (!dragSelection || !containerRef.current) return null;

  const container = containerRef.current;
  const selectionBox = {
    left: Math.min(dragSelection.startX, dragSelection.currentX),
    top: Math.min(dragSelection.startY, dragSelection.currentY),
    width: Math.abs(dragSelection.currentX - dragSelection.startX),
    height: Math.abs(dragSelection.currentY - dragSelection.startY),
    containerWidth: container.clientWidth,
    containerHeight: container.clientHeight
  };

  if (selectionBox.width === 0 || selectionBox.height === 0) return null;

  return (
    <div
      className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
      style={{
        left: `${(selectionBox.left / selectionBox.containerWidth) * 100}%`,
        top: `${(selectionBox.top / selectionBox.containerHeight) * 100}%`,
        width: `${(selectionBox.width / selectionBox.containerWidth) * 100}%`,
        height: `${(selectionBox.height / selectionBox.containerHeight) * 100}%`,
        zIndex: 10001
      }}
    />
  );
}
