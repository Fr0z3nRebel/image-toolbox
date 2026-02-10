"use client";

import { POTRACE_PRESETS } from "./constants";
import type { PotracePresetId } from "./types";
import ColorPickerField from "./ColorPickerField";

export interface ToolControlsProps {
  presetId: PotracePresetId;
  onPresetIdChange: (id: PotracePresetId) => void;
  threshold: number;
  onThresholdChange: (value: number) => void;
  invert: boolean;
  onInvertChange: (value: boolean) => void;
  useSingleColor: boolean;
  onUseSingleColorChange: (value: boolean) => void;
  colorOverride: string | null;
  onColorOverrideChange: (value: string | null) => void;
  isConverting: boolean;
  error: string | null;
}

export default function ToolControls({
  presetId,
  onPresetIdChange,
  threshold,
  onThresholdChange,
  invert,
  onInvertChange,
  useSingleColor,
  onUseSingleColorChange,
  colorOverride,
  onColorOverrideChange,
  isConverting,
  error,
}: ToolControlsProps) {
  return (
    <div className="order-2 lg:order-1 space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Style
        </label>
        <div
          role="group"
          aria-label="Style preset"
          className="flex rounded-lg border border-gray-300 overflow-hidden bg-gray-100 p-0.5"
        >
          {POTRACE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetIdChange(p.id)}
              disabled={isConverting}
              title={p.description}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 focus:ring-offset-gray-100 disabled:opacity-50 ${
                presetId === p.id
                  ? "bg-white text-teal-700 shadow-sm rounded-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cut threshold: {threshold}
        </label>
        <input
          type="range"
          min={0}
          max={255}
          value={threshold}
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          disabled={isConverting}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
        />
        <p className="text-xs text-gray-500 mt-0.5">
          Lower = more pixels as shape.
        </p>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={invert}
          onChange={(e) => onInvertChange(e.target.checked)}
          disabled={isConverting}
          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
        />
        <span className="text-sm font-medium text-gray-700">
          Invert (light = shape)
        </span>
      </label>

      <div className="space-y-2 pt-2 border-t border-gray-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useSingleColor}
            onChange={(e) => onUseSingleColorChange(e.target.checked)}
            disabled={isConverting}
            className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Apply single color to SVG
          </span>
        </label>
        {useSingleColor && (
          <ColorPickerField
            value={colorOverride ?? "#000000"}
            onChange={(hex) => onColorOverrideChange(hex)}
            label="Color"
            disabled={isConverting}
          />
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
    </div>
  );
}
