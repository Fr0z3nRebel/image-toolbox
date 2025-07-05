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

// Advanced background removal using saliency detection and edge-based segmentation
export const removeBackgroundAuto = (
  canvas: HTMLCanvasElement,
  settings: BackgroundRemovalSettings,
  foregroundHints?: ImageData,
  backgroundHints?: ImageData
): Promise<ProcessedFile> => {
  return new Promise((resolve, reject) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Create saliency map to identify main subject
    const saliencyMap = calculateSaliencyMap(imageData);
    
    // Detect edges in the image
    const edgeMap = detectEdges(imageData);
    
    // Combine saliency and edge information to create segmentation
    const mask = createAdvancedMask(imageData, saliencyMap, edgeMap, settings, foregroundHints, backgroundHints);
    
    // Apply the mask to create final result
    const result = applyMask(imageData, mask, settings);
    
    // Put result back to canvas
    ctx.putImageData(result, 0, 0);

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

// Calculate saliency map to identify main subject areas
const calculateSaliencyMap = (imageData: ImageData): Uint8Array => {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const saliency = new Uint8Array(width * height);
  
  // Create luminance channel
  const luminance = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    luminance[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
  }
  
  // Calculate center bias (subjects are often in the center)
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      // Distance from center (closer = higher saliency)
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const centerBias = 1 - (dist / maxDist);
      
      // Edge contrast (higher contrast = higher saliency)
      let contrast = 0;
      const windowSize = 5;
      const halfWindow = Math.floor(windowSize / 2);
      
      for (let dy = -halfWindow; dy <= halfWindow; dy++) {
        for (let dx = -halfWindow; dx <= halfWindow; dx++) {
          const nx = Math.max(0, Math.min(width - 1, x + dx));
          const ny = Math.max(0, Math.min(height - 1, y + dy));
          const neighborIdx = ny * width + nx;
          contrast += Math.abs(luminance[idx] - luminance[neighborIdx]);
        }
      }
      contrast /= (windowSize * windowSize);
      
      // Color uniqueness (unique colors are more likely to be subjects)
      let colorUniqueness = 0;
      const currentPixel = idx * 4;
      const searchRadius = 10;
      let similarPixels = 0;
      let totalPixels = 0;
      
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const neighborIdx = (ny * width + nx) * 4;
            const colorDist = Math.sqrt(
              (data[currentPixel] - data[neighborIdx]) ** 2 +
              (data[currentPixel + 1] - data[neighborIdx + 1]) ** 2 +
              (data[currentPixel + 2] - data[neighborIdx + 2]) ** 2
            );
            if (colorDist < 30) similarPixels++;
            totalPixels++;
          }
        }
      }
      colorUniqueness = 1 - (similarPixels / totalPixels);
      
      // Combine all factors
      saliency[idx] = Math.min(255, Math.round(
        (centerBias * 0.3 + (contrast / 50) * 0.4 + colorUniqueness * 0.3) * 255
      ));
    }
  }
  
  return saliency;
};

// Detect edges using Sobel operator
const detectEdges = (imageData: ImageData): Uint8Array => {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const edges = new Uint8Array(width * height);
  
  // Convert to grayscale first
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
  }
  
  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          gx += gray[idx] * sobelX[kernelIdx];
          gy += gray[idx] * sobelY[kernelIdx];
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = Math.min(255, magnitude);
    }
  }
  
  return edges;
};

// Create advanced segmentation mask
const createAdvancedMask = (
  imageData: ImageData,
  saliencyMap: Uint8Array,
  edgeMap: Uint8Array,
  settings: BackgroundRemovalSettings,
  foregroundHints?: ImageData,
  backgroundHints?: ImageData
): Uint8Array => {
  const width = imageData.width;
  const height = imageData.height;
  const mask = new Uint8Array(width * height);
  
  // Threshold saliency map to get initial foreground/background classification
  const saliencyThreshold = (settings.tolerance || 30) * 2.55; // Convert percentage to 0-255
  
  for (let i = 0; i < width * height; i++) {
    // Start with saliency-based classification
    let confidence = saliencyMap[i] > saliencyThreshold ? 255 : 0;
    
    // Incorporate user hints if available
    if (foregroundHints && backgroundHints) {
      const fgHint = foregroundHints.data[i * 4];
      const bgHint = backgroundHints.data[i * 4];
      
      if (fgHint > 128) {
        confidence = 255; // Strong foreground hint
      } else if (bgHint > 128) {
        confidence = 0; // Strong background hint
      }
    }
    
    mask[i] = confidence;
  }
  
  // Refine mask using edge information and region growing
  refineMaskWithEdges(mask, edgeMap, width, height);
  
  // Apply morphological operations to clean up the mask
  const cleanMask = morphologicalCleanup(mask, width, height);
  
  return cleanMask;
};

// Refine mask using edge information
const refineMaskWithEdges = (mask: Uint8Array, edges: Uint8Array, width: number, height: number) => {
  const refined = new Uint8Array(mask);
  
  // Region growing from high-confidence areas
  const queue: Array<{x: number, y: number, confidence: number}> = [];
  const visited = new Set<number>();
  
  // Add high-confidence seeds to queue
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx] > 200 || mask[idx] < 50) {
        queue.push({x, y, confidence: mask[idx]});
        visited.add(idx);
      }
    }
  }
  
  // Region growing
  while (queue.length > 0) {
    const {x, y, confidence} = queue.shift()!;
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        
        const neighborIdx = ny * width + nx;
        if (visited.has(neighborIdx)) continue;
        
        // Check if we should grow into this pixel
        const edgeStrength = edges[neighborIdx];
        const currentConf = mask[neighborIdx];
        
        // Don't cross strong edges unless confidence is very high
        if (edgeStrength < 100 || Math.abs(confidence - currentConf) < 100) {
          refined[neighborIdx] = confidence;
          visited.add(neighborIdx);
          queue.push({x: nx, y: ny, confidence});
        }
      }
    }
  }
  
  // Copy refined result back
  for (let i = 0; i < mask.length; i++) {
    mask[i] = refined[i];
  }
};

// Apply morphological operations to clean up the mask
const morphologicalCleanup = (mask: Uint8Array, width: number, height: number): Uint8Array => {
  const cleaned = new Uint8Array(mask);
  
  // Erosion followed by dilation (opening) to remove noise
  const kernelSize = 3;
  const halfKernel = Math.floor(kernelSize / 2);
  
  // Erosion
  for (let y = halfKernel; y < height - halfKernel; y++) {
    for (let x = halfKernel; x < width - halfKernel; x++) {
      let minVal = 255;
      for (let ky = -halfKernel; ky <= halfKernel; ky++) {
        for (let kx = -halfKernel; kx <= halfKernel; kx++) {
          const idx = (y + ky) * width + (x + kx);
          minVal = Math.min(minVal, mask[idx]);
        }
      }
      cleaned[y * width + x] = minVal;
    }
  }
  
  // Dilation
  const dilated = new Uint8Array(cleaned);
  for (let y = halfKernel; y < height - halfKernel; y++) {
    for (let x = halfKernel; x < width - halfKernel; x++) {
      let maxVal = 0;
      for (let ky = -halfKernel; ky <= halfKernel; ky++) {
        for (let kx = -halfKernel; kx <= halfKernel; kx++) {
          const idx = (y + ky) * width + (x + kx);
          maxVal = Math.max(maxVal, cleaned[idx]);
        }
      }
      dilated[y * width + x] = maxVal;
    }
  }
  
  return dilated;
};

// Apply mask to image data
const applyMask = (
  imageData: ImageData,
  mask: Uint8Array,
  settings: BackgroundRemovalSettings
): ImageData => {
  const result = new ImageData(imageData.width, imageData.height);
  const resultData = result.data;
  const originalData = imageData.data;
  
  for (let i = 0; i < mask.length; i++) {
    const pixelIdx = i * 4;
    const maskValue = mask[i] / 255;
    
    if (maskValue > 0.1) { // Foreground
      resultData[pixelIdx] = originalData[pixelIdx];     // R
      resultData[pixelIdx + 1] = originalData[pixelIdx + 1]; // G
      resultData[pixelIdx + 2] = originalData[pixelIdx + 2]; // B
      resultData[pixelIdx + 3] = Math.round(originalData[pixelIdx + 3] * maskValue); // A
    } else { // Background
      if (settings.useTransparent) {
        resultData[pixelIdx] = originalData[pixelIdx];
        resultData[pixelIdx + 1] = originalData[pixelIdx + 1];
        resultData[pixelIdx + 2] = originalData[pixelIdx + 2];
        resultData[pixelIdx + 3] = 0; // Transparent
      } else {
        const bgColor = hexToRgb(settings.backgroundColor || '#ffffff');
        resultData[pixelIdx] = bgColor.r;
        resultData[pixelIdx + 1] = bgColor.g;
        resultData[pixelIdx + 2] = bgColor.b;
        resultData[pixelIdx + 3] = 255;
      }
    }
  }
  
  // Apply edge smoothing if requested
  if (settings.edgeSmooth && settings.edgeSmooth > 0) {
    smoothEdges(result, settings.edgeSmooth);
  }
  
  return result;
};

// Interactive background removal using user hints
export const removeBackgroundDrawing = (
  originalCanvas: HTMLCanvasElement,
  foregroundHints: HTMLCanvasElement,
  backgroundHints: HTMLCanvasElement,
  settings: BackgroundRemovalSettings
): Promise<ProcessedFile> => {
  return new Promise((resolve, reject) => {
    const originalCtx = originalCanvas.getContext('2d');
    const fgCtx = foregroundHints.getContext('2d');
    const bgCtx = backgroundHints.getContext('2d');
    
    if (!originalCtx || !fgCtx || !bgCtx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Get image data
    const fgHints = fgCtx.getImageData(0, 0, foregroundHints.width, foregroundHints.height);
    const bgHints = bgCtx.getImageData(0, 0, backgroundHints.width, backgroundHints.height);
    
    // Use the advanced algorithm with user hints
    removeBackgroundAuto(originalCanvas, settings, fgHints, bgHints)
      .then(resolve)
      .catch(reject);
  });
};

// Generate real-time preview based on current hints
export const generateRealtimePreview = (
  originalCanvas: HTMLCanvasElement,
  foregroundHints: HTMLCanvasElement,
  backgroundHints: HTMLCanvasElement,
  settings: BackgroundRemovalSettings
): ImageData | null => {
  const originalCtx = originalCanvas.getContext('2d');
  const fgCtx = foregroundHints.getContext('2d');
  const bgCtx = backgroundHints.getContext('2d');
  
  if (!originalCtx || !fgCtx || !bgCtx) return null;

  try {
    const originalImageData = originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);
    const fgHints = fgCtx.getImageData(0, 0, foregroundHints.width, foregroundHints.height);
    const bgHints = bgCtx.getImageData(0, 0, backgroundHints.width, backgroundHints.height);
    
    // Create a fast preview using simplified algorithm
    
    // Calculate saliency map (simplified for real-time)
    const saliencyMap = calculateSimplifiedSaliencyMap(originalImageData);
    
    // Create mask with hints
    const mask = createFastMask(originalImageData, saliencyMap, settings, fgHints, bgHints);
    
    // Apply mask quickly
    const result = applyMaskFast(originalImageData, mask, settings);
    
    return result;
  } catch (error) {
    console.error('Error generating preview:', error);
    return null;
  }
};

// Simplified saliency calculation for real-time preview
const calculateSimplifiedSaliencyMap = (imageData: ImageData): Uint8Array => {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const saliency = new Uint8Array(width * height);
  
  // Quick center bias calculation
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      // Distance from center
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const centerBias = 1 - (dist / maxDist);
      
      // Simple contrast check (sample fewer neighbors for speed)
      let contrast = 0;
      const pixelIdx = idx * 4;
      const luminance = 0.299 * data[pixelIdx] + 0.587 * data[pixelIdx + 1] + 0.114 * data[pixelIdx + 2];
      
      // Check 4 neighbors only
      const neighbors = [
        {x: Math.max(0, x - 1), y},
        {x: Math.min(width - 1, x + 1), y},
        {x, y: Math.max(0, y - 1)},
        {x, y: Math.min(height - 1, y + 1)}
      ];
      
      for (const neighbor of neighbors) {
        const nIdx = (neighbor.y * width + neighbor.x) * 4;
        const nLuminance = 0.299 * data[nIdx] + 0.587 * data[nIdx + 1] + 0.114 * data[nIdx + 2];
        contrast += Math.abs(luminance - nLuminance);
      }
      contrast /= neighbors.length;
      
      // Combine factors (simplified)
      saliency[idx] = Math.min(255, Math.round(
        (centerBias * 0.4 + (contrast / 50) * 0.6) * 255
      ));
    }
  }
  
  return saliency;
};

// Fast mask creation for real-time preview
const createFastMask = (
  imageData: ImageData,
  saliencyMap: Uint8Array,
  settings: BackgroundRemovalSettings,
  foregroundHints: ImageData,
  backgroundHints: ImageData
): Uint8Array => {
  const width = imageData.width;
  const height = imageData.height;
  const mask = new Uint8Array(width * height);
  
  const saliencyThreshold = (settings.tolerance || 30) * 2.55;
  
  for (let i = 0; i < width * height; i++) {
    const pixelIdx = i * 4;
    
    // Check user hints first (they override everything)
    const fgHint = foregroundHints.data[pixelIdx];
    const bgHint = backgroundHints.data[pixelIdx];
    
    if (fgHint > 128) {
      mask[i] = 255; // Strong foreground
    } else if (bgHint > 128) {
      mask[i] = 0; // Strong background
    } else {
      // Use saliency
      mask[i] = saliencyMap[i] > saliencyThreshold ? 255 : 0;
    }
  }
  
  return mask;
};

// Fast mask application for real-time preview
const applyMaskFast = (
  imageData: ImageData,
  mask: Uint8Array,
  settings: BackgroundRemovalSettings
): ImageData => {
  const result = new ImageData(imageData.width, imageData.height);
  const resultData = result.data;
  const originalData = imageData.data;
  
  for (let i = 0; i < mask.length; i++) {
    const pixelIdx = i * 4;
    const maskValue = mask[i];
    
    if (maskValue > 128) { // Foreground
      resultData[pixelIdx] = originalData[pixelIdx];
      resultData[pixelIdx + 1] = originalData[pixelIdx + 1];
      resultData[pixelIdx + 2] = originalData[pixelIdx + 2];
      resultData[pixelIdx + 3] = originalData[pixelIdx + 3];
    } else { // Background
      if (settings.useTransparent) {
        resultData[pixelIdx] = originalData[pixelIdx];
        resultData[pixelIdx + 1] = originalData[pixelIdx + 1];
        resultData[pixelIdx + 2] = originalData[pixelIdx + 2];
        resultData[pixelIdx + 3] = 0;
      } else {
        const bgColor = hexToRgb(settings.backgroundColor || '#ffffff');
        resultData[pixelIdx] = bgColor.r;
        resultData[pixelIdx + 1] = bgColor.g;
        resultData[pixelIdx + 2] = bgColor.b;
        resultData[pixelIdx + 3] = 255;
      }
    }
  }
  
  return result;
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
          // For now, create empty hint canvases - this will be updated in the UI layer
          const emptyCanvas = document.createElement('canvas');
          emptyCanvas.width = canvas.width;
          emptyCanvas.height = canvas.height;
          result = await removeBackgroundDrawing(canvas, emptyCanvas, emptyCanvas, settings);
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