import type { ComposeOptions, ComposeResult } from "./types";
import type { ExportFormat, LayoutStyle } from "./types";
import { createBaseCanvas } from "./canvas";
import { loadFilesAsImages, getContentBoundingBoxIgnoringWhite } from "./image-processing";
import { getTextSafeRect } from "./text-safe-area";
import { computeImageFrames } from "./layouts";
import { drawCenterShape } from "./center-shapes";
import type { CenterShapeId } from "./types";
import { loadFonts } from "./fonts";
import { layoutCenterText } from "./center-text-layout";

/**
 * Compose a listing image from multiple images with specified layout and options
 */
export const composeListingImage = async (
  files: File[],
  options: ComposeOptions
): Promise<ComposeResult> => {
  if (files.length < 2) {
    throw new Error("Please select at least 2 images");
  }

  const {
    aspectRatio,
    layoutStyle,
    background,
    exportFormat,
    textSafeAreaPercent = 20,
    imagesPerRow,
    centerImageFile,
    backgroundImageFile
  } = options;

  const { canvas, ctx } = createBaseCanvas(aspectRatio, background);
  const { width, height } = canvas;

  const textSafeRect = getTextSafeRect(width, height, textSafeAreaPercent);
  const images = await loadFilesAsImages(files);

  const drawCoverImage = (img: HTMLImageElement) => {
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    if (imgW <= 0 || imgH <= 0) return;

    const scale = Math.max(width / imgW, height / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const dx = (width - drawW) / 2;
    const dy = (height - drawH) / 2;

    ctx.drawImage(img, dx, dy, drawW, drawH);
  };

  // Optional background image drawn behind everything (covers full canvas)
  if (backgroundImageFile) {
    try {
      const [bgImg] = await loadFilesAsImages([backgroundImageFile], { cropToContent: false });
      if (bgImg) drawCoverImage(bgImg);
    } catch (err) {
      // Non-fatal: fall back to plain background
      console.warn("Failed to render background image, continuing without it:", err);
    }
  }

  const frames = computeImageFrames(layoutStyle, width, height, images.length, textSafeRect, imagesPerRow);

  // Optional center image (only for divided grid layouts)
  if (centerImageFile && layoutStyle !== "grid") {
    try {
      const [centerImg] = await loadFilesAsImages([centerImageFile], { cropToContent: false });
      if (centerImg) {
        // Use full image dimensions for center image (not content bounding box)
        const srcW = centerImg.naturalWidth;
        const srcH = centerImg.naturalHeight;

        // Scale to fill 100% of the larger canvas dimension (width or height)
        const targetSize = Math.max(width, height);
        const imageMaxDimension = Math.max(srcW, srcH);
        const scale = targetSize / imageMaxDimension;
        const drawW = Math.round(srcW * scale);
        const drawH = Math.round(srcH * scale);
        // Center on canvas - round to ensure exact pixel alignment
        const drawX = Math.round((width - drawW) / 2);
        const drawY = Math.round((height - drawH) / 2);

        ctx.drawImage(centerImg, 0, 0, srcW, srcH, drawX, drawY, drawW, drawH);
      }
    } catch (err) {
      // Non-fatal: if center image fails, still generate the rest
      console.warn("Failed to render center image, continuing without it:", err);
    }
  }

  // For grid layout, calculate uniform sizing based on content bounds
  let contentBounds: Array<{ x: number; y: number; width: number; height: number } | null> = [];
  let medianArea = 0;

  if (layoutStyle === "grid") {
    // Get content bounds for all images (ignoring white/transparent space)
    contentBounds = images.map((img) => getContentBoundingBoxIgnoringWhite(img));
    
    // Calculate content areas (use full image if no bounds found)
    const contentAreas = contentBounds.map((bounds, index) => 
      bounds ? bounds.width * bounds.height : images[index].naturalWidth * images[index].naturalHeight
    );
    
    // Find median content area for consistent sizing
    const sortedAreas = [...contentAreas].sort((a, b) => a - b);
    medianArea = sortedAreas[Math.floor(sortedAreas.length / 2)];
  }

  images.forEach((img, index) => {
    const frame = frames[index] ?? frames[frames.length - 1];
    const { x, y, width: frameWidth, height: frameHeight, rotation } = frame;

    // For grid layout, add padding for spacing between items
    // For other layouts, add padding to ensure images never touch
    const isGridLayout = layoutStyle === "grid";
    const framePadding = isGridLayout 
      ? Math.min(frameWidth, frameHeight) * 0.04 // 4% padding for spacing between grid items
      : Math.min(frameWidth, frameHeight) * 0.05; // 5% padding on all sides
    const paddedWidth = frameWidth - framePadding * 2;
    const paddedHeight = frameHeight - framePadding * 2;

    let drawWidth: number;
    let drawHeight: number;

    if (isGridLayout) {
      // For grid layout, first scale to uniform content size, then fit to cell
      const bounds = contentBounds[index];
      
      if (bounds && bounds.width > 0 && bounds.height > 0 && medianArea > 0) {
        // Calculate scale to make content area match median
        const contentArea = bounds.width * bounds.height;
        const contentScale = Math.sqrt(medianArea / contentArea);
        
        // Apply uniform content scale to the image
        const scaledImgWidth = img.naturalWidth * contentScale;
        const scaledImgHeight = img.naturalHeight * contentScale;
        
        // Then fit the uniformly scaled image into the grid cell
        const cellScale = Math.min(paddedWidth / scaledImgWidth, paddedHeight / scaledImgHeight);
        drawWidth = scaledImgWidth * cellScale;
        drawHeight = scaledImgHeight * cellScale;
      } else {
        // Fallback: use original image dimensions
        const cellScale = Math.min(paddedWidth / img.naturalWidth, paddedHeight / img.naturalHeight);
        drawWidth = img.naturalWidth * cellScale;
        drawHeight = img.naturalHeight * cellScale;
      }
    } else {
      // For other layouts, images fit within padded area
      const scale = Math.min(paddedWidth / img.naturalWidth, paddedHeight / img.naturalHeight);
      drawWidth = img.naturalWidth * scale;
      drawHeight = img.naturalHeight * scale;
    }

    // Center the image within the frame
    const drawX = x + framePadding + (paddedWidth - drawWidth) / 2;
    const drawY = y + framePadding + (paddedHeight - drawHeight) / 2;

    const rad = (rotation * Math.PI) / 180;

    ctx.save();
    // Translate to the image center for rotation
    const imageCenterX = drawX + drawWidth / 2;
    const imageCenterY = drawY + drawHeight / 2;
    ctx.translate(imageCenterX, imageCenterY);
    ctx.rotate(rad);
    ctx.translate(-imageCenterX, -imageCenterY);

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    ctx.restore();
  });

  const mimeType = exportFormat === "webp" ? "image/webp" : "image/png";

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error("Failed to generate listing image"));
        return;
      }
      resolve(result);
    }, mimeType);
  });

  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    canvas: {
      width,
      height
    }
  };
};

/**
 * Composite a pre-rendered content layer with optional center image and background.
 * Used so center image and background can be applied without re-running the main composition.
 */
export const compositeLayers = async (params: {
  contentUrl: string;
  contentWidth: number;
  contentHeight: number;
  centerImageFile?: File;
  centerMode?: "image" | "text";
  centerShape?: CenterShapeId;
  titleText?: string;
  subtitleText?: string;
  titleFont?: string;
  subtitleFont?: string;
  titleFontSizeAuto?: boolean;
  subtitleFontSizeAuto?: boolean;
  titleFontSize?: number;
  subtitleFontSize?: number;
  shapeColor?: string;
  titleColor?: string;
  subtitleColor?: string;
  wrapText?: boolean;
  layoutStyle?: LayoutStyle;
  textSafeAreaPercent?: number;
  centerScale?: number;
  centerRotation?: number;
  centerXOffset?: number;
  centerYOffset?: number;
  backgroundMode: "transparent" | "backgroundImage" | "color";
  backgroundColor?: string;
  backgroundImageFile?: File;
  exportFormat: ExportFormat;
}): Promise<ComposeResult> => {
  const {
    contentUrl,
    contentWidth,
    contentHeight,
    centerImageFile,
    centerMode,
    centerShape = "roundedRect",
    titleText = "",
    subtitleText = "",
    titleFont = "Open Sans",
    subtitleFont = "Open Sans",
    titleFontSizeAuto = false,
    subtitleFontSizeAuto = false,
    titleFontSize = 48,
    subtitleFontSize = 28,
    shapeColor = "#fef3c7",
    titleColor = "#1f2937",
    subtitleColor = "#4b5563",
    wrapText = true,
    layoutStyle,
    textSafeAreaPercent = 20,
    centerScale = 1,
    centerRotation = 0,
    centerXOffset = 0,
    centerYOffset = 0,
    backgroundMode,
    backgroundColor,
    backgroundImageFile,
    exportFormat
  } = params;
  const canvas = document.createElement("canvas");
  canvas.width = contentWidth;
  canvas.height = contentHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  if (backgroundMode === "transparent") {
    ctx.clearRect(0, 0, contentWidth, contentHeight);
  } else if (backgroundMode === "color" && backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, contentWidth, contentHeight);
  } else if (backgroundMode === "backgroundImage" && backgroundImageFile) {
    ctx.clearRect(0, 0, contentWidth, contentHeight);
    try {
      const [bgImg] = await loadFilesAsImages([backgroundImageFile], { cropToContent: false });
      if (bgImg && (bgImg.naturalWidth || bgImg.width) > 0 && (bgImg.naturalHeight || bgImg.height) > 0) {
        const W = bgImg.naturalWidth || bgImg.width;
        const H = bgImg.naturalHeight || bgImg.height;
        const scale = Math.max(contentWidth / W, contentHeight / H);
        const dw = W * scale;
        const dh = H * scale;
        const dx = (contentWidth - dw) / 2;
        const dy = (contentHeight - dh) / 2;
        ctx.drawImage(bgImg, dx, dy, dw, dh);
      }
    } catch (err) {
      console.warn("Failed to draw background image:", err);
    }
  } else {
    ctx.clearRect(0, 0, contentWidth, contentHeight);
  }

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      resolve();
    };
    img.onerror = () => reject(new Error("Failed to load content image"));
    img.src = contentUrl;
  });

  // Optional center image (only for divided grid layouts), drawn on top of content
  if (centerImageFile && layoutStyle && layoutStyle !== "grid" && centerMode !== "text") {
    try {
      const [centerImg] = await loadFilesAsImages([centerImageFile], { cropToContent: false });
      if (centerImg) {
        // Use full image dimensions for center image (not content bounding box)
        const srcW = centerImg.naturalWidth;
        const srcH = centerImg.naturalHeight;
        // Scale to fill 100% of the larger canvas dimension (width or height)
        const targetSize = Math.max(contentWidth, contentHeight);
        const imageMaxDimension = Math.max(srcW, srcH);
        const baseScale = targetSize / imageMaxDimension;
        const drawW = Math.round(srcW * baseScale * centerScale);
        const drawH = Math.round(srcH * baseScale * centerScale);
        // Center on canvas, then apply offset (offset is percentage of canvas dimension)
        const offsetX = (contentWidth * centerXOffset) / 100;
        const offsetY = (contentHeight * centerYOffset) / 100;
        const drawX = Math.round((contentWidth - drawW) / 2 + offsetX);
        const drawY = Math.round((contentHeight - drawH) / 2 + offsetY);
        const cx = drawX + drawW / 2;
        const cy = drawY + drawH / 2;
        const rad = (centerRotation * Math.PI) / 180;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rad);
        ctx.translate(-drawW / 2, -drawH / 2);
        ctx.drawImage(centerImg, 0, 0, srcW, srcH, 0, 0, drawW, drawH);
        ctx.restore();
      }
    } catch (err) {
      console.warn("Failed to draw center image in composite:", err);
    }
  }

  // Center text (shape + title/subtitle) for divided grid layouts
  if (centerMode === "text" && layoutStyle && layoutStyle !== "grid") {
    await loadFonts([titleFont, subtitleFont]);
    const layout = layoutCenterText(
      {
        canvasWidth: contentWidth,
        canvasHeight: contentHeight,
        textSafeAreaPercent,
        centerScale,
        centerXOffset,
        centerYOffset,
        titleText,
        subtitleText,
        titleFont,
        subtitleFont,
        titleFontSize,
        subtitleFontSize,
        titleFontSizeAuto,
        subtitleFontSizeAuto,
        wrapText
      },
      ctx
    );

    const { shapeRect, title, subtitle } = layout;
    const cx = shapeRect.x + shapeRect.width / 2;
    const cy = shapeRect.y + shapeRect.height / 2;
    const rad = (centerRotation * Math.PI) / 180;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rad);
    ctx.translate(-cx, -cy);

    drawCenterShape(ctx, centerShape, shapeRect, shapeColor);

    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    title.lines.forEach((line) => {
      ctx.font = `600 ${line.fontSize}px "${line.fontFamily}", sans-serif`;
      ctx.fillStyle = titleColor;
      ctx.fillText(line.text, line.x, line.y);
    });

    subtitle.lines.forEach((line) => {
      ctx.font = `400 ${line.fontSize}px "${line.fontFamily}", sans-serif`;
      ctx.fillStyle = subtitleColor;
      ctx.fillText(line.text, line.x, line.y);
    });

    ctx.restore();
  }

  const mimeType = exportFormat === "webp" ? "image/webp" : "image/png";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("toBlob failed"));
    }, mimeType);
  });
  const url = URL.createObjectURL(blob);
  return { blob, url, canvas: { width: contentWidth, height: contentHeight } };
};