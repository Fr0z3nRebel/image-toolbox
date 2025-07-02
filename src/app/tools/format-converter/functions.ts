import { ProcessedFile } from "../../components/ProcessedFilesDisplay";

// Client-side image conversion function
export const convertImageToFormat = (file: File, targetFormat: string): Promise<ProcessedFile> => {
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

      // Convert to target format
      const mimeType = `image/${targetFormat}`;
      
      // Add timeout for AVIF conversion as it can be slow
      const timeoutMs = targetFormat === 'avif' ? 15000 : 10000;
      const timeoutId = setTimeout(() => {
        reject(new Error(`Conversion timeout - ${targetFormat.toUpperCase()} encoding took too long`));
      }, timeoutMs);
      
      canvas.toBlob((blob) => {
        clearTimeout(timeoutId);
        
        if (!blob) {
          reject(new Error(`Failed to convert image to ${targetFormat.toUpperCase()} - format may not be supported by this browser`));
          return;
        }

        const fileName = file.name.replace(/\.[^/.]+$/, "") + `.${targetFormat}`;
        const url = URL.createObjectURL(blob);

        resolve({
          name: fileName,
          url: url,
          blob: blob,
          originalSize: file.size,
          processedSize: blob.size
        });
      }, mimeType, 1.0); // Quality 1.0 = no compression
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    
    // Load the image
    img.src = URL.createObjectURL(file);
  });
};

// Process multiple files for conversion
export const convertImages = async (
  files: File[], 
  targetFormat: string,
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedFile[]> => {
  const converted: ProcessedFile[] = [];
  
  // Convert each file client-side
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length);
    
    try {
      const result = await convertImageToFormat(file, targetFormat);
      converted.push(result);
    } catch (error) {
      console.error(`Failed to convert ${file.name}:`, error);
    }
  }
  
  return converted;
};

// Check if individual downloads should be disabled for Firefox AVIF
export const shouldDisableIndividualDownload = (
  targetFormat: string, 
  isFirefox: boolean
): boolean => {
  return isFirefox && targetFormat === 'avif';
}; 