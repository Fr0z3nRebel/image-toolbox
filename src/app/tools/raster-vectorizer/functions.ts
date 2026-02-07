import type { PotracePresetId } from "./types";
import { POTRACE_PRESETS } from "./constants";

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Binarize image on canvas: foreground = black, background = white (by luminance). */
function binarizeCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  threshold: number,
  invert: boolean
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;
  const pixelCount = (d.length / 4) | 0;
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 4;
    const r = d[o];
    const g = d[o + 1];
    const b = d[o + 2];
    const a = d[o + 3];
    const lum = luminance(r, g, b);
    const useAlpha = a < 255;
    const value = useAlpha ? (255 - a) / 255 : (255 - lum) / 255;
    const above = value > threshold / 255;
    const foreground = invert ? !above : above;
    const v = foreground ? 0 : 255;
    d[o] = v;
    d[o + 1] = v;
    d[o + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Replace all fill and stroke attributes in an SVG string with a single color.
 */
export function applyColorToSvg(svgString: string, hexColor: string): string {
  const hex = hexColor.startsWith("#") ? hexColor : `#${hexColor}`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const rgb = `rgb(${r},${g},${b})`;

  return svgString
    .replace(/\bfill="[^"]*"/gi, `fill="${rgb}"`)
    .replace(/\bstroke="[^"]*"/gi, `stroke="${rgb}"`)
    .replace(/\bfill='[^']*'/gi, `fill='${rgb}'`)
    .replace(/\bstroke='[^']*'/gi, `stroke='${rgb}'`);
}

let potraceInitPromise: Promise<void> | null = null;

async function ensurePotraceInit(): Promise<void> {
  if (!potraceInitPromise) {
    const mod = await import("esm-potrace-wasm");
    potraceInitPromise = mod.init();
  }
  return potraceInitPromise;
}

/** Potrace WASM can hit "offset is out of bounds" on large rasters; keep dimensions conservative. */
const MAX_TRACE_DIMENSION = 1024;

export interface ImageToSvgOptions {
  presetId: PotracePresetId;
  /** 0–255; pixels below this are foreground (black). Default 128. */
  threshold?: number;
  /** Invert: treat light as foreground (e.g. white shape on black). Default false. */
  invert?: boolean;
  /** Max dimension for the raster. Default 1024 to avoid WASM bounds errors. */
  maxDimension?: number;
  /** If set, apply this color to all fill/stroke in the SVG. */
  colorOverride?: string | null;
}

/**
 * Convert a raster image to SVG using Potrace (client-side).
 * Image is binarized with threshold, then traced for clean outlines.
 */
export async function imageToSvg(file: File, options: ImageToSvgOptions): Promise<string> {
  const threshold = options.threshold ?? 128;
  const invert = options.invert ?? false;
  const maxDimension = options.maxDimension ?? MAX_TRACE_DIMENSION;
  const preset = POTRACE_PRESETS.find((p) => p.id === options.presetId) ?? POTRACE_PRESETS[0];

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Failed to load image"));
      i.src = url;
    });

    let w = Math.max(1, img.naturalWidth || 1);
    let h = Math.max(1, img.naturalHeight || 1);
    if (w > maxDimension || h > maxDimension) {
      const s = maxDimension / Math.max(w, h);
      w = Math.max(1, Math.round(w * s));
      h = Math.max(1, Math.round(h * s));
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");
    ctx.drawImage(img, 0, 0, w, h);
    binarizeCanvas(ctx, w, h, threshold, invert);

    await ensurePotraceInit();
    const { potrace } = await import("esm-potrace-wasm");
    let svg: unknown;
    try {
      svg = await potrace(canvas, {
        turdsize: preset.turdsize,
        opttolerance: preset.opttolerance,
        turnpolicy: 4,
        alphamax: 1,
        opticurve: 1,
        pathonly: false,
        extractcolors: false,
        posterizelevel: 2,
        posterizationalgorithm: 0,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/offset|out of bounds|bounds|RangeError/i.test(msg)) {
        throw new Error(
          "Image is too large or caused a bounds error. Try a smaller image or a different file."
        );
      }
      throw err;
    }

    let result = typeof svg === "string" ? svg : String(svg);
    if (options.colorOverride && /^#?[0-9A-Fa-f]{6}$/.test(options.colorOverride.replace("#", ""))) {
      result = applyColorToSvg(result, options.colorOverride);
    }
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}
