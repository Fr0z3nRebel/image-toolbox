"use client";

import { RotateCw } from "lucide-react";
import type { HandleType } from "../../types/imageManipulation";

interface ImageHandlesProps {
  onMouseDown: (e: React.MouseEvent, handle: HandleType) => void;
  onRotateMouseDown: (e: React.MouseEvent) => void;
  rotateIcon?: "rotate" | "svg";
}

export default function ImageHandles({ onMouseDown, onRotateMouseDown, rotateIcon = "svg" }: ImageHandlesProps) {
  return (
    <>
      {/* Resize handles */}
      {(["nw", "ne", "sw", "se"] as HandleType[]).map((handle) => (
        <div
          key={handle}
          data-handle
          className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize pointer-events-auto"
          style={{
            left: handle.includes("w") ? "-6px" : "auto",
            right: handle.includes("e") ? "-6px" : "auto",
            top: handle.includes("n") ? "-6px" : "auto",
            bottom: handle.includes("s") ? "-6px" : "auto",
            cursor: handle === "nw" || handle === "se" ? "nwse-resize" : "nesw-resize"
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDown(e, handle);
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      ))}

      {/* Rotate handle */}
      <div
        data-handle
        className="absolute left-1/2 -top-8 w-6 h-6 bg-blue-500 border-2 border-white rounded-full cursor-grab flex items-center justify-center pointer-events-auto"
        style={{ transform: "translateX(-50%)" }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onRotateMouseDown(e);
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {rotateIcon === "rotate" ? (
          <RotateCw className="h-3 w-3 text-white" />
        ) : (
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
      </div>
    </>
  );
}
