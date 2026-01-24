"use client";

import { useEffect, useState } from "react";
import type { AspectRatio, LayoutStyle } from "./types";
import type { FileWithPreview } from "../../components/FileUploadZone";
import { getCanvasDimensions } from "./canvas";
import { getTextSafeRect } from "./text-safe-area";
import { computeImageFrames } from "./layouts";
import { getContentCroppedDataUrlFromUrl } from "./image-processing";

export interface InstantPreviewProps {
  files: FileWithPreview[];
  centerFiles: FileWithPreview[];
  backgroundFiles: FileWithPreview[];
  backgroundMode: "transparent" | "backgroundImage" | "color";
  backgroundColor: string;
  layoutStyle: LayoutStyle;
  textSafeAreaPercent: number;
  imagesPerRow?: number;
  centerScale?: number;
  centerRotation?: number;
  centerXOffset?: number;
  centerYOffset?: number;
  aspectRatio: AspectRatio;
  className?: string;
}

/**
 * DOM-based instant preview. Uses file preview URLs and layout math only—
 * no canvas or image loading. Matches the export layout; composition runs only on export.
 */
export default function InstantPreview({
  files,
  centerFiles,
  backgroundFiles,
  backgroundMode,
  backgroundColor,
  layoutStyle,
  textSafeAreaPercent,
  imagesPerRow,
  centerScale = 1,
  centerRotation = 0,
  centerXOffset = 0,
  centerYOffset = 0,
  aspectRatio,
  className = ""
}: InstantPreviewProps) {
  const { width: w, height: h } = getCanvasDimensions(aspectRatio);
  const textSafeRect = getTextSafeRect(w, h, textSafeAreaPercent);
  const frames = computeImageFrames(layoutStyle, w, h, files.length, textSafeRect, imagesPerRow);

  const [contentCropped, setContentCropped] = useState<Record<string, string>>({});

  useEffect(() => {
    setContentCropped((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (!files.some((f) => f.id === id)) delete next[id];
      }
      return next;
    });

    files.forEach((file) => {
      if (!file.preview) return;
      getContentCroppedDataUrlFromUrl(file.preview)
        .then((url) => setContentCropped((prev) => ({ ...prev, [file.id]: url })))
        .catch(() => {});
    });
  }, [files]);

  const bgStyle: React.CSSProperties =
    backgroundMode === "transparent"
      ? { backgroundImage: "none", backgroundColor: "transparent" }
      : backgroundMode === "color"
        ? { backgroundImage: "none", backgroundColor }
        : {
            backgroundImage: backgroundFiles[0]?.preview ? `url(${backgroundFiles[0].preview})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundColor: "#f3f4f6"
          };

  const framePaddingPercent = layoutStyle === "grid" ? 92 : 90;

  const isProcessing = files.some((f) => f.preview && !contentCropped[f.id]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`.trim()}
      style={bgStyle}
    >
      {frames.map((frame, i) => {
        const file = files[i];
        const cropped = file ? contentCropped[file.id] : undefined;
        return (
          <div
            key={i}
            className="absolute flex items-center justify-center"
            style={{
              left: `${(frame.x / w) * 100}%`,
              top: `${(frame.y / h) * 100}%`,
              width: `${(frame.width / w) * 100}%`,
              height: `${(frame.height / h) * 100}%`
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{ width: `${framePaddingPercent}%`, height: `${framePaddingPercent}%` }}
            >
              {cropped ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL from content crop, next/image doesn't support object/data URLs
                <img
                  src={cropped}
                  alt=""
                  className="max-w-full max-h-full object-contain"
                  style={{ transform: `rotate(${frame.rotation}deg)` }}
                />
              ) : (
                <div className="w-full h-full min-h-[2px] bg-gray-200" />
              )}
            </div>
          </div>
        );
      })}
      {layoutStyle !== "grid" && (
        <div
          className="absolute z-10 flex items-center justify-center"
          style={{
            left: `calc(50% + ${centerXOffset}%)`,
            top: `calc(50% + ${centerYOffset}%)`,
            transform: "translate(-50%, -50%)",
            width: `${(Math.max(w, h) / w) * 100}%`,
            height: `${(Math.max(w, h) / h) * 100}%`
          }}
        >
          {centerFiles[0]?.preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview URL, next/image doesn't support object URLs
            <img
              src={centerFiles[0].preview}
              alt=""
              className="max-w-full max-h-full object-contain"
              style={{ transform: `scale(${centerScale}) rotate(${centerRotation}deg)` }}
            />
          ) : null}
        </div>
      )}
      {isProcessing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90">
          <span className="text-sm text-gray-500">Processing…</span>
        </div>
      )}
    </div>
  );
}
