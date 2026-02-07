"use client";

import { useState } from "react";
import ToolPageLayout from "../../components/ToolPageLayout";
import FileUploadZone, { FileWithPreview } from "../../components/FileUploadZone";
import ProcessedFilesDisplay, { ProcessedFile } from "../../components/ProcessedFilesDisplay";
import { createAndDownloadZip } from "../../components/utils/zipUtils";
import { removeBackgroundFromImages } from "./functions";

export default function BackgroundRemoverPage() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const handleRemoveBackgrounds = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: files.length });
    setProcessedFiles([]);
    try {
      const results = await removeBackgroundFromImages(
        files,
        (current, total) => setProgress({ current, total })
      );
      setProcessedFiles(results);
    } catch (error) {
      console.error("Error removing backgrounds:", error);
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const downloadAll = async () => {
    if (processedFiles.length === 0) return;
    setIsCreatingZip(true);
    try {
      await createAndDownloadZip(
        processedFiles.map((f) => ({ name: f.name, blob: f.blob })),
        "background-removed.zip"
      );
    } catch (error) {
      console.error("Error creating zip:", error);
    } finally {
      setIsCreatingZip(false);
    }
  };

  const actionButton = (
    <button
      type="button"
      onClick={handleRemoveBackgrounds}
      disabled={files.length === 0 || isProcessing}
      className="w-full bg-violet-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
    >
      {isProcessing
        ? progress
          ? `Processing ${progress.current} of ${progress.total}…`
          : "Processing…"
        : "Remove backgrounds"}
    </button>
  );

  return (
    <ToolPageLayout
      title="Background Remover"
      description="Remove backgrounds from images in your browser — private, client-side AI. First run may take a moment to load the model."
      showBackButton
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <FileUploadZone
          files={files}
          onFilesChange={setFiles}
          disabled={isProcessing}
          actionButton={actionButton}
          acceptedFileTypes="image/jpeg,image/png,image/gif,image/webp"
          supportedFormatsText="Supports JPEG, PNG, GIF, and WebP. Max 20 files."
          maxFiles={20}
        />
        <p className="text-sm text-gray-500 text-center -mt-4">
          Processing runs entirely in your browser. No images are uploaded to any server.
        </p>

        <ProcessedFilesDisplay
          title="Results"
          emptyStateMessage="Process images above to see results here."
          files={processedFiles}
          onDownloadAll={downloadAll}
          isCreatingZip={isCreatingZip}
          downloadAllButtonText="Download all as ZIP"
          showStats
        />
      </div>
    </ToolPageLayout>
  );
}
