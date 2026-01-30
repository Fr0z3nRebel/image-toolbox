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
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [dragSelection, setDragSelection] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const dragStateRef = useRef<{
    fileId: string; // The image being directly manipulated
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
    selectedImages: Array<{ fileId: string; x: number; y: number; width: number; height: number; rotation: number }>; // Initial state of all selected images
    hasMoved: boolean; // Track if mouse moved during drag
  } | null>(null);
  const justCompletedDragRef = useRef<boolean>(false);

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
      
      // Capture current selection IMMEDIATELY and synchronously before any other code runs
      // Use a fresh copy to avoid any potential state update issues
      const currentSelection = selectedImageIds;
      let finalSelection = new Set(currentSelection);
      
      // Update selection
      if (type === "drag" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Single select if not holding modifier keys
        finalSelection = new Set([fileId]);
        setSelectedImageIds(finalSelection);
      } else if (type === "drag" && (e.shiftKey || e.ctrlKey || e.metaKey)) {
        // Toggle selection with modifier keys
        finalSelection = new Set(selectedImageIds);
        if (finalSelection.has(fileId)) {
          finalSelection.delete(fileId);
        } else {
          finalSelection.add(fileId);
        }
        setSelectedImageIds(finalSelection);
      } else if (type === "resize" || type === "rotate") {
        // For resize/rotate, preserve the current selection - don't change it at all
        // The item being manipulated should already be selected, but if not, we'll still rotate it
        // We just don't modify the selection state here
      }

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

      // Store initial state of all selected images using the final selection
      // For resize/rotate, if the item isn't selected, include it anyway so it gets rotated/resized
      let imagesToOperateOn = finalSelection;
      if ((type === "resize" || type === "rotate") && !finalSelection.has(fileId)) {
        imagesToOperateOn = new Set(finalSelection);
        imagesToOperateOn.add(fileId);
      }
      const selectedImages = Array.from(imagesToOperateOn).map((id) => {
        const pos = positions.find((p) => p.fileId === id);
        return pos ? { fileId: id, x: pos.x, y: pos.y, width: pos.width, height: pos.height, rotation: pos.rotation } : null;
      }).filter((pos): pos is { fileId: string; x: number; y: number; width: number; height: number; rotation: number } => pos !== null);

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
        aspectRatio,
        selectedImages,
        hasMoved: false
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragStateRef.current) return;
        const state = dragStateRef.current;

        const currentX = moveEvent.clientX - rect.left;
        const currentY = moveEvent.clientY - rect.top;
        const deltaX = currentX - state.startX;
        const deltaY = currentY - state.startY;
        
        // Mark that we've moved (to distinguish drag from click)
        if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
          dragStateRef.current.hasMoved = true;
        }

        if (state.type === "drag") {
          const deltaXPercent = (deltaX / rect.width) * 100;
          const deltaYPercent = (deltaY / rect.height) * 100;
          
          // Move all selected images by the same delta - batch update
          // Use the initial selected images from state, but get current positions
          const updates = new Map<string, Partial<BundleImagePosition>>();
          state.selectedImages.forEach((initialImg) => {
            // Get current position for this image
            const currentPos = positions.find((p) => p.fileId === initialImg.fileId);
            if (!currentPos) return;
            
            // Calculate new position based on initial position + delta
            const newX = Math.max(0, Math.min(100, initialImg.x + deltaXPercent));
            const newY = Math.max(0, Math.min(100, initialImg.y + deltaYPercent));
            updates.set(initialImg.fileId, { x: newX, y: newY });
          });
          
          // Apply all updates at once
          onPositionsChange(
            positions.map((pos) => {
              const update = updates.get(pos.fileId);
              return update ? { ...pos, ...update } : pos;
            })
          );
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
          
          // Corner handles maintain aspect ratio
          const isCornerHandle = ["nw", "ne", "sw", "se"].includes(state.handle || "");
          
          let scaleX = 1;
          let scaleY = 1;
          
          if (isCornerHandle) {
            // Calculate scale factor based on distance from center
            // Use the larger dimension to maintain aspect ratio
            const initialDistance = Math.max(initialDistanceX, initialDistanceY);
            const currentDistance = Math.max(currentDistanceX, currentDistanceY);
            
            if (initialDistance > 0) {
              const scale = currentDistance / initialDistance;
              scaleX = scale;
              scaleY = scale;
            }
          } else {
            // Edge handles allow independent resizing, but scale from center
            if (state.handle.includes("e") || state.handle.includes("w")) {
              if (initialDistanceX > 0) {
                scaleX = currentDistanceX / initialDistanceX;
              }
            }
            if (state.handle.includes("s") || state.handle.includes("n")) {
              if (initialDistanceY > 0) {
                scaleY = currentDistanceY / initialDistanceY;
              }
            }
          }

          // Apply scale to all selected images - batch update
          const updates = new Map<string, Partial<BundleImagePosition>>();
          state.selectedImages.forEach((img) => {
            const imgAspectRatio = img.width / img.height;
            let scaledWidth = img.width * scaleX;
            let scaledHeight = img.height * scaleY;
            
            // For corner handles, maintain aspect ratio
            if (isCornerHandle) {
              scaledHeight = scaledWidth / imgAspectRatio;
            }
            
            updates.set(img.fileId, {
              width: Math.max(5, Math.min(50, scaledWidth)),
              height: Math.max(5, Math.min(50, scaledHeight)),
              x: img.x, // Center stays fixed
              y: img.y
            });
          });
          
          // Apply all updates at once
          onPositionsChange(
            positions.map((pos) => {
              const update = updates.get(pos.fileId);
              return update ? { ...pos, ...update } : pos;
            })
          );
        } else if (state.type === "rotate") {
          const centerX = rect.width * (state.imageX / 100);
          const centerY = rect.height * (state.imageY / 100);
          const angle1 = Math.atan2(state.startY - centerY, state.startX - centerX);
          const angle2 = Math.atan2(currentY - centerY, currentX - centerX);
          const deltaAngle = ((angle2 - angle1) * 180) / Math.PI;
          
          // Rotate all selected images by the same delta - batch update
          const updates = new Map<string, Partial<BundleImagePosition>>();
          state.selectedImages.forEach((img) => {
            updates.set(img.fileId, {
              rotation: (img.rotation + deltaAngle) % 360
            });
          });
          
          // Apply all updates at once
          onPositionsChange(
            positions.map((pos) => {
              const update = updates.get(pos.fileId);
              return update ? { ...pos, ...update } : pos;
            })
          );
        }
      };

      const handleMouseUp = () => {
        const wasDragging = dragStateRef.current?.hasMoved ?? false;
        const operationType = dragStateRef.current?.type;
        dragStateRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        
        // If we were dragging/resizing/rotating, prevent onClick from changing selection
        if (wasDragging && (operationType === "drag" || operationType === "resize" || operationType === "rotate")) {
          justCompletedDragRef.current = true;
          // Clear the flag after React processes events
          setTimeout(() => {
            justCompletedDragRef.current = false;
          }, 100);
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [positions, updatePosition, containerRef, onDragStart, selectedImageIds]
  );

  // Handle drag selection on container
  const handleContainerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start drag selection if clicking on empty space (not on an image or handle)
      if ((e.target as HTMLElement).closest('[data-image-element]') || 
          (e.target as HTMLElement).closest('[data-handle]')) {
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      setDragSelection({ startX, startY, currentX: startX, currentY: startY });

      // Clear selection if not holding shift/ctrl/cmd
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setSelectedImageIds(new Set());
      }

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const currentX = moveEvent.clientX - rect.left;
        const currentY = moveEvent.clientY - rect.top;
        setDragSelection((prev) => prev ? { ...prev, currentX, currentY } : null);

        // Calculate selection box
        const minX = Math.min(startX, currentX);
        const maxX = Math.max(startX, currentX);
        const minY = Math.min(startY, currentY);
        const maxY = Math.max(startY, currentY);

        // Find images that intersect with selection box
        const selectedIds = new Set<string>();
        positions.forEach((position) => {
          const imageCenterX = (position.x / 100) * rect.width;
          const imageCenterY = (position.y / 100) * rect.height;
          const imageWidth = (position.width / 100) * rect.width;
          const imageHeight = (position.height / 100) * rect.height;
          
          const imageLeft = imageCenterX - imageWidth / 2;
          const imageRight = imageCenterX + imageWidth / 2;
          const imageTop = imageCenterY - imageHeight / 2;
          const imageBottom = imageCenterY + imageHeight / 2;

          // Check if image intersects with selection box
          if (imageRight >= minX && imageLeft <= maxX && imageBottom >= minY && imageTop <= maxY) {
            selectedIds.add(position.fileId);
          }
        });

        // Update selection
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          // Add to existing selection
          setSelectedImageIds((prev) => {
            const next = new Set(prev);
            selectedIds.forEach((id) => next.add(id));
            return next;
          });
        } else {
          // Replace selection
          setSelectedImageIds(selectedIds);
        }
      };

      const handleMouseUp = () => {
        setDragSelection(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [positions, containerRef]
  );

  // Handle keyboard shortcuts: Escape to deselect, Arrow keys to nudge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedImageIds(new Set());
        return;
      }

      // Only handle arrow keys if images are selected
      if (selectedImageIds.size === 0) return;

      const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!arrowKeys.includes(e.key)) return;

      // Prevent default scrolling behavior
      e.preventDefault();

      // Determine nudge distance: 0.5% normally, 2% with Shift
      const nudgeDistance = e.shiftKey ? 2 : 0.5;

      // Nudge all selected images - batch update
      const updates = new Map<string, Partial<BundleImagePosition>>();
      selectedImageIds.forEach((fileId) => {
        const position = positions.find((pos) => pos.fileId === fileId);
        if (!position) return;

        let newX = position.x;
        let newY = position.y;

        switch (e.key) {
          case "ArrowUp":
            newY = Math.max(0, Math.min(100, position.y - nudgeDistance));
            break;
          case "ArrowDown":
            newY = Math.max(0, Math.min(100, position.y + nudgeDistance));
            break;
          case "ArrowLeft":
            newX = Math.max(0, Math.min(100, position.x - nudgeDistance));
            break;
          case "ArrowRight":
            newX = Math.max(0, Math.min(100, position.x + nudgeDistance));
            break;
        }

        if (newX !== position.x || newY !== position.y) {
          updates.set(fileId, { x: newX, y: newY });
        }
      });
      
      // Apply all updates at once
      if (updates.size > 0) {
        onPositionsChange(
          positions.map((pos) => {
            const update = updates.get(pos.fileId);
            return update ? { ...pos, ...update } : pos;
          })
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedImageIds, positions, onPositionsChange]);

  if (positions.length === 0) return null;

  // Calculate selection box bounds
  const container = containerRef.current;
  const selectionBox = dragSelection && container ? {
    left: Math.min(dragSelection.startX, dragSelection.currentX),
    top: Math.min(dragSelection.startY, dragSelection.currentY),
    width: Math.abs(dragSelection.currentX - dragSelection.startX),
    height: Math.abs(dragSelection.currentY - dragSelection.startY),
    containerWidth: container.clientWidth,
    containerHeight: container.clientHeight
  } : null;

  return (
    <>
      {/* Selection box */}
      {selectionBox && selectionBox.width > 0 && selectionBox.height > 0 && (
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
      )}
      {/* Container for drag selection */}
      <div
        className="absolute inset-0"
        style={{ zIndex: 1 }}
        onMouseDown={handleContainerMouseDown}
      />
      {positions.map((position, index) => {
        const file = files.find((f) => f.id === position.fileId);
        if (!file) return null;
        
        const isSelected = selectedImageIds.has(position.fileId);
        const cropped = contentCropped[file.id];
        
        return (
          <div
            key={position.fileId}
            data-image-element
            className="absolute cursor-move"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              width: `${position.width}%`,
              height: `${position.height}%`,
              transform: `translate(-50%, -50%) rotate(${position.rotation}deg)`,
              transformOrigin: "center center",
              zIndex: 10 + index, // Above center shape/text (z-5), below overlay images (z-40+)
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none"
            }}
            onMouseDown={(e) => {
              // Track if this mousedown will result in a drag operation
              const isHandle = (e.target as HTMLElement).closest('[data-handle]');
              if (!isHandle) {
                handleMouseDown(e, position.fileId, "drag");
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              // Don't change selection if we just completed a drag/resize/rotate operation
              if (justCompletedDragRef.current) {
                return;
              }
              // Don't change selection if we're currently dragging/resizing/rotating
              if (dragStateRef.current !== null) {
                return;
              }
              // Don't change selection if clicking on a handle (handles should have stopped propagation)
              const clickedHandle = (e.target as HTMLElement).closest('[data-handle]');
              if (clickedHandle) {
                return;
              }
              // Don't change selection if this click originated from a handle interaction
              // Check if the click event's detail is 0 (which can indicate a programmatic click)
              // or if we're in the middle of a drag operation
              if (e.detail === 0 && dragStateRef.current === null) {
                // This might be a synthetic click from a handle, ignore it
                return;
              }
              if (e.shiftKey || e.ctrlKey || e.metaKey) {
                // Toggle selection
                setSelectedImageIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(position.fileId)) {
                    next.delete(position.fileId);
                  } else {
                    next.add(position.fileId);
                  }
                  return next;
                });
              } else {
                // Single select
                setSelectedImageIds(new Set([position.fileId]));
              }
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

          </div>
        );
      })}
      {/* Render handles and selection boxes as siblings, outside image containers */}
      {positions.map((position, index) => {
        const isSelected = selectedImageIds.has(position.fileId);
        if (!isSelected) return null;
        
        return (
          <div
            key={`handles-${position.fileId}`}
            className="absolute pointer-events-none"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              width: `${position.width}%`,
              height: `${position.height}%`,
              transform: `translate(-50%, -50%) rotate(${position.rotation}deg)`,
              transformOrigin: "center center",
              zIndex: 10000 // Always on top
            }}
          >
            {/* Border */}
            <div 
              className="absolute inset-0 border-2 border-blue-500 pointer-events-none"
            />

            {/* Resize handles */}
            {["nw", "ne", "sw", "se"].map((handle) => (
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
                  handleMouseDown(e, position.fileId, "resize", handle);
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
                handleMouseDown(e, position.fileId, "rotate");
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
        );
      })}
    </>
  );
}
