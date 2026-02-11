"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import ToolPageLayout from "../../components/ToolPageLayout";
import FileUploadZone, { FileWithPreview } from "../../components/FileUploadZone";
import ProcessedFilesDisplay from "../../components/ProcessedFilesDisplay";
import { createAndDownloadZip } from "../../components/utils/zipUtils";
import { autoCropMany, type AutoCropOptions } from "./functions";

export default function AutoCropperPage() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [treatWhiteAsEmpty, setTreatWhiteAsEmpty] = useState(true);
  const [svgOutputAsSvg, setSvgOutputAsSvg] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<
    Awaited<ReturnType<typeof autoCropMany>>
  >([]);

  const handleAutoCrop = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProcessedFiles([]);

    try {
      const options: AutoCropOptions = {
        treatWhiteAsEmpty,
        svgOutputAsSvg,
      };
      const results = await autoCropMany(
        files.map((f) => f as File),
        options
      );
      setProcessedFiles(results);
    } catch (error) {
      console.error("Auto-crop error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAll = async () => {
    if (processedFiles.length === 0) return;

    setIsCreatingZip(true);
    try {
      await createAndDownloadZip(
        processedFiles.map((file) => ({ name: file.name, blob: file.blob })),
        "auto-cropped-images.zip"
      );
    } catch (error) {
      console.error("Error creating zip:", error);
    } finally {
      setIsCreatingZip(false);
    }
  };

  const controls = (
    <div className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={treatWhiteAsEmpty}
          onChange={(e) => setTreatWhiteAsEmpty(e.target.checked)}
          className="rounded border-gray-300 text-brand-orange focus:ring-brand-orange"
        />
        <span className="text-sm font-medium text-brand-white">
          Treat white as empty (crop white margins)
        </span>
      </label>
      <div>
        <label className="block text-sm font-medium text-brand-white mb-2">
          SVG output
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="svgOutput"
            checked={svgOutputAsSvg}
            onChange={() => setSvgOutputAsSvg(true)}
            className="border-gray-300 text-brand-orange focus:ring-brand-orange"
          />
          <span className="text-sm text-brand-white">Keep as SVG (vector)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer mt-1">
          <input
            type="radio"
            name="svgOutput"
            checked={!svgOutputAsSvg}
            onChange={() => setSvgOutputAsSvg(false)}
            className="border-gray-300 text-brand-orange focus:ring-brand-orange"
          />
          <span className="text-sm text-brand-white">Export as PNG (raster)</span>
        </label>
      </div>
    </div>
  );

  const actionButton = (
    <button
      onClick={handleAutoCrop}
      disabled={files.length === 0 || isProcessing}
      className="w-full bg-brand-orange text-white py-3 px-4 rounded-lg font-medium hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
    >
      {isProcessing ? "Cropping…" : "Auto-crop"}
    </button>
  );

  return (
    <ToolPageLayout
      title="Auto-Cropper"
      description="Crop images and SVGs to remove unused transparent or white space. All processing is done in your browser."
    >
      <div className="mb-8">
        <FileUploadZone
          files={files}
          onFilesChange={setFiles}
          disabled={isProcessing}
          actionButton={actionButton}
          acceptedFileTypes="image/*,.svg"
          supportedFormatsText="Supports PNG, JPEG, WebP, GIF, and SVG"
        >
          {controls}
        </FileUploadZone>
      </div>

      {processedFiles.length > 0 && (
        <div className="mb-8 bg-brand-grey rounded-xl border border-brand-charcoal p-6">
          <h2 className="text-xl font-semibold text-brand-white mb-4">Previews</h2>
          <p className="text-sm text-brand-white/90 mb-4">
            Review your cropped images below before downloading.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {processedFiles.map((file, index) => (
              <div
                key={index}
                className="flex flex-col rounded-lg border border-brand-grey bg-brand-charcoal overflow-hidden"
              >
                <div className="aspect-square flex items-center justify-center p-2 bg-brand-grey min-h-[120px]">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="p-2 flex items-center justify-between gap-2 min-w-0">
                  <span className="text-xs font-medium text-brand-white truncate" title={file.name}>
                    {file.name}
                  </span>
                  <a
                    href={file.url}
                    download={file.name}
                    className="flex-shrink-0 text-blue-600 hover:text-blue-700"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ProcessedFilesDisplay
        title="Cropped images"
        emptyStateMessage="Cropped images will appear here"
        files={processedFiles}
        onDownloadAll={downloadAll}
        isCreatingZip={isCreatingZip}
        downloadAllButtonText="Download all"
        showStats={processedFiles.length > 0}
      />
    </ToolPageLayout>
  );
}
