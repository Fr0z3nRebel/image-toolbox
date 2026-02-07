"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import ToolPageLayout from "../../components/ToolPageLayout";
import { imageToSvg } from "./functions";
import type { PotracePresetId } from "./types";
import { Upload, Download, ChevronLeft, ChevronRight, X, Trash2 } from "lucide-react";
import { ACCEPTED_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILES } from "./constants";
import JSZip from "jszip";
import ToolControls from "./ToolControls";
import HelpContent from "./HelpContent";
import AdPlaceholder from "./AdPlaceholder";

const LIVE_PREVIEW_DEBOUNCE_MS = 400;

interface VectorItem {
  id: string;
  file: File;
  svg: string | null;
  svgPreviewUrl: string | null;
  error: string | null;
  status: "pending" | "converting" | "done" | "error";
}

function validateFile(f: File): string | null {
  if (f.size > MAX_FILE_SIZE_BYTES) {
    return `File must be under 4 MB. This file is ${(f.size / 1024 / 1024).toFixed(2)} MB.`;
  }
  if (!f.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
    return "Please use a JPEG, PNG, GIF, or WebP image.";
  }
  return null;
}

function makeId(file: File, index: number): string {
  return `${file.name}-${file.size}-${index}-${Date.now()}`;
}

export default function RasterVectorizerPage() {
  const [items, setItems] = useState<VectorItem[]>([]);
  const [presetId, setPresetId] = useState<PotracePresetId>("clean");
  const [threshold, setThreshold] = useState(128);
  const [invert, setInvert] = useState(false);
  const [colorOverride, setColorOverride] = useState<string | null>(null);
  const [useSingleColor, setUseSingleColor] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [showAdPlaceholder, setShowAdPlaceholder] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (items.length > 0 && mobileIndex >= items.length) {
      setMobileIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, mobileIndex]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      setShowAdPlaceholder(host === "localhost" || host === "127.0.0.1");
    }
  }, []);

  const applyFiles = useCallback((files: FileList | File[]) => {
    setGlobalError(null);
    const list = Array.from(files).slice(0, MAX_FILES);
    const valid: VectorItem[] = [];
    const errors: string[] = [];
    list.forEach((file, index) => {
      const err = validateFile(file);
      if (err) {
        errors.push(`${file.name}: ${err}`);
      } else {
        valid.push({
          id: makeId(file, index),
          file,
          svg: null,
          svgPreviewUrl: null,
          error: null,
          status: "pending",
        });
      }
    });
    if (errors.length > 0 && valid.length === 0) {
      setGlobalError(errors[0]);
    } else if (errors.length > 0) {
      setGlobalError(`Skipped ${errors.length} file(s). ${errors[0]}`);
    }
    if (valid.length > 0) {
      setItems((prev) => [...prev, ...valid]);
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files?.length) {
        applyFiles(files);
      }
      e.target.value = "";
    },
    [applyFiles]
  );

  const removeItem = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.svgPreviewUrl) URL.revokeObjectURL(item.svgPreviewUrl);
      return prev.filter((i) => i.id !== id);
    });
    if (previewId === id) setPreviewId(null);
  }, [previewId]);

  const optionsRef = useRef({ presetId, threshold, invert, colorOverride: useSingleColor ? colorOverride ?? "#000000" : null });
  optionsRef.current = { presetId, threshold, invert, colorOverride: useSingleColor ? colorOverride ?? "#000000" : null };
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const runConversions = useCallback(async () => {
    const current = itemsRef.current;
    const pending = current.filter((i) => i.status === "pending");
    if (pending.length === 0) return;
    const opts = optionsRef.current;

    for (const item of pending) {
      setItems((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, status: "converting" as const } : p))
      );

      let svg: string | null = null;
      let error: string | null = null;
      try {
        svg = await imageToSvg(item.file, {
          presetId: opts.presetId,
          threshold: opts.threshold,
          invert: opts.invert,
          colorOverride: opts.colorOverride,
        });
      } catch (err) {
        error = err instanceof Error ? err.message : "Conversion failed.";
      }

      const previewUrl = svg
        ? URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
        : null;

      setItems((prev) => {
        return prev.map((p) => {
          if (p.id !== item.id) return p;
          if (p.svgPreviewUrl) URL.revokeObjectURL(p.svgPreviewUrl);
          return {
            ...p,
            svg,
            svgPreviewUrl: previewUrl,
            error,
            status: error ? "error" : "done",
          };
        });
      });
    }
  }, []);

  const prevSettingsRef = useRef({ presetId, threshold, invert, useSingleColor, colorOverride });
  // When settings change, reset all items to pending so they get re-converted
  useEffect(() => {
    const prev = prevSettingsRef.current;
    const changed =
      prev.presetId !== presetId ||
      prev.threshold !== threshold ||
      prev.invert !== invert ||
      prev.useSingleColor !== useSingleColor ||
      prev.colorOverride !== colorOverride;
    prevSettingsRef.current = { presetId, threshold, invert, useSingleColor, colorOverride };
    if (!changed || items.length === 0) return;
    setItems((prev) =>
      prev.map((p) => {
        if (p.svgPreviewUrl) URL.revokeObjectURL(p.svgPreviewUrl);
        return {
          ...p,
          status: "pending" as const,
          svg: null,
          svgPreviewUrl: null,
          error: null,
        };
      })
    );
  }, [presetId, threshold, invert, useSingleColor, colorOverride]);

  // When items or settings change, debounce then run conversions for all pending
  useEffect(() => {
    if (items.length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      runConversions();
    }, LIVE_PREVIEW_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [items, presetId, threshold, invert, useSingleColor, colorOverride, runConversions]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) applyFiles(e.dataTransfer.files);
    },
    [applyFiles]
  );

  const viewableItems = items.filter((i) => i.svgPreviewUrl && i.status === "done");
  const previewIndex = previewId ? viewableItems.findIndex((i) => i.id === previewId) : -1;
  const previewItem = previewId ? items.find((i) => i.id === previewId) : null;

  const openPreview = useCallback((id: string) => {
    const item = items.find((i) => i.id === id);
    if (item?.svgPreviewUrl && item.status === "done") setPreviewId(id);
  }, [items]);

  const closePreview = useCallback(() => setPreviewId(null), []);

  const goPrev = useCallback(() => {
    if (previewIndex <= 0 || viewableItems.length === 0) return;
    setPreviewId(viewableItems[previewIndex - 1].id);
  }, [previewIndex, viewableItems]);

  const goNext = useCallback(() => {
    if (previewIndex < 0 || previewIndex >= viewableItems.length - 1) return;
    setPreviewId(viewableItems[previewIndex + 1].id);
  }, [previewIndex, viewableItems]);

  useEffect(() => {
    if (!previewId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewId, closePreview, goPrev, goNext]);

  const downloadOne = useCallback((item: VectorItem) => {
    if (!item.svg) return;
    const name = item.file.name.replace(/\.[^/.]+$/, "") + ".svg";
    const blob = new Blob([item.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadAll = useCallback(async () => {
    const done = items.filter((i) => i.svg && i.status === "done");
    if (done.length === 0) return;
    const zip = new JSZip();
    const usedNames = new Set<string>();
    done.forEach((item) => {
      let name = item.file.name.replace(/\.[^/.]+$/, "") + ".svg";
      while (usedNames.has(name)) {
        const ext = name.endsWith(".svg") ? ".svg" : "";
        const base = name.slice(0, name.length - ext.length);
        const match = base.match(/^(.*)-(\d+)$/);
        if (match) name = `${match[1]}-${Number(match[2]) + 1}${ext}`;
        else name = `${base}-2${ext}`;
      }
      usedNames.add(name);
      zip.file(name, item.svg!);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vectorized-svgs.zip";
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  const isConverting = items.some((i) => i.status === "converting");

  return (
    <ToolPageLayout
      title="Raster Vectorizer"
      description="Free, fast raster to SVG converter. Convert images to clean vector outlines, privately in your browser."
    >
      <div className="max-w-6xl mx-auto h-full flex flex-col gap-6">
        <div
          className="order-2 lg:order-1 flex flex-col bg-white rounded-xl border border-gray-200 p-6 overflow-visible lg:overflow-hidden lg:h-[50vh]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-1 gap-8 lg:flex-1 lg:min-h-0 lg:items-stretch">
            <ToolControls
              presetId={presetId}
              onPresetIdChange={setPresetId}
              threshold={threshold}
              onThresholdChange={setThreshold}
              invert={invert}
              onInvertChange={setInvert}
              useSingleColor={useSingleColor}
              onUseSingleColorChange={setUseSingleColor}
              colorOverride={colorOverride}
              onColorOverrideChange={setColorOverride}
              isConverting={isConverting}
              error={(globalError || items.find((i) => i.error)?.error) ?? null}
            />

            {/* Right on lg, first on mobile (above controls) */}
            <div
              className={`order-1 lg:order-2 lg:col-span-2 flex flex-col min-h-0 overflow-hidden max-h-[calc(100vh-8rem)] lg:max-h-[50vh] ${items.length > 0 ? "lg:min-h-0" : ""}`}
            >
              <input
                type="file"
                accept={ACCEPTED_TYPES}
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="r2v-upload"
              />
              {items.length > 0 && (
                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                  <p className="text-sm font-medium text-gray-700">
                    Preview ({items.length})
                  </p>
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="r2v-upload"
                      className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium text-sm cursor-pointer"
                    >
                      <Upload className="h-4 w-4" />
                      Add images
                    </label>
                    {viewableItems.length > 0 && (
                      <button
                        type="button"
                        onClick={downloadAll}
                        className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium text-sm"
                      >
                        <Download className="h-4 w-4" />
                        Download all
                      </button>
                    )}
                  </div>
                </div>
              )}
              <div
                className={`min-h-0 flex flex-col relative ${
                  items.length === 0
                    ? "flex-1 min-h-[200px]"
                    : items.length === 1
                      ? "flex-initial lg:flex-1 lg:min-h-0 overflow-hidden"
                      : "flex-1 overflow-auto"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {items.length === 0 ? (
                  <label
                    htmlFor="r2v-upload"
                    className={`cursor-pointer flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors flex-1 min-h-[200px] ${
                      isDragging
                        ? "border-teal-500 bg-teal-50"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <Upload className="h-10 w-10 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Drop images or click to select
                    </span>
                    <span className="text-xs text-gray-500">
                      JPG, PNG, GIF, WebP — max 4 MB each, up to {MAX_FILES} files
                    </span>
                  </label>
                ) : (
                  <>
                  <div
                    className={`relative min-h-0 w-full ${items.length === 1 ? "flex-1 min-h-0 overflow-hidden lg:absolute lg:inset-0 lg:flex-none" : "flex-1 min-h-0 flex flex-col lg:flex-initial lg:flex-shrink-0"}`}
                  >
                    {isDragging && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-teal-500/10 border-2 border-dashed border-teal-500 pointer-events-none">
                        <span className="text-sm font-medium text-teal-700 bg-white/90 px-4 py-2 rounded-lg shadow">
                          Drop to add more images
                        </span>
                      </div>
                    )}
                    {items.length === 1 ? (
                      <div className="w-full aspect-square lg:absolute lg:inset-0 lg:aspect-auto flex items-center justify-center">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => item.svgPreviewUrl && item.status === "done" && openPreview(item.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && item.svgPreviewUrl && item.status === "done")
                                  openPreview(item.id);
                              }}
                              className="relative w-full h-full max-w-full max-h-full rounded-lg border border-gray-200 overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 flex items-center justify-center"
                            >
                              {item.status === "converting" && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-200/80 z-10">
                                  <span className="text-xs text-gray-600">Converting…</span>
                                </div>
                              )}
                              {item.status === "error" && (
                                <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 z-10 p-1">
                                  <span className="text-xs text-red-600 text-center">Error</span>
                                </div>
                              )}
                              {item.svgPreviewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.svgPreviewUrl}
                                  alt={item.file.name}
                                  className="max-w-full max-h-full w-auto h-auto object-contain pointer-events-none"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center min-h-[100px]">
                                  <span className="text-xs text-gray-400">—</span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => removeItem(item.id, e)}
                                className="absolute top-1 right-1 p-1 text-red-500 hover:text-red-600 transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                                aria-label="Remove"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          ))}
                      </div>
                    ) : (
                  <>
                    {/* Mobile: one image at a time with arrows */}
                    <div className="lg:hidden flex-1 min-h-0 flex flex-col overflow-hidden">
                      <div className="relative flex-1 min-h-0 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMobileIndex((i) => Math.max(0, i - 1))}
                          disabled={mobileIndex === 0}
                          className="flex-shrink-0 w-10 h-10 rounded-full bg-white/90 shadow border border-gray-200 flex items-center justify-center text-gray-700 disabled:opacity-40 disabled:pointer-events-none"
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div className="flex-1 min-w-0 min-h-0 flex items-center justify-center aspect-square max-h-full">
                          {items[mobileIndex] && (() => {
                            const item = items[mobileIndex];
                            return (
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => item.svgPreviewUrl && item.status === "done" && openPreview(item.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && item.svgPreviewUrl && item.status === "done")
                                    openPreview(item.id);
                                }}
                                className="relative w-full h-full max-w-full max-h-full rounded-lg border border-gray-200 overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 flex items-center justify-center"
                              >
                                {item.status === "converting" && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-gray-200/80 z-10">
                                    <span className="text-xs text-gray-600">Converting…</span>
                                  </div>
                                )}
                                {item.status === "error" && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 z-10 p-1">
                                    <span className="text-xs text-red-600 text-center">Error</span>
                                  </div>
                                )}
                                {item.svgPreviewUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.svgPreviewUrl}
                                    alt={item.file.name}
                                    className="max-w-full max-h-full w-auto h-auto object-contain pointer-events-none"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center min-h-[100px]">
                                    <span className="text-xs text-gray-400">—</span>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => removeItem(item.id, e)}
                                  className="absolute top-1 right-1 p-1 text-red-500 hover:text-red-600 transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                                  aria-label="Remove"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                        <button
                          type="button"
                          onClick={() => setMobileIndex((i) => Math.min(items.length - 1, i + 1))}
                          disabled={mobileIndex >= items.length - 1}
                          className="flex-shrink-0 w-10 h-10 rounded-full bg-white/90 shadow border border-gray-200 flex items-center justify-center text-gray-700 disabled:opacity-40 disabled:pointer-events-none"
                          aria-label="Next image"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </div>
                      <div className="flex-shrink-0 py-2 text-center text-sm text-gray-500">
                        {mobileIndex + 1} of {items.length}
                      </div>
                    </div>
                    {/* Desktop: scrollable grid */}
                    <div className="hidden lg:block min-h-0 flex-shrink-0">
                      <div
                        className={`grid gap-x-3 gap-y-6 ${
                          items.length === 2
                              ? "grid-cols-2"
                              : items.length === 3
                                ? "grid-cols-3"
                                : items.length === 4
                                  ? "grid-cols-4"
                                  : "grid-cols-2 sm:grid-cols-4"
                        }`}
                      >
                        {items.map((item) => (
                          <div
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => item.svgPreviewUrl && item.status === "done" && openPreview(item.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && item.svgPreviewUrl && item.status === "done")
                                openPreview(item.id);
                            }}
                            className="relative w-full rounded-lg border border-gray-200 overflow-hidden group cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                            style={{ aspectRatio: "1" }}
                          >
                            {item.status === "converting" && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-200/80 z-10">
                                <span className="text-xs text-gray-600">Converting…</span>
                              </div>
                            )}
                            {item.status === "error" && (
                              <div className="absolute inset-0 flex items-center justify-center bg-red-50/90 z-10 p-1">
                                <span className="text-xs text-red-600 text-center">Error</span>
                              </div>
                            )}
                            {item.svgPreviewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.svgPreviewUrl}
                                alt={item.file.name}
                                className="w-full h-full object-contain pointer-events-none"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center min-h-[100px]">
                                <span className="text-xs text-gray-400">—</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => removeItem(item.id, e)}
                              className="absolute top-1 right-1 p-1 text-red-500 hover:text-red-600 transition-colors lg:opacity-0 lg:group-hover:opacity-100"
                              aria-label="Remove"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                    )}
                  </div>
                  </>
                )}
              </div>

              {/* Preview lightbox: click to open, arrows + close */}
              {previewItem && previewItem.svgPreviewUrl && (
                <div
                  className="fixed inset-0 z-50 pointer-events-auto bg-black/50"
                  onClick={closePreview}
                >
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,36rem)] max-h-[85vh] flex flex-col rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {previewItem.file.name}
                      </span>
                      <div className="flex items-center gap-2">
                        {previewItem.svg && (
                          <button
                            type="button"
                            onClick={() => downloadOne(previewItem!)}
                            className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-medium text-sm"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={closePreview}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                          aria-label="Close preview"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="relative flex-1 min-h-0 flex items-center justify-center p-4">
                      {viewableItems.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={goPrev}
                            disabled={previewIndex <= 0}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 shadow border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
                            aria-label="Previous"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={goNext}
                            disabled={previewIndex >= viewableItems.length - 1}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 shadow border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
                            aria-label="Next"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewItem.svgPreviewUrl}
                        alt={previewItem.file.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    {viewableItems.length > 1 && (
                      <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center">
                        {previewIndex + 1} of {viewableItems.length} — use arrow keys or buttons
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showAdPlaceholder && (
          <AdPlaceholder onHide={() => setShowAdPlaceholder(false)} />
        )}

        <div className="order-3">
          <HelpContent />
        </div>
      </div>
    </ToolPageLayout>
  );
}
