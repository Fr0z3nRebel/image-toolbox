"use client";

import { useState } from "react";
import { formatFileSize } from "./utils/browserUtils";

interface ImageComparisonProps {
  originalImageUrl: string;
  processedImageUrl: string;
  originalSize: number;
  processedSize: number;
  fileName: string;
  className?: string;
}

export default function ImageComparison({
  originalImageUrl,
  processedImageUrl,
  originalSize,
  processedSize,
  fileName,
  className = ""
}: ImageComparisonProps) {
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  const handleSliderDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleSliderMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.buttons === 1) { // Left mouse button is pressed
      event.preventDefault();
      handleSliderDrag(event);
    }
  };

  const handleMouseUp = () => {
    // Re-enable text selection when dragging stops
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    // Prevent text selection during drag
    event.preventDefault();
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    handleSliderDrag(event);
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Before / After Comparison
      </h2>
      <p className="text-gray-600 mb-4">
        Comparing: {fileName}
      </p>

      <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-0">
        <div 
          className="relative overflow-hidden rounded-lg border border-gray-300 bg-gray-100 select-none h-64 sm:h-96"
          style={{ aspectRatio: "16/9" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleSliderMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Processed Image (Background - Right side) */}
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={processedImageUrl}
              alt="Processed"
              className="w-full h-full object-contain"
              draggable={false}
            />
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-green-600 text-white px-2 py-1 sm:px-3 sm:py-1 rounded text-xs sm:text-sm font-medium">
              <span className="hidden sm:inline">Processed ({formatFileSize(processedSize)})</span>
              <span className="sm:hidden">Processed</span>
            </div>
          </div>

          {/* Original Image (Foreground with clip - Left side) */}
          <div 
            className="absolute inset-0"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={originalImageUrl}
              alt="Original"
              className="w-full h-full object-contain"
              draggable={false}
            />
            <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-red-600 text-white px-2 py-1 sm:px-3 sm:py-1 rounded text-xs sm:text-sm font-medium">
              <span className="hidden sm:inline">Original ({formatFileSize(originalSize)})</span>
              <span className="sm:hidden">Original</span>
            </div>
          </div>

          {/* Slider Handle */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 sm:w-1 bg-white shadow-lg cursor-col-resize flex items-center justify-center pointer-events-none"
            style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-4 h-4 sm:w-6 sm:h-6 bg-white rounded-full shadow-lg border-2 border-gray-300 flex items-center justify-center">
              <div className="w-1 h-1 sm:w-2 sm:h-2 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Slider Instructions */}
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Click and drag the slider or click anywhere on the image to compare original vs processed</p>
          <div className="flex justify-center gap-8 mt-2">
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded"></div>
              Original (Left)
            </span>
            <span className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-600 rounded"></div>
              Processed (Right)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 