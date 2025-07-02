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

// Client-side image compression function
const compressImage = (file: File, quality: number): Promise<ProcessedFile> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set canvas dimensions to match image
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw image to canvas
      ctx.drawImage(img, 0, 0);

      // Determine output format based on original file type
      const originalFormat = file.type.toLowerCase();
      let outputFormat = 'image/jpeg'; // Default to JPEG for compression
      let fileExtension = 'jpg';
      
      // Keep original format for better quality preservation
      if (originalFormat.includes('png')) {
        outputFormat = 'image/png';
        fileExtension = 'png';
      } else if (originalFormat.includes('webp')) {
        outputFormat = 'image/webp';
        fileExtension = 'webp';
      } else if (originalFormat.includes('avif')) {
        outputFormat = 'image/avif';
        fileExtension = 'avif';
      }

      // Convert quality percentage to decimal (Canvas API expects 0.0 to 1.0)
      const canvasQuality = Math.max(0.1, Math.min(1.0, quality / 100));
      
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to compress image'));
          return;
        }

        const originalSize = file.size;
        const compressedSize = blob.size;
        const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
        
        // Generate filename
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const fileName = `${baseName}_compressed.${fileExtension}`;
        const url = URL.createObjectURL(blob);

        resolve({
          name: fileName,
          url: url,
          originalSize: originalSize,
          processedSize: compressedSize,
          compressionRatio: Math.max(0, compressionRatio),
          blob: blob
        });
      }, outputFormat, canvasQuality);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    
    // Load the image
    img.src = URL.createObjectURL(file);
  });
};

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

  const compressImages = async () => {
    if (files.length === 0) return;

    setIsCompressing(true);
    
    try {
      const compressed: ProcessedFile[] = [];
      
      // Compress each file client-side
      for (const file of files) {
        try {
          const result = await compressImage(file, quality);
          compressed.push(result);
        } catch (error) {
          console.error(`Failed to compress ${file.name}:`, error);
        }
      }
      
      setCompressedFiles(compressed);
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

  // Check if individual downloads should be disabled
  const shouldDisableIndividualDownload = (fileName: string) => {
    return userIsFirefox && fileName.toLowerCase().includes('.avif');
  };

  const getOriginalFileForComparison = (index: number) => {
    if (index >= 0 && index < files.length && index < compressedFiles.length) {
      return files[index];
    }
    return null;
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
      onClick={compressImages}
      disabled={files.length === 0 || isCompressing}
      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
    >
      <Minimize2 className="h-4 w-4" />
      {isCompressing ? "Compressing..." : "Compress Images"}
    </button>
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
          shouldDisableIndividualDownload={shouldDisableIndividualDownload}
          formatFileSize={formatFileSize}
        />
      </div>

      {/* Before/After Comparison */}
      {compressedFiles.length > 0 && getOriginalFileForComparison(selectedComparisonIndex) && (
        <ImageComparison
          originalImageUrl={getOriginalFileForComparison(selectedComparisonIndex)?.preview || ''}
          processedImageUrl={compressedFiles[selectedComparisonIndex]?.url || ''}
          originalSize={compressedFiles[selectedComparisonIndex]?.originalSize || 0}
          processedSize={compressedFiles[selectedComparisonIndex]?.processedSize || 0}
          fileName={compressedFiles[selectedComparisonIndex]?.name || ''}
        />
      )}
    </ToolPageLayout>
  );
} 