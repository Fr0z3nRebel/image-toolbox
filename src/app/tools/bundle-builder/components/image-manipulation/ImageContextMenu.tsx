"use client";

import { Copy, FlipHorizontal, FlipVertical, ArrowDown, ArrowUp, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { ContextMenuPosition } from "../../types/imageManipulation";

interface ImageContextMenuProps {
  contextMenu: ContextMenuPosition | null;
  isAtBack: boolean;
  isAtFront: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  onMirrorHorizontal: () => void;
  onMirrorVertical: () => void;
  onBringToFront: () => void;
  onBringForward: () => void;
  onSendBackwards: () => void;
  onSendToBack: () => void;
}

export default function ImageContextMenu({
  contextMenu,
  isAtBack,
  isAtFront,
  onDuplicate,
  onDelete,
  onMirrorHorizontal,
  onMirrorVertical,
  onBringToFront,
  onBringForward,
  onSendBackwards,
  onSendToBack
}: ImageContextMenuProps) {
  if (!contextMenu) return null;

  return (
    <div
      className="fixed bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[160px]"
      style={{
        left: `${contextMenu.x}px`,
        top: `${contextMenu.y}px`,
        zIndex: 20000
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onDuplicate}
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
      >
        <Copy className="h-4 w-4" />
        Duplicate
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
      <div className="border-t border-gray-200 my-1" />
      <div className="px-2 py-1">
        <div className="text-xs font-medium text-gray-500 px-2 py-1">Mirror</div>
        <button
          type="button"
          onClick={onMirrorHorizontal}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        >
          <FlipHorizontal className="h-4 w-4" />
          Horizontal
        </button>
        <button
          type="button"
          onClick={onMirrorVertical}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        >
          <FlipVertical className="h-4 w-4" />
          Vertical
        </button>
      </div>
      <div className="border-t border-gray-200 my-1" />
      <div className="px-2 py-1">
        <div className="text-xs font-medium text-gray-500 px-2 py-1">Layer Order</div>
        <button
          type="button"
          onClick={onBringToFront}
          disabled={isAtFront}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronUp className="h-4 w-4" />
          Bring to Front
        </button>
        <button
          type="button"
          onClick={onBringForward}
          disabled={isAtFront}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowUp className="h-4 w-4" />
          Bring Forward
        </button>
        <button
          type="button"
          onClick={onSendBackwards}
          disabled={isAtBack}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowDown className="h-4 w-4" />
          Send Backwards
        </button>
        <button
          type="button"
          onClick={onSendToBack}
          disabled={isAtBack}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronDown className="h-4 w-4" />
          Send to Back
        </button>
      </div>
    </div>
  );
}
