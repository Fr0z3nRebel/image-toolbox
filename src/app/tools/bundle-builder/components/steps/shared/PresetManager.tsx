"use client";

import { Save, Trash2 } from "lucide-react";
import type { BundleBuilderPreset } from "../../../types/presets";

interface PresetManagerProps {
  presets: Record<string, BundleBuilderPreset>;
  onLoadPreset: (presetName: string) => void;
  onDeletePreset: (presetName: string) => void;
  onShowSaveModal: () => void;
}

export default function PresetManager({
  presets,
  onLoadPreset,
  onDeletePreset,
  onShowSaveModal
}: PresetManagerProps) {
  return (
    <div className="space-y-2 pb-4 border-b border-gray-200">
      <label className="block text-sm font-bold text-gray-700 mb-2">Presets</label>
      <div className="flex gap-2">
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              onLoadPreset(e.target.value);
              e.target.value = "";
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white text-sm"
        >
          <option value="">Load preset...</option>
          {Object.keys(presets).map((name) => (
            <option key={name} value={name}>
              {presets[name].name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onShowSaveModal}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-sm font-medium"
          title="Save current settings as preset"
        >
          <Save className="h-4 w-4" />
          Save
        </button>
      </div>
      {Object.keys(presets).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.keys(presets).map((name) => (
            <div key={name} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 rounded-lg text-sm">
              <span className="text-gray-700">{name}</span>
              <button type="button" onClick={() => onDeletePreset(name)} className="text-gray-500 hover:text-red-600 transition-colors" title="Delete preset">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
