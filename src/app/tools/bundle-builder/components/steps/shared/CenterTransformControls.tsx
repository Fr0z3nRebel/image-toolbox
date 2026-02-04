"use client";

import { Maximize2, RotateCcw, ArrowLeftRight, ArrowUpDown, Lock, Unlock, Crosshair } from "lucide-react";

interface CenterTransformControlsProps {
  textSafeAreaPercent: number;
  centerRotation: number;
  centerWidthScale: number;
  centerHeightScale: number;
  centerScaleLocked: boolean;
  centerXOffset: number;
  centerYOffset: number;
  centerMode: "image" | "text";
  onTextSafeAreaPercentChange: (percent: number) => void;
  onCenterRotationChange: (rotation: number) => void;
  onCenterWidthScaleChange: (scale: number) => void;
  onCenterHeightScaleChange: (scale: number) => void;
  onCenterScaleLockedChange: (locked: boolean) => void;
  onCenterXOffsetChange: (offset: number) => void;
  onCenterYOffsetChange: (offset: number) => void;
}

export default function CenterTransformControls({
  textSafeAreaPercent,
  centerRotation,
  centerWidthScale,
  centerHeightScale,
  centerScaleLocked,
  centerXOffset,
  centerYOffset,
  centerMode,
  onTextSafeAreaPercentChange,
  onCenterRotationChange,
  onCenterWidthScaleChange,
  onCenterHeightScaleChange,
  onCenterScaleLockedChange,
  onCenterXOffsetChange,
  onCenterYOffsetChange
}: CenterTransformControlsProps) {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-start md:gap-4">
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
            <Maximize2 className="h-4 w-4 text-gray-500" aria-hidden="true" />
            <span>Size: {textSafeAreaPercent}%</span>
          </label>
          <input
            type="range"
            min={10}
            max={40}
            step={5}
            value={textSafeAreaPercent}
            onChange={(e) => onTextSafeAreaPercentChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
        <div className="flex-1 mt-4 md:mt-0">
          <div className="flex items-center gap-2 mb-1">
            <label className="block text-sm font-bold text-gray-700 flex-1 flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4 text-gray-500" aria-hidden="true" />
              <span>Rotation: {centerRotation}°</span>
            </label>
            <button
              type="button"
              onClick={() => onCenterRotationChange(0)}
              className="px-2 py-1 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Reset rotation to 0°"
            >
              Reset
            </button>
          </div>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={centerRotation}
            onChange={(e) => onCenterRotationChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      </div>
      {centerMode === "text" ? (
        <>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-bold text-gray-700 flex-1 flex items-center gap-1.5">
                <ArrowLeftRight className="h-4 w-4 text-gray-500" aria-hidden="true" />
                <span>Width: {Math.round(centerWidthScale * 100)}%</span>
              </label>
              <button
                type="button"
                onClick={() => onCenterScaleLockedChange(!centerScaleLocked)}
                className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                aria-label={centerScaleLocked ? "Unlock width and height" : "Lock width and height"}
              >
                {centerScaleLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              </button>
              <label className="block text-sm font-bold text-gray-700 flex-1 text-right flex items-center justify-end gap-1.5">
                <ArrowUpDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
                <span>Height: {Math.round(centerHeightScale * 100)}%</span>
              </label>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min={50}
                max={150}
                step={1}
                value={Math.round(centerWidthScale * 100)}
                onChange={(e) => {
                  const newWidth = Number(e.target.value) / 100;
                  onCenterWidthScaleChange(newWidth);
                  if (centerScaleLocked) {
                    onCenterHeightScaleChange(newWidth);
                  }
                }}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <input
                type="range"
                min={50}
                max={150}
                step={1}
                value={Math.round(centerHeightScale * 100)}
                onChange={(e) => {
                  const newHeight = Number(e.target.value) / 100;
                  onCenterHeightScaleChange(newHeight);
                  if (centerScaleLocked) {
                    onCenterWidthScaleChange(newHeight);
                  }
                }}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>
        </>
      ) : null}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="block text-sm font-bold text-gray-700 flex-1 flex items-center gap-1.5">
            <ArrowLeftRight className="h-4 w-4 text-gray-500" aria-hidden="true" />
            <span>Position: {centerXOffset}%</span>
          </label>
          <button
            type="button"
            onClick={() => {
              onCenterXOffsetChange(0);
              onCenterYOffsetChange(0);
            }}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-center justify-center"
            aria-label="Center position"
          >
            <Crosshair className="h-4 w-4" />
          </button>
          <label className="block text-sm font-bold text-gray-700 flex-1 text-right flex items-center justify-end gap-1.5">
            <ArrowUpDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
            <span>Position: {centerYOffset}%</span>
          </label>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min={-50}
            max={50}
            step={1}
            value={centerXOffset}
            onChange={(e) => onCenterXOffsetChange(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <input
            type="range"
            min={-50}
            max={50}
            step={1}
            value={centerYOffset}
            onChange={(e) => onCenterYOffsetChange(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      </div>
    </>
  );
}
