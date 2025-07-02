"use client";

import { useState, useCallback, useEffect } from "react";
import { Minimize2 } from "lucide-react";
import ToolPageLayout from "../../components/ToolPageLayout";
import FileUploadZone, { FileWithPreview } from "../../components/FileUploadZone";
import ProcessedFilesDisplay, { ProcessedFile } from "../../components/ProcessedFilesDisplay";
import FirefoxWarning from "../../components/FirefoxWarning";
import { isFirefox } from "../../components/utils/browserUtils";
import { createAndDownloadZip } from "../../components/utils/zipUtils";

// Client-side image conversion function
const convertImageToFormat = (file: File, targetFormat: string): Promise<ProcessedFile> => {
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

      // Convert to target format
      const mimeType = `image/${targetFormat}`;
      
      // Add timeout for AVIF conversion as it can be slow
      const timeoutMs = targetFormat === 'avif' ? 15000 : 10000;
      const timeoutId = setTimeout(() => {
        reject(new Error(`Conversion timeout - ${targetFormat.toUpperCase()} encoding took too long`));
      }, timeoutMs);
      
      canvas.toBlob((blob) => {
        clearTimeout(timeoutId);
        
        if (!blob) {
          reject(new Error(`Failed to convert image to ${targetFormat.toUpperCase()} - format may not be supported by this browser`));
          return;
        }

        const fileName = file.name.replace(/\.[^/.]+$/, "") + `.${targetFormat}`;
        const url = URL.createObjectURL(blob);

        resolve({
          name: fileName,
          url: url,
          blob: blob,
          originalSize: file.size,
          processedSize: blob.size
        });
      }, mimeType, 1.0); // Quality 1.0 = no compression
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    
    // Load the image
    img.src = URL.createObjectURL(file);
  });
};

export default function FormatConverterRefactored() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [targetFormat, setTargetFormat] = useState<"avif" | "jpeg" | "png" | "webp">("jpeg");
  const [isConverting, setIsConverting] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState<ProcessedFile[]>([]);
  const [userIsFirefox, setUserIsFirefox] = useState(false);

  // Check if user is on Firefox
  useEffect(() => {
    setUserIsFirefox(isFirefox());
  }, []);

  const convertImages = async () => {
    if (files.length === 0) return;

    setIsConverting(true);
    
    try {
      const converted: ProcessedFile[] = [];
      
      // Convert each file client-side
      for (const file of files) {
        try {
          const result = await convertImageToFormat(file, targetFormat);
          converted.push(result);
        } catch (error) {
          console.error(`Failed to convert ${file.name}:`, error);
        }
      }
      
      setConvertedFiles(converted);
    } catch (error) {
      console.error("Error converting images:", error);
    } finally {
      setIsConverting(false);
    }
  };

  const downloadAll = async () => {
    if (convertedFiles.length === 0) return;

    setIsCreatingZip(true);
    try {
      await createAndDownloadZip(
        convertedFiles.map(file => ({ name: file.name, blob: file.blob })),
        `converted-images-${targetFormat}.zip`
      );
    } catch (error) {
      console.error("Error creating zip file:", error);
    } finally {
      setIsCreatingZip(false);
    }
  };

  // Check if individual downloads should be disabled
  const shouldDisableIndividualDownload = (fileName: string) => {
    return userIsFirefox && targetFormat === 'avif';
  };

  const formatSelectionControl = (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Convert to:
      </label>
      <select
        value={targetFormat}
        onChange={(e) => setTargetFormat(e.target.value as "avif" | "jpeg" | "png" | "webp")}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
      >
        <option value="avif">AVIF</option>
        <option value="jpeg">JPEG</option>
        <option value="png">PNG</option>
        <option value="webp">WebP</option>
      </select>
    </div>
  );

  return (
    <ToolPageLayout
      title="Image Format Converter"
      description="Convert your images between AVIF, JPEG, PNG, and WebP formats"
    >
      {/* Firefox AVIF Warning */}
      {userIsFirefox && targetFormat === 'avif' && (
        <FirefoxWarning variant="avif-conversion" />
      )}

      {/* Upload Section */}
      <FileUploadZone
        files={files}
        onFilesChange={setFiles}
        disabled={isConverting}
        className="mb-8"
      >
        {formatSelectionControl}
      </FileUploadZone>

      {/* Convert Button */}
      <div className="mb-8">
        <button
          onClick={convertImages}
          disabled={files.length === 0 || isConverting}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Minimize2 className="h-4 w-4" />
          {isConverting ? "Converting..." : "Convert Images"}
        </button>
      </div>

      {/* Converted Images Display */}
      <ProcessedFilesDisplay
        title="Converted Images"
        emptyStateMessage="Converted images will appear here"
        files={convertedFiles}
        onDownloadAll={downloadAll}
        isCreatingZip={isCreatingZip}
        downloadAllButtonText="Download All"
        shouldDisableIndividualDownload={shouldDisableIndividualDownload}
      />
    </ToolPageLayout>
  );
} 