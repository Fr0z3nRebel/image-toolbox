"use client";

import { useEffect, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import ToolPageLayout from "../../components/ToolPageLayout";
import FileUploadZone, { FileWithPreview } from "../../components/FileUploadZone";
import {
  AspectRatio,
  ExportFormat,
  LayoutStyle,
  composeListingImage,
  compositeLayers,
  getCanvasDimensions
} from "./index";
import InstantPreview from "./InstantPreview";

const ASPECT_RATIO: AspectRatio = "4:3";
const LAYOUT_STYLES: { value: LayoutStyle; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "dividedGrid", label: "Divided Grid" },
  { value: "dividedGrid2", label: "Divided Grid 2" }
];
function parseHex(s: string): string | null {
  const t = s.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(t)) return "#" + t[0] + t[0] + t[1] + t[1] + t[2] + t[2];
  if (/^[0-9a-fA-F]{6}$/.test(t)) return "#" + t.toLowerCase();
  return null;
}

export default function BundleBuilderTool() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [backgroundFiles, setBackgroundFiles] = useState<FileWithPreview[]>([]);
  const [centerFiles, setCenterFiles] = useState<FileWithPreview[]>([]);
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>("dividedGrid");
  const [backgroundMode, setBackgroundMode] = useState<"transparent" | "backgroundImage" | "color">("transparent");
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [hexInput, setHexInput] = useState<string>("#ffffff");
  const [textSafeAreaPercent, setTextSafeAreaPercent] = useState<number>(20);
  const [imagesPerRow, setImagesPerRow] = useState<number | undefined>(undefined);
  const [centerScale, setCenterScale] = useState<number>(1);
  const [centerRotation, setCenterRotation] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);

  const handleDownload = async (format: ExportFormat) => {
    if (files.length < 2) return;
    setIsExporting(true);
    setError(null);
    let contentUrl: string | null = null;
    try {
      const content = await composeListingImage(files as File[], {
        aspectRatio: ASPECT_RATIO,
        layoutStyle,
        background: "transparent",
        exportFormat: "png",
        textSafeAreaPercent,
        imagesPerRow: imagesPerRow && imagesPerRow > 0 ? imagesPerRow : undefined,
        centerImageFile: undefined,
        backgroundImageFile: undefined
      });
      contentUrl = content.url;
      const final = await compositeLayers({
        contentUrl: content.url,
        contentWidth: content.canvas.width,
        contentHeight: content.canvas.height,
        centerImageFile: layoutStyle !== "grid" && centerFiles[0] ? (centerFiles[0] as File) : undefined,
        layoutStyle,
        textSafeAreaPercent,
        centerScale,
        centerRotation,
        backgroundMode,
        backgroundColor: backgroundMode === "color" ? backgroundColor : undefined,
        backgroundImageFile: backgroundMode === "backgroundImage" ? (backgroundFiles[0] as File | undefined) : undefined,
        exportFormat: format
      });
      if (contentUrl) URL.revokeObjectURL(contentUrl);
      const link = document.createElement("a");
      link.href = final.url;
      link.download = `bundle-builder-4x3-${layoutStyle}-${final.canvas.width}x${final.canvas.height}.${format === "webp" ? "webp" : "png"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(final.url), 100);
    } catch (err) {
      console.error("Export failed:", err);
      setError("Export failed. Please try again.");
      if (contentUrl) URL.revokeObjectURL(contentUrl);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    // Clear all files
    setFiles([]);
    setBackgroundFiles([]);
    setCenterFiles([]);
    // Reset to default settings
    setLayoutStyle("dividedGrid");
    setBackgroundMode("transparent");
    setBackgroundColor("#ffffff");
    setHexInput("#ffffff");
    setTextSafeAreaPercent(20);
        setImagesPerRow(undefined);
        setCenterScale(1);
        setCenterRotation(0);
        setError(null);
        setShowPreviewModal(false);
        setShowColorPickerModal(false);
    // Revoke object URLs to free memory
    files.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
    backgroundFiles.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
    centerFiles.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPreviewModal(false);
        setShowColorPickerModal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const { width: previewWidth, height: previewHeight } = getCanvasDimensions(ASPECT_RATIO);

  const aspectRatioStyle =
    previewWidth && previewHeight
      ? { aspectRatio: `${previewWidth}/${previewHeight}` }
      : {};

  const backgroundLabel = backgroundMode === "transparent" ? "Transparent" : backgroundMode === "backgroundImage" ? "Background image" : backgroundColor;
  const settingsSummary = `Aspect ratio: ${ASPECT_RATIO} · Layout: ${
    LAYOUT_STYLES.find((l) => l.value === layoutStyle)?.label ?? layoutStyle
  } · Background: ${backgroundLabel} · Text area: ${textSafeAreaPercent}%`;

  const actionButton = files.length > 0 ? (
    <button
      onClick={handleReset}
      disabled={isExporting}
      className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
      type="button"
    >
      <RotateCcw className="h-4 w-4" />
      Reset
    </button>
  ) : null;

  const controls = (
    <div className="space-y-4 min-h-0 lg:max-h-[65vh] lg:overflow-y-auto lg:pr-1">
      {/* Bundle Images */}
      <FileUploadZone
        title="Bundle Images"
        variant="subtleWhite"
        dropPromptText="Drop images or click"
        files={files}
        onFilesChange={setFiles}
        disabled={isExporting}
        actionButton={actionButton}
        acceptedFileTypes="image/*"
        supportedFormatsText=""
        maxDisplayHeight="max-h-48"
        showThumbnails={true}
        fileListColumns={2}
        compactDropZone={true}
      />

      {/* Layout style */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Layout style
        </label>
        <select
          value={layoutStyle}
          onChange={(e) => setLayoutStyle(e.target.value as LayoutStyle)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm"
        >
          {LAYOUT_STYLES.map((layout) => (
            <option key={layout.value} value={layout.value}>
              {layout.label}
            </option>
          ))}
        </select>
      </div>

      {/* Text-safe area size - only show for non-grid layouts */}
      {layoutStyle !== "grid" && (
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Central text area size: {textSafeAreaPercent}%
          </label>
          <input
            type="range"
            min="10"
            max="40"
            step="5"
            value={textSafeAreaPercent}
            onChange={(e) => setTextSafeAreaPercent(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Smaller (10%)</span>
            <span>Larger (40%)</span>
          </div>
        </div>
      )}


      {/* Images per row */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Images per row
        </label>
        <input
          type="number"
          min="1"
          max={files.length}
          value={imagesPerRow || ""}
          onChange={(e) => {
            const value = e.target.value;
            setImagesPerRow(value === "" ? undefined : Math.max(1, Math.min(files.length, Number(value))));
          }}
          placeholder="Auto"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm"
        />
      </div>

      {/* Background and center - under Images per row */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Background</label>
          <div className="flex gap-2 items-center flex-wrap">
            <button type="button" onClick={() => setBackgroundMode("transparent")} className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${backgroundMode === "transparent" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"}`}>Transparent</button>
            <button type="button" onClick={() => setBackgroundMode("backgroundImage")} className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${backgroundMode === "backgroundImage" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"}`}>Background image</button>
            <button
              type="button"
              onClick={() => {
                setBackgroundMode("color");
                setHexInput(backgroundColor);
                setShowColorPickerModal(true);
              }}
              className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${backgroundMode === "color" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"}`}
            >
              <span className="inline-block h-4 w-4 rounded border border-gray-300" style={{ backgroundColor }} aria-hidden="true" />
              Color
            </button>
          </div>
          {backgroundMode === "backgroundImage" && (
            <div className="mt-3">
              <FileUploadZone title="Background image" variant="subtle" dropPromptText="Drop a background image or click to select" files={backgroundFiles} onFilesChange={setBackgroundFiles} disabled={isExporting} actionButton={null} acceptedFileTypes="image/*" supportedFormatsText="" maxDisplayHeight="max-h-24" multiple={false} maxFiles={1} showFileSize={false} compactDropZone={true} />
            </div>
          )}
        </div>
        {layoutStyle !== "grid" && (
          <div className="space-y-3">
            <FileUploadZone title="Center image" variant="subtle" dropPromptText="Drop a center image or click to select" files={centerFiles} onFilesChange={setCenterFiles} disabled={isExporting} actionButton={null} acceptedFileTypes="image/*" supportedFormatsText="" maxDisplayHeight="max-h-24" multiple={false} maxFiles={1} showFileSize={false} compactDropZone={true} />
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Center scale: {Math.round(centerScale * 100)}%</label>
              <input
                type="range"
                min="50"
                max="150"
                step="5"
                value={Math.round(centerScale * 100)}
                onChange={(e) => setCenterScale(Number(e.target.value) / 100)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Center rotation: {centerRotation}°</label>
              <input
                type="range"
                min="-180"
                max="180"
                step="5"
                value={centerRotation}
                onChange={(e) => setCenterRotation(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <ToolPageLayout
      title="Bundle Builder"
      description="Arrange multiple previews into a single, text-ready bundle cover image for your digital products."
      showBackButton={true}
    >
      {/* Uploads + controls */}
      <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
          {/* Controls */}
          {controls}

          {/* Bundle Image Preview (right column) */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Bundle Image Preview</h2>

            <div className="relative w-full">
              <div
                className={`relative w-full rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm ${files.length >= 2 ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
                style={aspectRatioStyle}
                onClick={files.length >= 2 ? () => setShowPreviewModal(true) : undefined}
                onKeyDown={files.length >= 2 ? (e) => e.key === "Enter" && setShowPreviewModal(true) : undefined}
                role={files.length >= 2 ? "button" : undefined}
                tabIndex={files.length >= 2 ? 0 : undefined}
                aria-label={files.length >= 2 ? "View larger preview" : undefined}
              >
                {files.length >= 2 ? (
                  <InstantPreview
                    files={files}
                    centerFiles={centerFiles}
                    backgroundFiles={backgroundFiles}
                    backgroundMode={backgroundMode}
                    backgroundColor={backgroundColor}
                    layoutStyle={layoutStyle}
                    textSafeAreaPercent={textSafeAreaPercent}
                    imagesPerRow={imagesPerRow}
                    centerScale={centerScale}
                    centerRotation={centerRotation}
                    aspectRatio={ASPECT_RATIO}
                    className="absolute inset-0"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400" style={{ minHeight: 200 }}>
                    Add at least 2 bundle images to see a live preview
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Export - full width at bottom */}
      <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Export
          </h2>
          <p className="text-sm text-gray-600">
            Download your combined bundle image and add your brand text or titles in your preferred design tool (Canva, Affinity, Photoshop, etc.).
          </p>

          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <div className="text-sm text-gray-700">
              <span className="font-medium">Current settings:</span>{" "}
              <span>{settingsSummary}</span>
            </div>

            <div className="text-sm text-gray-500">
              Output size:{" "}
              <span className="font-medium">
                {previewWidth} × {previewHeight} px
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleDownload("png")}
                disabled={files.length < 2 || isExporting}
                className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                type="button"
              >
                {isExporting ? "Preparing…" : "Download PNG"}
              </button>
              <button
                onClick={() => handleDownload("webp")}
                disabled={files.length < 2 || isExporting}
                className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                type="button"
              >
                {isExporting ? "Preparing…" : "Download WebP"}
              </button>
            </div>
            {files.length < 2 && (
              <p className="text-xs text-gray-500">Add at least 2 bundle images to export</p>
            )}

            <p className="text-xs text-gray-400">
              Tip: Use this as your primary bundle image to showcase what&apos;s inside larger digital product bundles or printable sets.
            </p>
          </div>
      </div>

      {/* Larger preview modal */}
      {showPreviewModal && files.length >= 2 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowPreviewModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Larger preview"
        >
          <button
            type="button"
            onClick={() => setShowPreviewModal(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/90 hover:bg-white text-gray-700 transition-colors z-10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden bg-white"
            style={{ aspectRatio: `${previewWidth}/${previewHeight}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <InstantPreview
              files={files}
              centerFiles={centerFiles}
              backgroundFiles={backgroundFiles}
              backgroundMode={backgroundMode}
              backgroundColor={backgroundColor}
              layoutStyle={layoutStyle}
              textSafeAreaPercent={textSafeAreaPercent}
              imagesPerRow={imagesPerRow}
              centerScale={centerScale}
              centerRotation={centerRotation}
              aspectRatio={ASPECT_RATIO}
              className="w-full h-full relative"
            />
          </div>
        </div>
      )}

      {/* Color picker modal */}
      {showColorPickerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowColorPickerModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Pick background color"
        >
          <div
            className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Background color</h3>
              <button
                type="button"
                onClick={() => setShowColorPickerModal(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => {
                  const v = e.target.value;
                  setBackgroundColor(v);
                  setHexInput(v);
                }}
                className="h-12 w-14 shrink-0 p-1 border border-gray-300 rounded-lg cursor-pointer"
                aria-label="Pick color"
              />
              <input
                type="text"
                value={hexInput}
                onChange={(e) => {
                  const r = e.target.value;
                  setHexInput(r);
                  const p = parseHex(r);
                  if (p) setBackgroundColor(p);
                }}
                onBlur={() => {
                  const p = parseHex(hexInput);
                  if (p) setHexInput(p);
                  else setHexInput(backgroundColor);
                }}
                placeholder="#ffffff"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono text-gray-900"
                aria-label="Hex color"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowColorPickerModal(false)}
              className="w-full py-2.5 px-4 rounded-lg bg-gray-100 text-gray-800 font-medium hover:bg-gray-200 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}

