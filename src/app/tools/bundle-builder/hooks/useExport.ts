import { useState } from "react";
import type { FileWithPreview } from "../../../components/FileUploadZone";
import type { AspectRatio, LayoutStyle, CenterMode, CenterShapeId, ExportFormat } from "../types";
import type { OverlayImage } from "../OverlayImageEditor";
import type { BundleImagePosition } from "../BundleImageRenderer";
import { composeListingImage, compositeLayers } from "../composition";

export interface UseExportParams {
  files: FileWithPreview[];
  centerFiles: FileWithPreview[];
  backgroundFiles: FileWithPreview[];
  overlayImages: OverlayImage[];
  customBundleImagePositions: BundleImagePosition[];
  aspectRatio: AspectRatio;
  layoutStyle: LayoutStyle;
  backgroundMode: "transparent" | "backgroundImage" | "color";
  backgroundColor: string;
  textSafeAreaPercent: number;
  imagesPerRow: number | undefined;
  imageSpacingPercent: number;
  centerMode: CenterMode;
  centerShape: CenterShapeId;
  titleText: string;
  subtitleText: string;
  titleFont: string;
  subtitleFont: string;
  titleBold: boolean;
  subtitleBold: boolean;
  titleFontSize: number;
  subtitleFontSize: number;
  titleFontSizeAuto: boolean;
  subtitleFontSizeAuto: boolean;
  shapeColor: string;
  titleColor: string;
  subtitleColor: string;
  wrapText: boolean;
  centerWidthScale: number;
  centerHeightScale: number;
  centerRotation: number;
  centerXOffset: number;
  centerYOffset: number;
}

export interface UseExportReturn {
  isExporting: boolean;
  error: string | null;
  exportImage: (format: ExportFormat) => Promise<void>;
  setError: (error: string | null) => void;
}

export function useExport(params: UseExportParams): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportImage = async (format: ExportFormat) => {
    if (params.files.length < 2) return;
    setIsExporting(true);
    setError(null);
    let contentUrl: string | null = null;
    try {
      // Ensure we're passing actual File instances (FileWithPreview extends File)
      const fileInstances = params.files.map(f => {
        // If the file is already a File instance (which FileWithPreview is), use it directly
        // Otherwise, extract the underlying File if needed
        return f instanceof File ? f : f;
      });
      const content = await composeListingImage(fileInstances, {
        aspectRatio: params.aspectRatio,
        layoutStyle: params.layoutStyle,
        background: "transparent",
        exportFormat: "png",
        textSafeAreaPercent: params.textSafeAreaPercent,
        imagesPerRow: params.imagesPerRow && params.imagesPerRow > 0 ? params.imagesPerRow : undefined,
        imageSpacingPercent: params.imageSpacingPercent,
        centerImageFile: undefined,
        backgroundImageFile: undefined,
        customImagePositions: params.layoutStyle === "custom" ? params.customBundleImagePositions.map((pos) => ({
          fileId: pos.fileId,
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          rotation: pos.rotation,
          mirrorHorizontal: pos.mirrorHorizontal,
          mirrorVertical: pos.mirrorVertical
        })) : undefined
      });
      contentUrl = content.url;
      const final = await compositeLayers({
        contentUrl: content.url,
        contentWidth: content.canvas.width,
        contentHeight: content.canvas.height,
        centerImageFile: params.layoutStyle !== "grid" && params.centerMode === "image" && params.centerFiles[0] ? (params.centerFiles[0] as File) : undefined,
        centerMode: params.layoutStyle !== "grid" ? params.centerMode : undefined,
        centerShape: params.centerMode === "text" ? params.centerShape : undefined,
        titleText: params.centerMode === "text" ? params.titleText : undefined,
        subtitleText: params.centerMode === "text" ? params.subtitleText : undefined,
        titleFont: params.centerMode === "text" ? params.titleFont : undefined,
        subtitleFont: params.centerMode === "text" ? params.subtitleFont : undefined,
        titleBold: params.centerMode === "text" ? params.titleBold : undefined,
        subtitleBold: params.centerMode === "text" ? params.subtitleBold : undefined,
        titleFontSizeAuto: params.centerMode === "text" ? params.titleFontSizeAuto : undefined,
        subtitleFontSizeAuto: params.centerMode === "text" ? params.subtitleFontSizeAuto : undefined,
        titleFontSize: params.centerMode === "text" ? params.titleFontSize : undefined,
        subtitleFontSize: params.centerMode === "text" ? params.subtitleFontSize : undefined,
        wrapText: params.centerMode === "text" ? params.wrapText : undefined,
        shapeColor: params.centerMode === "text" ? params.shapeColor : undefined,
        titleColor: params.centerMode === "text" ? params.titleColor : undefined,
        subtitleColor: params.centerMode === "text" ? params.subtitleColor : undefined,
        layoutStyle: params.layoutStyle,
        textSafeAreaPercent: params.textSafeAreaPercent,
        centerWidthScale: params.centerWidthScale,
        centerHeightScale: params.centerHeightScale,
        centerRotation: params.centerRotation,
        centerXOffset: params.centerXOffset,
        centerYOffset: params.centerYOffset,
        backgroundMode: params.backgroundMode,
        backgroundColor: params.backgroundMode === "color" ? params.backgroundColor : undefined,
        backgroundImageFile: params.backgroundMode === "backgroundImage" ? (params.backgroundFiles[0] as File | undefined) : undefined,
        overlayImages: params.overlayImages && params.overlayImages.length > 0 ? params.overlayImages.map((overlay) => ({
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
      link.download = `bundle-builder-${params.aspectRatio.replace(":", "x")}-${params.layoutStyle}-${final.canvas.width}x${final.canvas.height}.${format === "webp" ? "webp" : "png"}`;
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

  return {
    isExporting,
    error,
    exportImage,
    setError
  };
}
