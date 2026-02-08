import type { ProcessedFile } from "../../components/ProcessedFilesDisplay";

/** Treat pixel as empty if alpha below this (0–255). Slightly above 0 so near-transparent export artifacts are trimmed. */
const ALPHA_THRESHOLD = 8;
/** Treat pixel as empty if all RGB components are at least this (0–255). Below 255 so off‑white / light gray padding is cropped. */
const WHITE_THRESHOLD = 240;

export function isSvgFile(file: File): boolean {
  return file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
}

/**
 * Find bounding box of non-empty pixels (non-transparent, non-white).
 * Returns { left, top, width, height } in pixel coordinates, or null if image is empty.
 */
function getRasterContentBounds(
  imageData: ImageData,
  treatWhiteAsEmpty: boolean
): { left: number; top: number; width: number; height: number } | null {
  const { data, width: w, height: h } = imageData;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      const transparent = a < ALPHA_THRESHOLD;
      const white =
        treatWhiteAsEmpty &&
        r >= WHITE_THRESHOLD &&
        g >= WHITE_THRESHOLD &&
        b >= WHITE_THRESHOLD;

      if (!transparent && !white) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return null;

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Auto-crop a raster image (PNG, JPEG, WebP, etc.) to content bounds. All processing client-side.
 */
function cropRaster(
  file: File,
  image: HTMLImageElement,
  treatWhiteAsEmpty: boolean
): Promise<ProcessedFile> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const bounds = getRasterContentBounds(imageData, treatWhiteAsEmpty);

    if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
      reject(new Error("No visible content found to crop"));
      return;
    }

    const out = document.createElement("canvas");
    out.width = bounds.width;
    out.height = bounds.height;
    const outCtx = out.getContext("2d");
    if (!outCtx) {
      reject(new Error("Could not get output canvas context"));
      return;
    }

    outCtx.drawImage(
      canvas,
      bounds.left,
      bounds.top,
      bounds.width,
      bounds.height,
      0,
      0,
      bounds.width,
      bounds.height
    );

    const ext = file.name.replace(/^.*\./, "").toLowerCase() || "png";
    const mime =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "webp"
          ? "image/webp"
          : "image/png";

    out.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create output image"));
          return;
        }
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const outName = `${baseName}-cropped.${ext}`;
        resolve({
          name: outName,
          url: URL.createObjectURL(blob),
          blob,
          originalSize: file.size,
          processedSize: blob.size,
        });
      },
      mime,
      1.0
    );
  });
}

/**
 * Parse numeric size from SVG width/height (e.g. "500", "100px", "50%") with optional viewBox fallback.
 */
function getSvgRenderSize(svg: SVGElement): { w: number; h: number } {
  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.trim().split(/\s+/);
    if (parts.length >= 4) {
      const vw = Number(parts[2]);
      const vh = Number(parts[3]);
      if (Number.isFinite(vw) && Number.isFinite(vh) && vw > 0 && vh > 0) {
        return { w: vw, h: vh };
      }
    }
  }
  const parseDim = (val: string | null, defaultVal: number): number => {
    if (val == null) return defaultVal;
    const n = parseFloat(val);
    return Number.isFinite(n) && n > 0 ? n : defaultVal;
  };
  const w = parseDim(svg.getAttribute("width"), 400);
  const h = parseDim(svg.getAttribute("height"), 400);
  return { w: Math.min(w, 2000), h: Math.min(h, 2000) };
}

/**
 * Auto-crop an SVG by computing content bbox and setting viewBox. Keeps vector output. Client-side.
 * The clone is rendered at a proper size so getBBox() returns correct bounds.
 */
async function cropSvgToSvg(
  file: File,
  _treatWhiteAsEmpty: boolean
): Promise<ProcessedFile> {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) {
    throw new Error("No SVG root element found");
  }

  const { w: renderW, h: renderH } = getSvgRenderSize(svg);

  const wrapper = document.createElement("div");
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.style.cssText =
    "position:absolute;left:-9999px;top:0;width:" +
    renderW +
    "px;height:" +
    renderH +
    "px;overflow:visible;pointer-events:none;";
  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute("width", String(renderW));
  clone.setAttribute("height", String(renderH));
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  let bbox: DOMRect;
  try {
    // getBBox is defined on SVGGraphicsElement/SVGSVGElement, but TypeScript's
    // lib DOM typings don't expose it on the generic SVGElement type, so we
    // use a narrow cast here.
    bbox = (clone as unknown as SVGGraphicsElement).getBBox();
  } finally {
    document.body.removeChild(wrapper);
  }

  if (
    !Number.isFinite(bbox.width) ||
    !Number.isFinite(bbox.height) ||
    bbox.width <= 0 ||
    bbox.height <= 0
  ) {
    throw new Error("Could not determine SVG content bounds");
  }

  const x = bbox.x;
  const y = bbox.y;
  const w = bbox.width;
  const h = bbox.height;

  // Update the original SVG in the document (we serialize doc, not the clone).
  svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.removeAttribute("x");
  svg.removeAttribute("y");

  const serializer = new XMLSerializer();
  const outSvg = serializer.serializeToString(doc);
  const blob = new Blob([outSvg], { type: "image/svg+xml" });
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const outName = `${baseName}-cropped.svg`;

  return {
    name: outName,
    url: URL.createObjectURL(blob),
    blob,
    originalSize: file.size,
    processedSize: blob.size,
  };
}

/**
 * Auto-crop an SVG by rendering to canvas, finding raster bounds, then cropping. Output PNG. Client-side.
 */
function cropSvgToRaster(
  file: File,
  treatWhiteAsEmpty: boolean
): Promise<ProcessedFile> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const bounds = getRasterContentBounds(imageData, treatWhiteAsEmpty);

      if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
        reject(new Error("No visible content found to crop"));
        return;
      }

      const out = document.createElement("canvas");
      out.width = bounds.width;
      out.height = bounds.height;
      const outCtx = out.getContext("2d");
      if (!outCtx) {
        reject(new Error("Could not get output canvas context"));
        return;
      }

      outCtx.drawImage(
        canvas,
        bounds.left,
        bounds.top,
        bounds.width,
        bounds.height,
        0,
        0,
        bounds.width,
        bounds.height
      );

      out.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create output image"));
            return;
          }
          const baseName = file.name.replace(/\.[^/.]+$/, "");
          const outName = `${baseName}-cropped.png`;
          resolve({
            name: outName,
            url: URL.createObjectURL(blob),
            blob,
            originalSize: file.size,
            processedSize: blob.size,
          });
        },
        "image/png",
        1.0
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG"));
    };

    img.src = url;
  });
}

export interface AutoCropOptions {
  /** Treat near-white pixels as empty (for images with white background). */
  treatWhiteAsEmpty: boolean;
  /** For SVG input: if true, output cropped SVG; if false, render and output PNG. */
  svgOutputAsSvg: boolean;
}

/**
 * Auto-crop one file (image or SVG). Removes transparent and optionally white margins. All client-side.
 */
export async function autoCropOne(
  file: File,
  options: AutoCropOptions
): Promise<ProcessedFile> {
  if (isSvgFile(file)) {
    if (options.svgOutputAsSvg) {
      return cropSvgToSvg(file, options.treatWhiteAsEmpty);
    }
    return cropSvgToRaster(file, options.treatWhiteAsEmpty);
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      cropRaster(file, img, options.treatWhiteAsEmpty).then(resolve).catch(reject);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Auto-crop multiple files. All processing client-side.
 */
export async function autoCropMany(
  files: File[],
  options: AutoCropOptions,
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedFile[]> {
  const results: ProcessedFile[] = [];

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    try {
      const result = await autoCropOne(files[i], options);
      results.push(result);
    } catch (err) {
      console.error(`Auto-crop failed for ${files[i].name}:`, err);
    }
  }

  return results;
}
