"use client";

import type { ExportFormat } from "../../types";
import type { AspectRatio } from "../../types";
import type { OverlayImage } from "../../OverlayImageEditor";
import OverlayImageEditor from "../../OverlayImageEditor";
import { getCanvasDimensions } from "../../canvas";

interface Step5ExportProps {
  aspectRatio: AspectRatio;
  layoutStyle: string;
  backgroundMode: "transparent" | "backgroundImage" | "color";
  backgroundColor: string;
  textSafeAreaPercent: number;
  files: Array<{ id: string }>;
  overlayImages: OverlayImage[];
  onOverlayImagesChange: (images: OverlayImage[]) => void;
  previewContainerRef: React.RefObject<HTMLDivElement | null>;
  onDownload: (format: ExportFormat) => void;
  isExporting: boolean;
}

export default function Step5Export({
  aspectRatio,
  layoutStyle,
  backgroundMode,
  backgroundColor,
  textSafeAreaPercent,
  files,
  overlayImages,
  onOverlayImagesChange,
  previewContainerRef,
  onDownload,
  isExporting
}: Step5ExportProps) {
  const { width: previewWidth, height: previewHeight } = getCanvasDimensions(aspectRatio);
  
  const backgroundLabel = backgroundMode === "transparent" ? "Transparent" : backgroundMode === "backgroundImage" ? "Background image" : backgroundColor;
  const settingsSummary = `Aspect ratio: ${aspectRatio} · Layout: ${layoutStyle} · Background: ${backgroundLabel} · Text area: ${textSafeAreaPercent}%`;

  return (
    <div className="space-y-4">
      <div className="text-sm text-brand-white">
        <span className="font-medium">Current settings:</span> <span>{settingsSummary}</span>
      </div>
      <div className="text-sm text-brand-white/90">
        Output size: <span className="font-medium">{previewWidth} × {previewHeight} px</span>
      </div>
      <OverlayImageEditor
        overlayImages={overlayImages}
        onOverlayImagesChange={onOverlayImagesChange}
        aspectRatio={aspectRatio}
        previewContainerRef={previewContainerRef}
      />
      <div className="flex gap-2">
        <button
          onClick={() => onDownload("png")}
          disabled={files.length < 2 || isExporting}
          className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          type="button"
        >
          {isExporting ? "Preparing…" : "Download PNG"}
        </button>
        <button
          onClick={() => onDownload("webp")}
          disabled={files.length < 2 || isExporting}
          className="flex-1 bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          type="button"
        >
          {isExporting ? "Preparing…" : "Download WebP"}
        </button>
      </div>
      {files.length < 2 && <p className="text-xs text-brand-white/90">Add at least 2 bundle images to export</p>}
      <p className="text-xs text-brand-white/80">Tip: Use this as your primary bundle image to showcase what&apos;s inside larger digital product bundles or printable sets.</p>
    </div>
  );
}
