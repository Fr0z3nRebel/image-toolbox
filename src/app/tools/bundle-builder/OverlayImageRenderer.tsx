"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { OverlayImage } from "./OverlayImageEditor";
import type { AspectRatio } from "./types";
import SelectionBox from "./components/image-manipulation/SelectionBox";
import ImageHandles from "./components/image-manipulation/ImageHandles";
import ImageContextMenu from "./components/image-manipulation/ImageContextMenu";
import type { DragSelection, ContextMenuPosition } from "./types/imageManipulation";

interface OverlayImageRendererProps {
  overlayImages: OverlayImage[];
  onOverlayImagesChange: (images: OverlayImage[]) => void;
  aspectRatio: AspectRatio;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isProcessing?: boolean; // Fade images when processing
  /** When provided, selection is controlled by parent (e.g. for unified drag selection with bundle images) */
  selectedImageIds?: Set<string>;
  onSelectedImageIdsChange?: (ids: Set<string>) => void;
  getZIndex?: (id: string) => number;
  isAtFront?: (id: string) => boolean;
  isAtBack?: (id: string) => boolean;
  onLayerBringToFront?: () => void;
  onLayerSendToBack?: () => void;
  onLayerBringForward?: () => void;
  onLayerSendBackward?: () => void;
  bundleSelectedIds?: Set<string>;
  /** Called when user single-selects an overlay (so page can clear bundle selection) */
  onClearBundleSelection?: () => void;
  bundlePositions?: Array<{ fileId: string; x: number; y: number; width: number; height: number; rotation: number }>;
  onBundleTransform?: (
    fileIds: string[],
    transform: { deltaRotation?: number; scaleX?: number; scaleY?: number; deltaXPercent?: number; deltaYPercent?: number },
    initialBundleState?: Array<{ fileId: string; x: number; y: number; width: number; height: number; rotation: number }>
  ) => void;
  onBundleMirrorHorizontal?: () => void;
  onBundleMirrorVertical?: () => void;
}

export default function OverlayImageRenderer({
  overlayImages,
  onOverlayImagesChange,
  aspectRatio: _aspectRatio,
  containerRef,
  isProcessing = false,
  selectedImageIds: controlledSelectedIds,
  onSelectedImageIdsChange: onControlledSelectedIdsChange,
  getZIndex,
  isAtFront,
  isAtBack,
  onLayerBringToFront,
  onLayerSendToBack,
  onLayerBringForward,
  onLayerSendBackward,
  bundleSelectedIds = new Set(),
  onClearBundleSelection,
  bundlePositions = [],
  onBundleTransform,
  onBundleMirrorHorizontal,
  onBundleMirrorVertical
}: OverlayImageRendererProps) {
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
  const selectedImageIds = controlledSelectedIds ?? internalSelectedIds;
  const setSelectedImageIds = useCallback(
    (value: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      if (onControlledSelectedIdsChange) {
        onControlledSelectedIdsChange(typeof value === "function" ? value(selectedImageIds) : value);
      } else {
        setInternalSelectedIds(value);
      }
    },
    [onControlledSelectedIdsChange, selectedImageIds]
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
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
    selectedImages: Array<{ imageId: string; x: number; y: number; width: number; height: number; rotation: number; mirrorHorizontal?: boolean; mirrorVertical?: boolean }>;
    hasMoved: boolean;
    initialBundlePositions?: Array<{ fileId: string; x: number; y: number; width: number; height: number; rotation: number }>;
  } | null>(null);
  const justCompletedDragRef = useRef<boolean>(false);

  const _updateOverlay = useCallback(
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
        onClearBundleSelection?.();
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

      const initialBundlePositions =
        bundleSelectedIds.size > 0 && bundlePositions.length > 0
          ? bundlePositions
              .filter((p) => bundleSelectedIds.has(p.fileId))
              .map((p) => ({ fileId: p.fileId, x: p.x, y: p.y, width: p.width, height: p.height, rotation: p.rotation }))
          : undefined;

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
        hasMoved: false,
        initialBundlePositions
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
          if (onBundleTransform && bundleSelectedIds.size > 0) {
            onBundleTransform(Array.from(bundleSelectedIds), { deltaXPercent, deltaYPercent }, dragStateRef.current?.initialBundlePositions);
          }
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
            const scaledWidth = img.width * scaleX;
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
          if (onBundleTransform && bundleSelectedIds.size > 0) {
            onBundleTransform(Array.from(bundleSelectedIds), { scaleX, scaleY }, dragStateRef.current?.initialBundlePositions);
          }
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
          if (onBundleTransform && bundleSelectedIds.size > 0) {
            onBundleTransform(Array.from(bundleSelectedIds), { deltaRotation: deltaAngle }, dragStateRef.current?.initialBundlePositions);
          }
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
    [overlayImages, onOverlayImagesChange, containerRef, selectedImageIds, bundleSelectedIds, bundlePositions, onClearBundleSelection, onBundleTransform, setSelectedImageIds]
  );

  const _handleContextMenu = useCallback(
    (e: React.MouseEvent, imageId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, itemId: imageId });
    },
    []
  );

  const handleDuplicate = useCallback(
    (_: string) => {
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
    [overlayImages, onOverlayImagesChange, selectedImageIds, setSelectedImageIds]
  );

  const handleMirrorHorizontal = useCallback(
    (_: string) => {
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
      onBundleMirrorHorizontal?.();
      setContextMenu(null);
    },
    [overlayImages, onOverlayImagesChange, selectedImageIds, onBundleMirrorHorizontal]
  );

  const handleMirrorVertical = useCallback(
    (_: string) => {
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
      onBundleMirrorVertical?.();
      setContextMenu(null);
    },
    [overlayImages, onOverlayImagesChange, selectedImageIds, onBundleMirrorVertical]
  );

  const handleSendToBack = useCallback(
    (_: string) => {
      if (onLayerSendToBack) {
        onLayerSendToBack();
        setContextMenu(null);
        return;
      }
      const selectedImages = Array.from(selectedImageIds)
        .map((id) => overlayImages.find((img) => img.id === id))
        .filter((img): img is OverlayImage => img !== undefined);
      if (selectedImages.length === 0) return;
      const newImages = overlayImages.filter((img) => !selectedImageIds.has(img.id));
      newImages.unshift(...selectedImages);
      onOverlayImagesChange(newImages);
      setContextMenu(null);
    },
    [overlayImages, onOverlayImagesChange, selectedImageIds, onLayerSendToBack]
  );

  const handleSendBackwards = useCallback(
    (_: string) => {
      if (onLayerSendBackward) {
        onLayerSendBackward();
        setContextMenu(null);
        return;
      }
      const selectedIndices = Array.from(selectedImageIds)
        .map((id) => overlayImages.findIndex((img) => img.id === id))
        .filter((idx) => idx !== -1)
        .sort((a, b) => a - b);
      if (selectedIndices.length === 0 || selectedIndices[0] === 0) return;
      const newImages = [...overlayImages];
      selectedIndices.forEach((index) => {
        if (index > 0 && !selectedImageIds.has(newImages[index - 1].id)) {
          [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
        }
      });
      onOverlayImagesChange(newImages);
      setContextMenu(null);
    },
    [overlayImages, onOverlayImagesChange, selectedImageIds, onLayerSendBackward]
  );

  const handleBringForward = useCallback(
    (_: string) => {
      if (onLayerBringForward) {
        onLayerBringForward();
        setContextMenu(null);
        return;
      }
      const selectedIndices = Array.from(selectedImageIds)
        .map((id) => overlayImages.findIndex((img) => img.id === id))
        .filter((idx) => idx !== -1)
        .sort((a, b) => b - a);
      if (selectedIndices.length === 0 || selectedIndices[0] === overlayImages.length - 1) return;
      const newImages = [...overlayImages];
      selectedIndices.forEach((index) => {
        if (index < newImages.length - 1 && !selectedImageIds.has(newImages[index + 1].id)) {
          [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
        }
      });
      onOverlayImagesChange(newImages);
      setContextMenu(null);
    },
    [overlayImages, onOverlayImagesChange, selectedImageIds, onLayerBringForward]
  );

  const handleBringToFront = useCallback(
    (_: string) => {
      if (onLayerBringToFront) {
        onLayerBringToFront();
        setContextMenu(null);
        return;
      }
      const selectedImages = Array.from(selectedImageIds)
        .map((id) => overlayImages.find((img) => img.id === id))
        .filter((img): img is OverlayImage => img !== undefined);
      if (selectedImages.length === 0) return;
      const newImages = overlayImages.filter((img) => !selectedImageIds.has(img.id));
      newImages.push(...selectedImages);
      onOverlayImagesChange(newImages);
      setContextMenu(null);
    },
    [overlayImages, onOverlayImagesChange, selectedImageIds, onLayerBringToFront]
  );

  const handleDelete = useCallback(
    (_: string) => {
      // Delete all selected images
      onOverlayImagesChange(overlayImages.filter((img) => !selectedImageIds.has(img.id)));
      setContextMenu(null);
      setSelectedImageIds(new Set());
    },
    [overlayImages, onOverlayImagesChange, selectedImageIds, setSelectedImageIds]
  );

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenu]);


  // Handle drag selection for overlay images (kept for potential future use; drag selection is unified in BundleImageRenderer)
  const _handleContainerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left mouse button (button 0)
      if (e.button !== 0) {
        return;
      }
      // Only start drag selection if clicking on empty space (not on an image or handle)
      const target = e.target as HTMLElement;
      if (target.closest('[data-image-element]') || 
          target.closest('[data-handle]') ||
          target.closest('.drag-selection-container')) {
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

        // Find overlay images that intersect with selection box
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
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [overlayImages, containerRef, setSelectedImageIds]
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
  }, [selectedImageIds, overlayImages, onOverlayImagesChange, setSelectedImageIds]);

  if (overlayImages.length === 0) return null;


  return (
    <div
      className="absolute inset-0"
      style={{ pointerEvents: "none" }}
      onContextMenuCapture={(e) => {
        // Show context menu if any images are selected, otherwise prevent browser menu
        // Use capture phase to catch events before children handle them
        if (selectedImageIds.size > 0) {
          e.preventDefault();
          e.stopPropagation();
          // Use the first selected image ID (context menu actions work on all selected)
          const firstSelectedId = Array.from(selectedImageIds)[0];
          setContextMenu({ x: e.clientX, y: e.clientY, itemId: firstSelectedId });
        } else {
          // Prevent browser menu on empty space
          e.preventDefault();
        }
      }}
    >
      {/* Selection box - only visible when overlay drag is active (we use bundle drag for both now) */}
      {dragSelection && <SelectionBox dragSelection={dragSelection} containerRef={containerRef} />}
      {overlayImages.map((overlay) => {
        return (
          <div
            key={overlay.id}
            data-image-element
            data-overlay-image
            data-overlay-image-content
            className="absolute cursor-move"
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              width: `${overlay.width}%`,
              height: `${overlay.height}%`,
              transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg)`,
              transformOrigin: "center center",
              zIndex: getZIndex != null ? getZIndex(overlay.id) + 10 : 40,
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
              pointerEvents: "auto" // So this overlay receives clicks (root has pointer-events: none so empty space passes through)
            }}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              handleMouseDown(e, overlay.id, "drag");
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (justCompletedDragRef.current || dragStateRef.current !== null) return;
              if (e.shiftKey || e.ctrlKey || e.metaKey) {
                setSelectedImageIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(overlay.id)) next.delete(overlay.id);
                  else next.add(overlay.id);
                  return next;
                });
              } else {
                setSelectedImageIds(new Set([overlay.id]));
                onClearBundleSelection?.();
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({ x: e.clientX, y: e.clientY, itemId: overlay.id });
            }}
          >
            {/* Image - pointer-events-none so resize/rotate handles on top can receive events */}
            {overlay.file.preview && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={overlay.file.preview}
                  alt=""
                  className={`w-full h-full object-contain transition-opacity pointer-events-none ${
                    isProcessing ? "opacity-50" : ""
                  }`}
                  draggable={false}
                  style={{
                    transform: `scaleX(${overlay.mirrorHorizontal ? -1 : 1}) scaleY(${overlay.mirrorVertical ? -1 : 1})`
                  }}
                />
              </>
            )}
          </div>
        );
      })}
      {/* Render handles and selection boxes as siblings, outside image containers.
          Container has pointer-events: none so clicks on the overlay body pass through to the
          overlay image underneath and start a drag; only the handle elements capture events. */}
      {overlayImages.map((overlay) => {
        if (!selectedImageIds.has(overlay.id)) return null;

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

            {/* Handles - ImageHandles use pointer-events-auto on each handle so they still receive clicks */}
            <ImageHandles
              onMouseDown={(e, handle) => handleMouseDown(e, overlay.id, "resize", handle)}
              onRotateMouseDown={(e) => handleMouseDown(e, overlay.id, "rotate")}
              rotateIcon="rotate"
            />
          </div>
        );
      })}

      {/* Context menu portaled to body so it receives clicks (root has pointer-events: none) */}
      {contextMenu &&
        typeof document !== "undefined" &&
        createPortal(
          <ImageContextMenu
            contextMenu={contextMenu}
          isAtBack={isAtBack ? isAtBack(contextMenu.itemId) : overlayImages.findIndex((img) => img.id === contextMenu.itemId) === 0}
          isAtFront={isAtFront ? isAtFront(contextMenu.itemId) : overlayImages.findIndex((img) => img.id === contextMenu.itemId) === overlayImages.length - 1}
            onDuplicate={() => handleDuplicate(contextMenu.itemId)}
            onDelete={() => handleDelete(contextMenu.itemId)}
            onMirrorHorizontal={() => handleMirrorHorizontal(contextMenu.itemId)}
            onMirrorVertical={() => handleMirrorVertical(contextMenu.itemId)}
            onBringToFront={() => handleBringToFront(contextMenu.itemId)}
            onBringForward={() => handleBringForward(contextMenu.itemId)}
            onSendBackwards={() => handleSendBackwards(contextMenu.itemId)}
            onSendToBack={() => handleSendToBack(contextMenu.itemId)}
          />,
          document.body
        )}
    </div>
  );
}
