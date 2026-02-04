import { useCallback } from "react";
import type { FileWithPreview } from "../../../components/FileUploadZone";
import type { OverlayImage } from "../OverlayImageEditor";
import type { BundleImagePosition } from "../BundleImageRenderer";
import type { AspectRatio, LayoutStyle, CenterMode, CenterShapeId } from "../types";
import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_LAYOUT_STYLE,
  DEFAULT_BACKGROUND_MODE,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_TEXT_SAFE_AREA_PERCENT,
  DEFAULT_IMAGE_SPACING_PERCENT,
  DEFAULT_CENTER_WIDTH_SCALE,
  DEFAULT_CENTER_HEIGHT_SCALE,
  DEFAULT_CENTER_SCALE_LOCKED,
  DEFAULT_CENTER_ROTATION,
  DEFAULT_CENTER_X_OFFSET,
  DEFAULT_CENTER_Y_OFFSET,
  DEFAULT_CENTER_MODE,
  DEFAULT_CENTER_SHAPE,
  DEFAULT_TITLE_TEXT,
  DEFAULT_SUBTITLE_TEXT,
  DEFAULT_TITLE_FONT,
  DEFAULT_SUBTITLE_FONT,
  DEFAULT_TITLE_BOLD,
  DEFAULT_SUBTITLE_BOLD,
  DEFAULT_TITLE_FONT_SIZE,
  DEFAULT_SUBTITLE_FONT_SIZE,
  DEFAULT_TITLE_FONT_SIZE_AUTO,
  DEFAULT_SUBTITLE_FONT_SIZE_AUTO,
  DEFAULT_SHAPE_COLOR,
  DEFAULT_TITLE_COLOR,
  DEFAULT_SUBTITLE_COLOR
} from "../constants/defaults";

export interface UseResetParams {
  setStep: (step: number) => void;
  setFiles: (files: FileWithPreview[]) => void;
  setBackgroundFiles: (files: FileWithPreview[]) => void;
  setCenterFiles: (files: FileWithPreview[]) => void;
  setOverlayImages: (images: OverlayImage[]) => void;
  setCustomBundleImagePositions: (positions: BundleImagePosition[]) => void;
  setContentCropped: (cropped: Record<string, string>) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setLayoutStyle: (style: LayoutStyle) => void;
  setBackgroundMode: (mode: "transparent" | "backgroundImage" | "color") => void;
  setBackgroundColor: (color: string) => void;
  setHexInput: (input: string) => void;
  setTextSafeAreaPercent: (percent: number) => void;
  setImagesPerRow: (count: number | undefined) => void;
  setImageSpacingPercent: (percent: number) => void;
  setCenterWidthScale: (scale: number) => void;
  setCenterHeightScale: (scale: number) => void;
  setCenterScaleLocked: (locked: boolean) => void;
  setCenterRotation: (rotation: number) => void;
  setCenterXOffset: (offset: number) => void;
  setCenterYOffset: (offset: number) => void;
  setError: (error: string | null) => void;
  setShowColorPickerModal: (show: boolean) => void;
  setCenterMode: (mode: CenterMode) => void;
  setCenterShape: (shape: CenterShapeId) => void;
  setTitleText: (text: string) => void;
  setSubtitleText: (text: string) => void;
  setTitleFont: (font: string) => void;
  setSubtitleFont: (font: string) => void;
  setTitleBold: (bold: boolean) => void;
  setSubtitleBold: (bold: boolean) => void;
  setTitleFontSize: (size: number) => void;
  setSubtitleFontSize: (size: number) => void;
  setTitleFontSizeAuto: (auto: boolean) => void;
  setSubtitleFontSizeAuto: (auto: boolean) => void;
  setShapeColor: (color: string) => void;
  setTitleColor: (color: string) => void;
  setSubtitleColor: (color: string) => void;
  setCenterColorPicker: (picker: "shape" | "title" | "subtitle" | null) => void;
  files: FileWithPreview[];
  backgroundFiles: FileWithPreview[];
  centerFiles: FileWithPreview[];
}

export function useReset(params: UseResetParams) {
  const reset = useCallback(() => {
    params.setStep(1);
    // Clear all files
    params.setFiles([]);
    params.setBackgroundFiles([]);
    params.setCenterFiles([]);
    params.setOverlayImages([]);
    params.setCustomBundleImagePositions([]);
    params.setContentCropped({});
    // Reset to default settings
    params.setAspectRatio(DEFAULT_ASPECT_RATIO);
    params.setLayoutStyle(DEFAULT_LAYOUT_STYLE);
    params.setBackgroundMode(DEFAULT_BACKGROUND_MODE);
    params.setBackgroundColor(DEFAULT_BACKGROUND_COLOR);
    params.setHexInput(DEFAULT_BACKGROUND_COLOR);
    params.setTextSafeAreaPercent(DEFAULT_TEXT_SAFE_AREA_PERCENT);
    params.setImagesPerRow(undefined);
    params.setImageSpacingPercent(DEFAULT_IMAGE_SPACING_PERCENT);
    params.setCenterWidthScale(DEFAULT_CENTER_WIDTH_SCALE);
    params.setCenterHeightScale(DEFAULT_CENTER_HEIGHT_SCALE);
    params.setCenterScaleLocked(DEFAULT_CENTER_SCALE_LOCKED);
    params.setCenterRotation(DEFAULT_CENTER_ROTATION);
    params.setCenterXOffset(DEFAULT_CENTER_X_OFFSET);
    params.setCenterYOffset(DEFAULT_CENTER_Y_OFFSET);
    params.setError(null);
    params.setShowColorPickerModal(false);
    params.setCenterMode(DEFAULT_CENTER_MODE);
    params.setCenterShape(DEFAULT_CENTER_SHAPE);
    params.setTitleText(DEFAULT_TITLE_TEXT);
    params.setSubtitleText(DEFAULT_SUBTITLE_TEXT);
    params.setTitleFont(DEFAULT_TITLE_FONT);
    params.setSubtitleFont(DEFAULT_SUBTITLE_FONT);
    params.setTitleBold(DEFAULT_TITLE_BOLD);
    params.setSubtitleBold(DEFAULT_SUBTITLE_BOLD);
    params.setTitleFontSize(DEFAULT_TITLE_FONT_SIZE);
    params.setSubtitleFontSize(DEFAULT_SUBTITLE_FONT_SIZE);
    params.setTitleFontSizeAuto(DEFAULT_TITLE_FONT_SIZE_AUTO);
    params.setSubtitleFontSizeAuto(DEFAULT_SUBTITLE_FONT_SIZE_AUTO);
    params.setShapeColor(DEFAULT_SHAPE_COLOR);
    params.setTitleColor(DEFAULT_TITLE_COLOR);
    params.setSubtitleColor(DEFAULT_SUBTITLE_COLOR);
    params.setCenterColorPicker(null);
    // Revoke object URLs to free memory
    params.files.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
    params.backgroundFiles.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
    params.centerFiles.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
  }, [params]);

  return reset;
}
