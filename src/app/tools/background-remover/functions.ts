import type { ProcessedFile } from "../../components/ProcessedFilesDisplay";

/**
 * Remove background from a single image using @imgly/background-removal (client-side).
 * Returns a PNG blob with transparent background.
 */
export async function removeBackgroundFromImage(file: File): Promise<ProcessedFile> {
  const { removeBackground } = await import("@imgly/background-removal");
  const blob = await removeBackground(file);
  const base = file.name.replace(/\.[^/.]+$/, "");
  const name = `${base}-no-bg.png`;
  const url = URL.createObjectURL(blob);
  return {
    name,
    url,
    blob,
    originalSize: file.size,
    processedSize: blob.size,
  };
}

/**
 * Remove background from multiple images. Processes sequentially to avoid overloading the browser.
 */
export async function removeBackgroundFromImages(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedFile[]> {
  const results: ProcessedFile[] = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    try {
      const result = await removeBackgroundFromImage(files[i]);
      results.push(result);
    } catch (err) {
      console.error(`Failed to remove background from ${files[i].name}:`, err);
      // Skip failed file; caller can show count
    }
  }
  return results;
}
