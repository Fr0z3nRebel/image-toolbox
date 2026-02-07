import type { PotracePreset } from "./types";

export const POTRACE_PRESETS: PotracePreset[] = [
  {
    id: "clean",
    label: "Clean",
    description: "Sharp, clean edges — best for logos and icons",
    turdsize: 2,
    opttolerance: 0.2,
  },
  {
    id: "smoother",
    label: "Smoother",
    description: "Softer curves, fewer corners",
    turdsize: 2,
    opttolerance: 0.5,
  },
  {
    id: "less_speckles",
    label: "Less speckles",
    description: "Removes more small noise; simpler outline",
    turdsize: 8,
    opttolerance: 0.2,
  },
];

export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB
export const MAX_FILES = 50;
export const ACCEPTED_TYPES = "image/jpeg,image/png,image/gif,image/webp";
