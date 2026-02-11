"use client";

import type { FileWithPreview } from "../../../../components/FileUploadZone";
import FileUploadZone from "../../../../components/FileUploadZone";
import type { AspectRatio } from "../../types";
import { ASPECT_RATIOS } from "../../constants/aspectRatios";
import PresetManager from "./shared/PresetManager";
import type { BundleBuilderPreset } from "../../types/presets";

interface Step1SetupProps {
  files: FileWithPreview[];
  onFilesChange: (files: FileWithPreview[]) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: string) => void;
  presets: Record<string, BundleBuilderPreset>;
  onLoadPreset: (presetName: string) => void;
  onDeletePreset: (presetName: string) => void;
  onShowSaveModal: () => void;
  isExporting: boolean;
  actionButton: React.ReactNode;
  processingProgress?: { processed: number; total: number };
  contentCropped?: Record<string, string>; // Track which files have been processed
}

export default function Step1Setup({
  files,
  onFilesChange,
  aspectRatio,
  onAspectRatioChange,
  presets,
  onLoadPreset,
  onDeletePreset,
  onShowSaveModal,
  isExporting,
  actionButton,
  processingProgress,
  contentCropped
}: Step1SetupProps) {
  const isProcessing = Boolean(
    processingProgress && 
    processingProgress.processed < processingProgress.total
  );
  const progressPercent = processingProgress && processingProgress.total > 0
    ? (processingProgress.processed / processingProgress.total) * 100
    : 0;
  
  // Create a Set of processed file IDs for efficient lookup
  const processedFileIds = contentCropped ? new Set(Object.keys(contentCropped)) : undefined;
  
  // Determine if we should fade all images (when processing is active)
  // Fade ALL images if we have files and processing is not complete
  const shouldFadeAll = files.length > 0 && isProcessing;

  return (
    <div className="space-y-4">
      <PresetManager
        presets={presets}
        onLoadPreset={onLoadPreset}
        onDeletePreset={onDeletePreset}
        onShowSaveModal={onShowSaveModal}
      />
      <FileUploadZone
        title="Bundle Images"
        variant="subtleWhite"
        dropPromptText="Drop images or click"
        files={files}
        onFilesChange={onFilesChange}
        disabled={isExporting}
        actionButton={actionButton}
        acceptedFileTypes="image/*"
        supportedFormatsText=""
        maxDisplayHeight="max-h-48"
        showThumbnails={true}
        fileListColumns={2}
        compactDropZone={true}
        processedFileIds={isProcessing ? processedFileIds : undefined}
        fadeAll={shouldFadeAll}
      />
      {isProcessing && processingProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-brand-white font-medium">
              Processing images...
            </span>
            <span className="text-brand-white/90">
              {processingProgress.processed} of {processingProgress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
      <div>
        <label className="block text-sm font-bold text-brand-white mb-2">Aspect ratio</label>
        <select
          value={aspectRatio}
          onChange={(e) => onAspectRatioChange(e.target.value as AspectRatio)}
          className="w-full px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal text-sm accent-brand-orange"
        >
          {ASPECT_RATIOS.map((ratio) => (
            <option key={ratio.value} value={ratio.value}>
              {ratio.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
