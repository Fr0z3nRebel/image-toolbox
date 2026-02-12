"use client";

import { useState, useCallback, useEffect } from "react";
import { Download, Minimize2, Trash2 } from "lucide-react";
import ToolPageLayout from "../../components/ToolPageLayout";
import SingleMultipleToggle from "../../components/SingleMultipleToggle";
import ImageDropZone from "../../components/ImageDropZone";
import { FileWithPreview } from "../../components/FileUploadZone";
import type { ProcessedFile } from "../../components/ProcessedFilesDisplay";
import FirefoxWarning from "../../components/FirefoxWarning";
import ImageComparison from "../../components/ImageComparison";
import { useFirefoxCheck } from "../../hooks/useFirefoxCheck";
import { createAndDownloadZip } from "../../components/utils/zipUtils";
import {
  compressImages,
  shouldDisableIndividualDownload,
  getOriginalFileForComparison,
} from "./functions";

const ACCEPTED_TYPES = "image/*";

function makeId(file: File, index: number): string {
  return `${file.name}-${file.size}-${index}-${Date.now()}`;
}

function toFileWithPreview(file: File, index: number): FileWithPreview {
  const f = file as FileWithPreview;
  f.id = makeId(file, index);
  f.preview = URL.createObjectURL(file);
  f.originalSize = file.size;
  return f;
}

export default function ImageCompressor() {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [quality, setQuality] = useState<number>(80);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [compressedFiles, setCompressedFiles] = useState<ProcessedFile[]>([]);
  const [selectedComparisonIndex, setSelectedComparisonIndex] = useState<number>(0);
  const userIsFirefox = useFirefoxCheck();

  useEffect(() => {
    if (mode === "single") {
      setFiles((prev) => {
        if (prev.length <= 1) return prev;
        prev.forEach((f, i) => {
          if (i > 0 && f.preview) URL.revokeObjectURL(f.preview);
        });
        return prev.slice(0, 1);
      });
      setCompressedFiles([]);
    }
  }, [mode]);

  const displayItems = compressedFiles.length > 0 ? compressedFiles : files;
  const showPreviews = displayItems.length > 0;
  const isProcessed = compressedFiles.length > 0;

  const applyFiles = useCallback((fileList: FileList | File[]) => {
    const list = Array.from(fileList);
    const limited = mode === "single" ? list.slice(0, 1) : list;
    const newFiles = limited.map((f, i) => toFileWithPreview(f, i));
    setFiles((prev) => {
      if (mode === "single") {
        prev.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
        return newFiles;
      }
      return [...prev, ...newFiles];
    });
    setCompressedFiles([]);
  }, [mode]);

  useEffect(() => {
    if (compressedFiles.length > 0 && selectedComparisonIndex >= compressedFiles.length) {
      setSelectedComparisonIndex(Math.max(0, compressedFiles.length - 1));
    }
  }, [compressedFiles.length, selectedComparisonIndex]);

  const removeFile = useCallback((idOrIndex: string | number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (typeof idOrIndex === "number") {
      setCompressedFiles((prev) => prev.filter((_, i) => i !== idOrIndex));
      return;
    }
    const id = idOrIndex as string;
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((f) => f.id !== id);
    });
    setCompressedFiles([]);
  }, []);

  const handleCompressImages = async () => {
    if (files.length === 0) return;
    setIsCompressing(true);
    try {
      const results = await compressImages(files, quality);
      setCompressedFiles(results);
      setSelectedComparisonIndex(0);
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
        compressedFiles.map((f) => ({ name: f.name, blob: f.blob })),
        `compressed-images-${quality}%.zip`
      );
    } catch (error) {
      console.error("Error creating zip file:", error);
    } finally {
      setIsCreatingZip(false);
    }
  };

  const originalFileForComparison = getOriginalFileForComparison(
    selectedComparisonIndex,
    files,
    compressedFiles
  );

  const isSingleItem = displayItems.length === 1;
  const getPreviewUrl = (item: FileWithPreview | ProcessedFile) =>
    "url" in item ? item.url : item.preview;
  const getName = (item: FileWithPreview | ProcessedFile) =>
    "name" in item ? item.name : (item as FileWithPreview).name;
  const getRemoveKey = (item: FileWithPreview | ProcessedFile, index: number) =>
    isProcessed ? index : (item as FileWithPreview).id;
  const disableIndividualDownload = (fileName: string) =>
    shouldDisableIndividualDownload(fileName, userIsFirefox);

  return (
    <ToolPageLayout
      title="Image Compressor"
      description="Reduce file sizes while maintaining image quality"
      showBackButton
    >
      {userIsFirefox &&
        compressedFiles.some((file) =>
          file.name.toLowerCase().includes(".avif")
        ) && <FirefoxWarning variant="avif-compression" />}

      <div className="max-w-6xl mx-auto h-full flex flex-col gap-6">
        <div className="flex flex-col bg-brand-grey rounded-xl border border-brand-charcoal p-6 overflow-visible lg:overflow-hidden lg:h-[50vh]">
          <SingleMultipleToggle
            mode={mode}
            onModeChange={setMode}
            ariaLabel="Compression mode"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-1 gap-8 lg:flex-1 lg:min-h-0 lg:items-stretch">
            <div className="flex flex-col gap-4 order-2 lg:order-1">
              <div>
                <label className="block text-sm font-medium text-brand-white mb-2">
                  Compression Quality: {quality}%
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full h-2 bg-brand-charcoal rounded-lg appearance-none cursor-pointer accent-brand-orange"
                />
                <div className="flex justify-between text-xs text-brand-white/90 mt-1">
                  <span>Smaller file (10%)</span>
                  <span>Better quality (100%)</span>
                </div>
              </div>
              <button
                onClick={handleCompressImages}
                disabled={files.length === 0 || isCompressing}
                className="w-full bg-brand-orange text-white py-3 px-4 rounded-lg font-medium hover:bg-brand-600 disabled:bg-brand-charcoal disabled:text-brand-white/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Minimize2 className="h-4 w-4" />
                {isCompressing ? "Compressing..." : "Compress Images"}
              </button>
            </div>

            <ImageDropZone
              inputId="compressor-upload"
              accept={ACCEPTED_TYPES}
              multiple={mode === "bulk"}
              isSingleMode={mode === "single"}
              supportedFormatsText="AVIF, JPEG, PNG, WebP"
              onDrop={applyFiles}
              isEmpty={!showPreviews}
              isSingleItem={isSingleItem}
              wrapperClassName={`order-1 lg:order-2 lg:col-span-2 flex flex-col min-h-0 overflow-hidden max-h-[calc(100vh-8rem)] lg:max-h-[50vh] ${showPreviews ? "lg:min-h-0" : ""}`}
            >
              {isSingleItem ? (
                <div
                  className={`w-full aspect-square lg:absolute lg:inset-0 lg:aspect-auto flex items-center justify-center rounded-lg border-2 cursor-pointer ${selectedComparisonIndex === 0 && isProcessed ? "border-brand-orange" : "border-brand-grey"}`}
                  onClick={() => isProcessed && setSelectedComparisonIndex(0)}
                >
                  {(() => {
                    const item = displayItems[0];
                    const url = getPreviewUrl(item);
                    const name = getName(item);
                    const removeKey = getRemoveKey(item, 0);
                    return (
                      <div className="relative w-full h-full max-w-full max-h-full rounded-lg overflow-hidden group flex items-center justify-center bg-brand-charcoal">
                        {isCompressing ? (
                          <span className="text-xs text-brand-white/90">
                            Compressing…
                          </span>
                        ) : url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={name}
                            className="max-w-full max-h-full w-auto h-auto object-contain pointer-events-none"
                          />
                        ) : (
                          <span className="text-xs text-brand-white/60">—</span>
                        )}
                        <div className="absolute top-1 right-1 flex items-center gap-1">
                          {isProcessed &&
                            !disableIndividualDownload(displayItems[0].name) && (
                              <a
                                href={"url" in item ? item.url : ""}
                                download={name}
                                className="p-1 text-brand-orange hover:text-brand-600"
                                title="Download"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(removeKey, e);
                            }}
                            className="p-1 text-red-500 hover:text-red-600 transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                            aria-label="Remove"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="min-h-0 flex-shrink-0 overflow-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {displayItems.map((item, index) => {
                      const url = getPreviewUrl(item);
                      const name = getName(item);
                      const key = isProcessed ? index : (item as FileWithPreview).id;
                      const removeKey = getRemoveKey(item, index);
                      const isSelected =
                        isProcessed && selectedComparisonIndex === index;
                      return (
                        <div
                          key={key}
                          className={`relative rounded-lg border overflow-hidden group bg-brand-charcoal cursor-pointer ${isSelected ? "border-2 border-brand-orange" : "border-brand-grey"}`}
                          style={{ aspectRatio: "1" }}
                          onClick={() =>
                            isProcessed && setSelectedComparisonIndex(index)
                          }
                        >
                          {isCompressing ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-brand-charcoal/90 z-10">
                              <span className="text-xs text-brand-white/90">
                                Processing…
                              </span>
                            </div>
                          ) : url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={url}
                              alt={name}
                              className="w-full h-full object-contain pointer-events-none"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center min-h-[100px]">
                              <span className="text-xs text-brand-white/60">—</span>
                            </div>
                          )}
                          <div className="absolute top-1 right-1 flex items-center gap-1">
                            {isProcessed &&
                              !disableIndividualDownload(
                                (item as ProcessedFile).name
                              ) && (
                                <a
                                  href={"url" in item ? item.url : ""}
                                  download={name}
                                  className="p-1 text-brand-orange hover:text-brand-600"
                                  title="Download"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(removeKey, e);
                              }}
                              className="p-1 text-red-500 hover:text-red-600 transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                              aria-label="Remove"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </ImageDropZone>
          </div>

          {isProcessed && compressedFiles.length > 0 && (
            <button
              type="button"
              onClick={downloadAll}
              disabled={isCreatingZip}
              className="w-full mt-4 py-3 px-4 rounded-lg bg-brand-orange text-white font-medium hover:bg-brand-600 disabled:bg-brand-charcoal disabled:text-brand-white/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2 inline-flex items-center justify-center gap-2"
            >
              <Download className="h-5 w-5" />
              {isCreatingZip ? "Creating ZIP..." : "Download"}
            </button>
          )}
        </div>

        {compressedFiles.length > 0 && originalFileForComparison && (
          <ImageComparison
            originalImageUrl={originalFileForComparison.preview || ""}
            processedImageUrl={compressedFiles[selectedComparisonIndex]?.url || ""}
            originalSize={
              compressedFiles[selectedComparisonIndex]?.originalSize || 0
            }
            processedSize={
              compressedFiles[selectedComparisonIndex]?.processedSize || 0
            }
            fileName={compressedFiles[selectedComparisonIndex]?.name || ""}
          />
        )}
      </div>
    </ToolPageLayout>
  );
}
