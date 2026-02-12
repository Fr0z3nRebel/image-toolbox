"use client";

import type { CenterMode, CenterShapeId } from "../../types";
import { CENTER_SHAPES } from "../../center-shapes";
import CenterTextControls from "./shared/CenterTextControls";
import CenterImageControls from "./shared/CenterImageControls";
import CenterTransformControls from "./shared/CenterTransformControls";
import type { FileWithPreview } from "../../../../components/FileUploadZone";
import ThemedSelect from "../../../../components/ThemedSelect";

interface Step3CenterProps {
  layoutStyle: string;
  centerMode: CenterMode;
  centerShape: CenterShapeId;
  shapeColor: string;
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
  titleColor: string;
  subtitleColor: string;
  wrapText: boolean;
  centerFiles: FileWithPreview[];
  textSafeAreaPercent: number;
  centerRotation: number;
  centerWidthScale: number;
  centerHeightScale: number;
  centerScaleLocked: boolean;
  centerXOffset: number;
  centerYOffset: number;
  onCenterModeChange: (mode: CenterMode) => void;
  onCenterShapeChange: (shape: CenterShapeId) => void;
  onShapeColorClick: () => void;
  onTitleTextChange: (text: string) => void;
  onSubtitleTextChange: (text: string) => void;
  onTitleFontChange: (font: string) => void;
  onSubtitleFontChange: (font: string) => void;
  onTitleBoldChange: (bold: boolean) => void;
  onSubtitleBoldChange: (bold: boolean) => void;
  onTitleFontSizeChange: (size: number) => void;
  onSubtitleFontSizeChange: (size: number) => void;
  onTitleFontSizeAutoChange: (auto: boolean) => void;
  onSubtitleFontSizeAutoChange: (auto: boolean) => void;
  onTitleColorClick: () => void;
  onSubtitleColorClick: () => void;
  onWrapTextChange: (wrap: boolean) => void;
  onCenterFilesChange: (files: FileWithPreview[]) => void;
  onTextSafeAreaPercentChange: (percent: number) => void;
  onCenterRotationChange: (rotation: number) => void;
  onCenterWidthScaleChange: (scale: number) => void;
  onCenterHeightScaleChange: (scale: number) => void;
  onCenterScaleLockedChange: (locked: boolean) => void;
  onCenterXOffsetChange: (offset: number) => void;
  onCenterYOffsetChange: (offset: number) => void;
  isExporting: boolean;
}

export default function Step3Center({
  layoutStyle,
  centerMode,
  centerShape,
  shapeColor,
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
  titleColor,
  subtitleColor,
  wrapText,
  centerFiles,
  textSafeAreaPercent,
  centerRotation,
  centerWidthScale,
  centerHeightScale,
  centerScaleLocked,
  centerXOffset,
  centerYOffset,
  onCenterModeChange,
  onCenterShapeChange,
  onShapeColorClick,
  onTitleTextChange,
  onSubtitleTextChange,
  onTitleFontChange,
  onSubtitleFontChange,
  onTitleBoldChange,
  onSubtitleBoldChange,
  onTitleFontSizeChange,
  onSubtitleFontSizeChange,
  onTitleFontSizeAutoChange,
  onSubtitleFontSizeAutoChange,
  onTitleColorClick,
  onSubtitleColorClick,
  onWrapTextChange,
  onCenterFilesChange,
  onTextSafeAreaPercentChange,
  onCenterRotationChange,
  onCenterWidthScaleChange,
  onCenterHeightScaleChange,
  onCenterScaleLockedChange,
  onCenterXOffsetChange,
  onCenterYOffsetChange,
  isExporting
}: Step3CenterProps) {
  if (layoutStyle === "grid") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-brand-white/90">Center options are for divided layouts only. Use Back to change the layout style, or continue to the next step.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-brand-white mb-2">Center content</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onCenterModeChange("text")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${centerMode === "text" ? "border-brand-orange bg-brand-orange/20 text-brand-orange" : "border-brand-grey bg-brand-charcoal text-brand-white hover:border-brand-500/50"}`}
          >
            Text
          </button>
          <button
            type="button"
            onClick={() => onCenterModeChange("image")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${centerMode === "image" ? "border-brand-orange bg-brand-orange/20 text-brand-orange" : "border-brand-grey bg-brand-charcoal text-brand-white hover:border-brand-500/50"}`}
          >
            Image
          </button>
        </div>
      </div>
      {centerMode === "image" ? (
        <CenterImageControls
          centerFiles={centerFiles}
          onCenterFilesChange={onCenterFilesChange}
          centerWidthScale={centerWidthScale}
          onCenterWidthScaleChange={onCenterWidthScaleChange}
          onCenterHeightScaleChange={onCenterHeightScaleChange}
          isExporting={isExporting}
        />
      ) : (
        <>
          <div>
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <ThemedSelect
                  label="Shape"
                  value={centerShape}
                  options={CENTER_SHAPES.map((s) => ({ value: s.id, label: s.label }))}
                  onChange={(v) => onCenterShapeChange(v as CenterShapeId)}
                  className="text-sm"
                />
              </div>
              <button
                type="button"
                onClick={onShapeColorClick}
                className="flex items-center gap-2 text-sm text-brand-white/90 hover:text-brand-white"
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
          <CenterTextControls
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
            onTitleTextChange={onTitleTextChange}
            onSubtitleTextChange={onSubtitleTextChange}
            onTitleFontChange={onTitleFontChange}
            onSubtitleFontChange={onSubtitleFontChange}
            onTitleBoldChange={onTitleBoldChange}
            onSubtitleBoldChange={onSubtitleBoldChange}
            onTitleFontSizeChange={onTitleFontSizeChange}
            onSubtitleFontSizeChange={onSubtitleFontSizeChange}
            onTitleFontSizeAutoChange={onTitleFontSizeAutoChange}
            onSubtitleFontSizeAutoChange={onSubtitleFontSizeAutoChange}
            onTitleColorClick={onTitleColorClick}
            onSubtitleColorClick={onSubtitleColorClick}
            onWrapTextChange={onWrapTextChange}
          />
        </>
      )}
      <CenterTransformControls
        textSafeAreaPercent={textSafeAreaPercent}
        centerRotation={centerRotation}
        centerWidthScale={centerWidthScale}
        centerHeightScale={centerHeightScale}
        centerScaleLocked={centerScaleLocked}
        centerXOffset={centerXOffset}
        centerYOffset={centerYOffset}
        centerMode={centerMode}
        onTextSafeAreaPercentChange={onTextSafeAreaPercentChange}
        onCenterRotationChange={onCenterRotationChange}
        onCenterWidthScaleChange={onCenterWidthScaleChange}
        onCenterHeightScaleChange={onCenterHeightScaleChange}
        onCenterScaleLockedChange={onCenterScaleLockedChange}
        onCenterXOffsetChange={onCenterXOffsetChange}
        onCenterYOffsetChange={onCenterYOffsetChange}
      />
    </div>
  );
}
