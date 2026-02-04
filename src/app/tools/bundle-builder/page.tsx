"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { flushSync } from "react-dom";
import { RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import ToolPageLayout from "../../components/ToolPageLayout";
import type { FileWithPreview } from "../../components/FileUploadZone";
import {
  AspectRatio,
  CenterMode,
  CenterShapeId,
  ExportFormat,
  LayoutStyle,
  getCanvasDimensions
} from "./index";
import { getTextSafeRect } from "./text-safe-area";
import { computeImageFrames } from "./layouts";
import InstantPreview from "./InstantPreview";
import ColorPickerModal from "./ColorPickerModal";
import { CENTER_TEXT_FONTS, loadFont } from "./fonts";
import OverlayImageRenderer from "./OverlayImageRenderer";
import BundleImageRenderer, { type BundleImagePosition } from "./BundleImageRenderer";
import { analyzePreviewColors } from "./utils/colorUtils";
import { WIZARD_STEPS } from "./constants/wizardSteps";
import { usePresets } from "./hooks/usePresets";
import { useExport } from "./hooks/useExport";
import { useReset } from "./hooks/useReset";
import { useWizard } from "./hooks/useWizard";
import Step1Setup from "./components/steps/Step1Setup";
import Step2Layout from "./components/steps/Step2Layout";
import Step3Center from "./components/steps/Step3Center";
import Step4Animation from "./components/steps/Step4Animation";
import Step5Export from "./components/steps/Step5Export";
import SavePresetModal from "./components/modals/SavePresetModal";
import SecondaryListingImages from "./SecondaryListingImages";
import type { OverlayImage } from "./OverlayImageEditor";
import type { BundleBuilderPreset } from "./types/presets";

type BundleTab = "primary" | "secondary";

export default function BundleBuilderTool() {
  const [activeTab, setActiveTab] = useState<BundleTab>("primary");
  const { step, setStep, nextStep, previousStep, isFirstStep, isLastStep } = useWizard(1);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [backgroundFiles, setBackgroundFiles] = useState<FileWithPreview[]>([]);
  const [centerFiles, setCenterFiles] = useState<FileWithPreview[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>("dividedGrid");
  const [backgroundMode, setBackgroundMode] = useState<"transparent" | "backgroundImage" | "color">("transparent");
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [textSafeAreaPercent, setTextSafeAreaPercent] = useState<number>(20);
  const [imagesPerRow, setImagesPerRow] = useState<number | undefined>(undefined);
  const [imageSpacingPercent, setImageSpacingPercent] = useState<number>(5);
  const [centerWidthScale, setCenterWidthScale] = useState<number>(1);
  const [centerHeightScale, setCenterHeightScale] = useState<number>(1);
  const [centerScaleLocked, setCenterScaleLocked] = useState<boolean>(true);
  const [centerRotation, setCenterRotation] = useState<number>(0);
  const [centerXOffset, setCenterXOffset] = useState<number>(0);
  const [centerYOffset, setCenterYOffset] = useState<number>(0);
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);
  const { presets, savePreset, loadPreset, deletePreset } = usePresets();
  const [presetNameInput, setPresetNameInput] = useState<string>("");
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  
  const [centerMode, setCenterMode] = useState<CenterMode>("text");
  const [centerShape, setCenterShape] = useState<CenterShapeId>("roundedRect");
  const [titleText, setTitleText] = useState<string>("Clipart Bundle");
  const [subtitleText, setSubtitleText] = useState<string>("20 PNGs | Transparent | Commercial Use | 300 DPI");
  const [titleFont, setTitleFont] = useState<string>(CENTER_TEXT_FONTS[0]?.id ?? "Open Sans");
  const [subtitleFont, setSubtitleFont] = useState<string>(CENTER_TEXT_FONTS[0]?.id ?? "Open Sans");
  const [titleBold, setTitleBold] = useState<boolean>(false);
  const [subtitleBold, setSubtitleBold] = useState<boolean>(false);
  const [titleFontSize, setTitleFontSize] = useState<number>(48);
  const [subtitleFontSize, setSubtitleFontSize] = useState<number>(28);
  const [titleFontSizeAuto, setTitleFontSizeAuto] = useState<boolean>(false);
  const [subtitleFontSizeAuto, setSubtitleFontSizeAuto] = useState<boolean>(false);
  const [shapeColor, setShapeColor] = useState<string>("#fef3c7");
  const [titleColor, setTitleColor] = useState<string>("#1f2937");
  const [subtitleColor, setSubtitleColor] = useState<string>("#4b5563");
  const [centerColorPicker, setCenterColorPicker] = useState<"shape" | "title" | "subtitle" | null>(null);
  const [wrapText, setWrapText] = useState<boolean>(true);
  const [overlayImages, setOverlayImages] = useState<OverlayImage[]>([]);
  const [overlaySelectedIds, setOverlaySelectedIds] = useState<Set<string>>(new Set());
  const [bundleSelectedIds, setBundleSelectedIds] = useState<Set<string>>(new Set());

  /** Unified draw order for bundle + overlay images; index = z-order (0 = back, length-1 = front) */
  type ImageLayerEntry = { type: "bundle"; id: string } | { type: "overlay"; id: string };
  const [imageLayerOrder, setImageLayerOrder] = useState<ImageLayerEntry[]>([]);

  // Custom bundle image positions (when layoutStyle is "custom")
  const [customBundleImagePositions, setCustomBundleImagePositions] = useState<BundleImagePosition[]>([]);
  
  const { isExporting, error, exportImage, setError } = useExport({
    files,
    centerFiles,
    backgroundFiles,
    overlayImages,
    customBundleImagePositions,
    aspectRatio,
    layoutStyle,
    backgroundMode,
    backgroundColor,
    textSafeAreaPercent,
    imagesPerRow,
    imageSpacingPercent,
    centerMode,
    centerShape,
    titleText,
    subtitleText,
    titleFont,
    subtitleFont,
    titleBold,
    subtitleBold,
    titleFontSize,
    subtitleFontSize,
    titleFontSizeAuto,
    subtitleFontSizeAuto,
    shapeColor,
    titleColor,
    subtitleColor,
    wrapText,
    centerWidthScale,
    centerHeightScale,
    centerRotation,
    centerXOffset,
    centerYOffset
  });
  
  // Track content cropped images from InstantPreview
  const [contentCropped, setContentCropped] = useState<Record<string, string>>({});
  const processingRef = useRef<Set<string>>(new Set());
  const contentCroppedRef = useRef<Record<string, string>>({});
  
  // Sync ref with state
  useEffect(() => {
    contentCroppedRef.current = contentCropped;
  }, [contentCropped]);
  
  // Track processing progress as state to ensure re-renders
  const [processingProgress, setProcessingProgress] = useState<{ processed: number; total: number } | undefined>(undefined);
  
  // Update processing progress whenever contentCropped or files change
  useEffect(() => {
    if (files.length === 0) {
      setProcessingProgress(undefined);
      return;
    }
    const filesWithPreview = files.filter(f => f.preview);
    const processed = filesWithPreview.filter(f => contentCropped[f.id]).length;
    const total = filesWithPreview.length;
    const newProgress = { processed, total };
    setProcessingProgress(newProgress);
  }, [files, contentCropped]);
  
  // Determine if processing is active (use actual file state, not derived progress)
  const hasUnprocessedFiles = files.some((file) => file.preview && !contentCropped[file.id]);
  const isProcessing = files.length > 0 && hasUnprocessedFiles;
  
  // Process images for progress tracking (independent of InstantPreview)
  useEffect(() => {
    if (files.length === 0) {
      setContentCropped({});
      contentCroppedRef.current = {};
      processingRef.current.clear();
      return;
    }
    
    // Find files that need processing using ref to avoid dependency issues
    const filesNeedingProcessing = files.filter(file => {
      if (!file.preview) return false;
      if (processingRef.current.has(file.id)) return false;
      return !contentCroppedRef.current[file.id];
    });
    
    if (filesNeedingProcessing.length === 0) return;
    
    // Process each file - process in parallel but track individually
    // Use forEach but ensure each promise is handled
    filesNeedingProcessing.forEach((file) => {
      processingRef.current.add(file.id);
      
      // Import and process - don't await in forEach, but handle each promise
      import("./image-processing")
        .then(({ getContentCroppedDataUrlFromUrl }) => {
          return getContentCroppedDataUrlFromUrl(file.preview!);
        })
        .then((url) => {
          flushSync(() => {
            setContentCropped((currentState) => {
              // Double-check it's still not processed (race condition protection)
              if (currentState[file.id]) {
                processingRef.current.delete(file.id);
                return currentState;
              }
              processingRef.current.delete(file.id);
              const newState = { ...currentState, [file.id]: url };
              contentCroppedRef.current = newState;
              return newState;
            });
          });
        })
        .catch((err) => {
          console.error(`[${file.id}] ❌ Failed to process ${file.name}:`, err);
          // On error, mark as processed with original preview to avoid infinite retries
          flushSync(() => {
            setContentCropped((currentState) => {
              if (currentState[file.id]) {
                processingRef.current.delete(file.id);
                return currentState;
              }
              processingRef.current.delete(file.id);
              const newState = { ...currentState, [file.id]: file.preview || "" };
              contentCroppedRef.current = newState;
              return newState;
            });
          });
        });
    });
  }, [files]); // Only depend on files - use ref to check contentCropped

  // Clear custom positions when not in custom layout
  useEffect(() => {
    if (layoutStyle !== "custom" && customBundleImagePositions.length > 0) {
      setCustomBundleImagePositions([]);
    }
  }, [layoutStyle, customBundleImagePositions.length]);

  // Initialize custom positions from computed frames when needed (only for custom layout)
  useEffect(() => {
    if (layoutStyle === "custom" && customBundleImagePositions.length === 0 && files.length >= 2) {
      const initializeCustomPositions = async () => {
        const { width: w, height: h } = getCanvasDimensions(aspectRatio);
        const { getTextSafeRect } = await import("./text-safe-area");
        const textSafeRect = getTextSafeRect(w, h, textSafeAreaPercent);
        const { computeImageFrames } = await import("./layouts");
        // Use dividedGrid as the base layout for custom positions
        const frames = computeImageFrames("dividedGrid", w, h, files.length, textSafeRect, imagesPerRow, imageSpacingPercent);
        
        const positions: BundleImagePosition[] = files.map((file, i) => {
          const frame = frames[i];
          if (!frame) return null;
          
          // Account for image spacing - frame already has padding applied in InstantPreview
          const framePaddingPercent = 100 - imageSpacingPercent;
          const frameWidthPercent = (frame.width / w) * 100;
          const frameHeightPercent = (frame.height / h) * 100;
          const actualWidth = frameWidthPercent * (framePaddingPercent / 100);
          const actualHeight = frameHeightPercent * (framePaddingPercent / 100);
          
          // Center position (x, y are percentages from top-left, we need center)
          return {
            fileId: file.id,
            x: (frame.x / w) * 100 + (frameWidthPercent / 2),
            y: (frame.y / h) * 100 + (frameHeightPercent / 2),
            width: actualWidth,
            height: actualHeight,
            rotation: frame.rotation
          };
        }).filter((pos): pos is BundleImagePosition => pos !== null);
        
        setCustomBundleImagePositions(positions);
      };
      
      initializeCustomPositions();
    }
  }, [files, aspectRatio, textSafeAreaPercent, imagesPerRow, imageSpacingPercent, layoutStyle, customBundleImagePositions.length]);

  // Compute positions from current layout when not in custom mode
  const computedBundleImagePositions = useMemo(() => {
    if (layoutStyle === "custom" || files.length < 2) {
      return customBundleImagePositions;
    }
    const { width: w, height: h } = getCanvasDimensions(aspectRatio);
    const textSafeRect = getTextSafeRect(w, h, textSafeAreaPercent);
    const frames = computeImageFrames(layoutStyle, w, h, files.length, textSafeRect, imagesPerRow, imageSpacingPercent);
    return files.map((file, i) => {
      const frame = frames[i];
      if (!frame) return null;
      const framePaddingPercent = 100 - imageSpacingPercent;
      const frameWidthPercent = (frame.width / w) * 100;
      const frameHeightPercent = (frame.height / h) * 100;
      const actualWidth = frameWidthPercent * (framePaddingPercent / 100);
      const actualHeight = frameHeightPercent * (framePaddingPercent / 100);
      return {
        fileId: file.id,
        x: (frame.x / w) * 100 + (frameWidthPercent / 2),
        y: (frame.y / h) * 100 + (frameHeightPercent / 2),
        width: actualWidth,
        height: actualHeight,
        rotation: frame.rotation
      };
    }).filter((pos): pos is BundleImagePosition => pos !== null);
  }, [layoutStyle, customBundleImagePositions, files, aspectRatio, textSafeAreaPercent, imagesPerRow, imageSpacingPercent]);

  // Sync unified layer order when bundle positions or overlay images change (add/remove only; preserve user reorder)
  const bundleFileIds = useMemo(() => computedBundleImagePositions.map((p) => p.fileId), [computedBundleImagePositions]);
  const overlayIds = useMemo(() => overlayImages.map((o) => o.id), [overlayImages]);
  useEffect(() => {
    setImageLayerOrder((prev) => {
      const next: ImageLayerEntry[] = [];
      const bundleSet = new Set(bundleFileIds);
      const overlaySet = new Set(overlayIds);
      // Keep existing entries that are still present, in order
      prev.forEach((entry) => {
        if (entry.type === "bundle" && bundleSet.has(entry.id)) {
          next.push(entry);
          bundleSet.delete(entry.id);
        } else if (entry.type === "overlay" && overlaySet.has(entry.id)) {
          next.push(entry);
          overlaySet.delete(entry.id);
        }
      });
      // Append new bundle ids (in positions order), then new overlay ids
      bundleFileIds.forEach((id) => {
        if (bundleSet.has(id)) next.push({ type: "bundle", id });
      });
      overlayImages.forEach((o) => {
        if (overlaySet.has(o.id)) next.push({ type: "overlay", id: o.id });
      });
      return next;
    });
  }, [bundleFileIds, overlayIds, overlayImages]);

  const getZIndex = useCallback((id: string) => {
    const idx = imageLayerOrder.findIndex((e) => e.id === id);
    return idx === -1 ? 0 : idx;
  }, [imageLayerOrder]);

  const isAtFront = useCallback((id: string) => imageLayerOrder.length > 0 && imageLayerOrder[imageLayerOrder.length - 1]?.id === id, [imageLayerOrder]);
  const isAtBack = useCallback((id: string) => imageLayerOrder.length > 0 && imageLayerOrder[0]?.id === id, [imageLayerOrder]);

  const moveLayerToFront = useCallback((ids: Set<string>) => {
    setImageLayerOrder((prev) => {
      const moving = prev.filter((e) => ids.has(e.id));
      if (moving.length === 0) return prev;
      const rest = prev.filter((e) => !ids.has(e.id));
      return [...rest, ...moving];
    });
  }, []);
  const moveLayerToBack = useCallback((ids: Set<string>) => {
    setImageLayerOrder((prev) => {
      const moving = prev.filter((e) => ids.has(e.id));
      if (moving.length === 0) return prev;
      const rest = prev.filter((e) => !ids.has(e.id));
      return [...moving, ...rest];
    });
  }, []);
  /** Move each id in the set one step forward in layer order (process from front to back so order is correct) */
  const moveLayerForward = useCallback((ids: Set<string>) => {
    if (ids.size === 0) return;
    setImageLayerOrder((prev) => {
      const indices = Array.from(ids)
        .map((id) => prev.findIndex((e) => e.id === id))
        .filter((i) => i !== -1 && i < prev.length - 1)
        .sort((a, b) => b - a); // descending so we move back ones first
      if (indices.length === 0) return prev;
      const next = [...prev];
      indices.forEach((i) => {
        if (i < next.length - 1) [next[i], next[i + 1]] = [next[i + 1], next[i]];
      });
      return next;
    });
  }, []);
  /** Move each id in the set one step backward in layer order */
  const moveLayerBackward = useCallback((ids: Set<string>) => {
    if (ids.size === 0) return;
    setImageLayerOrder((prev) => {
      const indices = Array.from(ids)
        .map((id) => prev.findIndex((e) => e.id === id))
        .filter((i) => i > 0)
        .sort((a, b) => a - b); // ascending so we move front ones first
      if (indices.length === 0) return prev;
      const next = [...prev];
      indices.forEach((i) => {
        if (i > 0) [next[i - 1], next[i]] = [next[i], next[i - 1]];
      });
      return next;
    });
  }, []);

  /** Apply the same transform to overlay images (used when bundle resize/rotate/drag also affects selected overlays).
   * When initialOverlayState is provided, apply transform from that initial state (avoids compounding each mousemove). */
  const onOverlayTransform = useCallback(
    (
      ids: string[],
      transform: { deltaRotation?: number; scaleX?: number; scaleY?: number; deltaXPercent?: number; deltaYPercent?: number },
      initialOverlayState?: Array<{ id: string; x: number; y: number; width: number; height: number; rotation: number }>
    ) => {
      if (ids.length === 0) return;
      const initialById = initialOverlayState ? new Map(initialOverlayState.map((o) => [o.id, o])) : null;
      setOverlayImages((prev) =>
        prev.map((img) => {
          if (!ids.includes(img.id)) return img;
          const initial = initialById?.get(img.id);
          let next = { ...img };
          if (transform.deltaRotation != null) {
            const base = initial?.rotation ?? img.rotation;
            next = { ...next, rotation: (base + transform.deltaRotation) % 360 };
          }
          if (transform.scaleX != null || transform.scaleY != null) {
            const sx = transform.scaleX ?? 1;
            const sy = transform.scaleY ?? 1;
            const w = initial?.width ?? img.width;
            const h = initial?.height ?? img.height;
            next = {
              ...next,
              width: Math.max(5, Math.min(50, w * sx)),
              height: Math.max(5, Math.min(50, h * sy))
            };
          }
          if (transform.deltaXPercent != null || transform.deltaYPercent != null) {
            const ix = initial?.x ?? img.x;
            const iy = initial?.y ?? img.y;
            next = {
              ...next,
              x: Math.max(0, Math.min(100, ix + (transform.deltaXPercent ?? 0))),
              y: Math.max(0, Math.min(100, iy + (transform.deltaYPercent ?? 0)))
            };
          }
          return next;
        })
      );
    },
    []
  );

  /** Apply the same transform to bundle positions (used when overlay resize/rotate also affects selected bundles) */
  const onBundleMirrorHorizontal = useCallback(() => {
    setCustomBundleImagePositions((prev) =>
      prev.map((pos) => (bundleSelectedIds.has(pos.fileId) ? { ...pos, mirrorHorizontal: !pos.mirrorHorizontal } : pos))
    );
    setLayoutStyle("custom");
  }, [bundleSelectedIds]);
  const onBundleMirrorVertical = useCallback(() => {
    setCustomBundleImagePositions((prev) =>
      prev.map((pos) => (bundleSelectedIds.has(pos.fileId) ? { ...pos, mirrorVertical: !pos.mirrorVertical } : pos))
    );
    setLayoutStyle("custom");
  }, [bundleSelectedIds]);
  const onOverlayMirrorHorizontal = useCallback(() => {
    setOverlayImages((prev) =>
      prev.map((img) => (overlaySelectedIds.has(img.id) ? { ...img, mirrorHorizontal: !img.mirrorHorizontal } : img))
    );
  }, [overlaySelectedIds]);
  const onOverlayMirrorVertical = useCallback(() => {
    setOverlayImages((prev) =>
      prev.map((img) => (overlaySelectedIds.has(img.id) ? { ...img, mirrorVertical: !img.mirrorVertical } : img))
    );
  }, [overlaySelectedIds]);

  /** When initialBundleState is provided, apply transform from that initial state (avoids compounding each mousemove). */
  const onBundleTransform = useCallback(
    (
      fileIds: string[],
      transform: { deltaRotation?: number; scaleX?: number; scaleY?: number; deltaXPercent?: number; deltaYPercent?: number },
      initialBundleState?: Array<{ fileId: string; x: number; y: number; width: number; height: number; rotation: number }>
    ) => {
      if (fileIds.length === 0) return;
      const initialById = initialBundleState ? new Map(initialBundleState.map((p) => [p.fileId, p])) : null;
      setCustomBundleImagePositions((prev) => {
        const next = prev.map((pos) => {
          if (!fileIds.includes(pos.fileId)) return pos;
          const initial = initialById?.get(pos.fileId);
          let p = { ...pos };
          if (transform.deltaRotation != null) {
            const base = initial?.rotation ?? pos.rotation;
            p = { ...p, rotation: (base + transform.deltaRotation) % 360 };
          }
          if (transform.scaleX != null || transform.scaleY != null) {
            const sx = transform.scaleX ?? 1;
            const sy = transform.scaleY ?? 1;
            const w = initial?.width ?? pos.width;
            const h = initial?.height ?? pos.height;
            p = {
              ...p,
              width: Math.max(5, Math.min(50, w * sx)),
              height: Math.max(5, Math.min(50, h * sy))
            };
          }
          if (transform.deltaXPercent != null || transform.deltaYPercent != null) {
            const ix = initial?.x ?? pos.x;
            const iy = initial?.y ?? pos.y;
            p = {
              ...p,
              x: Math.max(0, Math.min(100, ix + (transform.deltaXPercent ?? 0))),
              y: Math.max(0, Math.min(100, iy + (transform.deltaYPercent ?? 0)))
            };
          }
          return p;
        });
        return next;
      });
      setLayoutStyle("custom");
    },
    []
  );

  const handleBundleImagePositionsChange = useCallback((positions: BundleImagePosition[]) => {
    // Check if positions actually changed from computed positions
    if (layoutStyle !== "custom") {
      const positionsChanged = positions.some((pos, i) => {
        const computed = computedBundleImagePositions[i];
        if (!computed) return true;
        return Math.abs(pos.x - computed.x) > 0.01 ||
               Math.abs(pos.y - computed.y) > 0.01 ||
               Math.abs(pos.width - computed.width) > 0.01 ||
               Math.abs(pos.height - computed.height) > 0.01 ||
               Math.abs(pos.rotation - computed.rotation) > 0.01;
      });
      if (positionsChanged) {
        // User manipulated an image - switch to custom mode
        setCustomBundleImagePositions(positions);
        setLayoutStyle("custom");
      }
    } else {
      setCustomBundleImagePositions(positions);
    }
  }, [layoutStyle, computedBundleImagePositions]);

  const handleDownload = (format: ExportFormat) => {
    exportImage(format).catch(() => {
      // Error already handled by useExport hook
    });
  };

  const handleReset = useReset({
    setStep,
    setFiles,
    setBackgroundFiles,
    setCenterFiles,
    setOverlayImages,
    setCustomBundleImagePositions,
    setContentCropped,
    setAspectRatio,
    setLayoutStyle,
    setBackgroundMode,
    setBackgroundColor,
    setHexInput: () => {}, // Not used anymore, ColorPickerModal handles hex input internally
    setTextSafeAreaPercent,
    setImagesPerRow,
    setImageSpacingPercent,
    setCenterWidthScale,
    setCenterHeightScale,
    setCenterScaleLocked,
    setCenterRotation,
    setCenterXOffset,
    setCenterYOffset,
    setError,
    setShowColorPickerModal,
    setCenterMode,
    setCenterShape,
    setTitleText,
    setSubtitleText,
    setTitleFont,
    setSubtitleFont,
    setTitleBold,
    setSubtitleBold,
    setTitleFontSize,
    setSubtitleFontSize,
    setTitleFontSizeAuto,
    setSubtitleFontSizeAuto,
    setShapeColor,
    setTitleColor,
    setSubtitleColor,
    setCenterColorPicker,
    files,
    backgroundFiles,
    centerFiles
  });


  // Load center text fonts when in text mode
  useEffect(() => {
    if (centerMode !== "text") return;
    loadFont(titleFont).catch(() => {});
    loadFont(subtitleFont).catch(() => {});
  }, [centerMode, titleFont, subtitleFont]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowColorPickerModal(false);
        setShowSavePresetModal(false);
        setCenterColorPicker(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSavePreset = () => {
    if (!presetNameInput.trim()) {
      setError("Please enter a preset name");
      return;
    }
    const newPreset: BundleBuilderPreset = {
      name: presetNameInput.trim(),
      aspectRatio,
      layoutStyle,
      backgroundMode,
      backgroundColor,
      textSafeAreaPercent,
      imagesPerRow,
      imageSpacingPercent,
      centerMode,
      centerShape,
      centerScale: centerWidthScale,
      centerHeightScale,
      centerScaleLocked,
      centerRotation,
      centerXOffset,
      centerYOffset,
      titleText,
      subtitleText,
      titleFont,
      subtitleFont,
      titleBold,
      subtitleBold,
      titleFontSize,
      subtitleFontSize,
      titleFontSizeAuto,
      subtitleFontSizeAuto,
      shapeColor,
      titleColor,
      subtitleColor,
      wrapText
    };
    savePreset(newPreset);
    setPresetNameInput("");
    setShowSavePresetModal(false);
    setError(null);
  };

  const handleLoadPreset = (presetName: string) => {
    const preset = loadPreset(presetName);
    if (!preset) return;
    setAspectRatio(preset.aspectRatio);
    setLayoutStyle(preset.layoutStyle);
    setBackgroundMode(preset.backgroundMode);
    setBackgroundColor(preset.backgroundColor);
    setTextSafeAreaPercent(preset.textSafeAreaPercent);
    setImagesPerRow(preset.imagesPerRow);
    if (preset.imageSpacingPercent !== undefined) setImageSpacingPercent(preset.imageSpacingPercent);
    if (preset.centerMode !== undefined) setCenterMode(preset.centerMode);
    if (preset.centerShape !== undefined) setCenterShape(preset.centerShape);
    setCenterWidthScale(preset.centerScale);
    if (preset.centerHeightScale !== undefined) {
      setCenterHeightScale(preset.centerHeightScale);
    } else {
      setCenterHeightScale(preset.centerScale);
    }
    if (preset.centerScaleLocked !== undefined) {
      setCenterScaleLocked(preset.centerScaleLocked);
    } else {
      setCenterScaleLocked(true);
    }
    setCenterRotation(preset.centerRotation);
    setCenterXOffset(preset.centerXOffset);
    setCenterYOffset(preset.centerYOffset);
    if (preset.titleText !== undefined) setTitleText(preset.titleText);
    if (preset.subtitleText !== undefined) setSubtitleText(preset.subtitleText);
    if (preset.titleFont !== undefined) setTitleFont(preset.titleFont);
    if (preset.subtitleFont !== undefined) setSubtitleFont(preset.subtitleFont);
    if (preset.titleBold !== undefined) setTitleBold(preset.titleBold);
    if (preset.subtitleBold !== undefined) setSubtitleBold(preset.subtitleBold);
    if (preset.titleFontSize !== undefined) setTitleFontSize(preset.titleFontSize);
    if (preset.subtitleFontSize !== undefined) setSubtitleFontSize(preset.subtitleFontSize);
    if (preset.titleFontSizeAuto !== undefined) setTitleFontSizeAuto(preset.titleFontSizeAuto);
    if (preset.subtitleFontSizeAuto !== undefined) setSubtitleFontSizeAuto(preset.subtitleFontSizeAuto);
    if (preset.shapeColor !== undefined) setShapeColor(preset.shapeColor);
    if (preset.titleColor !== undefined) setTitleColor(preset.titleColor);
    if (preset.subtitleColor !== undefined) setSubtitleColor(preset.subtitleColor);
    if (preset.wrapText !== undefined) setWrapText(preset.wrapText);
  };

  const handleDeletePreset = (presetName: string) => {
    deletePreset(presetName);
  };

  const { width: previewWidth, height: previewHeight } = getCanvasDimensions(aspectRatio);

  const previewRatio = previewWidth && previewHeight ? previewWidth / previewHeight : 1;
  const aspectRatioStyle: React.CSSProperties =
    previewWidth && previewHeight
      ? {
          aspectRatio: `${previewWidth}/${previewHeight}`,
          maxHeight: "90vh",
          maxWidth: "100%",
          width: `min(100%, ${90 * previewRatio}vh)`,
          height: "auto"
        }
      : {};

  const actionButton = files.length > 0 ? (
    <button
      onClick={handleReset}
      disabled={isExporting}
      className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
      type="button"
    >
      <RotateCcw className="h-4 w-4" />
      Reset
    </button>
  ) : null;

  const stepContent =
    step === 1 ? (
      <Step1Setup
        files={files}
        onFilesChange={setFiles}
        aspectRatio={aspectRatio}
        onAspectRatioChange={(ratio) => setAspectRatio(ratio as AspectRatio)}
        presets={presets}
        onLoadPreset={handleLoadPreset}
        onDeletePreset={handleDeletePreset}
        onShowSaveModal={() => setShowSavePresetModal(true)}
        isExporting={isExporting}
        actionButton={actionButton}
        processingProgress={processingProgress}
        contentCropped={contentCropped}
      />
    ) : step === 2 ? (
      <Step2Layout
        layoutStyle={layoutStyle}
        onLayoutStyleChange={(style) => {
          const newLayout = style as LayoutStyle;
          setLayoutStyle(newLayout);
          // Reset custom positions when switching away from custom
          if (newLayout !== "custom") {
            setCustomBundleImagePositions([]);
          }
        }}
        imagesPerRow={imagesPerRow}
        onImagesPerRowChange={setImagesPerRow}
        imageSpacingPercent={imageSpacingPercent}
        onImageSpacingPercentChange={setImageSpacingPercent}
        backgroundMode={backgroundMode}
        backgroundColor={backgroundColor}
        backgroundFiles={backgroundFiles}
        onBackgroundModeChange={setBackgroundMode}
        onBackgroundFilesChange={setBackgroundFiles}
        onShowColorPicker={() => {
          setBackgroundMode("color");
          setShowColorPickerModal(true);
        }}
        files={files}
        onCustomPositionsReset={() => setCustomBundleImagePositions([])}
        isExporting={isExporting}
      />
    ) : step === 3 ? (
      <Step3Center
        layoutStyle={layoutStyle}
        centerMode={centerMode}
        centerShape={centerShape}
        shapeColor={shapeColor}
        titleText={titleText}
        subtitleText={subtitleText}
        titleFont={titleFont}
        subtitleFont={subtitleFont}
        titleBold={titleBold}
        subtitleBold={subtitleBold}
        titleFontSize={titleFontSize}
        subtitleFontSize={subtitleFontSize}
        titleFontSizeAuto={titleFontSizeAuto}
        subtitleFontSizeAuto={subtitleFontSizeAuto}
        titleColor={titleColor}
        subtitleColor={subtitleColor}
        wrapText={wrapText}
        centerFiles={centerFiles}
        textSafeAreaPercent={textSafeAreaPercent}
        centerRotation={centerRotation}
        centerWidthScale={centerWidthScale}
        centerHeightScale={centerHeightScale}
        centerScaleLocked={centerScaleLocked}
        centerXOffset={centerXOffset}
        centerYOffset={centerYOffset}
        onCenterModeChange={setCenterMode}
        onCenterShapeChange={setCenterShape}
        onShapeColorClick={() => setCenterColorPicker("shape")}
        onTitleTextChange={setTitleText}
        onSubtitleTextChange={setSubtitleText}
        onTitleFontChange={setTitleFont}
        onSubtitleFontChange={setSubtitleFont}
        onTitleBoldChange={setTitleBold}
        onSubtitleBoldChange={setSubtitleBold}
        onTitleFontSizeChange={setTitleFontSize}
        onSubtitleFontSizeChange={setSubtitleFontSize}
        onTitleFontSizeAutoChange={setTitleFontSizeAuto}
        onSubtitleFontSizeAutoChange={setSubtitleFontSizeAuto}
        onTitleColorClick={() => setCenterColorPicker("title")}
        onSubtitleColorClick={() => setCenterColorPicker("subtitle")}
        onWrapTextChange={setWrapText}
        onCenterFilesChange={setCenterFiles}
        onTextSafeAreaPercentChange={setTextSafeAreaPercent}
        onCenterRotationChange={setCenterRotation}
        onCenterWidthScaleChange={setCenterWidthScale}
        onCenterHeightScaleChange={setCenterHeightScale}
        onCenterScaleLockedChange={setCenterScaleLocked}
        onCenterXOffsetChange={setCenterXOffset}
        onCenterYOffsetChange={setCenterYOffset}
        isExporting={isExporting}
      />
    ) : step === 4 ? (
      <Step4Animation />
    ) : (
      <Step5Export
        aspectRatio={aspectRatio}
        layoutStyle={layoutStyle}
        backgroundMode={backgroundMode}
        backgroundColor={backgroundColor}
        textSafeAreaPercent={textSafeAreaPercent}
        files={files}
        overlayImages={overlayImages}
        onOverlayImagesChange={setOverlayImages}
        previewContainerRef={previewContainerRef}
        onDownload={handleDownload}
        isExporting={isExporting}
      />
    );

  return (
    <ToolPageLayout
      title="Bundle Builder"
      description="Arrange multiple previews into a single, text-ready bundle cover image for your digital products."
      showBackButton={true}
    >
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-1" aria-label="Bundle builder tabs">
          <button
            type="button"
            onClick={() => setActiveTab("primary")}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
              activeTab === "primary"
                ? "bg-white border-gray-200 text-blue-600 -mb-px"
                : "bg-transparent border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
            aria-current={activeTab === "primary" ? "page" : undefined}
          >
            Primary Listing Image
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("secondary")}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${
              activeTab === "secondary"
                ? "bg-white border-gray-200 text-blue-600 -mb-px"
                : "bg-transparent border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
            aria-current={activeTab === "secondary" ? "page" : undefined}
          >
            Secondary Listing Images
          </button>
        </nav>
      </div>

      {activeTab === "secondary" ? (
        <SecondaryListingImages />
      ) : (
      <>
      {/* Wizard + preview */}
      <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
          {/* Stepper + step content */}
          <div className="flex flex-col min-h-0">
            <nav aria-label="Steps" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mb-4 pb-4 border-b border-gray-200">
              {WIZARD_STEPS.map((s, i) => (
                <span key={s.num} className="flex items-center gap-x-1.5">
                  {i > 0 && <span className="text-gray-300 select-none" aria-hidden>•</span>}
                  <span
                    className={`text-sm font-medium ${step === s.num ? "text-blue-600" : "text-gray-500"}`}
                    aria-current={step === s.num ? "step" : undefined}
                  >
                    {s.num}. {s.label}
                  </span>
                </span>
              ))}
            </nav>
            <div className="space-y-4 flex-1 min-h-0 overflow-y-auto lg:pr-1">
              {stepContent}
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 shrink-0">
              {!isFirstStep ? (
                <button
                  type="button"
                  onClick={previousStep}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              ) : null}
              {!isLastStep ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors text-sm flex-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Bundle Image Preview (right column) */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <div className="relative w-full min-h-0 flex justify-center items-start max-h-[90vh]">
              <div
                ref={previewContainerRef}
                className="relative rounded-xl border border-gray-200 bg-white overflow-visible shadow-sm shrink-0"
                style={{
                  ...aspectRatioStyle,
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  msUserSelect: "none"
                }}
              >
                {files.length >= 2 ? (
                  <>
                    {/* Always render InstantPreview for background/shape/text, but hide bundle images in custom mode */}
                    <InstantPreview
                      files={files}
                      centerFiles={centerFiles}
                      centerMode={centerMode}
                      centerShape={centerShape}
                      titleText={titleText}
                      subtitleText={subtitleText}
                      titleFont={titleFont}
                      subtitleFont={subtitleFont}
                      titleBold={titleBold}
                      subtitleBold={subtitleBold}
                      titleFontSize={titleFontSize}
                      subtitleFontSize={subtitleFontSize}
                      titleFontSizeAuto={titleFontSizeAuto}
                      subtitleFontSizeAuto={subtitleFontSizeAuto}
                      shapeColor={shapeColor}
                      titleColor={titleColor}
                      subtitleColor={subtitleColor}
                      wrapText={wrapText}
                      backgroundFiles={backgroundFiles}
                      backgroundMode={backgroundMode}
                      backgroundColor={backgroundColor}
                      layoutStyle={layoutStyle}
                      textSafeAreaPercent={textSafeAreaPercent}
                      imagesPerRow={imagesPerRow}
                      imageSpacingPercent={imageSpacingPercent}
                      centerWidthScale={centerWidthScale}
                      centerHeightScale={centerHeightScale}
                      centerRotation={centerRotation}
                      centerXOffset={centerXOffset}
                      centerYOffset={centerYOffset}
                      aspectRatio={aspectRatio}
                      className="absolute inset-0"
                      onContentCroppedChange={setContentCropped}
                      fadeImages={isProcessing}
                      hideBundleImages={layoutStyle === "custom"}
                    />
                    {/* Always render BundleImageRenderer for selectable images */}
                    <BundleImageRenderer
                      files={files}
                      positions={computedBundleImagePositions}
                      onPositionsChange={handleBundleImagePositionsChange}
                      onFilesChange={(newFiles) => {
                        setFiles(newFiles);
                        setCustomBundleImagePositions((prev) =>
                          prev.filter((pos) => newFiles.some((f) => f.id === pos.fileId))
                        );
                      }}
                      aspectRatio={aspectRatio}
                      containerRef={previewContainerRef}
                      contentCropped={contentCropped}
                      isProcessing={isProcessing}
                      overlayImages={overlayImages}
                      onOverlaySelectionFromDrag={(ids, addToExisting) => {
                        if (addToExisting) setOverlaySelectedIds((prev) => new Set([...prev, ...ids]));
                        else setOverlaySelectedIds(new Set(ids));
                      }}
                      selectedImageIds={bundleSelectedIds}
                      onSelectedImageIdsChange={setBundleSelectedIds}
                      getZIndex={getZIndex}
                      isAtFront={isAtFront}
                      isAtBack={isAtBack}
                      onLayerBringToFront={() => moveLayerToFront(bundleSelectedIds)}
                      onLayerSendToBack={() => moveLayerToBack(bundleSelectedIds)}
                      onLayerBringForward={() => moveLayerForward(bundleSelectedIds)}
                      onLayerSendBackward={() => moveLayerBackward(bundleSelectedIds)}
                      overlaySelectedIds={overlaySelectedIds}
                      onClearOverlaySelection={() => setOverlaySelectedIds(new Set())}
                      onOverlayTransform={onOverlayTransform}
                      onOverlayMirrorHorizontal={onOverlayMirrorHorizontal}
                      onOverlayMirrorVertical={onOverlayMirrorVertical}
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400" style={{ minHeight: 200 }}>
                    Add at least 2 bundle images to see a live preview
                  </div>
                )}
                {files.length >= 2 && overlayImages.length > 0 && (
                  <OverlayImageRenderer
                    overlayImages={overlayImages}
                    onOverlayImagesChange={setOverlayImages}
                    aspectRatio={aspectRatio}
                    containerRef={previewContainerRef}
                    isProcessing={isProcessing}
                    selectedImageIds={overlaySelectedIds}
                    onSelectedImageIdsChange={setOverlaySelectedIds}
                    onClearBundleSelection={() => setBundleSelectedIds(new Set())}
                    getZIndex={getZIndex}
                    isAtFront={isAtFront}
                    isAtBack={isAtBack}
                    onLayerBringToFront={() => moveLayerToFront(overlaySelectedIds)}
                    onLayerSendToBack={() => moveLayerToBack(overlaySelectedIds)}
                    onLayerBringForward={() => moveLayerForward(overlaySelectedIds)}
                    onLayerSendBackward={() => moveLayerBackward(overlaySelectedIds)}
                    bundleSelectedIds={bundleSelectedIds}
                    bundlePositions={computedBundleImagePositions}
                    onBundleTransform={onBundleTransform}
                    onBundleMirrorHorizontal={onBundleMirrorHorizontal}
                    onBundleMirrorVertical={onBundleMirrorVertical}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Color picker modal */}
      {showColorPickerModal && (
        <ColorPickerModal
          open={true}
          onClose={() => setShowColorPickerModal(false)}
          value={backgroundColor}
          onChange={setBackgroundColor}
          title="Background color"
        />
      )}

      {/* Center text color picker modal (shape / title / subtitle) */}
      {centerColorPicker === "shape" && (
        <ColorPickerModal
          open={true}
          onClose={() => setCenterColorPicker(null)}
          value={shapeColor}
          onChange={setShapeColor}
          title="Shape color"
          showPickFromPreview
          onAutoPick={() => {
            if (previewContainerRef.current && files.length >= 2) {
              return analyzePreviewColors(previewContainerRef.current);
            }
            return null;
          }}
        />
      )}
      {centerColorPicker === "title" && (
        <ColorPickerModal
          open={true}
          onClose={() => setCenterColorPicker(null)}
          value={titleColor}
          onChange={setTitleColor}
          title="Title color"
          showPickFromPreview
        />
      )}
      {centerColorPicker === "subtitle" && (
        <ColorPickerModal
          open={true}
          onClose={() => setCenterColorPicker(null)}
          value={subtitleColor}
          onChange={setSubtitleColor}
          title="Subtitle color"
          showPickFromPreview
        />
      )}

      {/* Save preset modal */}
      <SavePresetModal
        open={showSavePresetModal}
        presetNameInput={presetNameInput}
        error={error}
        onClose={() => {
          setShowSavePresetModal(false);
          setPresetNameInput("");
          setError(null);
        }}
        onPresetNameInputChange={(value) => {
          setPresetNameInput(value);
          setError(null);
        }}
        onSave={handleSavePreset}
        onErrorChange={setError}
      />
      </>
      )}
    </ToolPageLayout>
  );
}

