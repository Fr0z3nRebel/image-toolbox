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
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; imageId: string } | null>(null);
  const [dragSelection, setDragSelection] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const dragStateRef = useRef<{
    imageId: string; // The image being directly manipulated
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
    selectedImages: Array<{ imageId: string; x: number; y: number; width: number; height: number; rotation: number; mirrorHorizontal?: boolean; mirrorVertical?: boolean }>; // Initial state of all selected images
    hasMoved: boolean; // Track if mouse moved during drag
  } | null>(null);
  const justCompletedDragRef = useRef<boolean>(false);

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
      
      // Capture current selection IMMEDIATELY and synchronously before any other code runs
      // Use a fresh copy to avoid any potential state update issues
      const currentSelection = selectedImageIds;
      let finalSelection = new Set(currentSelection);
      
      // Update selection
      if (type === "drag" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Single select if not holding modifier keys
        finalSelection = new Set([imageId]);
        setSelectedImageIds(finalSelection);
      } else if (type === "drag" && (e.shiftKey || e.ctrlKey || e.metaKey)) {
        // Toggle selection with modifier keys
        finalSelection = new Set(selectedImageIds);
        if (finalSelection.has(imageId)) {
          finalSelection.delete(imageId);
        } else {
          finalSelection.add(imageId);
        }
        setSelectedImageIds(finalSelection);
      } else if (type === "resize" || type === "rotate") {
        // For resize/rotate, preserve the current selection - don't change it at all
        // The item being manipulated should already be selected, but if not, we'll still rotate/resize it
        // We just don't modify the selection state here
      }

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      const image = overlayImages.find((img) => img.id === imageId);
      if (!image) return;

      // Use stored aspect ratio or calculate from current dimensions
      const aspectRatio = image.aspectRatio ?? (image.width / image.height);

      // Store initial state of all selected images using the final selection
      // For resize/rotate, if the item isn't selected, include it anyway so it gets rotated/resized
      let imagesToOperateOn = finalSelection;
      if ((type === "resize" || type === "rotate") && !finalSelection.has(imageId)) {
        imagesToOperateOn = new Set(finalSelection);
        imagesToOperateOn.add(imageId);
      }
      const selectedImages = Array.from(imagesToOperateOn).map((id) => {
        const img = overlayImages.find((i) => i.id === id);
        return img ? { imageId: id, x: img.x, y: img.y, width: img.width, height: img.height, rotation: img.rotation, mirrorHorizontal: img.mirrorHorizontal, mirrorVertical: img.mirrorVertical } : null;
      }).filter((img): img is { imageId: string; x: number; y: number; width: number; height: number; rotation: number; mirrorHorizontal: boolean | undefined; mirrorVertical: boolean | undefined } => img !== null);

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
          const updates = new Map<string, Partial<OverlayImage>>();
          state.selectedImages.forEach((initialImg) => {
            // Get current position for this image
            const currentImg = overlayImages.find((i) => i.id === initialImg.imageId);
            if (!currentImg) return;
            
            // Calculate new position based on initial position + delta
            const newX = Math.max(0, Math.min(100, initialImg.x + deltaXPercent));
            const newY = Math.max(0, Math.min(100, initialImg.y + deltaYPercent));
            updates.set(initialImg.imageId, { x: newX, y: newY });
          });
          
          // Apply all updates at once
          onOverlayImagesChange(
            overlayImages.map((img) => {
              const update = updates.get(img.id);
              return update ? { ...img, ...update } : img;
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
          const updates = new Map<string, Partial<OverlayImage>>();
          state.selectedImages.forEach((img) => {
            const imgAspectRatio = img.width / img.height;
            let scaledWidth = img.width * scaleX;
            let scaledHeight = img.height * scaleY;
            
            // For corner handles, maintain aspect ratio
            if (isCornerHandle) {
              scaledHeight = scaledWidth / imgAspectRatio;
            }
            
            updates.set(img.imageId, {
              width: Math.max(5, Math.min(50, scaledWidth)),
              height: Math.max(5, Math.min(50, scaledHeight)),
              x: img.x, // Center stays fixed
              y: img.y
            });
          });
          
          // Apply all updates at once
          onOverlayImagesChange(
            overlayImages.map((img) => {
              const update = updates.get(img.id);
              return update ? { ...img, ...update } : img;
            })
          );
        } else if (state.type === "rotate") {
          const centerX = rect.width * (state.imageX / 100);
          const centerY = rect.height * (state.imageY / 100);
          const angle1 = Math.atan2(state.startY - centerY, state.startX - centerX);
          const angle2 = Math.atan2(currentY - centerY, currentX - centerX);
          const deltaAngle = ((angle2 - angle1) * 180) / Math.PI;
          
          // Rotate all selected images by the same delta - batch update
          const updates = new Map<string, Partial<OverlayImage>>();
          state.selectedImages.forEach((img) => {
            updates.set(img.imageId, {
              rotation: (img.rotation + deltaAngle) % 360
            });
          });
          
          // Apply all updates at once
          onOverlayImagesChange(
            overlayImages.map((img) => {
              const update = updates.get(img.id);
              return update ? { ...img, ...update } : img;
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
    [overlayImages, onOverlayImagesChange, containerRef, selectedImageIds]
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
      // Duplicate all selected images
      const imagesToDuplicate = Array.from(selectedImageIds).map((id) => 
        overlayImages.find((img) => img.id === id)
      ).filter((img): img is OverlayImage => img !== undefined);

      const duplicated: OverlayImage[] = imagesToDuplicate.map((image, index) => ({
        ...image,
        id: `${image.id}-copy-${Date.now()}-${index}`,
        x: Math.min(100, image.x + 2), // Slight offset
        y: Math.min(100, image.y + 2),
        aspectRatio: image.aspectRatio // Preserve aspect ratio
      }));

      onOverlayImagesChange([...overlayImages, ...duplicated]);
      setContextMenu(null);
      setSelectedImageIds(new Set(duplicated.map((img) => img.id)));
    },
    [overlayImages, onOverlayImagesChange, selectedImageIds]
  );

  const handleMirrorHorizontal = useCallback(
    (imageId: string) => {
      // Mirror all selected images - batch update
      const updates = new Map<string, Partial<OverlayImage>>();
      selectedImageIds.forEach((id) => {
        const image = overlayImages.find((img) => img.id === id);
        if (image) {
          updates.set(id, {
            mirrorHorizontal: !image.mirrorHorizontal
          });
        }
      });
      
      // Apply all updates at once
      if (updates.size > 0) {
        onOverlayImagesChange(
          overlayImages.map((img) => {
            const update = updates.get(img.id);
            return update ? { ...img, ...update } : img;
          })
        );
      }
      setContextMenu(null);
    },
    [overlayImages, onOverlayImagesChange, selectedImageIds]
  );

  const handleMirrorVertical = useCallback(
    (imageId: string) => {
      // Mirror all selected images - batch update
      const updates = new Map<string, Partial<OverlayImage>>();
      selectedImageIds.forEach((id) => {
        const image = overlayImages.find((img) => img.id === id);
        if (image) {
          updates.set(id, {
            mirrorVertical: !image.mirrorVertical
          });
        }
      });
      
      // Apply all updates at once
      if (updates.size > 0) {
        onOverlayImagesChange(
          overlayImages.map((img) => {
            const update = updates.get(img.id);
            return update ? { ...img, ...update } : img;
          })
        );
      }
      setContextMenu(null);
    },
    [overlayImages, onOverlayImagesChange, selectedImageIds]
  );

  const handleSendToBack = useCallback(
    (imageId: string) => {
      // Send all selected images to back, maintaining their relative order
      const selectedImages = Array.from(selectedImageIds)
        .map((id) => overlayImages.find((img) => img.id === id))
        .filter((img): img is OverlayImage => img !== undefined);
      
      if (selectedImages.length === 0) return;

      const newImages = overlayImages.filter((img) => !selectedImageIds.has(img.id));
      // Insert selected images at the beginning, maintaining their relative order
      newImages.unshift(...selectedImages);
      onOverlayImagesChange(newImages);
      setContextMenu(null);
    },
    [overlayImages, onOverlayImagesChange, selectedImageIds]
  );

  const handleSendBackwards = useCallback(
    (imageId: string) => {
      // Move all selected images one step backward
      const selectedIndices = Array.from(selectedImageIds)
        .map((id) => overlayImages.findIndex((img) => img.id === id))
        .filter((idx) => idx !== -1)
        .sort((a, b) => a - b); // Sort ascending
      
      if (selectedIndices.length === 0 || selectedIndices[0] === 0) return; // Already at back

      const newImages = [...overlayImages];
      // Move each selected image backward one position
      selectedIndices.forEach((index) => {
        if (index > 0 && !selectedImageIds.has(newImages[index - 1].id)) {
          [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
        }
      });
      onOverlayImagesChange(newImages);
      setContextMenu(null);
    },
    [overlayImages, onOverlayImagesChange, selectedImageIds]
  );

  const handleBringForward = useCallback(
    (imageId: string) => {
      // Move all selected images one step forward
      const selectedIndices = Array.from(selectedImageIds)
        .map((id) => overlayImages.findIndex((img) => img.id === id))
        .filter((idx) => idx !== -1)
        .sort((a, b) => b - a); // Sort descending
      
      if (selectedIndices.length === 0 || selectedIndices[0] === overlayImages.length - 1) return; // Already at front

      const newImages = [...overlayImages];
      // Move each selected image forward one position
      selectedIndices.forEach((index) => {
        if (index < newImages.length - 1 && !selectedImageIds.has(newImages[index + 1].id)) {
          [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
        }
      });
      onOverlayImagesChange(newImages);
      setContextMenu(null);
    },
    [overlayImages, onOverlayImagesChange, selectedImageIds]
  );

  const handleBringToFront = useCallback(
    (imageId: string) => {
      // Bring all selected images to front, maintaining their relative order
      const selectedImages = Array.from(selectedImageIds)
        .map((id) => overlayImages.find((img) => img.id === id))
        .filter((img): img is OverlayImage => img !== undefined);
      
      if (selectedImages.length === 0) return;

      const newImages = overlayImages.filter((img) => !selectedImageIds.has(img.id));
      // Append selected images at the end, maintaining their relative order
      newImages.push(...selectedImages);
      onOverlayImagesChange(newImages);
      setContextMenu(null);
    },
    [overlayImages, onOverlayImagesChange, selectedImageIds]
  );

  const handleDelete = useCallback(
    (imageId: string) => {
      // Delete all selected images
      onOverlayImagesChange(overlayImages.filter((img) => !selectedImageIds.has(img.id)));
      setContextMenu(null);
      setSelectedImageIds(new Set());
    },
    [overlayImages, onOverlayImagesChange, selectedImageIds]
  );

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenu]);


  // Handle drag selection on container
  const handleContainerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left mouse button (button 0)
      if (e.button !== 0) {
        return;
      }
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
        overlayImages.forEach((overlay) => {
          const imageCenterX = (overlay.x / 100) * rect.width;
          const imageCenterY = (overlay.y / 100) * rect.height;
          const imageWidth = (overlay.width / 100) * rect.width;
          const imageHeight = (overlay.height / 100) * rect.height;
          
          const imageLeft = imageCenterX - imageWidth / 2;
          const imageRight = imageCenterX + imageWidth / 2;
          const imageTop = imageCenterY - imageHeight / 2;
          const imageBottom = imageCenterY + imageHeight / 2;

          // Check if image intersects with selection box
          if (imageRight >= minX && imageLeft <= maxX && imageBottom >= minY && imageTop <= maxY) {
            selectedIds.add(overlay.id);
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
        // Re-disable pointer events on container
        const container = containerRef.current;
        if (container) {
          const dragContainer = container.querySelector('.drag-selection-container') as HTMLElement;
          if (dragContainer) {
            dragContainer.style.pointerEvents = 'none';
          }
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [overlayImages, containerRef]
  );

  // Handle keyboard shortcuts: Escape to deselect, Arrow keys to nudge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedImageIds(new Set());
        setContextMenu(null);
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
      const updates = new Map<string, Partial<OverlayImage>>();
      selectedImageIds.forEach((imageId) => {
        const overlay = overlayImages.find((img) => img.id === imageId);
        if (!overlay) return;

        let newX = overlay.x;
        let newY = overlay.y;

        switch (e.key) {
          case "ArrowUp":
            newY = Math.max(0, Math.min(100, overlay.y - nudgeDistance));
            break;
          case "ArrowDown":
            newY = Math.max(0, Math.min(100, overlay.y + nudgeDistance));
            break;
          case "ArrowLeft":
            newX = Math.max(0, Math.min(100, overlay.x - nudgeDistance));
            break;
          case "ArrowRight":
            newX = Math.max(0, Math.min(100, overlay.x + nudgeDistance));
            break;
        }

        if (newX !== overlay.x || newY !== overlay.y) {
          updates.set(imageId, { x: newX, y: newY });
        }
      });
      
      // Apply all updates at once
      if (updates.size > 0) {
        onOverlayImagesChange(
          overlayImages.map((img) => {
            const update = updates.get(img.id);
            return update ? { ...img, ...update } : img;
          })
        );
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedImageIds, overlayImages, onOverlayImagesChange]);

  if (overlayImages.length === 0) return null;

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
    <div
      className="absolute inset-0"
      onContextMenuCapture={(e) => {
        // Show context menu if any images are selected, otherwise prevent browser menu
        // Use capture phase to catch events before children handle them
        if (selectedImageIds.size > 0) {
          e.preventDefault();
          e.stopPropagation();
          // Use the first selected image ID (context menu actions work on all selected)
          const firstSelectedId = Array.from(selectedImageIds)[0];
          setContextMenu({ x: e.clientX, y: e.clientY, imageId: firstSelectedId });
        } else {
          // Prevent browser menu on empty space
          e.preventDefault();
        }
      }}
    >
      {/* Container for drag selection */}
      <div
        className="absolute inset-0 drag-selection-container"
        style={{ zIndex: 1 }}
        onMouseDown={(e) => {
          // Only handle left mouse button (button 0) for drag selection
          if (e.button === 0) {
            handleContainerMouseDown(e);
          }
        }}
      />
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
      {overlayImages.map((overlay, index) => {
        const isSelected = selectedImageIds.has(overlay.id);
        return (
          <div
            key={overlay.id}
            data-image-element
            className="absolute cursor-move"
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              width: `${overlay.width}%`,
              height: `${overlay.height}%`,
              transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg)`,
              transformOrigin: "center center",
              zIndex: 40 + index, // Later items appear on top
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
              pointerEvents: "auto" // Ensure image containers can receive pointer events
            }}
            onMouseDown={(e) => {
              // Only handle left mouse button (button 0) - ignore right-clicks
              if (e.button !== 0) {
                return;
              }
              // Track if this mousedown will result in a drag operation
              const isHandle = (e.target as HTMLElement).closest('[data-handle]');
              if (!isHandle) {
                handleMouseDown(e, overlay.id, "drag");
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
              if ((e.target as HTMLElement).closest('[data-handle]')) {
                return;
              }
              if (e.shiftKey || e.ctrlKey || e.metaKey) {
                // Toggle selection
                setSelectedImageIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(overlay.id)) {
                    next.delete(overlay.id);
                  } else {
                    next.add(overlay.id);
                  }
                  return next;
                });
              } else {
                // Single select
                setSelectedImageIds(new Set([overlay.id]));
              }
            }}
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

          </div>
        );
      })}
      {/* Render handles and selection boxes as siblings, outside image containers */}
      {overlayImages.map((overlay, index) => {
        const isSelected = selectedImageIds.has(overlay.id);
        if (!isSelected) return null;
        
        return (
          <div
            key={`handles-${overlay.id}`}
            className="absolute pointer-events-none"
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              width: `${overlay.width}%`,
              height: `${overlay.height}%`,
              transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg)`,
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
                  handleMouseDown(e, overlay.id, "resize", handle);
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
                handleMouseDown(e, overlay.id, "rotate");
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <RotateCw className="h-3 w-3 text-white" />
            </div>
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
    </div>
  );
}
