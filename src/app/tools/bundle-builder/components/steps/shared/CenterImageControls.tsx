"use client";

import type { FileWithPreview } from "../../../../../components/FileUploadZone";
import FileUploadZone from "../../../../../components/FileUploadZone";

interface CenterImageControlsProps {
  centerFiles: FileWithPreview[];
  onCenterFilesChange: (files: FileWithPreview[]) => void;
  centerWidthScale: number;
  onCenterWidthScaleChange: (scale: number) => void;
  onCenterHeightScaleChange: (scale: number) => void;
  isExporting: boolean;
}

export default function CenterImageControls({
  centerFiles,
  onCenterFilesChange,
  centerWidthScale,
  onCenterWidthScaleChange,
  onCenterHeightScaleChange,
  isExporting
}: CenterImageControlsProps) {
  return (
    <>
      <FileUploadZone
        title="Center image"
        variant="subtle"
        dropPromptText="Drop a center image or click to select"
        files={centerFiles}
        onFilesChange={onCenterFilesChange}
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
      <div>
        <label className="block text-sm font-bold text-brand-white mb-1">Center scale: {Math.round(centerWidthScale * 100)}%</label>
        <input
          type="range"
          min={50}
          max={150}
          step={1}
          value={Math.round(centerWidthScale * 100)}
          onChange={(e) => {
            const newScale = Number(e.target.value) / 100;
            onCenterWidthScaleChange(newScale);
            onCenterHeightScaleChange(newScale);
          }}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>
    </>
  );
}
