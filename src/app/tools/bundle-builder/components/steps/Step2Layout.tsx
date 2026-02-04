"use client";

import type { LayoutStyle } from "../../types";
import { LAYOUT_STYLES } from "../../constants/layoutStyles";
import BackgroundSelector from "./shared/BackgroundSelector";
import type { FileWithPreview } from "../../../../components/FileUploadZone";

interface Step2LayoutProps {
  layoutStyle: LayoutStyle;
  onLayoutStyleChange: (style: string) => void;
  imagesPerRow: number | undefined;
  onImagesPerRowChange: (count: number | undefined) => void;
  imageSpacingPercent: number;
  onImageSpacingPercentChange: (percent: number) => void;
  backgroundMode: "transparent" | "backgroundImage" | "color";
  backgroundColor: string;
  backgroundFiles: FileWithPreview[];
  onBackgroundModeChange: (mode: "transparent" | "backgroundImage" | "color") => void;
  onBackgroundFilesChange: (files: FileWithPreview[]) => void;
  onShowColorPicker: () => void;
  files: FileWithPreview[];
  onCustomPositionsReset: () => void;
  isExporting: boolean;
}

export default function Step2Layout({
  layoutStyle,
  onLayoutStyleChange,
  imagesPerRow,
  onImagesPerRowChange,
  imageSpacingPercent,
  onImageSpacingPercentChange,
  backgroundMode,
  backgroundColor,
  backgroundFiles,
  onBackgroundModeChange,
  onBackgroundFilesChange,
  onShowColorPicker,
  files,
  onCustomPositionsReset: _onCustomPositionsReset,
  isExporting
}: Step2LayoutProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Layout style</label>
        <select
          value={layoutStyle}
          onChange={(e) => {
            onLayoutStyleChange(e.target.value);
          }}
          disabled={layoutStyle === "custom"}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {LAYOUT_STYLES.map((layout) => (
            <option key={layout.value} value={layout.value}>
              {layout.label}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
        {layoutStyle === "custom" && (
          <p className="text-xs text-gray-500 mt-1">Drag images in the preview to reposition them.</p>
        )}
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
            onImagesPerRowChange(value === "" ? undefined : Math.max(1, Math.min(files.length, Number(value))));
          }}
          placeholder="Auto"
          disabled={layoutStyle === "custom"}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
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
          onChange={(e) => onImageSpacingPercentChange(Number(e.target.value))}
          disabled={layoutStyle === "custom"}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
      <BackgroundSelector
        backgroundMode={backgroundMode}
        backgroundColor={backgroundColor}
        backgroundFiles={backgroundFiles}
        onBackgroundModeChange={onBackgroundModeChange}
        onBackgroundFilesChange={onBackgroundFilesChange}
        onShowColorPicker={onShowColorPicker}
        isExporting={isExporting}
      />
    </div>
  );
}
