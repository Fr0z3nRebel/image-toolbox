"use client";

import { useEffect, useRef, useState } from "react";
import {
  RotateCcw,
  X,
  Save,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Crosshair,
  ArrowLeftRight,
  ArrowUpDown,
  Maximize2
} from "lucide-react";
import ToolPageLayout from "../../components/ToolPageLayout";
import FileUploadZone, { FileWithPreview } from "../../components/FileUploadZone";
import {
  AspectRatio,
  CenterMode,
  CenterShapeId,
  CENTER_TEXT_FONT_SIZE_MIN,
  CENTER_TEXT_FONT_SIZE_MAX,
  ExportFormat,
  LayoutStyle,
  composeListingImage,
  compositeLayers,
  getCanvasDimensions
} from "./index";
import InstantPreview from "./InstantPreview";
import ColorPickerModal from "./ColorPickerModal";
import { CENTER_SHAPES } from "./center-shapes";
import { CENTER_TEXT_FONTS, loadFont } from "./fonts";
import OverlayImageEditor, { type OverlayImage } from "./OverlayImageEditor";
import OverlayImageRenderer from "./OverlayImageRenderer";

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" }
];
const LAYOUT_STYLES: { value: LayoutStyle; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "dividedGrid", label: "Divided Grid" },
  { value: "dividedGrid2", label: "Divided Grid 2" }
];

const FONT_SIZE_PRESETS: number[] = [24, 32, 40, 48, 56, 64, 72, 96, 120];

const WIZARD_STEPS = [
  { num: 1, label: "Setup" },
  { num: 2, label: "Layout" },
  { num: 3, label: "Center" },
  { num: 4, label: "Animation" },
  { num: 5, label: "Export" }
] as const;

interface BundleBuilderPreset {
  name: string;
  aspectRatio: AspectRatio;
  layoutStyle: LayoutStyle;
  backgroundMode: "transparent" | "backgroundImage" | "color";
  backgroundColor: string;
  textSafeAreaPercent: number;
  imagesPerRow: number | undefined;
  imageSpacingPercent?: number;
  centerMode?: CenterMode;
  centerShape?: CenterShapeId;
  centerScale: number;
  centerHeightScale?: number;
  centerScaleLocked?: boolean;
  centerRotation: number;
  centerXOffset: number;
  centerYOffset: number;
  titleText?: string;
  subtitleText?: string;
  titleFont?: string;
  subtitleFont?: string;
  titleBold?: boolean;
  subtitleBold?: boolean;
  titleFontSize?: number;
  subtitleFontSize?: number;
  titleFontSizeAuto?: boolean;
  subtitleFontSizeAuto?: boolean;
  shapeColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  wrapText?: boolean;
}

const PRESET_STORAGE_KEY = "bundle-builder-presets";

function loadPresets(): Record<string, BundleBuilderPreset> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(PRESET_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function savePresets(presets: Record<string, BundleBuilderPreset>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Ignore storage errors
  }
}
function parseHex(s: string): string | null {
  const t = s.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(t)) return "#" + t[0] + t[0] + t[1] + t[1] + t[2] + t[2];
  if (/^[0-9a-fA-F]{6}$/.test(t)) return "#" + t.toLowerCase();
  return null;
}

// Convert RGB to HSL
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h * 360, s, l];
}

// Convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

interface ColorSuggestion {
  color: string;
  label: string;
}

function analyzePreviewColors(previewContainer: HTMLElement): ColorSuggestion[] | null {
  try {
    // Sample colors from images in the preview
    const images = previewContainer.querySelectorAll("img");
    if (images.length === 0) return null;

    // Sample colors from multiple images to get a representative palette
    const sampleSize = Math.min(images.length, 5);
    const colorSamples: Array<{ r: number; g: number; b: number; weight: number }> = [];

    for (let i = 0; i < sampleSize; i++) {
      const img = images[i] as HTMLImageElement;
      try {
        // Check if image is loaded
        if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
          continue;
        }

        const tempCanvas = document.createElement("canvas");
        const maxSize = 200;
        const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight, 1);
        tempCanvas.width = Math.round(img.naturalWidth * scale);
        tempCanvas.height = Math.round(img.naturalHeight * scale);
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) continue;

        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Sample from center area (where the shape would be)
        const centerX = Math.floor(tempCanvas.width * 0.25);
        const centerY = Math.floor(tempCanvas.height * 0.25);
        const sampleWidth = Math.floor(tempCanvas.width * 0.5);
        const sampleHeight = Math.floor(tempCanvas.height * 0.5);
        
        const imageData = tempCtx.getImageData(centerX, centerY, sampleWidth, sampleHeight);
        const data = imageData.data;

        // Sample pixels
        for (let j = 0; j < data.length; j += 32) {
          const r = data[j];
          const g = data[j + 1];
          const b = data[j + 2];
          const a = data[j + 3];
          // Only consider non-transparent and non-white/black pixels
          if (a > 128 && !(r > 250 && g > 250 && b > 250) && !(r < 5 && g < 5 && b < 5)) {
            // Calculate saturation and brightness for weighting
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            
            // Prefer colors that are moderately saturated and not too dark/bright
            // This helps us find the actual color palette, not just grays
            const weight = saturation * (brightness > 50 && brightness < 200 ? 1.2 : 0.8);
            
            colorSamples.push({ r, g, b, weight });
          }
        }
      } catch {
        continue;
      }
    }

    if (colorSamples.length === 0) return null;

    // Find dominant hue by grouping similar hues
    const hueBuckets: Array<{ hue: number; weight: number; count: number }> = [];
    
    for (const sample of colorSamples) {
      const [h, s, l] = rgbToHsl(sample.r, sample.g, sample.b);
      // Only consider colors with some saturation
      if (s < 0.1) continue;
      
      // Find or create bucket for this hue (group similar hues together)
      let found = false;
      for (const bucket of hueBuckets) {
        // Group hues within 30 degrees
        const hueDiff = Math.abs(h - bucket.hue);
        const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
        if (normalizedDiff < 30) {
          bucket.hue = (bucket.hue * bucket.count + h) / (bucket.count + 1);
          bucket.weight += sample.weight;
          bucket.count++;
          found = true;
          break;
        }
      }
      
      if (!found) {
        hueBuckets.push({ hue: h, weight: sample.weight, count: 1 });
      }
    }

    if (hueBuckets.length === 0) return null;

    // Find the dominant hue (highest weighted)
    hueBuckets.sort((a, b) => b.weight - a.weight);
    const dominantHue = hueBuckets[0].hue;

    // Calculate average saturation and lightness from samples
    let totalS = 0;
    let totalL = 0;
    let totalWeight = 0;
    
    for (const sample of colorSamples) {
      const [h, s, l] = rgbToHsl(sample.r, sample.g, sample.b);
      if (s > 0.1) { // Only consider saturated colors
        const hueDiff = Math.abs(h - dominantHue);
        const normalizedDiff = Math.min(hueDiff, 360 - hueDiff);
        if (normalizedDiff < 60) { // Within 60 degrees of dominant hue
          totalS += s * sample.weight;
          totalL += l * sample.weight;
          totalWeight += sample.weight;
        }
      }
    }

    if (totalWeight === 0) return null;

    const avgS = totalS / totalWeight;
    const avgL = totalL / totalWeight;

    const toHex = (n: number) => {
      const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    const suggestions: ColorSuggestion[] = [];

    // Method 1: Analogous color harmony (shift hue by 45 degrees)
    const analogousHue = (dominantHue + 45) % 360;
    const analogousS = Math.min(0.4, avgS);
    const analogousL = Math.max(0.85, Math.min(0.95, avgL));
    const [ar, ag, ab] = hslToRgb(analogousHue, analogousS, analogousL);
    suggestions.push({
      color: `#${toHex(ar)}${toHex(ag)}${toHex(ab)}`,
      label: "Harmonious"
    });

    // Method 2: Triadic color harmony (shift hue by 120 degrees)
    const triadicHue = (dominantHue + 120) % 360;
    const triadicS = Math.min(0.35, avgS * 0.8);
    const triadicL = Math.max(0.88, Math.min(0.95, avgL));
    const [tr, tg, tb] = hslToRgb(triadicHue, triadicS, triadicL);
    suggestions.push({
      color: `#${toHex(tr)}${toHex(tg)}${toHex(tb)}`,
      label: "Vibrant"
    });

    // Method 3: Light tint of dominant color (same hue, lighter and less saturated)
    const tintS = Math.min(0.3, avgS * 0.6);
    const tintL = Math.max(0.9, Math.min(0.96, avgL + 0.1));
    const [tintr, tintg, tintb] = hslToRgb(dominantHue, tintS, tintL);
    suggestions.push({
      color: `#${toHex(tintr)}${toHex(tintg)}${toHex(tintb)}`,
      label: "Soft"
    });

    return suggestions;
  } catch {
    return null;
  }
}

export default function BundleBuilderTool() {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [backgroundFiles, setBackgroundFiles] = useState<FileWithPreview[]>([]);
  const [centerFiles, setCenterFiles] = useState<FileWithPreview[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>("dividedGrid");
  const [backgroundMode, setBackgroundMode] = useState<"transparent" | "backgroundImage" | "color">("transparent");
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [hexInput, setHexInput] = useState<string>("#ffffff");
  const [textSafeAreaPercent, setTextSafeAreaPercent] = useState<number>(20);
  const [imagesPerRow, setImagesPerRow] = useState<number | undefined>(undefined);
  const [imageSpacingPercent, setImageSpacingPercent] = useState<number>(5);
  const [centerWidthScale, setCenterWidthScale] = useState<number>(1);
  const [centerHeightScale, setCenterHeightScale] = useState<number>(1);
  const [centerScaleLocked, setCenterScaleLocked] = useState<boolean>(true);
  const [centerRotation, setCenterRotation] = useState<number>(0);
  const [centerXOffset, setCenterXOffset] = useState<number>(0);
  const [centerYOffset, setCenterYOffset] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);
  const [presets, setPresets] = useState<Record<string, BundleBuilderPreset>>({});
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

  const handleDownload = async (format: ExportFormat) => {
    if (files.length < 2) return;
    setIsExporting(true);
    setError(null);
    let contentUrl: string | null = null;
    try {
      const content = await composeListingImage(files as File[], {
        aspectRatio,
        layoutStyle,
        background: "transparent",
        exportFormat: "png",
        textSafeAreaPercent,
        imagesPerRow: imagesPerRow && imagesPerRow > 0 ? imagesPerRow : undefined,
        imageSpacingPercent,
        centerImageFile: undefined,
        backgroundImageFile: undefined
      });
      contentUrl = content.url;
      const final = await compositeLayers({
        contentUrl: content.url,
        contentWidth: content.canvas.width,
        contentHeight: content.canvas.height,
        centerImageFile: layoutStyle !== "grid" && centerMode === "image" && centerFiles[0] ? (centerFiles[0] as File) : undefined,
        centerMode: layoutStyle !== "grid" ? centerMode : undefined,
        centerShape: centerMode === "text" ? centerShape : undefined,
        titleText: centerMode === "text" ? titleText : undefined,
        subtitleText: centerMode === "text" ? subtitleText : undefined,
        titleFont: centerMode === "text" ? titleFont : undefined,
        subtitleFont: centerMode === "text" ? subtitleFont : undefined,
        titleBold: centerMode === "text" ? titleBold : undefined,
        subtitleBold: centerMode === "text" ? subtitleBold : undefined,
        titleFontSizeAuto: centerMode === "text" ? titleFontSizeAuto : undefined,
        subtitleFontSizeAuto: centerMode === "text" ? subtitleFontSizeAuto : undefined,
        titleFontSize: centerMode === "text" ? titleFontSize : undefined,
        subtitleFontSize: centerMode === "text" ? subtitleFontSize : undefined,
        wrapText: centerMode === "text" ? wrapText : undefined,
        shapeColor: centerMode === "text" ? shapeColor : undefined,
        titleColor: centerMode === "text" ? titleColor : undefined,
        subtitleColor: centerMode === "text" ? subtitleColor : undefined,
        layoutStyle,
        textSafeAreaPercent,
        centerWidthScale,
        centerHeightScale,
        centerRotation,
        centerXOffset,
        centerYOffset,
        backgroundMode,
        backgroundColor: backgroundMode === "color" ? backgroundColor : undefined,
        backgroundImageFile: backgroundMode === "backgroundImage" ? (backgroundFiles[0] as File | undefined) : undefined,
        overlayImages: overlayImages && overlayImages.length > 0 ? overlayImages.map((overlay) => ({
          file: overlay.file as File,
          x: overlay.x,
          y: overlay.y,
          width: overlay.width,
          height: overlay.height,
          rotation: overlay.rotation,
          mirrorHorizontal: overlay.mirrorHorizontal ?? false,
          mirrorVertical: overlay.mirrorVertical ?? false
        })) : [],
        exportFormat: format
      });
      if (contentUrl) URL.revokeObjectURL(contentUrl);
      const link = document.createElement("a");
      link.href = final.url;
      link.download = `bundle-builder-${aspectRatio.replace(":", "x")}-${layoutStyle}-${final.canvas.width}x${final.canvas.height}.${format === "webp" ? "webp" : "png"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(final.url), 100);
    } catch (err) {
      console.error("Export failed:", err);
      setError("Export failed. Please try again.");
      if (contentUrl) URL.revokeObjectURL(contentUrl);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    // Clear all files
    setFiles([]);
    setBackgroundFiles([]);
    setCenterFiles([]);
    setOverlayImages([]);
    // Reset to default settings
    setAspectRatio("1:1");
    setLayoutStyle("dividedGrid");
    setBackgroundMode("transparent");
    setBackgroundColor("#ffffff");
    setHexInput("#ffffff");
    setTextSafeAreaPercent(20);
    setImagesPerRow(undefined);
    setImageSpacingPercent(5);
    setCenterWidthScale(1);
    setCenterHeightScale(1);
    setCenterScaleLocked(true);
    setCenterRotation(0);
    setCenterXOffset(0);
    setCenterYOffset(0);
    setError(null);
    setShowColorPickerModal(false);
    setCenterMode("text");
    setCenterShape("roundedRect");
    setTitleText("Clipart Bundle");
    setSubtitleText("20 PNGs | Transparent | Commercial Use | 300 DPI");
    setTitleFont(CENTER_TEXT_FONTS[0]?.id ?? "Open Sans");
    setSubtitleFont(CENTER_TEXT_FONTS[0]?.id ?? "Open Sans");
    setTitleBold(false);
    setSubtitleBold(false);
    setTitleFontSize(48);
    setSubtitleFontSize(28);
    setTitleFontSizeAuto(false);
    setSubtitleFontSizeAuto(false);
    setShapeColor("#fef3c7");
    setTitleColor("#1f2937");
    setSubtitleColor("#4b5563");
    setCenterColorPicker(null);
    // Revoke object URLs to free memory
    files.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
    backgroundFiles.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
    centerFiles.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
  };

  // Load presets from localStorage on mount
  useEffect(() => {
    setPresets(loadPresets());
  }, []);

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
    const updatedPresets = { ...presets, [presetNameInput.trim()]: newPreset };
    setPresets(updatedPresets);
    savePresets(updatedPresets);
    setPresetNameInput("");
    setShowSavePresetModal(false);
    setError(null);
  };

  const handleLoadPreset = (presetName: string) => {
    const preset = presets[presetName];
    if (!preset) return;
    setAspectRatio(preset.aspectRatio);
    setLayoutStyle(preset.layoutStyle);
    setBackgroundMode(preset.backgroundMode);
    setBackgroundColor(preset.backgroundColor);
    setHexInput(preset.backgroundColor);
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
    const updatedPresets = { ...presets };
    delete updatedPresets[presetName];
    setPresets(updatedPresets);
    savePresets(updatedPresets);
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

  const backgroundLabel = backgroundMode === "transparent" ? "Transparent" : backgroundMode === "backgroundImage" ? "Background image" : backgroundColor;
  const settingsSummary = `Aspect ratio: ${aspectRatio} · Layout: ${
    LAYOUT_STYLES.find((l) => l.value === layoutStyle)?.label ?? layoutStyle
  } · Background: ${backgroundLabel} · Text area: ${textSafeAreaPercent}%`;

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
      <div className="space-y-4">
        <div className="space-y-2 pb-4 border-b border-gray-200">
          <label className="block text-sm font-bold text-gray-700 mb-2">Presets</label>
          <div className="flex gap-2">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  handleLoadPreset(e.target.value);
                  e.target.value = "";
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm"
            >
              <option value="">Load preset...</option>
              {Object.keys(presets).map((name) => (
                <option key={name} value={name}>
                  {presets[name].name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowSavePresetModal(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-sm font-medium"
              title="Save current settings as preset"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          </div>
          {Object.keys(presets).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.keys(presets).map((name) => (
                <div key={name} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 rounded-lg text-sm">
                  <span className="text-gray-700">{name}</span>
                  <button type="button" onClick={() => handleDeletePreset(name)} className="text-gray-500 hover:text-red-600 transition-colors" title="Delete preset">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <FileUploadZone
          title="Bundle Images"
          variant="subtleWhite"
          dropPromptText="Drop images or click"
          files={files}
          onFilesChange={setFiles}
          disabled={isExporting}
          actionButton={actionButton}
          acceptedFileTypes="image/*"
          supportedFormatsText=""
          maxDisplayHeight="max-h-48"
          showThumbnails={true}
          fileListColumns={2}
          compactDropZone={true}
        />
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Aspect ratio</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm"
          >
            {ASPECT_RATIOS.map((ratio) => (
              <option key={ratio.value} value={ratio.value}>
                {ratio.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    ) : step === 2 ? (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Layout style</label>
          <select
            value={layoutStyle}
            onChange={(e) => setLayoutStyle(e.target.value as LayoutStyle)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm"
          >
            {LAYOUT_STYLES.map((layout) => (
              <option key={layout.value} value={layout.value}>
                {layout.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Images per row</label>
          <p className="text-xs text-gray-500 mb-2">Leave empty for automatic layout.</p>
          <input
            type="number"
            min={1}
            max={files.length}
            value={imagesPerRow ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              setImagesPerRow(value === "" ? undefined : Math.max(1, Math.min(files.length, Number(value))));
            }}
            placeholder="Auto"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Image padding: {imageSpacingPercent}%</label>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={imageSpacingPercent}
            onChange={(e) => setImageSpacingPercent(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Background</label>
          <div className="flex gap-2 items-center flex-wrap">
            <button
              type="button"
              onClick={() => setBackgroundMode("transparent")}
              className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${backgroundMode === "transparent" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"}`}
            >
              Transparent
            </button>
            <button
              type="button"
              onClick={() => setBackgroundMode("backgroundImage")}
              className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${backgroundMode === "backgroundImage" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"}`}
            >
              Background image
            </button>
            <button
              type="button"
              onClick={() => {
                setBackgroundMode("color");
                setHexInput(backgroundColor);
                setShowColorPickerModal(true);
              }}
              className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${backgroundMode === "color" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"}`}
            >
              <span className="inline-block h-4 w-4 rounded border border-gray-300" style={{ backgroundColor }} aria-hidden="true" />
              Color
            </button>
          </div>
          {backgroundMode === "backgroundImage" && (
            <div className="mt-3">
              <FileUploadZone
                title="Background image"
                variant="subtle"
                dropPromptText="Drop a background image or click to select"
                files={backgroundFiles}
                onFilesChange={setBackgroundFiles}
                disabled={isExporting}
                actionButton={null}
                acceptedFileTypes="image/*"
                supportedFormatsText=""
                maxDisplayHeight="max-h-24"
                multiple={false}
                maxFiles={1}
                showFileSize={false}
                compactDropZone={true}
              />
            </div>
          )}
        </div>
      </div>
    ) : step === 3 ? (
      <div className="space-y-4">
        {layoutStyle === "grid" ? (
          <p className="text-sm text-gray-600">Center options are for divided layouts only. Use Back to change the layout style, or continue to the next step.</p>
        ) : (
          <>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Center content</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCenterMode("text")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${centerMode === "text" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"}`}
                >
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => setCenterMode("image")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${centerMode === "image" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"}`}
                >
                  Image
                </button>
              </div>
            </div>
            {centerMode === "image" ? (
              <FileUploadZone
                title="Center image"
                variant="subtle"
                dropPromptText="Drop a center image or click to select"
                files={centerFiles}
                onFilesChange={setCenterFiles}
                disabled={isExporting}
                actionButton={null}
                acceptedFileTypes="image/*"
                supportedFormatsText=""
                maxDisplayHeight="max-h-24"
                multiple={false}
                maxFiles={1}
                showFileSize={false}
                compactDropZone={true}
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Shape</label>
                  <div className="flex gap-3 items-center">
                    <select
                      value={centerShape}
                      onChange={(e) => setCenterShape(e.target.value as CenterShapeId)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm"
                    >
                      {CENTER_SHAPES.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setCenterColorPicker("shape")}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      <span
                        className="inline-block h-4 w-4 rounded border border-gray-300"
                        style={{ backgroundColor: shapeColor }}
                        aria-hidden
                      />
                      <span>Shape color</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={titleText}
                    onChange={(e) => setTitleText(e.target.value)}
                    placeholder="Title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                  <div className="flex gap-2 mt-2">
                    <select
                      value={titleFont}
                      onChange={(e) => setTitleFont(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm"
                    >
                      {CENTER_TEXT_FONTS.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1.5 px-2 py-2 border border-gray-300 rounded-lg bg-white">
                      <input
                        id="bundle-builder-title-bold"
                        type="checkbox"
                        checked={titleBold}
                        onChange={(e) => setTitleBold(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="bundle-builder-title-bold" className="text-sm text-gray-700 cursor-pointer">
                        Bold
                      </label>
                    </div>
                    <select
                      value={titleFontSizeAuto ? "auto" : String(titleFontSize)}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "auto") {
                          setTitleFontSizeAuto(true);
                          return;
                        }
                        setTitleFontSizeAuto(false);
                        const size = Number(v);
                        if (!Number.isNaN(size)) {
                          const clamped = Math.min(
                            CENTER_TEXT_FONT_SIZE_MAX,
                            Math.max(CENTER_TEXT_FONT_SIZE_MIN, size)
                          );
                          setTitleFontSize(clamped);
                        }
                      }}
                      className="w-28 px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                      aria-label="Title font size"
                    >
                      <option value="auto">Auto</option>
                      {FONT_SIZE_PRESETS.map((size) => (
                        <option key={size} value={size}>{size}px</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCenterColorPicker("title")}
                    className="mt-1 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <span className="inline-block h-4 w-4 rounded border border-gray-300" style={{ backgroundColor: titleColor }} aria-hidden />
                    Title color
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Subtitle</label>
                  <input
                    type="text"
                    value={subtitleText}
                    onChange={(e) => setSubtitleText(e.target.value)}
                    placeholder="Subtitle"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm"
                  />
                  <div className="flex gap-2 mt-2">
                    <select
                      value={subtitleFont}
                      onChange={(e) => setSubtitleFont(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm"
                    >
                      {CENTER_TEXT_FONTS.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1.5 px-2 py-2 border border-gray-300 rounded-lg bg-white">
                      <input
                        id="bundle-builder-subtitle-bold"
                        type="checkbox"
                        checked={subtitleBold}
                        onChange={(e) => setSubtitleBold(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="bundle-builder-subtitle-bold" className="text-sm text-gray-700 cursor-pointer">
                        Bold
                      </label>
                    </div>
                    <select
                      value={subtitleFontSizeAuto ? "auto" : String(subtitleFontSize)}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "auto") {
                          setSubtitleFontSizeAuto(true);
                          return;
                        }
                        setSubtitleFontSizeAuto(false);
                        const size = Number(v);
                        if (!Number.isNaN(size)) {
                          const clamped = Math.min(
                            CENTER_TEXT_FONT_SIZE_MAX,
                            Math.max(CENTER_TEXT_FONT_SIZE_MIN, size)
                          );
                          setSubtitleFontSize(clamped);
                        }
                      }}
                      className="w-28 px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                      aria-label="Subtitle font size"
                    >
                      <option value="auto">Auto</option>
                      {FONT_SIZE_PRESETS.map((size) => (
                        <option key={size} value={size}>{size}px</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCenterColorPicker("subtitle")}
                    className="mt-1 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <span className="inline-block h-4 w-4 rounded border border-gray-300" style={{ backgroundColor: subtitleColor }} aria-hidden />
                    Subtitle color
                  </button>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="bundle-builder-wrap-text"
                    type="checkbox"
                    checked={wrapText}
                    onChange={(e) => setWrapText(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="bundle-builder-wrap-text" className="text-sm text-gray-700">
                    Wrap text
                  </label>
                </div>
              </div>
            )}
            <div className="flex flex-col md:flex-row md:items-start md:gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Maximize2 className="h-4 w-4 text-gray-500" aria-hidden="true" />
                  <span>Size: {textSafeAreaPercent}%</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={40}
                  step={5}
                  value={textSafeAreaPercent}
                  onChange={(e) => setTextSafeAreaPercent(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              <div className="flex-1 mt-4 md:mt-0">
                <div className="flex items-center gap-2 mb-1">
                  <label className="block text-sm font-bold text-gray-700 flex-1 flex items-center gap-1.5">
                    <RotateCcw className="h-4 w-4 text-gray-500" aria-hidden="true" />
                    <span>Rotation: {centerRotation}°</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCenterRotation(0)}
                    className="px-2 py-1 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label="Reset rotation to 0°"
                  >
                    Reset
                  </button>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={1}
                  value={centerRotation}
                  onChange={(e) => setCenterRotation(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>
            {centerMode === "text" ? (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-bold text-gray-700 flex-1 flex items-center gap-1.5">
                      <ArrowLeftRight className="h-4 w-4 text-gray-500" aria-hidden="true" />
                      <span>Width: {Math.round(centerWidthScale * 100)}%</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCenterScaleLocked(!centerScaleLocked)}
                      className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                      aria-label={centerScaleLocked ? "Unlock width and height" : "Lock width and height"}
                    >
                      {centerScaleLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </button>
                    <label className="block text-sm font-bold text-gray-700 flex-1 text-right flex items-center justify-end gap-1.5">
                      <ArrowUpDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
                      <span>Height: {Math.round(centerHeightScale * 100)}%</span>
                    </label>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range"
                      min={50}
                      max={150}
                      step={1}
                      value={Math.round(centerWidthScale * 100)}
                      onChange={(e) => {
                        const newWidth = Number(e.target.value) / 100;
                        setCenterWidthScale(newWidth);
                        if (centerScaleLocked) {
                          setCenterHeightScale(newWidth);
                        }
                      }}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <input
                      type="range"
                      min={50}
                      max={150}
                      step={1}
                      value={Math.round(centerHeightScale * 100)}
                      onChange={(e) => {
                        const newHeight = Number(e.target.value) / 100;
                        setCenterHeightScale(newHeight);
                        if (centerScaleLocked) {
                          setCenterWidthScale(newHeight);
                        }
                      }}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Center scale: {Math.round(centerWidthScale * 100)}%</label>
                <input
                  type="range"
                  min={50}
                  max={150}
                  step={1}
                  value={Math.round(centerWidthScale * 100)}
                  onChange={(e) => {
                    const newScale = Number(e.target.value) / 100;
                    setCenterWidthScale(newScale);
                    setCenterHeightScale(newScale);
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-sm font-bold text-gray-700 flex-1 flex items-center gap-1.5">
                  <ArrowLeftRight className="h-4 w-4 text-gray-500" aria-hidden="true" />
                  <span>Position: {centerXOffset}%</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setCenterXOffset(0);
                    setCenterYOffset(0);
                  }}
                  className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-center justify-center"
                  aria-label="Center position"
                >
                  <Crosshair className="h-4 w-4" />
                </button>
                <label className="block text-sm font-bold text-gray-700 flex-1 text-right flex items-center justify-end gap-1.5">
                  <ArrowUpDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
                  <span>Position: {centerYOffset}%</span>
                </label>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={1}
                  value={centerXOffset}
                  onChange={(e) => setCenterXOffset(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={1}
                  value={centerYOffset}
                  onChange={(e) => setCenterYOffset(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>
          </>
        )}
      </div>
    ) : step === 4 ? (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Animation options coming soon.</p>
      </div>
    ) : (
      <div className="space-y-4">
        <div className="text-sm text-gray-700">
          <span className="font-medium">Current settings:</span> <span>{settingsSummary}</span>
        </div>
        <div className="text-sm text-gray-500">
          Output size: <span className="font-medium">{previewWidth} × {previewHeight} px</span>
        </div>
        <OverlayImageEditor
          overlayImages={overlayImages}
          onOverlayImagesChange={setOverlayImages}
          aspectRatio={aspectRatio}
          previewContainerRef={previewContainerRef}
        />
        <div className="flex gap-2">
          <button
            onClick={() => handleDownload("png")}
            disabled={files.length < 2 || isExporting}
            className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            {isExporting ? "Preparing…" : "Download PNG"}
          </button>
          <button
            onClick={() => handleDownload("webp")}
            disabled={files.length < 2 || isExporting}
            className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            {isExporting ? "Preparing…" : "Download WebP"}
          </button>
        </div>
        {files.length < 2 && <p className="text-xs text-gray-500">Add at least 2 bundle images to export</p>}
        <p className="text-xs text-gray-400">Tip: Use this as your primary bundle image to showcase what&apos;s inside larger digital product bundles or printable sets.</p>
      </div>
    );

  return (
    <ToolPageLayout
      title="Bundle Builder"
      description="Arrange multiple previews into a single, text-ready bundle cover image for your digital products."
      showBackButton={true}
    >
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
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              ) : null}
              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
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
                style={aspectRatioStyle}
              >
                {files.length >= 2 ? (
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
                  />
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent"
          onClick={() => setShowColorPickerModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Pick background color"
        >
          <div
            className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Background color</h3>
              <button
                type="button"
                onClick={() => setShowColorPickerModal(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => {
                  const v = e.target.value;
                  setBackgroundColor(v);
                  setHexInput(v);
                }}
                className="h-12 w-14 shrink-0 p-1 border border-gray-300 rounded-lg cursor-pointer"
                aria-label="Pick color"
              />
              <input
                type="text"
                value={hexInput}
                onChange={(e) => {
                  const r = e.target.value;
                  setHexInput(r);
                  const p = parseHex(r);
                  if (p) setBackgroundColor(p);
                }}
                onBlur={() => {
                  const p = parseHex(hexInput);
                  if (p) setHexInput(p);
                  else setHexInput(backgroundColor);
                }}
                placeholder="#ffffff"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono text-gray-900"
                aria-label="Hex color"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowColorPickerModal(false)}
              className="w-full py-2.5 px-4 rounded-lg bg-gray-100 text-gray-800 font-medium hover:bg-gray-200 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
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
      {showSavePresetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => {
            setShowSavePresetModal(false);
            setPresetNameInput("");
            setError(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Save preset"
        >
          <div
            className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Save Preset</h3>
              <button
                type="button"
                onClick={() => {
                  setShowSavePresetModal(false);
                  setPresetNameInput("");
                  setError(null);
                }}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Preset name
              </label>
              <input
                type="text"
                value={presetNameInput}
                onChange={(e) => {
                  setPresetNameInput(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSavePreset();
                  }
                }}
                placeholder="Enter preset name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSavePresetModal(false);
                  setPresetNameInput("");
                  setError(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-lg bg-gray-100 text-gray-800 font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePreset}
                className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}

