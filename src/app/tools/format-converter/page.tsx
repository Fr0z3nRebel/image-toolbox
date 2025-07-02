"use client";

import { useState, useEffect } from "react";
import ToolPageLayout from "../../components/ToolPageLayout";
import FileUploadZone, { FileWithPreview } from "../../components/FileUploadZone";
import ProcessedFilesDisplay, { ProcessedFile } from "../../components/ProcessedFilesDisplay";
import FirefoxWarning from "../../components/FirefoxWarning";
import { isFirefox } from "../../components/utils/browserUtils";
import { createAndDownloadZip } from "../../components/utils/zipUtils";
import { convertImages, shouldDisableIndividualDownload } from "./functions";

export default function FormatConverter() {
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

  const handleConvertImages = async () => {
    if (files.length === 0) return;

    setIsConverting(true);
    
    try {
      const results = await convertImages(files, targetFormat);
      setConvertedFiles(results);
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

  const convertButton = (
    <button
      onClick={handleConvertImages}
      disabled={files.length === 0 || isConverting}
      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
    >
      {isConverting ? "Converting..." : "Convert Images"}
    </button>
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
      <div className="mb-8">
        <FileUploadZone
          files={files}
          onFilesChange={setFiles}
          disabled={isConverting}
          actionButton={convertButton}
        >
          {formatSelectionControl}
        </FileUploadZone>
      </div>

      {/* Converted Images Display */}
      <ProcessedFilesDisplay
        title="Converted Images"
        emptyStateMessage="Converted images will appear here"
        files={convertedFiles}
        onDownloadAll={downloadAll}
        isCreatingZip={isCreatingZip}
        downloadAllButtonText="Download All"
        shouldDisableIndividualDownload={() => shouldDisableIndividualDownload(targetFormat, userIsFirefox)}
      />
    </ToolPageLayout>
  );
} 