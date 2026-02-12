"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export interface ThemedSelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface ThemedSelectProps<T extends string = string> {
  value: T;
  options: ThemedSelectOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export default function ThemedSelect<T extends string = string>({
  value,
  options,
  onChange,
  label,
  id,
  className = "",
  disabled = false,
}: ThemedSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-brand-white mb-2"
        >
          {label}
        </label>
      )}
      <button
        type="button"
        id={id}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={id}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-brand-grey rounded-lg focus:ring-2 focus:ring-brand-orange focus:border-transparent text-brand-white text-left flex items-center justify-between ${
          disabled ? "bg-brand-grey cursor-not-allowed opacity-70" : "bg-brand-charcoal"
        }`}
      >
        <span>{selectedOption?.label ?? value}</span>
        <ChevronDown
          className={`h-4 w-4 text-brand-white/70 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-brand-grey bg-brand-charcoal py-1 shadow-lg"
        >
          {options.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value as T);
                setIsOpen(false);
              }}
              className={`cursor-pointer px-3 py-2 text-sm text-brand-white hover:bg-brand-orange/20 ${
                option.value === value ? "bg-brand-orange/30 text-brand-orange" : ""
              }`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
