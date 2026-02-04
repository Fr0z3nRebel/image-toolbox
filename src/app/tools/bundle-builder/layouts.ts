import type { LayoutStyle, ImageFrame, TextSafeRect } from "./types";

const computeGridLayout = (
  canvasWidth: number,
  canvasHeight: number,
  imagesCount: number,
  textSafeRect: TextSafeRect,
  imagesPerRow?: number,
  imageSpacingPercent: number = 5
): ImageFrame[] => {
  if (imagesCount <= 0) return [];

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(value, max));

  // Smaller margins to maximize image size
  const margin = Math.min(canvasWidth, canvasHeight) * 0.02;
  // Calculate gap between images based on imageSpacingPercent
  // Convert percentage (0-20) to a gap size relative to canvas dimensions
  // At 0%, gap is 0 (images can touch), at 20% use 3% of smaller dimension
  const maxGap = Math.min(canvasWidth, canvasHeight) * 0.03; // 3% maximum
  const gapBetweenImages = (imageSpacingPercent / 20) * maxGap;
  const innerWidth = canvasWidth - margin * 2;

  // Calculate available space above and below the text-safe area
  const topAvailableHeight = textSafeRect.y - margin;
  const bottomAvailableHeight = canvasHeight - (textSafeRect.y + textSafeRect.height) - margin;

  // Split images equally above and below
  const imagesAbove = Math.ceil(imagesCount / 2);
  const imagesBelow = Math.floor(imagesCount / 2);

  // Determine columns: use imagesPerRow if provided, otherwise auto-calculate
  const cols = imagesPerRow && imagesPerRow > 0
    ? imagesPerRow
    : Math.max(1, Math.ceil(Math.sqrt(imagesCount)));

  // Account for gaps between images in width calculation
  const totalGapWidth = gapBetweenImages * (cols - 1);
  const cellWidth = (innerWidth - totalGapWidth) / cols;

  const frames: ImageFrame[] = [];

  const pushSectionFrames = (params: {
    count: number;
    colsInSection: number;
    yStart: number;
    availableHeight: number;
    yMin: number;
    yMax: number;
    fillFromBottom?: boolean;
  }) => {
    const { count, colsInSection, yStart, availableHeight, yMin, yMax, fillFromBottom } = params;
    if (count <= 0) return;

    const rows = Math.ceil(count / Math.max(1, colsInSection));
    // Include gap before first row: rows gaps total (not rows - 1)
    const totalGapHeight = gapBetweenImages * rows;
    const cellHeight = (availableHeight - totalGapHeight) / Math.max(1, rows);

    // Compute how many items are in each row using the "natural" fill order.
    // We can then optionally flip the visual row order so the partial row ends
    // up closest to the center divider (desired for the bottom section).
    const rowItemCounts: number[] = Array.from({ length: rows }, (_, r) => {
      const startIndex = r * colsInSection;
      return Math.min(colsInSection, Math.max(0, count - startIndex));
    });

    for (let i = 0; i < count; i++) {
      const baseRow = Math.floor(i / colsInSection);
      const col = i % colsInSection;
      const visualRow = fillFromBottom ? (rows - 1 - baseRow) : baseRow;

      // Center each row based on how many images are actually in that row.
      // This keeps partial rows centered (e.g. odd image counts) and creates
      // the desired staggered/brick look relative to full rows.
      const itemsInRow = rowItemCounts[baseRow] ?? colsInSection;
      const rowWidth = itemsInRow * cellWidth + gapBetweenImages * Math.max(0, itemsInRow - 1);
      const startX = margin + (innerWidth - rowWidth) / 2;

      const x = startX + col * (cellWidth + gapBetweenImages);
      const y = yStart + visualRow * (cellHeight + gapBetweenImages);

      frames.push({
        x: clamp(x, margin, canvasWidth - margin - cellWidth),
        y: clamp(y, yMin, yMax - cellHeight),
        width: cellWidth,
        height: cellHeight,
        rotation: 0
      });
    }
  };

  // Place images above the center
  const colsAbove = Math.min(cols, imagesAbove);
  pushSectionFrames({
    count: imagesAbove,
    colsInSection: Math.max(1, colsAbove),
    yStart: margin + gapBetweenImages, // Add gap before first row for uniform spacing
    availableHeight: topAvailableHeight - gapBetweenImages, // Adjust for gap added to yStart
    yMin: margin,
    yMax: textSafeRect.y - gapBetweenImages,
    fillFromBottom: false
  });

  // Place images below the center
  const colsBelow = Math.min(cols, imagesBelow);
  const startYBelow = textSafeRect.y + textSafeRect.height + gapBetweenImages;
  pushSectionFrames({
    count: imagesBelow,
    colsInSection: Math.max(1, colsBelow),
    yStart: startYBelow,
    availableHeight: bottomAvailableHeight,
    yMin: startYBelow,
    yMax: canvasHeight - margin,
    // Fill bottom section from the bottom up so any partial row is nearest
    // the center divider (row 3), not at the very bottom (row 4).
    fillFromBottom: true
  });

  return frames;
};

const applyAngledVariation = (frames: ImageFrame[], maxRotationDeg = 6): ImageFrame[] => {
  if (frames.length === 0) return frames;

  const rotated: ImageFrame[] = [];
  const count = frames.length;

  for (let i = 0; i < count; i++) {
    const base = frames[i];
    // Alternate rotations like -max..+max across the set
    const t = count <= 1 ? 0 : (i / (count - 1)) * 2 - 1; // range [-1, 1]
    const rotation = t * maxRotationDeg * (i % 2 === 0 ? 1 : -1);

    rotated.push({
      ...base,
      rotation
    });
  }

  return rotated;
};

const computePlainGridLayout = (
  canvasWidth: number,
  canvasHeight: number,
  imagesCount: number,
  textSafeRect: TextSafeRect,
  imagesPerRow?: number,
  imageSpacingPercent: number = 5
): ImageFrame[] => {
  if (imagesCount <= 0) return [];

  // Calculate optimal grid dimensions first
  let cols: number;
  let rows: number;

  if (imagesPerRow && imagesPerRow > 0) {
    cols = imagesPerRow;
    rows = Math.ceil(imagesCount / cols);
  } else {
    // Calculate optimal aspect ratio for grid
    const canvasAspect = canvasWidth / canvasHeight;
    // Try to find a grid that's close to the canvas aspect ratio
    cols = Math.ceil(Math.sqrt(imagesCount * canvasAspect));
    rows = Math.ceil(imagesCount / cols);
    
    // Ensure we don't have too many empty cells
    while ((cols * rows - imagesCount) >= cols && rows > 1) {
      rows--;
    }
  }

  // Calculate uniform spacing using imageSpacingPercent
  // The spacing is a percentage of the cell size, ensuring uniform gaps
  const spacingRatio = imageSpacingPercent / 100;
  const numGapsY = Math.max(0, rows - 1);
  const numGapsX = Math.max(0, cols - 1);
  
  // Solve: canvasHeight = rows * cellHeight + numGapsY * gapSize
  // Where: gapSize = cellHeight * spacingRatio
  // So: canvasHeight = rows * cellHeight + numGapsY * cellHeight * spacingRatio
  //    = cellHeight * (rows + numGapsY * spacingRatio)
  const cellHeight = canvasHeight / (rows + numGapsY * spacingRatio);
  const gapSize = cellHeight * spacingRatio;
  
  // Same for width
  const cellWidth = canvasWidth / (cols + numGapsX * spacingRatio);
  const gapWidth = cellWidth * spacingRatio;
  
  // Use vertical gap size for row spacing (this is what matters for uniform row gaps)
  const uniformGapSize = gapSize;
  
  // Use the calculated cell sizes directly - they already account for uniform gaps
  const finalCellWidth = cellWidth;
  const finalCellHeight = cellHeight;

  const frames: ImageFrame[] = [];

  for (let i = 0; i < imagesCount; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    // Position frames with EXACTLY uniformGapSize between each row
    // Formula: y = row * (cellHeight + gapSize)
    // This ensures: gap between row N and N+1 = (N+1)*(cellHeight+gap) - N*(cellHeight+gap) - cellHeight = gapSize
    const x = col * (finalCellWidth + gapWidth);
    const y = row * (finalCellHeight + uniformGapSize);

    frames.push({
      x,
      y,
      width: finalCellWidth,
      height: finalCellHeight,
      rotation: 0
    });
  }

  return frames;
};

/**
 * Compute image frames for the given layout style
 */
export const computeImageFrames = (
  layoutStyle: LayoutStyle,
  canvasWidth: number,
  canvasHeight: number,
  imagesCount: number,
  textSafeRect: TextSafeRect,
  imagesPerRow?: number,
  imageSpacingPercent?: number
): ImageFrame[] => {
  if (imagesCount <= 0) return [];

  switch (layoutStyle) {
    case "grid": {
      return computePlainGridLayout(canvasWidth, canvasHeight, imagesCount, textSafeRect, imagesPerRow, imageSpacingPercent);
    }
    case "dividedGrid": {
      return computeGridLayout(canvasWidth, canvasHeight, imagesCount, textSafeRect, imagesPerRow, imageSpacingPercent);
    }
    case "dividedGrid2": {
      const base = computeGridLayout(canvasWidth, canvasHeight, imagesCount, textSafeRect, imagesPerRow, imageSpacingPercent);
      return applyAngledVariation(base, 6);
    }
    default: {
      return computeGridLayout(canvasWidth, canvasHeight, imagesCount, textSafeRect, imagesPerRow, imageSpacingPercent);
    }
  }
};