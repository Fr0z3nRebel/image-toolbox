import { ProcessedFile } from "../../components/ProcessedFilesDisplay";
import { isSvgFile } from "../../utils/imageProcessingUtils";

export const SVG_SIZE_PRESETS = [1024, 2048, 4096, 8192] as const;
export type SvgSizePreset = (typeof SVG_SIZE_PRESETS)[number];
export const SVG_SIZE_DEFAULT = 4096;

export interface SvgExportOptions {
  /** Longest side in pixels (used when input is SVG). */
  svgLongestSide: number;
  /** If true, output 1:1 square with padding on shortest sides. */
  svgSquare: boolean;
}

// Client-side image conversion function
export const convertImageToFormat = (
  file: File,
  targetFormat: string,
  options?: SvgExportOptions
): Promise<ProcessedFile> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      const isSvg = isSvgFile(file);
      const useSvgOptions = isSvg && options && options.svgLongestSide > 0;

      if (useSvgOptions) {
        const w = img.naturalWidth || 1;
        const h = img.naturalHeight || 1;
        const longest = Math.max(w, h);
        const scale = options.svgLongestSide / longest;
        const drawW = Math.round(w * scale);
        const drawH = Math.round(h * scale);

        if (options.svgSquare) {
          canvas.width = options.svgLongestSide;
          canvas.height = options.svgLongestSide;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(
            img,
            0,
            0,
            w,
            h,
            (options.svgLongestSide - drawW) / 2,
            (options.svgLongestSide - drawH) / 2,
            drawW,
            drawH
          );
        } else {
          canvas.width = drawW;
          canvas.height = drawH;
          ctx.drawImage(img, 0, 0, w, h, 0, 0, drawW, drawH);
        }
      } else {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
      }

      const mimeType = `image/${targetFormat}`;

      const timeoutMs = targetFormat === "avif" ? 15000 : 10000;
      const timeoutId = setTimeout(() => {
        reject(
          new Error(
            `Conversion timeout - ${targetFormat.toUpperCase()} encoding took too long`
          )
        );
      }, timeoutMs);

      canvas.toBlob(
        (blob) => {
          clearTimeout(timeoutId);

          if (!blob) {
            reject(
              new Error(
                `Failed to convert image to ${targetFormat.toUpperCase()} - format may not be supported by this browser`
              )
            );
            return;
          }

          const fileName =
            file.name.replace(/\.[^/.]+$/, "") + `.${targetFormat}`;
          const resultUrl = URL.createObjectURL(blob);

          resolve({
            name: fileName,
            url: resultUrl,
            blob: blob,
            originalSize: file.size,
            processedSize: blob.size,
          });
        },
        mimeType,
        1.0
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
};

// Process multiple files for conversion
export const convertImages = async (
  files: File[],
  targetFormat: string,
  onProgress?: (current: number, total: number) => void,
  options?: SvgExportOptions
): Promise<ProcessedFile[]> => {
  const converted: ProcessedFile[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length);

    try {
      const result = await convertImageToFormat(file, targetFormat, options);
      converted.push(result);
    } catch (error) {
      console.error(`Failed to convert ${file.name}:`, error);
    }
  }

  return converted;
};

export { shouldDisableIndividualDownloadAvif as shouldDisableIndividualDownload } from "../../utils/imageProcessingUtils";
