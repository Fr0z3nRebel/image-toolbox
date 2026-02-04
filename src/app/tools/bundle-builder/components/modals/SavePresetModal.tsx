"use client";

import { X } from "lucide-react";

interface SavePresetModalProps {
  open: boolean;
  presetNameInput: string;
  error: string | null;
  onClose: () => void;
  onPresetNameInputChange: (value: string) => void;
  onSave: () => void;
  onErrorChange: (error: string | null) => void;
}

export default function SavePresetModal({
  open,
  presetNameInput,
  error,
  onClose,
  onPresetNameInputChange,
  onSave,
  onErrorChange
}: SavePresetModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={() => {
        onClose();
        onErrorChange(null);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Save preset"
    >
      <div
        className="bg-white rounded-xl shadow-xl p-5 max-w-sm w-full space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Save Preset</h3>
          <button
            type="button"
            onClick={() => {
              onClose();
              onErrorChange(null);
            }}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Preset name
          </label>
          <input
            type="text"
            value={presetNameInput}
            onChange={(e) => {
              onPresetNameInputChange(e.target.value);
              onErrorChange(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSave();
              }
            }}
            placeholder="Enter preset name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onErrorChange(null);
            }}
            className="flex-1 py-2.5 px-4 rounded-lg bg-gray-100 text-gray-800 font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
