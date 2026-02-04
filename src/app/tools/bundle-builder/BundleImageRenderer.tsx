"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { FileWithPreview } from "../../components/FileUploadZone";
import type { AspectRatio } from "./types";
import SelectionBox from "./components/image-manipulation/SelectionBox";
import ImageHandles from "./components/image-manipulation/ImageHandles";
import ImageContextMenu from "./components/image-manipulation/ImageContextMenu";
import type { DragSelection, ContextMenuPosition } from "./types/imageManipulation";

export interface BundleImagePosition {
  fileId: string;
  x: number; // Percentage of canvas width
  y: number; // Percentage of canvas height
  width: number; // Percentage of canvas width
  height: number; // Percentage of canvas height
  rotation: number; // Degrees
  mirrorHorizontal?: boolean;
  mirrorVertical?: boolean;
}

interface OverlayForDragSelection {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

interface BundleImageRendererProps {
  files: FileWithPreview[];
  positions: BundleImagePosition[];
  onPositionsChange: (positions: BundleImagePosition[]) => void;
  onFilesChange?: (files: FileWithPreview[]) => void; // Called when files should be deleted
  aspectRatio: AspectRatio;
  containerRef: React.RefObject<HTMLDivElement | null>;
  contentCropped: Record<string, string>;
  onDragStart?: () => void; // Called when user starts dragging an image
  isProcessing?: boolean; // Fade images when processing
  overlayImages?: OverlayForDragSelection[]; // For drag selection to also select overlays in box
  onOverlaySelectionFromDrag?: (ids: string[], addToExisting?: boolean) => void; // Called when drag selection includes overlay IDs
  /** Controlled selection (when provided, layer order is unified with overlay) */
  selectedImageIds?: Set<string>;
  onSelectedImageIdsChange?: (ids: Set<string>) => void;
  getZIndex?: (id: string) => number;
  isAtFront?: (id: string) => boolean;
  isAtBack?: (id: string) => boolean;
  onLayerBringToFront?: () => void;
  onLayerSendToBack?: () => void;
  onLayerBringForward?: () => void;
  onLayerSendBackward?: () => void;
  overlaySelectedIds?: Set<string>; // When both bundle and overlay selected, resize/rotate apply to both
  /** Called when user single-selects a bundle image (so page can clear overlay selection) */
  onClearOverlaySelection?: () => void;
  onOverlayTransform?: (
    ids: string[],
    transform: { deltaRotation?: number; scaleX?: number; scaleY?: number; deltaXPercent?: number; deltaYPercent?: number },
    initialOverlayState?: Array<{ id: string; x: number; y: number; width: number; height: number; rotation: number }>
  ) => void;
  onOverlayMirrorHorizontal?: () => void;
  onOverlayMirrorVertical?: () => void;
}

export default function BundleImageRenderer({
  files,
  positions,
  onPositionsChange,
  onFilesChange,
  aspectRatio: _aspectRatio,
  containerRef,
  contentCropped,
  onDragStart,
  isProcessing = false,
  overlayImages = [],
  onOverlaySelectionFromDrag,
  selectedImageIds: controlledSelectedIds,
  onSelectedImageIdsChange: onControlledSelectedIdsChange,
  getZIndex,
  isAtFront,
  isAtBack,
  onLayerBringToFront,
  onLayerSendToBack,
  onLayerBringForward,
  onLayerSendBackward,
  overlaySelectedIds = new Set(),
  onClearOverlaySelection,
  onOverlayTransform,
  onOverlayMirrorHorizontal,
  onOverlayMirrorVertical
}: BundleImageRendererProps) {
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
  const selectedImageIds = controlledSelectedIds ?? internalSelectedIds;
  const setSelectedImageIds = useCallback(
    (value: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      const next = typeof value === "function" ? value(selectedImageIds) : value;
      if (onControlledSelectedIdsChange) onControlledSelectedIdsChange(next);
      else setInternalSelectedIds(next);
    },
    [onControlledSelectedIdsChange, selectedImageIds]
  );
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);
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
    selectedImages: Array<{ fileId: string; x: number; y: number; width: number; height: number; rotation: number }>;
    hasMoved: boolean;
    initialOverlayImages?: Array<{ id: string; x: number; y: number; width: number; height: number; rotation: number }>;
  } | null>(null);
  const justCompletedDragRef = useRef<boolean>(false);

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
        onClearOverlaySelection?.();
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

      const initialOverlayImages =
        overlaySelectedIds.size > 0 && overlayImages.length > 0
          ? overlayImages
              .filter((o) => overlaySelectedIds.has(o.id))
              .map((o) => ({ id: o.id, x: o.x, y: o.y, width: o.width, height: o.height, rotation: o.rotation ?? 0 }))
          : undefined;

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
        hasMoved: false,
        initialOverlayImages
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
          const updates = new Map<string, Partial<BundleImagePosition>>();
          state.selectedImages.forEach((initialImg) => {
            const newX = Math.max(0, Math.min(100, initialImg.x + deltaXPercent));
            const newY = Math.max(0, Math.min(100, initialImg.y + deltaYPercent));
            updates.set(initialImg.fileId, { x: newX, y: newY });
          });
          onPositionsChange(
            positions.map((pos) => {
              const update = updates.get(pos.fileId);
              return update ? { ...pos, ...update } : pos;
            })
          );
          if (onOverlayTransform && overlaySelectedIds.size > 0) {
            onOverlayTransform(Array.from(overlaySelectedIds), { deltaXPercent, deltaYPercent }, dragStateRef.current?.initialOverlayImages);
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
          const updates = new Map<string, Partial<BundleImagePosition>>();
          state.selectedImages.forEach((img) => {
            const imgAspectRatio = img.width / img.height;
            const scaledWidth = img.width * scaleX;
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
          if (onOverlayTransform && overlaySelectedIds.size > 0) {
            onOverlayTransform(Array.from(overlaySelectedIds), { scaleX, scaleY }, dragStateRef.current?.initialOverlayImages);
          }
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
          if (onOverlayTransform && overlaySelectedIds.size > 0) {
            onOverlayTransform(Array.from(overlaySelectedIds), { deltaRotation: deltaAngle }, dragStateRef.current?.initialOverlayImages);
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
    [positions, containerRef, onDragStart, selectedImageIds, overlaySelectedIds, overlayImages, onClearOverlaySelection, onOverlayTransform, onPositionsChange, setSelectedImageIds]
  );

  // Handle drag selection on container
  const handleContainerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start drag selection if clicking on empty space (not on an image or handle)
      const target = e.target as HTMLElement;
      // Don't start drag selection if clicking on bundle images, overlay images, or handles
      if (target.closest('[data-bundle-image]') || 
          target.closest('[data-overlay-image]') ||
          target.closest('[data-handle]') ||
          target.closest('[data-overlay-image-content]')) {
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;

      setDragSelection({ startX, startY, currentX: startX, currentY: startY });

      // Clear selection if not holding shift/ctrl/cmd (both bundle and overlay)
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setSelectedImageIds(new Set());
        onOverlaySelectionFromDrag?.([]);
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

        // Also compute overlay images in box and report for overlay selection
        if (onOverlaySelectionFromDrag && overlayImages.length > 0) {
          const overlayIds = new Set<string>();
          overlayImages.forEach((overlay) => {
            const imageCenterX = (overlay.x / 100) * rect.width;
            const imageCenterY = (overlay.y / 100) * rect.height;
            const imageWidth = (overlay.width / 100) * rect.width;
            const imageHeight = (overlay.height / 100) * rect.height;
            const imageLeft = imageCenterX - imageWidth / 2;
            const imageRight = imageCenterX + imageWidth / 2;
            const imageTop = imageCenterY - imageHeight / 2;
            const imageBottom = imageCenterY + imageHeight / 2;
            if (imageRight >= minX && imageLeft <= maxX && imageBottom >= minY && imageTop <= maxY) {
              overlayIds.add(overlay.id);
            }
          });
          onOverlaySelectionFromDrag(Array.from(overlayIds), e.shiftKey || e.ctrlKey || e.metaKey);
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
    [positions, containerRef, overlayImages, onOverlaySelectionFromDrag, setSelectedImageIds]
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
  }, [selectedImageIds, positions, onPositionsChange, setSelectedImageIds]);

  const handleDuplicate = useCallback(
    async (_: string) => {
      // Duplicate all selected images
      const filesToDuplicate = Array.from(selectedImageIds).map((id) => 
        files.find((file) => file.id === id)
      ).filter((file): file is FileWithPreview => file !== undefined);

      if (filesToDuplicate.length === 0 || !onFilesChange) return;

      // Create duplicated files with new IDs
      // Since FileWithPreview is just a File object with extra properties added,
      // and Files are immutable, we can safely reuse the same File instance.
      // However, we need separate entries in the files array for selection purposes.
      // The solution: Read the File as a Blob and create a new File from it.
      // This ensures we have a proper File instance.
      const duplicatedFiles: FileWithPreview[] = await Promise.all(
        filesToDuplicate.map(async (file, index) => {
          // Read the file as a blob
          const blob = await file.arrayBuffer();
          // Create a new File from the blob (this creates a proper File instance)
          const newFile = new File([blob], file.name, {
            type: file.type,
            lastModified: file.lastModified
          });
          // Cast to FileWithPreview and add properties (same as FileUploadZone does)
          const duplicated = newFile as FileWithPreview;
          duplicated.id = `${file.id}-copy-${Date.now()}-${index}`;
          duplicated.preview = file.preview; // Reuse the same preview URL
          duplicated.originalSize = file.originalSize || file.size;
          return duplicated;
        })
      );

      // Create duplicated positions
      const duplicatedPositions: BundleImagePosition[] = filesToDuplicate.map((file, index) => {
        const originalPos = positions.find((pos) => pos.fileId === file.id);
        if (!originalPos) return null;
        return {
          ...originalPos,
          fileId: duplicatedFiles[index].id,
          x: Math.min(100, originalPos.x + 2), // Slight offset
          y: Math.min(100, originalPos.y + 2)
        };
      }).filter((pos): pos is BundleImagePosition => pos !== null);

      // Add duplicated files and positions
      onFilesChange([...files, ...duplicatedFiles]);
      onPositionsChange([...positions, ...duplicatedPositions]);
      setContextMenu(null);
      setSelectedImageIds(new Set(duplicatedFiles.map((file) => file.id)));
    },
    [files, positions, onPositionsChange, onFilesChange, selectedImageIds, setSelectedImageIds]
  );

  const handleMirrorHorizontal = useCallback(
    (_: string) => {
      // Mirror all selected images - batch update
      const updates = new Map<string, Partial<BundleImagePosition>>();
      selectedImageIds.forEach((id) => {
        const position = positions.find((pos) => pos.fileId === id);
        if (position) {
          updates.set(id, {
            mirrorHorizontal: !position.mirrorHorizontal
          });
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
      onOverlayMirrorHorizontal?.();
      setContextMenu(null);
    },
    [positions, onPositionsChange, selectedImageIds, onOverlayMirrorHorizontal]
  );

  const handleMirrorVertical = useCallback(
    (_: string) => {
      // Mirror all selected images - batch update
      const updates = new Map<string, Partial<BundleImagePosition>>();
      selectedImageIds.forEach((id) => {
        const position = positions.find((pos) => pos.fileId === id);
        if (position) {
          updates.set(id, {
            mirrorVertical: !position.mirrorVertical
          });
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
      onOverlayMirrorVertical?.();
      setContextMenu(null);
    },
    [positions, onPositionsChange, selectedImageIds, onOverlayMirrorVertical]
  );

  const handleDelete = useCallback(
    (_: string) => {
      // Delete all selected images
      if (onFilesChange) {
        onFilesChange(files.filter((file) => !selectedImageIds.has(file.id)));
      }
      // Update positions to remove deleted images
      onPositionsChange(positions.filter((pos) => !selectedImageIds.has(pos.fileId)));
      setContextMenu(null);
      setSelectedImageIds(new Set());
    },
    [files, positions, onPositionsChange, onFilesChange, selectedImageIds, setSelectedImageIds]
  );

  const handleSendToBack = useCallback(
    (_: string) => {
      if (onLayerSendToBack) {
        onLayerSendToBack();
        setContextMenu(null);
        return;
      }
      const selectedPositions = Array.from(selectedImageIds)
        .map((id) => positions.find((pos) => pos.fileId === id))
        .filter((pos): pos is BundleImagePosition => pos !== undefined);
      if (selectedPositions.length === 0) return;
      const newPositions = positions.filter((pos) => !selectedImageIds.has(pos.fileId));
      newPositions.unshift(...selectedPositions);
      onPositionsChange(newPositions);
      setContextMenu(null);
    },
    [positions, onPositionsChange, selectedImageIds, onLayerSendToBack]
  );

  const handleSendBackwards = useCallback(
    (_: string) => {
      if (onLayerSendBackward) {
        onLayerSendBackward();
        setContextMenu(null);
        return;
      }
      const selectedIndices = Array.from(selectedImageIds)
        .map((id) => positions.findIndex((pos) => pos.fileId === id))
        .filter((idx) => idx !== -1)
        .sort((a, b) => a - b);
      if (selectedIndices.length === 0 || selectedIndices[0] === 0) return;
      const newPositions = [...positions];
      selectedIndices.forEach((index) => {
        if (index > 0 && !selectedImageIds.has(newPositions[index - 1].fileId)) {
          [newPositions[index - 1], newPositions[index]] = [newPositions[index], newPositions[index - 1]];
        }
      });
      onPositionsChange(newPositions);
      setContextMenu(null);
    },
    [positions, onPositionsChange, selectedImageIds, onLayerSendBackward]
  );

  const handleBringForward = useCallback(
    (_: string) => {
      if (onLayerBringForward) {
        onLayerBringForward();
        setContextMenu(null);
        return;
      }
      const selectedIndices = Array.from(selectedImageIds)
        .map((id) => positions.findIndex((pos) => pos.fileId === id))
        .filter((idx) => idx !== -1)
        .sort((a, b) => b - a);
      if (selectedIndices.length === 0 || selectedIndices[0] === positions.length - 1) return;
      const newPositions = [...positions];
      selectedIndices.forEach((index) => {
        if (index < newPositions.length - 1 && !selectedImageIds.has(newPositions[index + 1].fileId)) {
          [newPositions[index], newPositions[index + 1]] = [newPositions[index + 1], newPositions[index]];
        }
      });
      onPositionsChange(newPositions);
      setContextMenu(null);
    },
    [positions, onPositionsChange, selectedImageIds, onLayerBringForward]
  );

  const handleBringToFront = useCallback(
    (_: string) => {
      if (onLayerBringToFront) {
        onLayerBringToFront();
        setContextMenu(null);
        return;
      }
      const selectedPositions = Array.from(selectedImageIds)
        .map((id) => positions.find((pos) => pos.fileId === id))
        .filter((pos): pos is BundleImagePosition => pos !== undefined);
      if (selectedPositions.length === 0) return;
      const newPositions = positions.filter((pos) => !selectedImageIds.has(pos.fileId));
      newPositions.push(...selectedPositions);
      onPositionsChange(newPositions);
      setContextMenu(null);
    },
    [positions, onPositionsChange, selectedImageIds, onLayerBringToFront]
  );

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;

    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [contextMenu]);

  // Don't render if no positions - positions will be initialized by parent
  if (positions.length === 0) return null;

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
          setContextMenu({ x: e.clientX, y: e.clientY, itemId: firstSelectedId });
        } else {
          // Prevent browser menu on empty space
          e.preventDefault();
        }
      }}
    >
      {/* Selection box */}
      <SelectionBox dragSelection={dragSelection} containerRef={containerRef} />
      {positions.map((position, index) => {
        const file = files.find((f) => f.id === position.fileId);
        if (!file) return null;
        
        const cropped = contentCropped[file.id];
        
        return (
          <div
            key={position.fileId}
            data-image-element
            data-bundle-image
            className="absolute cursor-move"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              width: `${position.width}%`,
              height: `${position.height}%`,
              transform: `translate(-50%, -50%) rotate(${position.rotation}deg)`,
              transformOrigin: "center center",
              zIndex: getZIndex != null ? getZIndex(position.fileId) + 10 : 10 + index,
              pointerEvents: "auto",
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none"
            }}
            onMouseDown={(e) => {
              // Only handle left mouse button (button 0) - ignore right-clicks
              if (e.button !== 0) {
                return;
              }
              // Track if this mousedown will result in a drag operation
              const isHandle = (e.target as HTMLElement).closest('[data-handle]');
              if (!isHandle) {
                e.stopPropagation(); // Prevent event from reaching drag selection container
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
                onClearOverlaySelection?.();
              }
            }}
          >
            {/* Image */}
            {cropped ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cropped}
                alt=""
                className={`w-full h-full object-contain pointer-events-none transition-opacity ${
                  isProcessing ? "opacity-50" : ""
                }`}
                draggable={false}
                style={{
                  transform: `scaleX(${position.mirrorHorizontal ? -1 : 1}) scaleY(${position.mirrorVertical ? -1 : 1})`
                }}
              />
            ) : (
              <div
                className={`w-full h-full min-h-[2px] bg-gray-200 transition-opacity ${
                  isProcessing ? "opacity-50" : ""
                }`}
              />
            )}

          </div>
        );
      })}
      {/* Render handles and selection boxes as siblings, outside image containers */}
      {positions.map((position) => {
        if (!selectedImageIds.has(position.fileId)) return null;
        
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

            {/* Handles */}
            <ImageHandles
              onMouseDown={(e, handle) => handleMouseDown(e, position.fileId, "resize", handle)}
              onRotateMouseDown={(e) => handleMouseDown(e, position.fileId, "rotate")}
            />
          </div>
        );
      })}
      {/* Container for drag selection at z-index 0; bundle images use z-index 10+ so they receive clicks first */}
      <div
        className="absolute inset-0 bundle-drag-selection-container"
        style={{ zIndex: 0, pointerEvents: "none" }}
      >
        <div
          className="absolute inset-0"
          onMouseDown={(e) => {
            // Only handle drag selection if clicking on empty space (not on images or handles)
            const target = e.target as HTMLElement;
            if (
              target.closest("[data-bundle-image]") ||
              target.closest("[data-overlay-image]") ||
              target.closest("[data-handle]")
            ) {
              return;
            }
            e.stopPropagation();
            handleContainerMouseDown(e);
          }}
          style={{ pointerEvents: "auto" }}
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ImageContextMenu
          contextMenu={contextMenu}
          isAtBack={isAtBack ? isAtBack(contextMenu.itemId) : positions.findIndex((pos) => pos.fileId === contextMenu.itemId) === 0}
          isAtFront={isAtFront ? isAtFront(contextMenu.itemId) : positions.findIndex((pos) => pos.fileId === contextMenu.itemId) === positions.length - 1}
          onDuplicate={() => handleDuplicate(contextMenu.itemId).catch(console.error)}
          onDelete={() => handleDelete(contextMenu.itemId)}
          onMirrorHorizontal={() => handleMirrorHorizontal(contextMenu.itemId)}
          onMirrorVertical={() => handleMirrorVertical(contextMenu.itemId)}
          onBringToFront={() => handleBringToFront(contextMenu.itemId)}
          onBringForward={() => handleBringForward(contextMenu.itemId)}
          onSendBackwards={() => handleSendBackwards(contextMenu.itemId)}
          onSendToBack={() => handleSendToBack(contextMenu.itemId)}
        />
      )}
    </div>
  );
}
