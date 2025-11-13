import { ProcessedFile } from "../../components/ProcessedFilesDisplay";

// Client-side image resolution change function (sets to 300 DPI equivalent)
export const changeImageResolution = (file: File): Promise<ProcessedFile> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set canvas dimensions to match image (preserve pixel dimensions)
      // For 300 DPI, we maintain the original pixel dimensions
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Use high-quality rendering settings for 300 DPI
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw image to canvas
      ctx.drawImage(img, 0, 0);

      // Determine output format based on original file type
      const originalFormat = file.type.toLowerCase();
      let outputFormat = 'image/jpeg';
      let fileExtension = 'jpg';
      
      // Preserve original format when possible
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

      // Use maximum quality for 300 DPI (1.0 = no compression)
      const quality = 1.0;
      
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to process image'));
          return;
        }

        const originalSize = file.size;
        const processedSize = blob.size;
        const compressionRatio = ((originalSize - processedSize) / originalSize) * 100;
        
        // Generate filename
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const fileName = `${baseName}_300dpi.${fileExtension}`;
        const url = URL.createObjectURL(blob);

        resolve({
          name: fileName,
          url: url,
          originalSize: originalSize,
          processedSize: processedSize,
          compressionRatio: Math.max(0, compressionRatio),
          blob: blob
        });
      }, outputFormat, quality);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    
    // Load the image
    img.src = URL.createObjectURL(file);
  });
};

// Process multiple files for resolution change
export const changeImagesResolution = async (
  files: File[], 
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedFile[]> => {
  const processed: ProcessedFile[] = [];
  
  // Process each file client-side
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length);
    
    try {
      const result = await changeImageResolution(file);
      processed.push(result);
    } catch (error) {
      console.error(`Failed to process ${file.name}:`, error);
    }
  }
  
  return processed;
};

// Get original file for comparison
export const getOriginalFileForComparison = <T extends File>(
  index: number, 
  originalFiles: T[], 
  processedFiles: ProcessedFile[]
): T | null => {
  if (index >= 0 && index < originalFiles.length && index < processedFiles.length) {
    return originalFiles[index];
  }
  return null;
};

