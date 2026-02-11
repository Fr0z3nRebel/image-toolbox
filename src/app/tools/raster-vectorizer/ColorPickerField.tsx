"use client";

import { useState, useCallback, useEffect } from "react";
import { Pipette } from "lucide-react";

function parseHex(s: string): string | null {
  const t = s.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(t))
    return "#" + t[0] + t[0] + t[1] + t[1] + t[2] + t[2];
  if (/^[0-9a-fA-F]{6}$/.test(t)) return "#" + t.toLowerCase();
  return null;
}

function isEyeDropperSupported(): boolean {
  return typeof window !== "undefined" && "EyeDropper" in window;
}

export interface ColorPickerFieldProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
}

export default function ColorPickerField({
  value,
  onChange,
  label = "Color",
  id = "r2v-color",
  disabled = false,
}: ColorPickerFieldProps) {
  const [hexInput, setHexInput] = useState(value);
  const [isPicking, setIsPicking] = useState(false);

  useEffect(() => {
    setHexInput(value);
  }, [value]);

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

  const handlePick = useCallback(async () => {
    if (!isEyeDropperSupported()) return;
    setIsPicking(true);
    try {
      const dropper = new (window as unknown as {
        EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> };
      }).EyeDropper();
      const { sRGBHex } = await dropper.open();
      onChange(sRGBHex);
      setHexInput(sRGBHex);
    } catch {
      // User cancelled or error
    } finally {
      setIsPicking(false);
    }
  }, [onChange]);

  const swatchValue = parseHex(hexInput) || value;

  return (
    <div className="space-y-1">
      {label ? (
        <label htmlFor={id} className="block text-sm font-medium text-brand-white">
          {label}
        </label>
      ) : null}
      <div className="flex items-center gap-2">
        <div className="relative flex-shrink-0">
          <input
            type="color"
            id={id}
            value={swatchValue}
            onChange={(e) => {
              const v = e.target.value;
              setHexInput(v);
              onChange(v);
            }}
            disabled={disabled}
            className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
          />
          {isEyeDropperSupported() && (
            <button
              type="button"
              onClick={handlePick}
              disabled={disabled || isPicking}
              title="Pick color from screen"
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-grey text-brand-white hover:bg-brand-charcoal disabled:opacity-50"
            >
              <Pipette className="h-3 w-3" />
            </button>
          )}
        </div>
        <input
          type="text"
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value)}
          onBlur={handleHexBlur}
          placeholder="#000000"
          disabled={disabled}
          className="flex-1 min-w-0 px-3 py-2 border border-brand-grey rounded-lg text-sm text-brand-white bg-brand-charcoal focus:ring-2 focus:ring-brand-orange focus:border-transparent disabled:opacity-50 placeholder:text-brand-white/50"
        />
      </div>
      <p className="text-xs text-brand-white/70">
        Optional: apply one color to the whole SVG (e.g. for icons).
      </p>
    </div>
  );
}
