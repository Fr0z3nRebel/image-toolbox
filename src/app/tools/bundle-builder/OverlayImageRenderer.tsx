"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { RotateCw, Copy, FlipHorizontal, FlipVertical, ArrowDown, ArrowUp, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { OverlayImage } from "./OverlayImageEditor";
import { getCanvasDimensions } from "./canvas";
import type { AspectRatio } from "./types";

interface OverlayImageRendererProps {
  overlayImages: OverlayImage[];
  onOverlayImagesChange: (images: OverlayImage[]) => void;
  aspectRatio: AspectRatio;
  containerRef: React.RefObject<HTMLDivElement>;
}

export default function OverlayImageRenderer({
  overlayImages,
  onOverlayImagesChange,
  aspectRatio,
  containerRef
}: OverlayImageRendererProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; imageId: string } | null>(null);
  const dragStateRef = useRef<{
    imageId: string;
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

  const updateOverlay = useCallback(
    (id: string, updates: Partial<OverlayImage>) => {
      onOverlayImagesChange(
        overlayImages.map((img) => (img.id === id ? { ...img, ...updates } : img))
      );
    },
    [overlayImages, onOverlayImagesChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, imageId: string, type: "drag" | "resize" | "rotate", handle?: string) => {
      e.stopPropagation();
      setSelectedImageId(imageId);

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      const image = overlayImages.find((img) => img.id === imageId);
      if (!image) return;

      // Use stored aspect ratio or calculate from current dimensions
      const aspectRatio = image.aspectRatio ?? (image.width / image.height);

      dragStateRef.current = {
        imageId,
        type,
        handle,
        startX,
        startY,
        imageX: image.x,
        imageY: image.y,
        imageWidth: image.width,
        imageHeight: image.height,
        imageRotation: image.rotation,
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
          updateOverlay(state.imageId, {
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

          updateOverlay(state.imageId, { width: newWidth, height: newHeight, x: newX, y: newY });
        } else if (state.type === "rotate") {
          const centerX = rect.width * (state.imageX / 100);
          const centerY = rect.height * (state.imageY / 100);
          const angle1 = Math.atan2(state.startY - centerY, state.startX - centerX);
          const angle2 = Math.atan2(currentY - centerY, currentX - centerX);
          const deltaAngle = ((angle2 - angle1) * 180) / Math.PI;
          updateOverlay(state.imageId, {
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
    [overlayImages, updateOverlay, containerRef]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, imageId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, imageId });
    },
    []
  );

  const handleDuplicate = useCallback(
    (imageId: string) => {
      const image = overlayImages.find((img) => img.id === imageId);
      if (!image) return;

      const duplicated: OverlayImage = {
        ...image,
        id: `${image.id}-copy-${Date.now()}`,
        x: Math.min(100, image.x + 2), // Slight offset
        y: Math.min(100, image.y + 2),
        aspectRatio: image.aspectRatio // Preserve aspect ratio
      };

      onOverlayImagesChange([...overlayImages, duplicated]);
      setContextMenu(null);
      setSelectedImageId(duplicated.id);
    },
    [overlayImages, onOverlayImagesChange]
  );

  const handleMirrorHorizontal = useCallback(
    (imageId: string) => {
      updateOverlay(imageId, {
        mirrorHorizontal: !overlayImages.find((img) => img.id === imageId)?.mirrorHorizontal
      });
      setContextMenu(null);
    },
    [overlayImages, updateOverlay]
  );

  const handleMirrorVertical = useCallback(
    (imageId: string) => {
      updateOverlay(imageId, {
        mirrorVertical: !overlayImages.find((img) => img.id === imageId)?.mirrorVertical
      });
      setContextMenu(null);
    },
    [overlayImages, updateOverlay]
  );

  const handleSendToBack = useCallback(
    (imageId: string) => {
      const index = overlayImages.findIndex((img) => img.id === imageId);
      if (index === -1 || index === 0) return; // Already at back or not found

      const newImages = [...overlayImages];
      const [image] = newImages.splice(index, 1);
      newImages.unshift(image);
      onOverlayImagesChange(newImages);
      setContextMenu(null);
    },
    [overlayImages, onOverlayImagesChange]
  );

  const handleSendBackwards = useCallback(
    (imageId: string) => {
      const index = overlayImages.findIndex((img) => img.id === imageId);
      if (index === -1 || index === 0) return; // Already at back or not found

      const newImages = [...overlayImages];
      [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
      onOverlayImagesChange(newImages);
      setContextMenu(null);
    },
    [overlayImages, onOverlayImagesChange]
  );

  const handleBringForward = useCallback(
    (imageId: string) => {
      const index = overlayImages.findIndex((img) => img.id === imageId);
      if (index === -1 || index === overlayImages.length - 1) return; // Already at front or not found

      const newImages = [...overlayImages];
      [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
      onOverlayImagesChange(newImages);
      setContextMenu(null);
    },
    [overlayImages, onOverlayImagesChange]
  );

  const handleBringToFront = useCallback(
    (imageId: string) => {
      const index = overlayImages.findIndex((img) => img.id === imageId);
      if (index === -1 || index === overlayImages.length - 1) return; // Already at front or not found

      const newImages = [...overlayImages];
      const [image] = newImages.splice(index, 1);
      newImages.push(image);
      onOverlayImagesChange(newImages);
      setContextMenu(null);
    },
    [overlayImages, onOverlayImagesChange]
  );

  const handleDelete = useCallback(
    (imageId: string) => {
      onOverlayImagesChange(overlayImages.filter((img) => img.id !== imageId));
      setContextMenu(null);
      if (selectedImageId === imageId) {
        setSelectedImageId(null);
      }
    },
    [overlayImages, onOverlayImagesChange, selectedImageId]
  );

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenu]);

  // Deselect on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedImageId(null);
        setContextMenu(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (overlayImages.length === 0) return null;

  return (
    <>
      {overlayImages.map((overlay, index) => {
        const isSelected = selectedImageId === overlay.id;
        return (
          <div
            key={overlay.id}
            className="absolute cursor-move"
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              width: `${overlay.width}%`,
              height: `${overlay.height}%`,
              transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg)`,
              transformOrigin: "center center",
              zIndex: 40 + index + (isSelected ? 0.5 : 0), // Later items appear on top, selected items slightly higher
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none"
            }}
            onMouseDown={(e) => handleMouseDown(e, overlay.id, "drag")}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImageId(overlay.id);
            }}
            onContextMenu={(e) => handleContextMenu(e, overlay.id)}
          >
            {/* Image */}
            {overlay.file.preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={overlay.file.preview}
                alt=""
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
                style={{
                  transform: `scaleX(${overlay.mirrorHorizontal ? -1 : 1}) scaleY(${overlay.mirrorVertical ? -1 : 1})`
                }}
              />
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
                      handleMouseDown(e, overlay.id, "resize", handle);
                    }}
                  />
                ))}

                {/* Rotate handle */}
                <div
                  className="absolute left-1/2 -top-8 w-6 h-6 bg-blue-500 border-2 border-white rounded-full cursor-grab flex items-center justify-center z-10"
                  style={{ transform: "translateX(-50%)" }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, overlay.id, "rotate");
                  }}
                >
                  <RotateCw className="h-3 w-3 text-white" />
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Context Menu */}
      {contextMenu && (() => {
        const imageIndex = overlayImages.findIndex((img) => img.id === contextMenu.imageId);
        const isAtBack = imageIndex === 0;
        const isAtFront = imageIndex === overlayImages.length - 1;
        
        return (
          <div
            className="fixed bg-white border border-gray-300 rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
          <button
            type="button"
            onClick={() => handleDuplicate(contextMenu.imageId)}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => handleDelete(contextMenu.imageId)}
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
                onClick={() => handleMirrorHorizontal(contextMenu.imageId)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <FlipHorizontal className="h-4 w-4" />
                Horizontal
              </button>
              <button
                type="button"
                onClick={() => handleMirrorVertical(contextMenu.imageId)}
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
                onClick={() => handleBringToFront(contextMenu.imageId)}
                disabled={isAtFront}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronUp className="h-4 w-4" />
                Bring to Front
              </button>
              <button
                type="button"
                onClick={() => handleBringForward(contextMenu.imageId)}
                disabled={isAtFront}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUp className="h-4 w-4" />
                Bring Forward
              </button>
              <button
                type="button"
                onClick={() => handleSendBackwards(contextMenu.imageId)}
                disabled={isAtBack}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowDown className="h-4 w-4" />
                Send Backwards
              </button>
              <button
                type="button"
                onClick={() => handleSendToBack(contextMenu.imageId)}
                disabled={isAtBack}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronDown className="h-4 w-4" />
                Send to Back
              </button>
            </div>
          </div>
        );
      })()}
    </>
  );
}
