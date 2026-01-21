interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Checks if a pixel is considered "empty" (transparent or white)
 */
const isEmptyPixel = (r: number, g: number, b: number, alpha: number, whiteThreshold: number = 250): boolean => {
  // Transparent pixel
  if (alpha < 10) return true;
  // White or near-white pixel
  if (r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold) return true;
  return false;
};

/**
 * Detects the bounding box of non-transparent pixels in an image
 */
const getContentBoundingBox = (img: HTMLImageElement): BoundingBox | null => {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  // Draw the image to the canvas
  ctx.drawImage(img, 0, 0);

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  let hasContent = false;

  // Scan through all pixels to find the bounding box
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      const alpha = data[index + 3];

      // If pixel is not transparent
      if (alpha > 0) {
        hasContent = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // If no content found, return null (will use full image)
  if (!hasContent) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
};

/**
 * Detects the bounding box of content, ignoring transparent and white pixels
 */
export const getContentBoundingBoxIgnoringWhite = (img: HTMLImageElement, whiteThreshold: number = 250): BoundingBox | null => {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  // Draw the image to the canvas
  ctx.drawImage(img, 0, 0);

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  let hasContent = false;

  // Scan through all pixels to find the bounding box
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const alpha = data[index + 3];

      // If pixel is not empty (not transparent and not white)
      if (!isEmptyPixel(r, g, b, alpha, whiteThreshold)) {
        hasContent = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // If no content found, return null (will use full image)
  if (!hasContent) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
};

/**
 * Crops an image to its content bounding box, removing transparent space
 */
const cropImageToContent = (img: HTMLImageElement): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const boundingBox = getContentBoundingBox(img);

    // If no bounding box found or image is already tight, return original
    if (!boundingBox ||
        (boundingBox.x === 0 && boundingBox.y === 0 &&
         boundingBox.width === img.naturalWidth &&
         boundingBox.height === img.naturalHeight)) {
      resolve(img);
      return;
    }

    // Create a new canvas with the cropped dimensions
    const canvas = document.createElement("canvas");
    canvas.width = boundingBox.width;
    canvas.height = boundingBox.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    // Draw the cropped portion of the image
    ctx.drawImage(
      img,
      boundingBox.x,
      boundingBox.y,
      boundingBox.width,
      boundingBox.height,
      0,
      0,
      boundingBox.width,
      boundingBox.height
    );

    // Convert canvas to image
    const croppedImg = new Image();
    croppedImg.onload = () => {
      resolve(croppedImg);
    };
    croppedImg.onerror = () => {
      reject(new Error("Failed to create cropped image"));
    };
    croppedImg.src = canvas.toDataURL();
  });
};

/**
 * Load an image from a URL, crop to content (ignoring transparent and white),
 * and return a data URL. Used by InstantPreview to match export sizing.
 * Falls back to the original URL on load or crop failure.
 */
export async function getContentCroppedDataUrlFromUrl(url: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Image load failed"));
    i.src = url;
  });
  const bounds = getContentBoundingBoxIgnoringWhite(img);
  const sx = bounds?.x ?? 0;
  const sy = bounds?.y ?? 0;
  const sw = bounds?.width ?? img.naturalWidth;
  const sh = bounds?.height ?? img.naturalHeight;
  if (sw <= 0 || sh <= 0) return url;
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return url;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return url;
  }
}

/**
 * Load files as images, with automatic cropping to content
 */
export const loadFilesAsImages = (
  files: File[],
  options?: { cropToContent?: boolean }
): Promise<HTMLImageElement[]> => {
  const cropToContent = options?.cropToContent ?? true;

  return Promise.all(
    files.map(
      (file) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = async () => {
            try {
              if (!cropToContent) {
                resolve(img);
                return;
              }

              // Crop to content bounds (removes transparent space)
              const croppedImg = await cropImageToContent(img);
              resolve(croppedImg);
            } catch (err) {
              // If cropping fails, fall back to original image
              console.warn(`Failed to crop image ${file.name}, using original:`, err);
              resolve(img);
            }
          };
          img.onerror = () => {
            reject(new Error(`Failed to load image: ${file.name}`));
          };
          img.src = URL.createObjectURL(file);
        })
    )
  );
};