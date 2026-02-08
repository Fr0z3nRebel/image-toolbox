import type { ProcessedFile } from "../../components/ProcessedFilesDisplay";

/**
 * Pad a raster image to a perfect 1:1 square by adding transparent space on the short sides.
 * All processing client-side. Output is always PNG to preserve transparency.
 */
function rationalizeRaster(
  file: File,
  image: HTMLImageElement
): Promise<ProcessedFile> {
  return new Promise((resolve, reject) => {
    const w = image.naturalWidth;
    const h = image.naturalHeight;
    const size = Math.max(w, h);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    // Canvas is transparent by default; draw image centered
    const x = (size - w) / 2;
    const y = (size - h) / 2;
    ctx.drawImage(image, 0, 0, w, h, x, y, w, h);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create output image"));
          return;
        }
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const outName = `${baseName}-rationalized.png`;
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
  });
}

/**
 * Rationalize one image to a 1:1 square (transparent padding on short sides). Client-side.
 */
export function rationalizeOne(file: File): Promise<ProcessedFile> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      rationalizeRaster(file, img).then(resolve).catch(reject);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * Rationalize multiple images. All processing client-side.
 */
export async function rationalizeMany(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedFile[]> {
  const results: ProcessedFile[] = [];

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    try {
      const result = await rationalizeOne(files[i]);
      results.push(result);
    } catch (err) {
      console.error(`Rationalize failed for ${files[i].name}:`, err);
    }
  }

  return results;
}
