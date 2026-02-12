"use client";

import { useState, useCallback, useEffect } from "react";
import { Download, Trash2 } from "lucide-react";
import ToolPageLayout from "../../components/ToolPageLayout";
import SingleMultipleToggle from "../../components/SingleMultipleToggle";
import ImageDropZone from "../../components/ImageDropZone";
import { FileWithPreview } from "../../components/FileUploadZone";
import ProcessedFilesDisplay, { ProcessedFile } from "../../components/ProcessedFilesDisplay";
import FirefoxWarning from "../../components/FirefoxWarning";
import { useFirefoxCheck } from "../../hooks/useFirefoxCheck";
import { createAndDownloadZip } from "../../components/utils/zipUtils";
import ThemedSelect from "../../components/ThemedSelect";
import {
  convertImages,
  shouldDisableIndividualDownload,
  SVG_SIZE_PRESETS,
  SVG_SIZE_DEFAULT,
  type SvgExportOptions,
  type SvgSizePreset,
} from "./functions";

const ACCEPTED_TYPES = "image/*,.avif,.svg";

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

export default function FormatConverter() {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [targetFormat, setTargetFormat] = useState<"avif" | "jpeg" | "png" | "webp">("jpeg");
  const [svgLongestSide, setSvgLongestSide] = useState<SvgSizePreset>(SVG_SIZE_DEFAULT);
  const [svgSquare, setSvgSquare] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState<ProcessedFile[]>([]);
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
      setConvertedFiles([]);
    }
  }, [mode]);

  const displayItems = convertedFiles.length > 0 ? convertedFiles : files;
  const showPreviews = displayItems.length > 0;
  const isProcessed = convertedFiles.length > 0;

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
    setConvertedFiles([]);
  }, [mode]);

  const removeFile = useCallback((idOrIndex: string | number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (typeof idOrIndex === "number") {
      setConvertedFiles((prev) => prev.filter((_, i) => i !== idOrIndex));
      return;
    }
    const id = idOrIndex as string;
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((f) => f.id !== id);
    });
    setConvertedFiles([]);
  }, []);

  const handleConvertImages = async () => {
    if (files.length === 0) return;
    setIsConverting(true);
    try {
      const svgOptions: SvgExportOptions = { svgLongestSide, svgSquare };
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
        convertedFiles.map((f) => ({ name: f.name, blob: f.blob })),
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
      (f) => f.type === "image/svg+xml" || f.name.toLowerCase().endsWith(".svg")
    );

  const isSingleItem = displayItems.length === 1;
  const getPreviewUrl = (item: FileWithPreview | ProcessedFile) =>
    "url" in item ? item.url : item.preview;
  const getName = (item: FileWithPreview | ProcessedFile) =>
    "name" in item ? item.name : (item as FileWithPreview).name;
  const getRemoveKey = (item: FileWithPreview | ProcessedFile, index: number) =>
    isProcessed ? index : (item as FileWithPreview).id;

  const disableIndividualDownload = shouldDisableIndividualDownload(targetFormat, userIsFirefox);

  return (
    <ToolPageLayout
      title="Image Format Converter"
      description="Convert images (including SVG) between AVIF, JPEG, PNG, and WebP. SVG output size is configurable."
      showBackButton
    >
      {userIsFirefox && targetFormat === "avif" && (
        <FirefoxWarning variant="avif-conversion" />
      )}

      <div className="max-w-6xl mx-auto h-full flex flex-col gap-6">
        <div className="flex flex-col bg-brand-grey rounded-xl border border-brand-charcoal p-6 overflow-visible lg:overflow-hidden lg:h-[50vh]">
          <SingleMultipleToggle
            mode={mode}
            onModeChange={setMode}
            ariaLabel="Conversion mode"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-1 gap-8 lg:flex-1 lg:min-h-0 lg:items-stretch">
            <div className="flex flex-col gap-4 order-2 lg:order-1">
              <ThemedSelect
                label="Convert to:"
                value={targetFormat}
                options={[
                  { value: "avif", label: "AVIF" },
                  { value: "jpeg", label: "JPEG" },
                  { value: "png", label: "PNG" },
                  { value: "webp", label: "WebP" },
                ]}
                onChange={(v) => setTargetFormat(v)}
              />
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
                          (SVG_SIZE_PRESETS[Number(e.target.value)] ??
                            SVG_SIZE_DEFAULT) as SvgSizePreset
                        )
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                    />
                    <div className="relative w-full text-xs text-brand-white/90 mt-1 h-4">
                      <span className="absolute left-0">1024</span>
                      <span className="absolute left-1/3 -translate-x-1/2">2048</span>
                      <span className="absolute left-2/3 -translate-x-1/2">4096</span>
                      <span className="absolute right-0">8K (8192)</span>
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
              <button
                onClick={handleConvertImages}
                disabled={files.length === 0 || isConverting}
                className="w-full bg-brand-orange text-white py-3 px-4 rounded-lg font-medium hover:bg-brand-600 disabled:bg-brand-charcoal disabled:text-brand-white/50 disabled:cursor-not-allowed transition-colors"
              >
                {isConverting ? "Converting..." : "Convert Images"}
              </button>
            </div>

            <ImageDropZone
              inputId="format-converter-upload"
              accept={ACCEPTED_TYPES}
              multiple={mode === "bulk"}
              isSingleMode={mode === "single"}
              supportedFormatsText="AVIF, JPEG, PNG, WebP, SVG"
              onDrop={applyFiles}
              isEmpty={!showPreviews}
              isSingleItem={isSingleItem}
              wrapperClassName={`order-1 lg:order-2 lg:col-span-2 flex flex-col min-h-0 overflow-hidden max-h-[calc(100vh-8rem)] lg:max-h-[50vh] ${showPreviews ? "lg:min-h-0" : ""}`}
            >
              {isSingleItem ? (
                <div className="w-full aspect-square lg:absolute lg:inset-0 lg:aspect-auto flex items-center justify-center">
                  {(() => {
                    const item = displayItems[0];
                    const url = getPreviewUrl(item);
                    const name = getName(item);
                    const removeKey = getRemoveKey(item, 0);
                    return (
                      <div className="relative w-full h-full max-w-full max-h-full rounded-lg border border-brand-grey overflow-hidden group flex items-center justify-center bg-brand-charcoal">
                        {isConverting ? (
                          <span className="text-xs text-brand-white/90">
                            Converting…
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
                          {isProcessed && !disableIndividualDownload && (
                            <a
                              href={"url" in item ? item.url : ""}
                              download={name}
                              className="p-1 text-brand-orange hover:text-brand-600"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={(e) => removeFile(removeKey, e)}
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
                      return (
                        <div
                          key={key}
                          className="relative rounded-lg border border-brand-grey overflow-hidden group bg-brand-charcoal"
                          style={{ aspectRatio: "1" }}
                        >
                          {isConverting ? (
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
                            {isProcessed && !disableIndividualDownload && (
                              <a
                                href={"url" in item ? item.url : ""}
                                download={name}
                                className="p-1 text-brand-orange hover:text-brand-600"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={(e) => removeFile(removeKey, e)}
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

          {isProcessed && convertedFiles.length > 0 && (
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
      </div>
    </ToolPageLayout>
  );
}
