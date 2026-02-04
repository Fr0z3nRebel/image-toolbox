import { useState, useEffect } from "react";
import type { BundleBuilderPreset } from "../types/presets";
import { PRESET_STORAGE_KEY } from "../constants/defaults";

export function loadPresets(): Record<string, BundleBuilderPreset> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(PRESET_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function savePresets(presets: Record<string, BundleBuilderPreset>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Ignore storage errors
  }
}

export interface UsePresetsReturn {
  presets: Record<string, BundleBuilderPreset>;
  savePreset: (preset: BundleBuilderPreset) => void;
  loadPreset: (presetName: string) => BundleBuilderPreset | undefined;
  deletePreset: (presetName: string) => void;
}

export function usePresets(): UsePresetsReturn {
  const [presets, setPresets] = useState<Record<string, BundleBuilderPreset>>({});

  // Load presets from localStorage on mount
  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  const savePreset = (preset: BundleBuilderPreset) => {
    const updatedPresets = { ...presets, [preset.name]: preset };
    setPresets(updatedPresets);
    savePresets(updatedPresets);
  };

  const loadPreset = (presetName: string): BundleBuilderPreset | undefined => {
    return presets[presetName];
  };

  const deletePreset = (presetName: string) => {
    const updatedPresets = { ...presets };
    delete updatedPresets[presetName];
    setPresets(updatedPresets);
    savePresets(updatedPresets);
  };

  return {
    presets,
    savePreset,
    loadPreset,
    deletePreset
  };
}
