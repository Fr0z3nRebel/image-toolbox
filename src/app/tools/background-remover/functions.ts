import { ProcessedFile } from "../../components/ProcessedFilesDisplay";

export type BackgroundRemovalMode = "auto" | "drawing";

export interface BackgroundRemovalSettings {
  mode: BackgroundRemovalMode;
  tolerance?: number; // For auto mode - color similarity tolerance (0-100)
  edgeSmooth?: number; // For edge smoothing (0-10)
  backgroundColor?: string; // Replacement background color
  useTransparent?: boolean; // Use transparent background instead of color
}

export interface DrawingMask {
  imageData: ImageData;
  canvas: HTMLCanvasElement;
}

// Auto background removal using color similarity
export const removeBackgroundAuto = (
  canvas: HTMLCanvasElement,
  settings: BackgroundRemovalSettings
): Promise<ProcessedFile> => {
  return new Promise((resolve, reject) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const tolerance = (settings.tolerance || 30) / 100 * 255;
    
    // Sample background color from corners
    const cornerColors = [
      [data[0], data[1], data[2]], // Top-left
      [data[(canvas.width - 1) * 4], data[(canvas.width - 1) * 4 + 1], data[(canvas.width - 1) * 4 + 2]], // Top-right
      [data[(canvas.height - 1) * canvas.width * 4], data[(canvas.height - 1) * canvas.width * 4 + 1], data[(canvas.height - 1) * canvas.width * 4 + 2]], // Bottom-left
      [data[((canvas.height - 1) * canvas.width + canvas.width - 1) * 4], data[((canvas.height - 1) * canvas.width + canvas.width - 1) * 4 + 1], data[((canvas.height - 1) * canvas.width + canvas.width - 1) * 4 + 2]] // Bottom-right
    ];
    
    // Find the most common corner color as background
    const avgBackgroundColor = cornerColors.reduce((acc, color) => [
      acc[0] + color[0] / 4,
      acc[1] + color[1] / 4,
      acc[2] + color[2] / 4
    ], [0, 0, 0]);

    // Remove background based on color similarity
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate color distance
      const colorDistance = Math.sqrt(
        Math.pow(r - avgBackgroundColor[0], 2) +
        Math.pow(g - avgBackgroundColor[1], 2) +
        Math.pow(b - avgBackgroundColor[2], 2)
      );
      
      // If color is similar to background, make it transparent or replace with background color
      if (colorDistance <= tolerance) {
        if (settings.useTransparent) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        } else {
          // Replace with background color
          const bgColor = hexToRgb(settings.backgroundColor || '#ffffff');
          data[i] = bgColor.r;
          data[i + 1] = bgColor.g;
          data[i + 2] = bgColor.b;
          data[i + 3] = 255;
        }
      }
    }

    // Apply edge smoothing if requested
    if (settings.edgeSmooth && settings.edgeSmooth > 0) {
      smoothEdges(imageData, settings.edgeSmooth);
    }

    // Put processed image data back to canvas
    ctx.putImageData(imageData, 0, 0);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to process image'));
        return;
      }

      resolve({
        name: 'processed_image.png',
        url: URL.createObjectURL(blob),
        blob: blob,
        originalSize: 0,
        processedSize: blob.size
      });
    }, 'image/png');
  });
};

// Manual background removal using drawn mask
export const removeBackgroundDrawing = (
  originalCanvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement,
  settings: BackgroundRemovalSettings
): Promise<ProcessedFile> => {
  return new Promise((resolve, reject) => {
    const originalCtx = originalCanvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    
    if (!originalCtx || !maskCtx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Create result canvas
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = originalCanvas.width;
    resultCanvas.height = originalCanvas.height;
    const resultCtx = resultCanvas.getContext('2d');
    
    if (!resultCtx) {
      reject(new Error('Could not create result canvas'));
      return;
    }

    // Get image data
    const originalImageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
    const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const resultImageData = resultCtx.createImageData(originalCanvas.width, originalCanvas.height);

    const originalData = originalImageData.data;
    const maskData = maskImageData.data;
    const resultData = resultImageData.data;

    // Apply mask to original image
    for (let i = 0; i < originalData.length; i += 4) {
      const pixelIndex = i / 4;
      const maskIndex = pixelIndex * 4;
      
      // Check if this pixel should be removed (mask is dark/black)
      const maskValue = (maskData[maskIndex] + maskData[maskIndex + 1] + maskData[maskIndex + 2]) / 3;
      const shouldRemove = maskValue < 128; // Dark areas in mask = remove

      if (shouldRemove) {
        if (settings.useTransparent) {
          resultData[i] = originalData[i];
          resultData[i + 1] = originalData[i + 1];
          resultData[i + 2] = originalData[i + 2];
          resultData[i + 3] = 0; // Transparent
        } else {
          // Replace with background color
          const bgColor = hexToRgb(settings.backgroundColor || '#ffffff');
          resultData[i] = bgColor.r;
          resultData[i + 1] = bgColor.g;
          resultData[i + 2] = bgColor.b;
          resultData[i + 3] = 255;
        }
      } else {
        // Keep original pixel
        resultData[i] = originalData[i];
        resultData[i + 1] = originalData[i + 1];
        resultData[i + 2] = originalData[i + 2];
        resultData[i + 3] = originalData[i + 3];
      }
    }

    // Apply edge smoothing if requested
    if (settings.edgeSmooth && settings.edgeSmooth > 0) {
      smoothEdges(resultImageData, settings.edgeSmooth);
    }

    // Put result on canvas
    resultCtx.putImageData(resultImageData, 0, 0);

    // Convert to blob
    resultCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to process image'));
        return;
      }

      resolve({
        name: 'processed_image.png',
        url: URL.createObjectURL(blob),
        blob: blob,
        originalSize: 0,
        processedSize: blob.size
      });
    }, 'image/png');
  });
};

// Process a single image file
export const processBackgroundRemoval = (
  file: File,
  settings: BackgroundRemovalSettings,
  maskCanvas?: HTMLCanvasElement
): Promise<ProcessedFile> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        let result: ProcessedFile;
        
        if (settings.mode === 'auto') {
          result = await removeBackgroundAuto(canvas, settings);
        } else if (settings.mode === 'drawing' && maskCanvas) {
          result = await removeBackgroundDrawing(canvas, maskCanvas, settings);
        } else {
          reject(new Error('Invalid mode or missing mask canvas'));
          return;
        }

        // Update filename
        const fileName = file.name.replace(/\.[^/.]+$/, "") + "_background_removed.png";
        result.name = fileName;
        result.originalSize = file.size;

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Process multiple files
export const processBackgroundRemovalBatch = async (
  files: File[],
  settings: BackgroundRemovalSettings,
  maskCanvas?: HTMLCanvasElement,
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedFile[]> => {
  const processed: ProcessedFile[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length);
    
    try {
      const result = await processBackgroundRemoval(file, settings, maskCanvas);
      processed.push(result);
    } catch (error) {
      console.error(`Failed to process ${file.name}:`, error);
    }
  }
  
  return processed;
};

// Utility function to convert hex color to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
};

// Utility function to smooth edges
const smoothEdges = (imageData: ImageData, strength: number) => {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const newData = new Uint8ClampedArray(data);
  
  const kernelSize = Math.min(strength, 5);
  const kernel: number[][] = [];
  
  // Create smoothing kernel
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] = [];
    for (let j = 0; j < kernelSize; j++) {
      kernel[i][j] = 1 / (kernelSize * kernelSize);
    }
  }
  
  // Apply smoothing to alpha channel
  for (let y = kernelSize; y < height - kernelSize; y++) {
    for (let x = kernelSize; x < width - kernelSize; x++) {
      let alphaSum = 0;
      
      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const pixelIndex = ((y + ky - Math.floor(kernelSize / 2)) * width + (x + kx - Math.floor(kernelSize / 2))) * 4;
          alphaSum += data[pixelIndex + 3] * kernel[ky][kx];
        }
      }
      
      const currentIndex = (y * width + x) * 4;
      newData[currentIndex + 3] = Math.round(alphaSum);
    }
  }
  
  // Copy smoothed data back
  for (let i = 0; i < data.length; i++) {
    data[i] = newData[i];
  }
};

// Check if individual downloads should be disabled (always allow PNG)
export const shouldDisableIndividualDownload = (): boolean => {
  return false; // PNG is supported by all browsers
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