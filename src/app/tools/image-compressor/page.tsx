"use client";

import { useState, useEffect } from "react";
import { Minimize2 } from "lucide-react";
import ToolPageLayout from "../../components/ToolPageLayout";
import FileUploadZone, { FileWithPreview } from "../../components/FileUploadZone";
import ProcessedFilesDisplay, { ProcessedFile } from "../../components/ProcessedFilesDisplay";
import FirefoxWarning from "../../components/FirefoxWarning";
import ImageComparison from "../../components/ImageComparison";
import { isFirefox, formatFileSize } from "../../components/utils/browserUtils";
import { createAndDownloadZip } from "../../components/utils/zipUtils";
import { 
  compressImages, 
  shouldDisableIndividualDownload, 
  getOriginalFileForComparison 
} from "./functions";



export default function ImageCompressor() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [quality, setQuality] = useState<number>(80);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [compressedFiles, setCompressedFiles] = useState<ProcessedFile[]>([]);
  const [selectedComparisonIndex, setSelectedComparisonIndex] = useState<number>(0);
  const [userIsFirefox, setUserIsFirefox] = useState(false);

  // Check if user is on Firefox
  useEffect(() => {
    setUserIsFirefox(isFirefox());
  }, []);

  const handleCompressImages = async () => {
    if (files.length === 0) return;

    setIsCompressing(true);
    
    try {
      const results = await compressImages(files, quality);
      setCompressedFiles(results);
    } catch (error) {
      console.error("Error compressing images:", error);
    } finally {
      setIsCompressing(false);
    }
  };

  const downloadAll = async () => {
    if (compressedFiles.length === 0) return;

    setIsCreatingZip(true);
    try {
      await createAndDownloadZip(
        compressedFiles.map(file => ({ name: file.name, blob: file.blob })),
        `compressed-images-${quality}%.zip`
      );
    } catch (error) {
      console.error("Error creating zip file:", error);
    } finally {
      setIsCreatingZip(false);
    }
  };

  const qualityControl = (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Compression Quality: {quality}%
      </label>
      <input
        type="range"
        min="10"
        max="100"
        step="5"
        value={quality}
        onChange={(e) => setQuality(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Smaller file (10%)</span>
        <span>Better quality (100%)</span>
      </div>
    </div>
  );

  const compressButton = (
    <button
      onClick={handleCompressImages}
      disabled={files.length === 0 || isCompressing}
      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
    >
      <Minimize2 className="h-4 w-4" />
      {isCompressing ? "Compressing..." : "Compress Images"}
    </button>
  );

  const originalFileForComparison = getOriginalFileForComparison(
    selectedComparisonIndex, 
    files, 
    compressedFiles
  );

  return (
    <ToolPageLayout
      title="Image Compressor"
      description="Reduce file sizes while maintaining image quality"
      showBackButton={true}
    >
      {/* Firefox AVIF Warning */}
      {userIsFirefox && compressedFiles.some(file => file.name.toLowerCase().includes('.avif')) && (
        <FirefoxWarning variant="avif-compression" />
      )}

      {/* Upload Section */}
      <div className="mb-8">
        <FileUploadZone
          files={files}
          onFilesChange={setFiles}
          disabled={isCompressing}
          actionButton={compressButton}
          acceptedFileTypes="image/*"
          supportedFormatsText="Supports AVIF, JPEG, PNG, and WebP images"
        >
          {qualityControl}
        </FileUploadZone>
      </div>

      {/* Compressed Images Display */}
      <div className="mb-8">
        <ProcessedFilesDisplay
          title="Compressed Images"
          emptyStateMessage="Compressed images will appear here"
          files={compressedFiles}
          onDownloadAll={downloadAll}
          isCreatingZip={isCreatingZip}
          downloadAllButtonText="Download All"
          showStats={true}
          onFileSelect={setSelectedComparisonIndex}
          selectedIndex={selectedComparisonIndex}
          shouldDisableIndividualDownload={(fileName) => shouldDisableIndividualDownload(fileName, userIsFirefox)}
          formatFileSize={formatFileSize}
        />
      </div>

      {/* Before/After Comparison */}
      {compressedFiles.length > 0 && originalFileForComparison && (
        <ImageComparison
          originalImageUrl={originalFileForComparison.preview || ''}
          processedImageUrl={compressedFiles[selectedComparisonIndex]?.url || ''}
          originalSize={compressedFiles[selectedComparisonIndex]?.originalSize || 0}
          processedSize={compressedFiles[selectedComparisonIndex]?.processedSize || 0}
          fileName={compressedFiles[selectedComparisonIndex]?.name || ''}
        />
      )}
    </ToolPageLayout>
  );
} 