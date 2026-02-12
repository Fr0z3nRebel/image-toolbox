"use client";

export type ModeToggleOptions = "single" | "bulk";

interface ModeToggleProps {
  mode: ModeToggleOptions;
  onModeChange: (mode: ModeToggleOptions) => void;
  ariaLabel: string;
}

export default function ModeToggle({
  mode,
  onModeChange,
  ariaLabel,
}: ModeToggleProps) {
  const inactiveClasses =
    "bg-brand-charcoal text-brand-white/80 border-brand-grey hover:bg-brand-grey hover:border-brand-orange/70";
  const activeClasses = "bg-brand-orange text-white border-brand-orange";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex mb-4 flex-shrink-0"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === "single"}
        onClick={() => onModeChange("single")}
        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
          mode === "single" ? activeClasses : inactiveClasses
        }`}
      >
        Single image
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "bulk"}
        onClick={() => onModeChange("bulk")}
        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
          mode === "bulk" ? activeClasses : inactiveClasses
        }`}
      >
        Multiple images
      </button>
    </div>
  );
}
