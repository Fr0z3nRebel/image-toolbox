"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import ToolPageLayout from "../../components/ToolPageLayout";
import FileUploadZone, { FileWithPreview } from "../../components/FileUploadZone";
import ProcessedFilesDisplay from "../../components/ProcessedFilesDisplay";
import { createAndDownloadZip } from "../../components/utils/zipUtils";
import { rationalizeMany } from "./functions";

export default function RationalizerPage() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<
    Awaited<ReturnType<typeof rationalizeMany>>
  >([]);

  const handleRationalize = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProcessedFiles([]);

    try {
      const results = await rationalizeMany(files.map((f) => f as File));
      setProcessedFiles(results);
    } catch (error) {
      console.error("Rationalize error:", error);
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
        "rationalized-images.zip"
      );
    } catch (error) {
      console.error("Error creating zip:", error);
    } finally {
      setIsCreatingZip(false);
    }
  };

  const actionButton = (
    <button
      onClick={handleRationalize}
      disabled={files.length === 0 || isProcessing}
      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
    >
      {isProcessing ? "Rationalizing…" : "Rationalize"}
    </button>
  );

  return (
    <ToolPageLayout
      title="Rationalizer"
      description="Add transparent padding so images become perfect 1:1 squares. Padding is added on the short sides to match the longest side. All processing is done in your browser. Output is PNG."
    >
      <div className="mb-8">
        <FileUploadZone
          files={files}
          onFilesChange={setFiles}
          disabled={isProcessing}
          actionButton={actionButton}
          acceptedFileTypes="image/*,.svg"
          supportedFormatsText="Supports PNG, JPEG, WebP, GIF, and SVG"
        />
      </div>

      {processedFiles.length > 0 && (
        <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Previews</h2>
          <p className="text-sm text-gray-600 mb-4">
            Each image is now a 1:1 square with transparent padding. Review below before downloading.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {processedFiles.map((file, index) => (
              <div
                key={index}
                className="flex flex-col rounded-lg border border-gray-200 bg-gray-50 overflow-hidden"
              >
                <div className="aspect-square flex items-center justify-center p-2 bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)] bg-[length:12px_12px] min-h-[120px]">
                  <img
                    src={file.url}
                    alt={file.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="p-2 flex items-center justify-between gap-2 min-w-0">
                  <span className="text-xs font-medium text-gray-700 truncate" title={file.name}>
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
        title="Rationalized images"
        emptyStateMessage="Rationalized (1:1 square) images will appear here"
        files={processedFiles}
        onDownloadAll={downloadAll}
        isCreatingZip={isCreatingZip}
        downloadAllButtonText="Download all"
        showStats={processedFiles.length > 0}
      />
    </ToolPageLayout>
  );
}
