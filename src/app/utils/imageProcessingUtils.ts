export { formatFileSize } from "../components/utils/browserUtils";

export function isSvgFile(file: File): boolean {
  return file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
}

export function getOriginalFileForComparison<T extends File>(
  index: number,
  originalFiles: T[],
  processedFiles: Array<{ name: string }>
): T | null {
  if (
    index >= 0 &&
    index < originalFiles.length &&
    index < processedFiles.length
  ) {
    return originalFiles[index];
  }
  return null;
}

/**
 * Returns true if individual download should be disabled for Firefox + AVIF.
 * Pass either targetFormat (e.g. "avif") or fileName (e.g. "image.avif").
 */
export function shouldDisableIndividualDownloadAvif(
  fileNameOrFormat: string,
  isFirefox: boolean
): boolean {
  if (!isFirefox) return false;
  const lower = fileNameOrFormat.toLowerCase();
  return lower === "avif" || lower.includes(".avif");
}
