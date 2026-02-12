"use client";

import { Check } from "lucide-react";

interface ThemedCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  label?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export default function ThemedCheckbox({
  checked,
  onChange,
  id,
  label,
  className = "",
  disabled = false,
}: ThemedCheckboxProps) {
  const content = (
    <span
      className={`inline-flex shrink-0 items-center justify-center w-4 h-4 rounded border transition-colors ${
        checked
          ? "bg-brand-orange border-brand-orange"
          : "bg-brand-charcoal border-brand-grey hover:border-brand-orange/70"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      aria-hidden
    >
      {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
    </span>
  );

  return (
    <label
      className={`inline-flex items-center gap-1.5 cursor-pointer select-none ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        id={id}
        className="sr-only peer"
        aria-hidden={false}
      />
      {content}
      {label != null && <span className="text-sm text-brand-white/80">{label}</span>}
    </label>
  );
}
