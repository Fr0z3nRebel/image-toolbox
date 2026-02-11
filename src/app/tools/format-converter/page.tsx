"use client";

import { useState, useEffect } from "react";
import ToolPageLayout from "../../components/ToolPageLayout";
import FileUploadZone, { FileWithPreview } from "../../components/FileUploadZone";
import ProcessedFilesDisplay, { ProcessedFile } from "../../components/ProcessedFilesDisplay";
import FirefoxWarning from "../../components/FirefoxWarning";
import { isFirefox } from "../../components/utils/browserUtils";
import { createAndDownloadZip } from "../../components/utils/zipUtils";
import {
  convertImages,
  shouldDisableIndividualDownload,
  SVG_SIZE_PRESETS,
  SVG_SIZE_DEFAULT,
  type SvgExportOptions,
  type SvgSizePreset,
} from "./functions";

export default function FormatConverter() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [targetFormat, setTargetFormat] = useState<"avif" | "jpeg" | "png" | "webp">("jpeg");
  const [svgLongestSide, setSvgLongestSide] = useState<SvgSizePreset>(SVG_SIZE_DEFAULT);
  const [svgSquare, setSvgSquare] = useState(false);
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
      const svgOptions: SvgExportOptions = {
        svgLongestSide,
        svgSquare,
      };
      const results = await convertImages(files, targetFormat, undefined, svgOptions);
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

  const isSvgOnly =
    files.length > 0 &&
    files.every(
      (f) =>
        f.type === "image/svg+xml" || f.name.toLowerCase().endsWith(".svg")
    );

  const formatSelectionControl = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-brand-white mb-2">
          Convert to:
        </label>
        <select
          value={targetFormat}
          onChange={(e) =>
            setTargetFormat(e.target.value as "avif" | "jpeg" | "png" | "webp")
          }
          className="w-full px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal accent-brand-orange"
        >
          <option value="avif">AVIF</option>
          <option value="jpeg">JPEG</option>
          <option value="png">PNG</option>
          <option value="webp">WebP</option>
        </select>
      </div>
      {isSvgOnly && (
        <>
          <div>
            <label className="block text-sm font-medium text-brand-white mb-2">
              Output size (longest side): {svgLongestSide}px
            </label>
            <input
              type="range"
              min={0}
              max={SVG_SIZE_PRESETS.length - 1}
              step={1}
              value={
                SVG_SIZE_PRESETS.includes(svgLongestSide)
                  ? SVG_SIZE_PRESETS.indexOf(svgLongestSide)
                  : 2
              }
              onChange={(e) =>
                setSvgLongestSide(
                  (SVG_SIZE_PRESETS[Number(e.target.value)] ?? SVG_SIZE_DEFAULT) as SvgSizePreset
                )
              }
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
            />
            <div className="relative w-full text-xs text-brand-white/90 mt-1 h-4">
              <span className="absolute left-0" style={{ transform: "translateX(0)" }}>
                1024
              </span>
              <span
                className="absolute"
                style={{ left: "33.33%", transform: "translateX(-50%)" }}
              >
                2048
              </span>
              <span
                className="absolute"
                style={{ left: "66.66%", transform: "translateX(-50%)" }}
              >
                4096
              </span>
              <span
                className="absolute right-0"
                style={{ transform: "translateX(0)" }}
              >
                8K (8192)
              </span>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={svgSquare}
              onChange={(e) => setSvgSquare(e.target.checked)}
              className="rounded border-gray-300 text-brand-orange focus:ring-brand-orange"
            />
            <span className="text-sm font-medium text-brand-white">
              1:1 square (add white padding to shortest sides)
            </span>
          </label>
        </>
      )}
    </div>
  );

  const convertButton = (
    <button
      onClick={handleConvertImages}
      disabled={files.length === 0 || isConverting}
      className="w-full bg-brand-orange text-white py-3 px-4 rounded-lg font-medium hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
    >
      {isConverting ? "Converting..." : "Convert Images"}
    </button>
  );

  return (
    <ToolPageLayout
      title="Image Format Converter"
      description="Convert images (including SVG) between AVIF, JPEG, PNG, and WebP. SVG output size is configurable."
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
          acceptedFileTypes="image/*,.avif,.svg"
          supportedFormatsText="Supports AVIF, JPEG, PNG, WebP, and SVG"
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