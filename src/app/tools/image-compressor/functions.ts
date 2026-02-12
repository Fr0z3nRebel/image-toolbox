import { ProcessedFile } from "../../components/ProcessedFilesDisplay";
import {
  getOriginalFileForComparison,
  shouldDisableIndividualDownloadAvif as shouldDisableIndividualDownload,
} from "../../utils/imageProcessingUtils";

// Client-side image compression function
export const compressImage = (file: File, quality: number): Promise<ProcessedFile> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set canvas dimensions to match image
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw image to canvas
      ctx.drawImage(img, 0, 0);

      // Determine output format based on original file type
      const originalFormat = file.type.toLowerCase();
      let outputFormat = 'image/jpeg'; // Default to JPEG for compression
      let fileExtension = 'jpg';
      
      // Keep original format for better quality preservation
      if (originalFormat.includes('png')) {
        outputFormat = 'image/png';
        fileExtension = 'png';
      } else if (originalFormat.includes('webp')) {
        outputFormat = 'image/webp';
        fileExtension = 'webp';
      } else if (originalFormat.includes('avif')) {
        outputFormat = 'image/avif';
        fileExtension = 'avif';
      }

      // Convert quality percentage to decimal (Canvas API expects 0.0 to 1.0)
      const canvasQuality = Math.max(0.1, Math.min(1.0, quality / 100));
      
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to compress image'));
          return;
        }

        const originalSize = file.size;
        const compressedSize = blob.size;
        const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
        
        // Generate filename
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const fileName = `${baseName}_compressed.${fileExtension}`;
        const url = URL.createObjectURL(blob);

        resolve({
          name: fileName,
          url: url,
          originalSize: originalSize,
          processedSize: compressedSize,
          compressionRatio: Math.max(0, compressionRatio),
          blob: blob
        });
      }, outputFormat, canvasQuality);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    
    // Load the image
    img.src = URL.createObjectURL(file);
  });
};

// Process multiple files for compression
export const compressImages = async (
  files: File[], 
  quality: number,
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedFile[]> => {
  const compressed: ProcessedFile[] = [];
  
  // Compress each file client-side
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length);
    
    try {
      const result = await compressImage(file, quality);
      compressed.push(result);
    } catch (error) {
      console.error(`Failed to compress ${file.name}:`, error);
    }
  }
  
  return compressed;
};

export { getOriginalFileForComparison, shouldDisableIndividualDownload }; 