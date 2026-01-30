"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { FileWithPreview } from "../../components/FileUploadZone";
import type { AspectRatio } from "./types";
import { getCanvasDimensions } from "./canvas";

export interface BundleImagePosition {
  fileId: string;
  x: number; // Percentage of canvas width
  y: number; // Percentage of canvas height
  width: number; // Percentage of canvas width
  height: number; // Percentage of canvas height
  rotation: number; // Degrees
}

interface BundleImageRendererProps {
  files: FileWithPreview[];
  positions: BundleImagePosition[];
  onPositionsChange: (positions: BundleImagePosition[]) => void;
  aspectRatio: AspectRatio;
  containerRef: React.RefObject<HTMLDivElement>;
  contentCropped: Record<string, string>;
  onDragStart?: () => void; // Called when user starts dragging an image
}

export default function BundleImageRenderer({
  files,
  positions,
  onPositionsChange,
  aspectRatio,
  containerRef,
  contentCropped,
  onDragStart
}: BundleImageRendererProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const dragStateRef = useRef<{
    fileId: string;
    type: "drag" | "resize" | "rotate";
    handle?: string;
    startX: number;
    startY: number;
    imageX: number;
    imageY: number;
    imageWidth: number;
    imageHeight: number;
    imageRotation: number;
    aspectRatio: number;
  } | null>(null);

  const { width: canvasWidth, height: canvasHeight } = getCanvasDimensions(aspectRatio);

  const updatePosition = useCallback(
    (fileId: string, updates: Partial<BundleImagePosition>) => {
      onPositionsChange(
        positions.map((pos) => (pos.fileId === fileId ? { ...pos, ...updates } : pos))
      );
    },
    [positions, onPositionsChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, fileId: string, type: "drag" | "resize" | "rotate", handle?: string) => {
      e.stopPropagation();
      setSelectedImageId(fileId);

      const container = containerRef.current;
      if (!container) return;
      
      // Notify parent that layout should be set to custom when user starts dragging/resizing
      if ((type === "drag" || type === "resize") && onDragStart) {
        onDragStart();
      }

      const rect = container.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      const position = positions.find((pos) => pos.fileId === fileId);
      if (!position) return;

      // Calculate aspect ratio from current dimensions
      const aspectRatio = position.width / position.height;

      dragStateRef.current = {
        fileId,
        type,
        handle,
        startX,
        startY,
        imageX: position.x,
        imageY: position.y,
        imageWidth: position.width,
        imageHeight: position.height,
        imageRotation: position.rotation,
        aspectRatio
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragStateRef.current) return;
        const state = dragStateRef.current;

        const currentX = moveEvent.clientX - rect.left;
        const currentY = moveEvent.clientY - rect.top;
        const deltaX = currentX - state.startX;
        const deltaY = currentY - state.startY;

        if (state.type === "drag") {
          const deltaXPercent = (deltaX / rect.width) * 100;
          const deltaYPercent = (deltaY / rect.height) * 100;
          updatePosition(state.fileId, {
            x: Math.max(0, Math.min(100, state.imageX + deltaXPercent)),
            y: Math.max(0, Math.min(100, state.imageY + deltaYPercent))
          });
        } else if (state.type === "resize" && state.handle) {
          // Calculate center point in pixels
          const centerX = rect.width * (state.imageX / 100);
          const centerY = rect.height * (state.imageY / 100);
          
          // Calculate distance from center to current mouse position
          const currentDistanceX = Math.abs(currentX - centerX);
          const currentDistanceY = Math.abs(currentY - centerY);
          
          // Calculate distance from center to initial mouse position
          const initialDistanceX = Math.abs(state.startX - centerX);
          const initialDistanceY = Math.abs(state.startY - centerY);
          
          let newWidth = state.imageWidth;
          let newHeight = state.imageHeight;
          let newX = state.imageX;
          let newY = state.imageY;

          // Corner handles maintain aspect ratio
          const isCornerHandle = ["nw", "ne", "sw", "se"].includes(state.handle || "");
          
          if (isCornerHandle) {
            // Calculate scale factor based on distance from center
            // Use the larger dimension to maintain aspect ratio
            const initialDistance = Math.max(initialDistanceX, initialDistanceY);
            const currentDistance = Math.max(currentDistanceX, currentDistanceY);
            
            if (initialDistance > 0) {
              const scale = currentDistance / initialDistance;
              newWidth = Math.max(5, Math.min(50, state.imageWidth * scale));
              newHeight = newWidth / state.aspectRatio;
              
              // Center point stays fixed, so x and y don't change
              newX = state.imageX;
              newY = state.imageY;
            }
          } else {
            // Edge handles allow independent resizing, but scale from center
            if (state.handle.includes("e") || state.handle.includes("w")) {
              if (initialDistanceX > 0) {
                const scaleX = currentDistanceX / initialDistanceX;
                newWidth = Math.max(5, Math.min(50, state.imageWidth * scaleX));
                // Center point stays fixed
                newX = state.imageX;
              }
            }
            if (state.handle.includes("s") || state.handle.includes("n")) {
              if (initialDistanceY > 0) {
                const scaleY = currentDistanceY / initialDistanceY;
                newHeight = Math.max(5, Math.min(50, state.imageHeight * scaleY));
                // Center point stays fixed
                newY = state.imageY;
              }
            }
          }

          updatePosition(state.fileId, { width: newWidth, height: newHeight, x: newX, y: newY });
        } else if (state.type === "rotate") {
          const centerX = rect.width * (state.imageX / 100);
          const centerY = rect.height * (state.imageY / 100);
          const angle1 = Math.atan2(state.startY - centerY, state.startX - centerX);
          const angle2 = Math.atan2(currentY - centerY, currentX - centerX);
          const deltaAngle = ((angle2 - angle1) * 180) / Math.PI;
          updatePosition(state.fileId, {
            rotation: (state.imageRotation + deltaAngle) % 360
          });
        }
      };

      const handleMouseUp = () => {
        dragStateRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [positions, updatePosition, containerRef, onDragStart]
  );

  // Deselect on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedImageId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (positions.length === 0) return null;

  return (
    <>
      {positions.map((position, index) => {
        const file = files.find((f) => f.id === position.fileId);
        if (!file) return null;
        
        const isSelected = selectedImageId === position.fileId;
        const cropped = contentCropped[file.id];
        
        return (
          <div
            key={position.fileId}
            className="absolute cursor-move"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              width: `${position.width}%`,
              height: `${position.height}%`,
              transform: `translate(-50%, -50%) rotate(${position.rotation}deg)`,
              transformOrigin: "center center",
              zIndex: 10 + index + (isSelected ? 0.5 : 0), // Above center shape/text (z-5), below overlay images (z-40+)
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none"
            }}
            onMouseDown={(e) => handleMouseDown(e, position.fileId, "drag")}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImageId(position.fileId);
            }}
          >
            {/* Image */}
            {cropped ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cropped}
                alt=""
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full min-h-[2px] bg-gray-200" />
            )}

            {/* Selection border and handles */}
            {isSelected && (
              <>
                {/* Border */}
                <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />

                {/* Resize handles */}
                {["nw", "ne", "sw", "se"].map((handle) => (
                  <div
                    key={handle}
                    className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize z-10"
                    style={{
                      left: handle.includes("w") ? "-6px" : "auto",
                      right: handle.includes("e") ? "-6px" : "auto",
                      top: handle.includes("n") ? "-6px" : "auto",
                      bottom: handle.includes("s") ? "-6px" : "auto",
                      cursor: handle === "nw" || handle === "se" ? "nwse-resize" : "nesw-resize"
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleMouseDown(e, position.fileId, "resize", handle);
                    }}
                  />
                ))}

                {/* Rotate handle */}
                <div
                  className="absolute left-1/2 -top-8 w-6 h-6 bg-blue-500 border-2 border-white rounded-full cursor-grab flex items-center justify-center z-10"
                  style={{ transform: "translateX(-50%)" }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, position.fileId, "rotate");
                  }}
                >
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </>
            )}
          </div>
        );
      })}
    </>
  );
}
