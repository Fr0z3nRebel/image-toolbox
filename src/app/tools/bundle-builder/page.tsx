"use client";

import { useEffect, useState } from "react";
import { RotateCcw, X, Save, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" }
];
const LAYOUT_STYLES: { value: LayoutStyle; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "dividedGrid", label: "Divided Grid" },
  { value: "dividedGrid2", label: "Divided Grid 2" }
];

const WIZARD_STEPS = [
  { num: 1, label: "Setup" },
  { num: 2, label: "Layout" },
  { num: 3, label: "Center" },
  { num: 4, label: "Animation" },
  { num: 5, label: "Export" }
] as const;

interface BundleBuilderPreset {
  name: string;
  aspectRatio: AspectRatio;
  layoutStyle: LayoutStyle;
  backgroundMode: "transparent" | "backgroundImage" | "color";
  backgroundColor: string;
  textSafeAreaPercent: number;
  imagesPerRow: number | undefined;
  centerScale: number;
  centerRotation: number;
  centerXOffset: number;
  centerYOffset: number;
}

const PRESET_STORAGE_KEY = "bundle-builder-presets";

function loadPresets(): Record<string, BundleBuilderPreset> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(PRESET_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function savePresets(presets: Record<string, BundleBuilderPreset>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Ignore storage errors
  }
}
function parseHex(s: string): string | null {
  const t = s.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(t)) return "#" + t[0] + t[0] + t[1] + t[1] + t[2] + t[2];
  if (/^[0-9a-fA-F]{6}$/.test(t)) return "#" + t.toLowerCase();
  return null;
}

export default function BundleBuilderTool() {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [backgroundFiles, setBackgroundFiles] = useState<FileWithPreview[]>([]);
  const [centerFiles, setCenterFiles] = useState<FileWithPreview[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>("dividedGrid");
  const [backgroundMode, setBackgroundMode] = useState<"transparent" | "backgroundImage" | "color">("transparent");
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [hexInput, setHexInput] = useState<string>("#ffffff");
  const [textSafeAreaPercent, setTextSafeAreaPercent] = useState<number>(20);
  const [imagesPerRow, setImagesPerRow] = useState<number | undefined>(undefined);
  const [centerScale, setCenterScale] = useState<number>(1);
  const [centerRotation, setCenterRotation] = useState<number>(0);
  const [centerXOffset, setCenterXOffset] = useState<number>(0);
  const [centerYOffset, setCenterYOffset] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);
  const [presets, setPresets] = useState<Record<string, BundleBuilderPreset>>({});
  const [presetNameInput, setPresetNameInput] = useState<string>("");
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);

  const handleDownload = async (format: ExportFormat) => {
    if (files.length < 2) return;
    setIsExporting(true);
    setError(null);
    let contentUrl: string | null = null;
    try {
      const content = await composeListingImage(files as File[], {
        aspectRatio,
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
        centerXOffset,
        centerYOffset,
        backgroundMode,
        backgroundColor: backgroundMode === "color" ? backgroundColor : undefined,
        backgroundImageFile: backgroundMode === "backgroundImage" ? (backgroundFiles[0] as File | undefined) : undefined,
        exportFormat: format
      });
      if (contentUrl) URL.revokeObjectURL(contentUrl);
      const link = document.createElement("a");
      link.href = final.url;
      link.download = `bundle-builder-${aspectRatio.replace(":", "x")}-${layoutStyle}-${final.canvas.width}x${final.canvas.height}.${format === "webp" ? "webp" : "png"}`;
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
    setStep(1);
    // Clear all files
    setFiles([]);
    setBackgroundFiles([]);
    setCenterFiles([]);
    // Reset to default settings
    setAspectRatio("1:1");
    setLayoutStyle("dividedGrid");
    setBackgroundMode("transparent");
    setBackgroundColor("#ffffff");
    setHexInput("#ffffff");
    setTextSafeAreaPercent(20);
        setImagesPerRow(undefined);
        setCenterScale(1);
        setCenterRotation(0);
        setCenterXOffset(0);
        setCenterYOffset(0);
        setError(null);
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

  // Load presets from localStorage on mount
  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowColorPickerModal(false);
        setShowSavePresetModal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSavePreset = () => {
    if (!presetNameInput.trim()) {
      setError("Please enter a preset name");
      return;
    }
    const newPreset: BundleBuilderPreset = {
      name: presetNameInput.trim(),
      aspectRatio,
      layoutStyle,
      backgroundMode,
      backgroundColor,
      textSafeAreaPercent,
      imagesPerRow,
      centerScale,
      centerRotation,
      centerXOffset,
      centerYOffset
    };
    const updatedPresets = { ...presets, [presetNameInput.trim()]: newPreset };
    setPresets(updatedPresets);
    savePresets(updatedPresets);
    setPresetNameInput("");
    setShowSavePresetModal(false);
    setError(null);
  };

  const handleLoadPreset = (presetName: string) => {
    const preset = presets[presetName];
    if (!preset) return;
    setAspectRatio(preset.aspectRatio);
    setLayoutStyle(preset.layoutStyle);
    setBackgroundMode(preset.backgroundMode);
    setBackgroundColor(preset.backgroundColor);
    setHexInput(preset.backgroundColor);
    setTextSafeAreaPercent(preset.textSafeAreaPercent);
    setImagesPerRow(preset.imagesPerRow);
    setCenterScale(preset.centerScale);
    setCenterRotation(preset.centerRotation);
    setCenterXOffset(preset.centerXOffset);
    setCenterYOffset(preset.centerYOffset);
  };

  const handleDeletePreset = (presetName: string) => {
    const updatedPresets = { ...presets };
    delete updatedPresets[presetName];
    setPresets(updatedPresets);
    savePresets(updatedPresets);
  };

  const { width: previewWidth, height: previewHeight } = getCanvasDimensions(aspectRatio);

  const previewRatio = previewWidth && previewHeight ? previewWidth / previewHeight : 1;
  const aspectRatioStyle: React.CSSProperties =
    previewWidth && previewHeight
      ? {
          aspectRatio: `${previewWidth}/${previewHeight}`,
          maxHeight: "90vh",
          maxWidth: "100%",
          width: `min(100%, ${90 * previewRatio}vh)`,
          height: "auto"
        }
      : {};

  const backgroundLabel = backgroundMode === "transparent" ? "Transparent" : backgroundMode === "backgroundImage" ? "Background image" : backgroundColor;
  const settingsSummary = `Aspect ratio: ${aspectRatio} · Layout: ${
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

  const stepContent =
    step === 1 ? (
      <div className="space-y-4">
        <div className="space-y-2 pb-4 border-b border-gray-200">
          <label className="block text-sm font-bold text-gray-700 mb-2">Presets</label>
          <div className="flex gap-2">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  handleLoadPreset(e.target.value);
                  e.target.value = "";
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm"
            >
              <option value="">Load preset...</option>
              {Object.keys(presets).map((name) => (
                <option key={name} value={name}>
                  {presets[name].name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowSavePresetModal(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-sm font-medium"
              title="Save current settings as preset"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          </div>
          {Object.keys(presets).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.keys(presets).map((name) => (
                <div key={name} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 rounded-lg text-sm">
                  <span className="text-gray-700">{name}</span>
                  <button type="button" onClick={() => handleDeletePreset(name)} className="text-gray-500 hover:text-red-600 transition-colors" title="Delete preset">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Aspect ratio</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm"
          >
            {ASPECT_RATIOS.map((ratio) => (
              <option key={ratio.value} value={ratio.value}>
                {ratio.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    ) : step === 2 ? (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Layout style</label>
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
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Images per row</label>
          <p className="text-xs text-gray-500 mb-2">Leave empty for automatic layout.</p>
          <input
            type="number"
            min={1}
            max={files.length}
            value={imagesPerRow ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              setImagesPerRow(value === "" ? undefined : Math.max(1, Math.min(files.length, Number(value))));
            }}
            placeholder="Auto"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Background</label>
          <div className="flex gap-2 items-center flex-wrap">
            <button
              type="button"
              onClick={() => setBackgroundMode("transparent")}
              className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${backgroundMode === "transparent" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"}`}
            >
              Transparent
            </button>
            <button
              type="button"
              onClick={() => setBackgroundMode("backgroundImage")}
              className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${backgroundMode === "backgroundImage" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700 hover:border-blue-300"}`}
            >
              Background image
            </button>
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
              <FileUploadZone
                title="Background image"
                variant="subtle"
                dropPromptText="Drop a background image or click to select"
                files={backgroundFiles}
                onFilesChange={setBackgroundFiles}
                disabled={isExporting}
                actionButton={null}
                acceptedFileTypes="image/*"
                supportedFormatsText=""
                maxDisplayHeight="max-h-24"
                multiple={false}
                maxFiles={1}
                showFileSize={false}
                compactDropZone={true}
              />
            </div>
          )}
        </div>
      </div>
    ) : step === 3 ? (
      <div className="space-y-4">
        {layoutStyle === "grid" ? (
          <p className="text-sm text-gray-600">Center options are for divided layouts only. Use Back to change the layout style, or continue to the next step.</p>
        ) : (
          <>
            <FileUploadZone
              title="Center image"
              variant="subtle"
              dropPromptText="Drop a center image or click to select"
              files={centerFiles}
              onFilesChange={setCenterFiles}
              disabled={isExporting}
              actionButton={null}
              acceptedFileTypes="image/*"
              supportedFormatsText=""
              maxDisplayHeight="max-h-24"
              multiple={false}
              maxFiles={1}
              showFileSize={false}
              compactDropZone={true}
            />
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Central text area size: {textSafeAreaPercent}%</label>
              <input
                type="range"
                min={10}
                max={40}
                step={5}
                value={textSafeAreaPercent}
                onChange={(e) => setTextSafeAreaPercent(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Smaller (10%)</span>
                <span>Larger (40%)</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Center scale: {Math.round(centerScale * 100)}%</label>
              <input type="range" min={50} max={150} step={1} value={Math.round(centerScale * 100)} onChange={(e) => setCenterScale(Number(e.target.value) / 100)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Center rotation: {centerRotation}°</label>
              <input type="range" min={-180} max={180} step={1} value={centerRotation} onChange={(e) => setCenterRotation(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Center position (left/right): {centerXOffset}%</label>
              <input type="range" min={-50} max={50} step={1} value={centerXOffset} onChange={(e) => setCenterXOffset(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Center position (up/down): {centerYOffset}%</label>
              <input type="range" min={-50} max={50} step={1} value={centerYOffset} onChange={(e) => setCenterYOffset(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider" />
            </div>
          </>
        )}
      </div>
    ) : step === 4 ? (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Animation options coming soon.</p>
      </div>
    ) : (
      <div className="space-y-4">
        <div className="text-sm text-gray-700">
          <span className="font-medium">Current settings:</span> <span>{settingsSummary}</span>
        </div>
        <div className="text-sm text-gray-500">
          Output size: <span className="font-medium">{previewWidth} × {previewHeight} px</span>
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
        {files.length < 2 && <p className="text-xs text-gray-500">Add at least 2 bundle images to export</p>}
        <p className="text-xs text-gray-400">Tip: Use this as your primary bundle image to showcase what&apos;s inside larger digital product bundles or printable sets.</p>
      </div>
    );

  return (
    <ToolPageLayout
      title="Bundle Builder"
      description="Arrange multiple previews into a single, text-ready bundle cover image for your digital products."
      showBackButton={true}
    >
      {/* Wizard + preview */}
      <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
          {/* Stepper + step content */}
          <div className="flex flex-col min-h-0">
            <nav aria-label="Steps" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mb-4 pb-4 border-b border-gray-200">
              {WIZARD_STEPS.map((s, i) => (
                <span key={s.num} className="flex items-center gap-x-1.5">
                  {i > 0 && <span className="text-gray-300 select-none" aria-hidden>•</span>}
                  <span
                    className={`text-sm font-medium ${step === s.num ? "text-blue-600" : "text-gray-500"}`}
                    aria-current={step === s.num ? "step" : undefined}
                  >
                    {s.num}. {s.label}
                  </span>
                </span>
              ))}
            </nav>
            <div className="space-y-4 flex-1 min-h-0 overflow-y-auto lg:pr-1">
              {stepContent}
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 shrink-0">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              ) : null}
              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors text-sm flex-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Bundle Image Preview (right column) */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            <div className="relative w-full min-h-0 flex justify-center items-start max-h-[90vh]">
              <div
                className="relative rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm shrink-0"
                style={aspectRatioStyle}
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
                    centerXOffset={centerXOffset}
                    centerYOffset={centerYOffset}
                    aspectRatio={aspectRatio}
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

      {/* Save preset modal */}
      {showSavePresetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => {
            setShowSavePresetModal(false);
            setPresetNameInput("");
            setError(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Save preset"
        >
          <div
            className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Save Preset</h3>
              <button
                type="button"
                onClick={() => {
                  setShowSavePresetModal(false);
                  setPresetNameInput("");
                  setError(null);
                }}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Preset name
              </label>
              <input
                type="text"
                value={presetNameInput}
                onChange={(e) => {
                  setPresetNameInput(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSavePreset();
                  }
                }}
                placeholder="Enter preset name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSavePresetModal(false);
                  setPresetNameInput("");
                  setError(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-lg bg-gray-100 text-gray-800 font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePreset}
                className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolPageLayout>
  );
}

