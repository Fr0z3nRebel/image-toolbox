"use client";

import { useState, useCallback, useEffect } from "react";
import { X, Pipette, Sparkles } from "lucide-react";
import { parseHex } from "./utils/colorUtils";

// Re-export parseHex for backward compatibility
export { parseHex };

function isEyeDropperSupported(): boolean {
  return typeof window !== "undefined" && "EyeDropper" in window;
}

export interface ColorSuggestion {
  color: string;
  label: string;
}

export interface ColorPickerModalProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (hex: string) => void;
  title: string;
  /** When true, show "Pick from preview" button using EyeDropper (Chrome/Edge). */
  showPickFromPreview?: boolean;
  /** Optional callback to auto-pick colors from the preview image. Returns array of suggestions. */
  onAutoPick?: () => ColorSuggestion[] | null;
}

export default function ColorPickerModal({
  open,
  onClose,
  value,
  onChange,
  title,
  showPickFromPreview = false,
  onAutoPick
}: ColorPickerModalProps) {
  const [hexInput, setHexInput] = useState(value);
  const [isPicking, setIsPicking] = useState(false);
  const [isAutoPicking, setIsAutoPicking] = useState(false);
  const [suggestions, setSuggestions] = useState<ColorSuggestion[] | null>(null);

  const syncFromValue = useCallback(() => {
    setHexInput(value);
  }, [value]);

  useEffect(() => {
    if (open) {
      setHexInput(value);
      setSuggestions(null);
    }
  }, [open, value]);

  const handleHexChange = (raw: string) => {
    setHexInput(raw);
    const parsed = parseHex(raw);
    if (parsed) onChange(parsed);
  };

  const handleHexBlur = () => {
    const parsed = parseHex(hexInput);
    if (parsed) setHexInput(parsed);
    else setHexInput(value);
  };

  const handlePickFromPreview = async () => {
    if (!isEyeDropperSupported()) return;
    setIsPicking(true);
    try {
      const dropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
      const { sRGBHex } = await dropper.open();
      onChange(sRGBHex);
      setHexInput(sRGBHex);
    } catch {
      // User cancelled or error
    } finally {
      setIsPicking(false);
    }
  };

  const handleAutoPick = () => {
    if (!onAutoPick) return;
    setIsAutoPicking(true);
    try {
      const suggestionsResult = onAutoPick();
      if (suggestionsResult && suggestionsResult.length > 0) {
        setSuggestions(suggestionsResult);
        // Auto-select the first suggestion
        onChange(suggestionsResult[0].color);
        setHexInput(suggestionsResult[0].color);
      }
    } catch {
      // Error analyzing colors
    } finally {
      setIsAutoPicking(false);
    }
  };

  const handleSuggestionClick = (color: string) => {
    onChange(color);
    setHexInput(color);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent"
      onClick={() => { syncFromValue(); onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-brand-grey rounded-xl shadow-xl p-5 max-w-sm w-full space-y-4 border border-brand-charcoal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-white">{title}</h3>
          <button
            type="button"
            onClick={() => { syncFromValue(); onClose(); }}
            className="p-1.5 rounded-lg text-brand-white/70 hover:bg-brand-charcoal hover:text-brand-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-3 items-center">
          <input
            type="color"
            value={value}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v);
              setHexInput(v);
            }}
            className="h-12 w-14 shrink-0 p-1 border border-gray-300 rounded-lg cursor-pointer"
            aria-label="Pick color"
          />
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            onBlur={handleHexBlur}
            placeholder="#ffffff"
            className="flex-1 px-3 py-2 text-sm border border-brand-grey rounded-lg font-mono text-brand-white bg-brand-charcoal placeholder:text-brand-white/50"
            aria-label="Hex color"
          />
        </div>
        <div className="space-y-2">
          {onAutoPick && (
            <>
              <button
                type="button"
                onClick={handleAutoPick}
                disabled={isAutoPicking}
                className="w-full py-2 px-4 rounded-lg border border-brand-orange bg-brand-orange/20 text-brand-orange font-medium hover:bg-brand-orange/30 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Sparkles className="h-4 w-4" />
                {isAutoPicking ? "Analyzing preview…" : "Suggest colors from preview"}
              </button>
              {suggestions && suggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-brand-white">Suggested colors:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion.color)}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all hover:scale-105"
                        style={{
                          borderColor: value === suggestion.color ? suggestion.color : "transparent",
                          backgroundColor: value === suggestion.color ? `${suggestion.color}15` : "transparent"
                        }}
                      >
                        <div
                          className="w-full h-10 rounded border border-gray-300"
                          style={{ backgroundColor: suggestion.color }}
                        />
                        <span className="text-xs font-medium text-brand-white">{suggestion.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {showPickFromPreview && (
            <div>
              {isEyeDropperSupported() ? (
                <button
                  type="button"
                  onClick={handlePickFromPreview}
                  disabled={isPicking}
                  className="w-full py-2 px-4 rounded-lg border border-brand-grey bg-brand-charcoal text-brand-white font-medium hover:bg-brand-grey transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Pipette className="h-4 w-4" />
                  {isPicking ? "Pick a color on screen…" : "Pick from preview"}
                </button>
              ) : (
                <p className="text-xs text-brand-white/60">Pick from preview is supported in Chrome and Edge.</p>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => { syncFromValue(); onClose(); }}
          className="w-full py-2.5 px-4 rounded-lg bg-brand-orange text-white font-medium hover:bg-brand-600 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
