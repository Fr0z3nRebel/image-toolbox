import { ProcessedFile } from "../../components/ProcessedFilesDisplay";

// Lanczos resampling kernel function
function lanczosKernel(x: number, a: number = 3): number {
  if (x === 0) return 1;
  if (Math.abs(x) >= a) return 0;
  
  const piX = Math.PI * x;
  const piXOverA = piX / a;
  
  return (Math.sin(piX) / piX) * (Math.sin(piXOverA) / piXOverA);
}

// High-quality image upscaling using Lanczos resampling
export const upscaleImage = (file: File, scaleFactor: number): Promise<ProcessedFile> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const srcWidth = img.naturalWidth;
      const srcHeight = img.naturalHeight;
      const dstWidth = Math.round(srcWidth * scaleFactor);
      const dstHeight = Math.round(srcHeight * scaleFactor);

      canvas.width = dstWidth;
      canvas.height = dstHeight;

      // For moderate upscaling (up to 2x), use high-quality Lanczos
      if (scaleFactor <= 2.0) {
        performLanczosUpscaling(img, ctx, srcWidth, srcHeight, dstWidth, dstHeight);
      } else {
        // For larger upscaling, use bicubic interpolation for better performance
        performBicubicUpscaling(img, ctx, srcWidth, srcHeight, dstWidth, dstHeight);
      }

      // Determine output format
      const originalFormat = file.type.toLowerCase();
      let outputFormat = 'image/png'; // Default to PNG for best quality
      let fileExtension = 'png';
      
      // Keep original format if it's a good quality format
      if (originalFormat.includes('png')) {
        outputFormat = 'image/png';
        fileExtension = 'png';
      } else if (originalFormat.includes('webp')) {
        outputFormat = 'image/webp';
        fileExtension = 'webp';
      } else if (originalFormat.includes('avif')) {
        outputFormat = 'image/avif';
        fileExtension = 'avif';
      } else {
        // For JPEG, convert to PNG to avoid quality loss
        outputFormat = 'image/png';
        fileExtension = 'png';
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to upscale image'));
          return;
        }

        const originalSize = file.size;
        const upscaledSize = blob.size;
        const sizeIncrease = ((upscaledSize - originalSize) / originalSize) * 100;
        
        // Generate filename
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const fileName = `${baseName}_upscaled_${scaleFactor}x.${fileExtension}`;
        const url = URL.createObjectURL(blob);

        resolve({
          name: fileName,
          url: url,
          originalSize: originalSize,
          processedSize: upscaledSize,
          compressionRatio: -Math.max(0, sizeIncrease), // Negative because file got larger
          blob: blob
        });
      }, outputFormat, 1.0); // Quality 1.0 = no compression
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Lanczos upscaling implementation
function performLanczosUpscaling(
  img: HTMLImageElement,
  ctx: CanvasRenderingContext2D,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
) {
  // Create temporary canvas for source image
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = srcWidth;
  tempCanvas.height = srcHeight;
  const tempCtx = tempCanvas.getContext('2d')!;
  
  // Draw source image
  tempCtx.drawImage(img, 0, 0);
  const srcData = tempCtx.getImageData(0, 0, srcWidth, srcHeight);
  const srcPixels = srcData.data;
  
  // Create destination image data
  const dstData = ctx.createImageData(dstWidth, dstHeight);
  const dstPixels = dstData.data;
  
  const xRatio = srcWidth / dstWidth;
  const yRatio = srcHeight / dstHeight;
  const kernelSize = 3; // Lanczos-3
  
  // Process each pixel in destination image
  for (let dstY = 0; dstY < dstHeight; dstY++) {
    for (let dstX = 0; dstX < dstWidth; dstX++) {
      const srcX = dstX * xRatio;
      const srcY = dstY * yRatio;
      
      let r = 0, g = 0, b = 0, a = 0;
      let weightSum = 0;
      
      // Sample surrounding pixels
      for (let y = Math.floor(srcY) - kernelSize + 1; y <= Math.floor(srcY) + kernelSize; y++) {
        for (let x = Math.floor(srcX) - kernelSize + 1; x <= Math.floor(srcX) + kernelSize; x++) {
          if (x >= 0 && x < srcWidth && y >= 0 && y < srcHeight) {
            const weight = lanczosKernel(srcX - x, kernelSize) * lanczosKernel(srcY - y, kernelSize);
            const pixelIndex = (y * srcWidth + x) * 4;
            
            r += srcPixels[pixelIndex] * weight;
            g += srcPixels[pixelIndex + 1] * weight;
            b += srcPixels[pixelIndex + 2] * weight;
            a += srcPixels[pixelIndex + 3] * weight;
            weightSum += weight;
          }
        }
      }
      
      // Normalize and clamp values
      if (weightSum > 0) {
        const dstIndex = (dstY * dstWidth + dstX) * 4;
        dstPixels[dstIndex] = Math.max(0, Math.min(255, Math.round(r / weightSum)));
        dstPixels[dstIndex + 1] = Math.max(0, Math.min(255, Math.round(g / weightSum)));
        dstPixels[dstIndex + 2] = Math.max(0, Math.min(255, Math.round(b / weightSum)));
        dstPixels[dstIndex + 3] = Math.max(0, Math.min(255, Math.round(a / weightSum)));
      }
    }
  }
  
  // Put the processed image data
  ctx.putImageData(dstData, 0, 0);
}

// Bicubic upscaling implementation for larger scale factors
function performBicubicUpscaling(
  img: HTMLImageElement,
  ctx: CanvasRenderingContext2D,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
) {
  // Use step-by-step scaling for better quality with large scale factors
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  
  let currentWidth = srcWidth;
  let currentHeight = srcHeight;
  
  // Draw initial image
  tempCanvas.width = currentWidth;
  tempCanvas.height = currentHeight;
  tempCtx.drawImage(img, 0, 0);
  
  // Scale in steps of maximum 2x to maintain quality
  while (currentWidth < dstWidth || currentHeight < dstHeight) {
    const nextWidth = Math.min(currentWidth * 2, dstWidth);
    const nextHeight = Math.min(currentHeight * 2, dstHeight);
    
    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = nextWidth;
    stepCanvas.height = nextHeight;
    const stepCtx = stepCanvas.getContext('2d')!;
    
    // Use high-quality canvas scaling
    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(tempCanvas, 0, 0, nextWidth, nextHeight);
    
    // Update for next iteration
    tempCanvas.width = nextWidth;
    tempCanvas.height = nextHeight;
    tempCtx.clearRect(0, 0, nextWidth, nextHeight);
    tempCtx.drawImage(stepCanvas, 0, 0);
    
    currentWidth = nextWidth;
    currentHeight = nextHeight;
  }
  
  // Final draw to destination
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(tempCanvas, 0, 0, dstWidth, dstHeight);
}

// Process multiple files for upscaling
export const upscaleImages = async (
  files: File[], 
  scaleFactor: number,
  onProgress?: (current: number, total: number) => void
): Promise<ProcessedFile[]> => {
  const upscaled: ProcessedFile[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length);
    
    try {
      const result = await upscaleImage(file, scaleFactor);
      upscaled.push(result);
    } catch (error) {
      console.error(`Failed to upscale ${file.name}:`, error);
    }
  }
  
  return upscaled;
};

// Get original file for comparison
export const getOriginalFileForComparison = <T extends File>(
  index: number, 
  originalFiles: T[], 
  upscaledFiles: ProcessedFile[]
): T | null => {
  if (index >= 0 && index < originalFiles.length && index < upscaledFiles.length) {
    return originalFiles[index];
  }
  return null;
};