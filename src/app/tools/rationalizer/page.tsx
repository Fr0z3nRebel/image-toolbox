"use client";

import { useState, useCallback, useEffect } from "react";
import { Download, Trash2 } from "lucide-react";
import ToolPageLayout from "../../components/ToolPageLayout";
import SingleMultipleToggle from "../../components/SingleMultipleToggle";
import ImageDropZone from "../../components/ImageDropZone";
import { FileWithPreview } from "../../components/FileUploadZone";
import { createAndDownloadZip } from "../../components/utils/zipUtils";
import { rationalizeMany } from "./functions";
import type { ProcessedFile } from "../../components/ProcessedFilesDisplay";

const ACCEPTED_TYPES = "image/*,.svg";

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

export default function RationalizerPage() {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  // When switching to single mode, keep only first file
  useEffect(() => {
    if (mode === "single") {
      setFiles((prev) => {
        if (prev.length <= 1) return prev;
        prev.forEach((f, i) => {
          if (i > 0 && f.preview) URL.revokeObjectURL(f.preview);
        });
        return prev.slice(0, 1);
      });
      setProcessedFiles([]);
    }
  }, [mode]);

  const displayItems =
    processedFiles.length > 0 ? processedFiles : files;
  const showPreviews = displayItems.length > 0;
  const isProcessed = processedFiles.length > 0;

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
    setProcessedFiles([]);
  }, [mode]);

  const removeFile = useCallback((idOrIndex: string | number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (typeof idOrIndex === "number") {
      setProcessedFiles((prev) => prev.filter((_, i) => i !== idOrIndex));
      return;
    }
    const id = idOrIndex as string;
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((f) => f.id !== id);
    });
    setProcessedFiles([]);
  }, []);

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
        processedFiles.map((f) => ({ name: f.name, blob: f.blob })),
        "rationalized-images.zip"
      );
    } catch (error) {
      console.error("Error creating zip:", error);
    } finally {
      setIsCreatingZip(false);
    }
  };

  const getPreviewUrl = (item: FileWithPreview | ProcessedFile) =>
    "url" in item ? item.url : item.preview;
  const getName = (item: FileWithPreview | ProcessedFile) =>
    "name" in item ? item.name : (item as FileWithPreview).name;
  const getRemoveKey = (item: FileWithPreview | ProcessedFile, index: number) =>
    isProcessed ? index : (item as FileWithPreview).id;

  return (
    <ToolPageLayout
      title="Rationalizer"
      description="Add transparent padding so images become perfect 1:1 squares. Padding is added on the short sides to match the longest side. All processing is done in your browser. Output is PNG."
      showBackButton
    >
      <div className="max-w-6xl mx-auto h-full flex flex-col gap-6">
        <div className="flex flex-col bg-brand-grey rounded-xl border border-brand-charcoal p-6 overflow-visible lg:overflow-hidden lg:h-[50vh]">
          <SingleMultipleToggle
            mode={mode}
            onModeChange={setMode}
            ariaLabel="Rationalizer mode"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-1 gap-8 lg:flex-1 lg:min-h-0 lg:items-stretch">
            {/* Controls placeholder */}
            <div className="flex flex-col gap-4 order-2 lg:order-1">
              <div className="p-4 rounded-lg border border-brand-charcoal bg-brand-charcoal/50">
                <p className="text-sm text-brand-white/70">Options coming soon</p>
              </div>
              <button
                onClick={handleRationalize}
                disabled={files.length === 0 || isProcessing}
                className="w-full bg-brand-orange text-white py-3 px-4 rounded-lg font-medium hover:bg-brand-600 disabled:bg-brand-charcoal disabled:text-brand-white/50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? "Rationalizing…" : "Rationalize"}
              </button>
            </div>

            {/* Drop zone + previews */}
            <ImageDropZone
              inputId="rationalizer-upload"
              accept={ACCEPTED_TYPES}
              multiple={mode === "bulk"}
              isSingleMode={mode === "single"}
              supportedFormatsText="PNG, JPEG, WebP, GIF, SVG"
              onDrop={applyFiles}
              isEmpty={!showPreviews}
              isSingleItem={displayItems.length === 1}
              wrapperClassName={`order-1 lg:order-2 lg:col-span-2 flex flex-col min-h-0 overflow-hidden max-h-[calc(100vh-8rem)] lg:max-h-[50vh] ${showPreviews ? "lg:min-h-0" : ""}`}
            >
              {displayItems.length === 1 ? (
                <div className="w-full aspect-square lg:absolute lg:inset-0 lg:aspect-auto flex items-center justify-center">
                  {(() => {
                    const item = displayItems[0];
                    const url = getPreviewUrl(item);
                    const name = getName(item);
                    const removeKey = getRemoveKey(item, 0);
                    return (
                      <div className="relative w-full h-full max-w-full max-h-full rounded-lg border border-brand-grey overflow-hidden group flex items-center justify-center bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)] bg-[length:12px_12px]">
                        {isProcessing ? (
                          <span className="text-xs text-brand-white/90">
                            Rationalizing…
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
                        <button
                          type="button"
                          onClick={(e) => removeFile(removeKey, e)}
                          className="absolute top-1 right-1 p-1 text-red-500 hover:text-red-600 transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
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
                      return (
                        <div
                          key={key}
                          className="relative rounded-lg border border-brand-grey overflow-hidden group bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)] bg-[length:12px_12px]"
                          style={{ aspectRatio: "1" }}
                        >
                          {isProcessing ? (
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
                          <button
                            type="button"
                            onClick={(e) => removeFile(removeKey, e)}
                            className="absolute top-1 right-1 p-1 text-red-500 hover:text-red-600 transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                            aria-label="Remove"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </ImageDropZone>
          </div>

          {isProcessed && processedFiles.length > 0 && (
            <button
              type="button"
              onClick={downloadAll}
              className="w-full mt-4 py-3 px-4 rounded-lg bg-brand-orange text-white font-medium hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2 inline-flex items-center justify-center gap-2"
            >
              <Download className="h-5 w-5" />
              Download
            </button>
          )}
        </div>
      </div>
    </ToolPageLayout>
  );
}
