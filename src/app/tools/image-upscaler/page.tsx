"use client";

import { useState } from "react";
import { ZoomIn } from "lucide-react";
import ToolPageLayout from "../../components/ToolPageLayout";
import FileUploadZone, { FileWithPreview } from "../../components/FileUploadZone";
import ProcessedFilesDisplay, { ProcessedFile } from "../../components/ProcessedFilesDisplay";
import ImageComparison from "../../components/ImageComparison";
import { formatFileSize } from "../../components/utils/browserUtils";
import { createAndDownloadZip } from "../../components/utils/zipUtils";
import { 
  upscaleImages, 
  getOriginalFileForComparison 
} from "./functions";

export default function ImageUpscaler() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [scaleFactor, setScaleFactor] = useState<number>(2);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [upscaledFiles, setUpscaledFiles] = useState<ProcessedFile[]>([]);
  const [selectedComparisonIndex, setSelectedComparisonIndex] = useState<number>(0);

  const handleUpscaleImages = async () => {
    if (files.length === 0) return;

    setIsUpscaling(true);
    
    try {
      const results = await upscaleImages(files, scaleFactor);
      setUpscaledFiles(results);
    } catch (error) {
      console.error("Error upscaling images:", error);
    } finally {
      setIsUpscaling(false);
    }
  };

  const downloadAll = async () => {
    if (upscaledFiles.length === 0) return;

    setIsCreatingZip(true);
    try {
      await createAndDownloadZip(
        upscaledFiles.map(file => ({ name: file.name, blob: file.blob })),
        `upscaled-images-${scaleFactor}x.zip`
      );
    } catch (error) {
      console.error("Error creating zip file:", error);
    } finally {
      setIsCreatingZip(false);
    }
  };

  const scaleFactorControl = (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Scale Factor: {scaleFactor}x
      </label>
      <input
        type="range"
        min="1.1"
        max="5.0"
        step="0.1"
        value={scaleFactor}
        onChange={(e) => setScaleFactor(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>1.1x (Small)</span>
        <span>5.0x (Large)</span>
      </div>
      <div className="mt-2 text-xs text-gray-600">
        <p>Uses high-quality Lanczos resampling for scales up to 2x</p>
        <p>Uses advanced bicubic interpolation for larger scales</p>
      </div>
    </div>
  );

  const upscaleButton = (
    <button
      onClick={handleUpscaleImages}
      disabled={files.length === 0 || isUpscaling}
      className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
    >
      <ZoomIn className="h-4 w-4" />
      {isUpscaling ? "Upscaling..." : "Upscale Images"}
    </button>
  );

  const originalFileForComparison = getOriginalFileForComparison(
    selectedComparisonIndex, 
    files, 
    upscaledFiles
  );

  const totalOriginalSize = upscaledFiles.reduce((sum, file) => sum + (file.originalSize || 0), 0);
  const totalProcessedSize = upscaledFiles.reduce((sum, file) => sum + (file.processedSize || file.blob.size), 0);
  const sizeIncrease = totalOriginalSize > 0 ? ((totalProcessedSize - totalOriginalSize) / totalOriginalSize) * 100 : 0;

  return (
    <ToolPageLayout
      title="Image Upscaler"
      description="Enhance your images with high-quality upscaling algorithms"
      showBackButton={true}
    >
      {/* Upload Section */}
      <div className="mb-8">
        <FileUploadZone
          files={files}
          onFilesChange={setFiles}
          disabled={isUpscaling}
          actionButton={upscaleButton}
          acceptedFileTypes="image/*"
          supportedFormatsText="Supports JPEG, PNG, WebP, and AVIF images"
        >
          {scaleFactorControl}
        </FileUploadZone>
      </div>

      {/* Processing Info */}
      {upscaledFiles.length > 0 && (
        <div className="mb-8">
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-purple-600">Original Size: {formatFileSize(totalOriginalSize)}</p>
              </div>
              <div>
                <p className="text-purple-600">Upscaled Size: {formatFileSize(totalProcessedSize)}</p>
              </div>
              <div>
                <p className="text-purple-600">Size Increase: {sizeIncrease.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-purple-600">Scale Factor: {scaleFactor}x</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upscaled Images Display */}
      <div className="mb-8">
        <ProcessedFilesDisplay
          title="Upscaled Images"
          emptyStateMessage="Upscaled images will appear here"
          files={upscaledFiles}
          onDownloadAll={downloadAll}
          isCreatingZip={isCreatingZip}
          downloadAllButtonText="Download All"
          showStats={false} // We show custom stats above
          onFileSelect={setSelectedComparisonIndex}
          selectedIndex={selectedComparisonIndex}
          formatFileSize={formatFileSize}
        />
      </div>

      {/* Before/After Comparison */}
      {upscaledFiles.length > 0 && originalFileForComparison && (
        <ImageComparison
          originalImageUrl={originalFileForComparison.preview || ''}
          processedImageUrl={upscaledFiles[selectedComparisonIndex]?.url || ''}
          originalSize={upscaledFiles[selectedComparisonIndex]?.originalSize || 0}
          processedSize={upscaledFiles[selectedComparisonIndex]?.processedSize || 0}
          fileName={upscaledFiles[selectedComparisonIndex]?.name || ''}
          title="Before / After Comparison"
          originalLabel="Original"
          processedLabel="Upscaled"
        />
      )}
    </ToolPageLayout>
  );
}