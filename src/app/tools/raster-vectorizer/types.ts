export type PotracePresetId = "clean" | "smoother" | "less_speckles";

export interface PotracePreset {
  id: PotracePresetId;
  label: string;
  description: string;
  turdsize: number;
  opttolerance: number;
}
