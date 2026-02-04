"use client";

import type { FileWithPreview } from "../../../../../components/FileUploadZone";
import FileUploadZone from "../../../../../components/FileUploadZone";

interface BackgroundSelectorProps {
  backgroundMode: "transparent" | "backgroundImage" | "color";
  backgroundColor: string;
  backgroundFiles: FileWithPreview[];
  onBackgroundModeChange: (mode: "transparent" | "backgroundImage" | "color") => void;
  onBackgroundFilesChange: (files: FileWithPreview[]) => void;
  onShowColorPicker: () => void;
  isExporting: boolean;
}

export default function BackgroundSelector({
  backgroundMode,
  backgroundColor,
  backgroundFiles,
  onBackgroundModeChange,
  onBackgroundFilesChange,
  onShowColorPicker,
  isExporting
}: BackgroundSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">Background</label>
      <div className="flex gap-2 items-center flex-wrap">
        <button
          type="button"
          onClick={() => onBackgroundModeChange("transparent")}
          className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${backgroundMode === "transparent" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"}`}
        >
          Transparent
        </button>
        <button
          type="button"
          onClick={() => onBackgroundModeChange("backgroundImage")}
          className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${backgroundMode === "backgroundImage" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"}`}
        >
          Background image
        </button>
        <button
          type="button"
          onClick={() => {
            onBackgroundModeChange("color");
            onShowColorPicker();
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
            onFilesChange={onBackgroundFilesChange}
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
  );
}
