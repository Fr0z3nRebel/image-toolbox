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
        className="bg-brand-grey rounded-xl shadow-xl p-5 max-w-sm w-full space-y-4 border border-brand-charcoal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-white">Save Preset</h3>
          <button
            type="button"
            onClick={() => {
              onClose();
              onErrorChange(null);
            }}
            className="p-1.5 rounded-lg text-brand-white/70 hover:bg-brand-charcoal hover:text-brand-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-brand-white">
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
            className="w-full px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white bg-brand-charcoal text-sm placeholder:text-brand-white/50"
            autoFocus
          />
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onErrorChange(null);
            }}
            className="flex-1 py-2.5 px-4 rounded-lg bg-brand-charcoal text-brand-white font-medium hover:bg-brand-grey transition-colors border border-brand-grey"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="flex-1 py-2.5 px-4 rounded-lg bg-brand-orange text-white font-medium hover:bg-brand-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
