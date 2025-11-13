"use client";

import { useState } from "react";
import { Ruler } from "lucide-react";
import ToolPageLayout from "../../components/ToolPageLayout";
import FileUploadZone, { FileWithPreview } from "../../components/FileUploadZone";
import ProcessedFilesDisplay, { ProcessedFile } from "../../components/ProcessedFilesDisplay";
import ImageComparison from "../../components/ImageComparison";
import { formatFileSize } from "../../components/utils/browserUtils";
import { createAndDownloadZip } from "../../components/utils/zipUtils";
import { 
  changeImagesResolution, 
  getOriginalFileForComparison 
} from "./functions";



export default function ResolutionChanger() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [selectedComparisonIndex, setSelectedComparisonIndex] = useState<number>(0);

  const handleChangeResolution = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    
    try {
      const results = await changeImagesResolution(files);
      setProcessedFiles(results);
    } catch (error) {
      console.error("Error changing image resolution:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAll = async () => {
    if (processedFiles.length === 0) return;

    setIsCreatingZip(true);
    try {
      await createAndDownloadZip(
        processedFiles.map(file => ({ name: file.name, blob: file.blob })),
        `images-300dpi.zip`
      );
    } catch (error) {
      console.error("Error creating zip file:", error);
    } finally {
      setIsCreatingZip(false);
    }
  };

  const processButton = (
    <button
      onClick={handleChangeResolution}
      disabled={files.length === 0 || isProcessing}
      className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
    >
      <Ruler className="h-4 w-4" />
      {isProcessing ? "Processing..." : "Set to 300 DPI"}
    </button>
  );

  const originalFileForComparison = getOriginalFileForComparison(
    selectedComparisonIndex, 
    files, 
    processedFiles
  );

  return (
    <ToolPageLayout
      title="Image Resolution Changer"
      description="Set your images to 300 DPI for high-quality printing"
      showBackButton={true}
    >
      {/* Upload Section */}
      <div className="mb-8">
        <FileUploadZone
          files={files}
          onFilesChange={setFiles}
          disabled={isProcessing}
          actionButton={processButton}
          acceptedFileTypes="image/*"
          supportedFormatsText="Supports JPEG, PNG, WebP, and AVIF images"
        />
      </div>

      {/* Processed Images Display */}
      <div className="mb-8">
        <ProcessedFilesDisplay
          title="300 DPI Images"
          emptyStateMessage="Processed images will appear here"
          files={processedFiles}
          onDownloadAll={downloadAll}
          isCreatingZip={isCreatingZip}
          downloadAllButtonText="Download All"
          showStats={true}
          onFileSelect={setSelectedComparisonIndex}
          selectedIndex={selectedComparisonIndex}
          formatFileSize={formatFileSize}
        />
      </div>

      {/* Before/After Comparison */}
      {processedFiles.length > 0 && originalFileForComparison && (
        <ImageComparison
          originalImageUrl={originalFileForComparison.preview || ''}
          processedImageUrl={processedFiles[selectedComparisonIndex]?.url || ''}
          originalSize={processedFiles[selectedComparisonIndex]?.originalSize || 0}
          processedSize={processedFiles[selectedComparisonIndex]?.processedSize || 0}
          fileName={processedFiles[selectedComparisonIndex]?.name || ''}
        />
      )}
    </ToolPageLayout>
  );
}

