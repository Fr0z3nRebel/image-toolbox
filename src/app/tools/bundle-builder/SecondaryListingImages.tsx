"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Download } from "lucide-react";
import FileUploadZone, { type FileWithPreview } from "../../components/FileUploadZone";
import ThemedSelect from "../../components/ThemedSelect";
import { createAndDownloadZip } from "../../components/utils/zipUtils";
import ColorPickerModal from "./ColorPickerModal";
import BackgroundSelector from "./components/steps/shared/BackgroundSelector";

const OUTPUT_SIZE = 2048;
const PREVIEW_SIZE = 280;
const MIN_GRID = 1;
const MAX_GRID = 4;
const DEFAULT_GRID = 2;

type BackgroundMode = "transparent" | "color" | "image";

interface DrawBackgroundOptions {
  backgroundColor?: string;
  backgroundImage?: HTMLImageElement;
}

function loadImageFromFile(file: FileWithPreview): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = file.preview || URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${file.name}`));
    img.src = url;
  });
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  size: number,
  options: DrawBackgroundOptions | undefined
): void {
  if (!options) {
    ctx.clearRect(0, 0, size, size);
    return;
  }
  if (options.backgroundColor) {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, size, size);
    return;
  }
  if (options.backgroundImage) {
    const img = options.backgroundImage;
    const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const x = (size - w) / 2;
    const y = (size - h) / 2;
    ctx.drawImage(img, x, y, w, h);
    return;
  }
  ctx.clearRect(0, 0, size, size);
}

function drawPageToContext(
  ctx: CanvasRenderingContext2D,
  size: number,
  images: HTMLImageElement[],
  gridSize: number,
  pageIndex: number,
  backgroundOptions?: DrawBackgroundOptions
): void {
  const cellsPerPage = gridSize * gridSize;
  const start = pageIndex * cellsPerPage;
  const cellImages = images.slice(start, start + cellsPerPage);

  drawBackground(ctx, size, backgroundOptions);

  const cellWidth = size / gridSize;
  const cellHeight = size / gridSize;

  for (let i = 0; i < cellImages.length; i++) {
    const img = cellImages[i];
    const col = i % gridSize;
    const row = Math.floor(i / gridSize);
    const x = col * cellWidth;
    const y = row * cellHeight;

    const scale = Math.min(cellWidth / img.naturalWidth, cellHeight / img.naturalHeight);
    const drawWidth = img.naturalWidth * scale;
    const drawHeight = img.naturalHeight * scale;
    const drawX = x + (cellWidth - drawWidth) / 2;
    const drawY = y + (cellHeight - drawHeight) / 2;

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  }
}

async function renderPageToBlob(
  images: HTMLImageElement[],
  gridSize: number,
  pageIndex: number,
  backgroundOptions?: DrawBackgroundOptions
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  drawPageToContext(ctx, OUTPUT_SIZE, images, gridSize, pageIndex, backgroundOptions);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
      1
    );
  });
}

export default function SecondaryListingImages() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [gridSize, setGridSize] = useState<number>(DEFAULT_GRID);
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>("transparent");
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [backgroundFiles, setBackgroundFiles] = useState<FileWithPreview[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const previewCancelRef = useRef(false);

  const cellsPerPage = gridSize * gridSize;
  const pageCount = files.length > 0 ? Math.ceil(files.length / cellsPerPage) : 0;

  const getBackgroundOptions = useCallback(
    (bgImage: HTMLImageElement | null): DrawBackgroundOptions | undefined => {
      if (backgroundMode === "transparent") return undefined;
      if (backgroundMode === "color") return { backgroundColor };
      if (backgroundMode === "image" && bgImage) return { backgroundImage: bgImage };
      return undefined;
    },
    [backgroundMode, backgroundColor]
  );

  // Generate preview data URLs when files, gridSize, or background change
  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrls([]);
      return;
    }
    previewCancelRef.current = false;
    let cancelled = false;
    const loadBackground = () => {
      if (backgroundMode !== "image" || backgroundFiles.length === 0) return Promise.resolve(null);
      return loadImageFromFile(backgroundFiles[0]).catch(() => null);
    };
    Promise.all([Promise.all(files.map(loadImageFromFile)), loadBackground()])
      .then(([images, bgImage]) => {
        if (cancelled || previewCancelRef.current) return;
        const pageCountNow = Math.ceil(files.length / (gridSize * gridSize));
        const canvas = document.createElement("canvas");
        canvas.width = PREVIEW_SIZE;
        canvas.height = PREVIEW_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const bgOpts = getBackgroundOptions(bgImage ?? null);
        const urls: string[] = [];
        for (let p = 0; p < pageCountNow; p++) {
          if (cancelled || previewCancelRef.current) break;
          drawPageToContext(ctx, PREVIEW_SIZE, images, gridSize, p, bgOpts);
          urls.push(canvas.toDataURL("image/png"));
        }
        if (!cancelled && !previewCancelRef.current) setPreviewUrls(urls);
      })
      .catch(() => {
        if (!cancelled && !previewCancelRef.current) setPreviewUrls([]);
      });
    return () => {
      cancelled = true;
      previewCancelRef.current = true;
    };
  }, [files, gridSize, backgroundMode, backgroundColor, backgroundFiles, getBackgroundOptions]);

  const handleExport = useCallback(async () => {
    if (files.length === 0) {
      setError("Add at least one clipart to export.");
      return;
    }
    if (backgroundMode === "image" && backgroundFiles.length === 0) {
      setError("Please upload a background image or switch to Transparent or Color.");
      return;
    }
    setIsExporting(true);
    setError(null);
    try {
      const [images, bgImage] = await Promise.all([
        Promise.all(files.map(loadImageFromFile)),
        backgroundMode === "image" && backgroundFiles.length > 0
          ? loadImageFromFile(backgroundFiles[0])
          : Promise.resolve(null)
      ]);
      const bgOpts = getBackgroundOptions(bgImage ?? null);
      const blobs: { name: string; blob: Blob }[] = [];
      for (let p = 0; p < pageCount; p++) {
        const blob = await renderPageToBlob(images, gridSize, p, bgOpts);
        blobs.push({
          name: `secondary-listing-${String(p + 1).padStart(2, "0")}.png`,
          blob
        });
      }
      await createAndDownloadZip(blobs, "secondary-listing-images.zip");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  }, [files, gridSize, pageCount, backgroundMode, backgroundFiles, getBackgroundOptions]);

  return (
    <div className="mb-8 bg-brand-grey rounded-xl border border-brand-charcoal p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
        {/* Left column: upload + controls (smaller, like Primary steps) */}
        <div className="flex flex-col min-h-0 space-y-4">
          <FileUploadZone
            title="Clipart images"
            variant="subtleWhite"
            dropPromptText="Drop cliparts or click"
            files={files}
            onFilesChange={setFiles}
            disabled={isExporting}
            actionButton={<span className="sr-only">Export below</span>}
            acceptedFileTypes="image/*"
            supportedFormatsText=""
            maxDisplayHeight="max-h-48"
            showThumbnails={true}
            fileListColumns={2}
            compactDropZone={true}
          />

          <div>
            <p className="text-xs text-brand-white/90 mb-2">
              {gridSize}×{gridSize} = {cellsPerPage} cliparts per page. Images are 2048×2048 px (1:1).
            </p>
            <ThemedSelect
              label="Grid size (per page)"
              value={String(gridSize)}
              options={Array.from({ length: MAX_GRID - MIN_GRID + 1 }, (_, i) => {
                const n = MIN_GRID + i;
                return { value: String(n), label: `${n}×${n}` };
              })}
              onChange={(v) => setGridSize(Number(v))}
              className="text-sm"
            />
          </div>

          <BackgroundSelector
            backgroundMode={backgroundMode === "image" ? "backgroundImage" : backgroundMode}
            backgroundColor={backgroundColor}
            backgroundFiles={backgroundFiles}
            onBackgroundModeChange={(mode) => setBackgroundMode(mode === "backgroundImage" ? "image" : mode)}
            onBackgroundFilesChange={(newFiles) => setBackgroundFiles(newFiles.slice(0, 1))}
            onShowColorPicker={() => setShowColorPicker(true)}
            isExporting={isExporting}
          />
        </div>

        {/* Right column: export preview (fill and wrap) */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <label className="block text-sm font-bold text-brand-white mb-2 shrink-0">Export preview</label>
          <p className="text-xs text-brand-white/90 mb-3 shrink-0">
            This is how each exported page will look (2048×2048 px in the ZIP).
          </p>
          {files.length === 0 ? (
            <div className="flex-1 rounded-lg border border-gray-200 border-dashed bg-gray-50 flex items-center justify-center min-h-[200px]">
              <p className="text-sm text-brand-white/90">Add cliparts to see preview</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 content-start overflow-y-auto min-h-0">
              {previewUrls.map((url, index) => (
                <div key={index} className="flex flex-col items-start shrink-0">
                  <span className="text-xs font-medium text-brand-white/90 mb-1.5">
                    Page {index + 1}
                  </span>
                  <div
                    className="rounded-lg border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center"
                    style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
                  >
                    <img
                      src={url}
                      alt={`Page ${index + 1} preview`}
                      className="w-full h-full object-contain rounded-lg"
                      width={PREVIEW_SIZE}
                      height={PREVIEW_SIZE}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleExport}
        disabled={files.length === 0 || isExporting}
        className="mt-6 w-full bg-brand-orange text-white py-2.5 px-4 rounded-lg font-medium hover:bg-brand-600 disabled:bg-brand-charcoal disabled:text-brand-white/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
      >
        <Download className="h-4 w-4" />
        {isExporting ? "Exporting…" : "Export as ZIP"}
      </button>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showColorPicker && (
        <ColorPickerModal
          open={true}
          onClose={() => setShowColorPicker(false)}
          value={backgroundColor}
          onChange={setBackgroundColor}
          title="Background color"
        />
      )}
    </div>
  );
}
