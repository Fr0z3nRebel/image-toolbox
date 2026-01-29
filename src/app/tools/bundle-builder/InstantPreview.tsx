"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AspectRatio, LayoutStyle } from "./types";
import type { CenterShapeId } from "./types";
import type { FileWithPreview } from "../../components/FileUploadZone";
import { getCanvasDimensions } from "./canvas";
import { getTextSafeRect } from "./text-safe-area";
import { computeImageFrames } from "./layouts";
import { getContentCroppedDataUrlFromUrl } from "./image-processing";
import { layoutCenterText } from "./center-text-layout";
import type { CenterTextLayout } from "./center-text-layout";

export interface InstantPreviewProps {
  files: FileWithPreview[];
  centerFiles: FileWithPreview[];
  centerMode?: "image" | "text";
  centerShape?: CenterShapeId;
  titleText?: string;
  subtitleText?: string;
  titleFont?: string;
  subtitleFont?: string;
  titleBold?: boolean;
  subtitleBold?: boolean;
  titleFontSize?: number;
  subtitleFontSize?: number;
  shapeColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  titleFontSizeAuto?: boolean;
  subtitleFontSizeAuto?: boolean;
  wrapText?: boolean;
  backgroundFiles: FileWithPreview[];
  backgroundMode: "transparent" | "backgroundImage" | "color";
  backgroundColor: string;
  layoutStyle: LayoutStyle;
  textSafeAreaPercent: number;
  imagesPerRow?: number;
  centerWidthScale?: number;
  centerHeightScale?: number;
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
const SHAPE_BORDER_RADIUS: Record<CenterShapeId, string> = {
  rectangle: "0",
  roundedRect: "12%",
  pill: "999px",
  badge: "8%",
  banner: "0",
  bannerRibbon: "4%"
};

export default function InstantPreview({
  files,
  centerFiles,
  centerMode = "image",
  centerShape = "roundedRect",
  titleText = "",
  subtitleText = "",
  titleFont = "Open Sans",
  subtitleFont = "Open Sans",
  titleBold = false,
  subtitleBold = false,
  titleFontSize = 48,
  subtitleFontSize = 28,
  shapeColor = "#fef3c7",
  titleColor = "#1f2937",
  subtitleColor = "#4b5563",
  titleFontSizeAuto = false,
  subtitleFontSizeAuto = false,
  wrapText = true,
  backgroundFiles,
  backgroundMode,
  backgroundColor,
  layoutStyle,
  textSafeAreaPercent,
  imagesPerRow,
  centerWidthScale = 1,
  centerHeightScale = 1,
  centerRotation = 0,
  centerXOffset = 0,
  centerYOffset = 0,
  aspectRatio,
  className = ""
}: InstantPreviewProps) {
  const { width: w, height: h } = getCanvasDimensions(aspectRatio);
  const textSafeRect = getTextSafeRect(w, h, textSafeAreaPercent);
  const frames = computeImageFrames(layoutStyle, w, h, files.length, textSafeRect, imagesPerRow);

  const drawW = textSafeRect.width * centerWidthScale;
  const drawH = textSafeRect.height * centerHeightScale;

  const [contentCropped, setContentCropped] = useState<Record<string, string>>({});
  const [centerLayout, setCenterLayout] = useState<CenterTextLayout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  const shapeBorderRadius = useMemo(() => {
    if (!centerLayout) return SHAPE_BORDER_RADIUS[centerShape];
    const minDim = Math.min(centerLayout.shapeRect.width, centerLayout.shapeRect.height);
    if (centerShape === "roundedRect") {
      return `${minDim * 0.12}px`;
    }
    if (centerShape === "pill") {
      return `${minDim / 2}px`;
    }
    return SHAPE_BORDER_RADIUS[centerShape];
  }, [centerLayout, centerShape]);

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

  useLayoutEffect(() => {
    const updateScale = () => {
      const el = containerRef.current;
      if (!el || w === 0) return;
      const width = el.clientWidth;
      setScale(width / w);
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [w]);

  useEffect(() => {
    if (centerMode !== "text" || layoutStyle === "grid") {
      setCenterLayout(null);
      return;
    }
    if (typeof document === "undefined") {
      setCenterLayout(null);
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCenterLayout(null);
      return;
    }
    const layout = layoutCenterText(
      {
        canvasWidth: w,
        canvasHeight: h,
        textSafeAreaPercent,
        centerWidthScale,
        centerHeightScale,
        centerXOffset,
        centerYOffset,
        titleText,
        subtitleText,
        titleFont,
        subtitleFont,
        titleBold,
        subtitleBold,
        titleFontSize,
        subtitleFontSize,
        titleFontSizeAuto,
        subtitleFontSizeAuto,
        wrapText
      },
      ctx
    );
    setCenterLayout(layout);
  }, [
    centerMode,
    layoutStyle,
    w,
    h,
    textSafeAreaPercent,
    centerWidthScale,
    centerHeightScale,
    centerXOffset,
    centerYOffset,
    titleText,
    subtitleText,
    titleFont,
    subtitleFont,
    titleBold,
    subtitleBold,
    titleFontSize,
    subtitleFontSize,
    titleFontSizeAuto,
    subtitleFontSizeAuto,
    wrapText
  ]);

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
      ref={containerRef}
      className={`relative w-full h-full ${className}`.trim()}
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
      {layoutStyle !== "grid" && centerMode === "image" && (
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
              style={{ transform: `scaleX(${centerWidthScale}) scaleY(${centerHeightScale}) rotate(${centerRotation}deg)` }}
            />
          ) : null}
        </div>
      )}
      {layoutStyle !== "grid" && centerMode === "text" && centerLayout && (
        <div
          className="absolute z-10"
          style={{
            left: `${(centerLayout.shapeRect.x / w) * 100}%`,
            top: `${(centerLayout.shapeRect.y / h) * 100}%`,
            width: `${(centerLayout.shapeRect.width / w) * 100}%`,
            height: `${(centerLayout.shapeRect.height / h) * 100}%`,
            transformOrigin: "50% 50%",
            transform: `rotate(${centerRotation}deg)`
          }}
        >
            <div
              className="relative w-full h-full"
              style={{
                backgroundColor: shapeColor,
                borderRadius: shapeBorderRadius
              }}
            >
            {centerLayout.title.lines.map((line, idx) => (
              <span
                key={`title-${idx}`}
                style={{
                  position: "absolute",
                  left: `${((line.x - centerLayout.shapeRect.x) / centerLayout.shapeRect.width) * 100}%`,
                  top: `${((line.y - centerLayout.shapeRect.y) / centerLayout.shapeRect.height) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  fontFamily: `"${line.fontFamily}", sans-serif`,
                  fontWeight: line.fontWeight,
                  fontSize: `${line.fontSize * scale}px`,
                  color: titleColor,
                  whiteSpace: "nowrap",
                  lineHeight: 1.2
                }}
              >
                {line.text}
              </span>
            ))}
            {centerLayout.subtitle.lines.map((line, idx) => (
              <span
                key={`subtitle-${idx}`}
                style={{
                  position: "absolute",
                  left: `${((line.x - centerLayout.shapeRect.x) / centerLayout.shapeRect.width) * 100}%`,
                  top: `${((line.y - centerLayout.shapeRect.y) / centerLayout.shapeRect.height) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  fontFamily: `"${line.fontFamily}", sans-serif`,
                  fontWeight: line.fontWeight,
                  fontSize: `${line.fontSize * scale}px`,
                  color: subtitleColor,
                  whiteSpace: "nowrap",
                  lineHeight: 1.2
                }}
              >
                {line.text}
              </span>
            ))}
          </div>
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
