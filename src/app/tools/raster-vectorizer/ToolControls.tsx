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
        <label className="block text-sm font-medium text-brand-white mb-1">
          Style
        </label>
        <div
          role="group"
          aria-label="Style preset"
          className="flex rounded-lg border border-brand-grey overflow-hidden bg-brand-charcoal p-0.5"
        >
          {POTRACE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetIdChange(p.id)}
              disabled={isConverting}
              title={p.description}
              className={`flex-1 px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-1 focus:ring-offset-brand-charcoal disabled:opacity-50 ${
                presetId === p.id
                  ? "bg-brand-orange text-white shadow-sm rounded-md"
                  : "text-brand-white/80 hover:text-brand-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-white mb-1">
          Cut threshold: {threshold}
        </label>
        <input
          type="range"
          min={0}
          max={255}
          value={threshold}
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          disabled={isConverting}
          className="w-full h-2 bg-brand-charcoal rounded-lg appearance-none cursor-pointer accent-brand-orange"
        />
        <p className="text-xs text-brand-white/70 mt-0.5">
          Lower = more pixels as shape.
        </p>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={invert}
          onChange={(e) => onInvertChange(e.target.checked)}
          disabled={isConverting}
          className="rounded border-gray-300 text-brand-orange focus:ring-brand-orange"
        />
        <span className="text-sm font-medium text-brand-white">
          Invert (light = shape)
        </span>
      </label>

      <div className="space-y-2 pt-2 border-t border-brand-grey">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useSingleColor}
            onChange={(e) => onUseSingleColorChange(e.target.checked)}
            disabled={isConverting}
            className="rounded border-gray-300 text-brand-orange focus:ring-brand-orange"
          />
          <span className="text-sm font-medium text-brand-white">
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
