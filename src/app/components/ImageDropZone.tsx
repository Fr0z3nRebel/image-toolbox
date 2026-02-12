"use client";

import { useState, useCallback } from "react";
import { Upload } from "lucide-react";

export interface ImageDropZoneProps {
  /** Unique id for the hidden file input (for the label's htmlFor) */
  inputId: string;
  /** Accept attribute for the file input (e.g. "image/*,.avif,.svg") */
  accept: string;
  /** Whether multiple files can be selected */
  multiple: boolean;
  /** Single vs multiple mode - affects prompt text */
  isSingleMode: boolean;
  /** Format hints shown below the drop prompt (e.g. "AVIF, JPEG, PNG, WebP") */
  supportedFormatsText: React.ReactNode;
  /** Called when files are dropped or selected via the file picker */
  onDrop: (files: File[]) => void;
  /** Whether the drop zone is empty (shows upload prompt) vs has files (shows children) */
  isEmpty: boolean;
  /** When not empty, use single-item layout (one large preview) vs grid layout */
  isSingleItem: boolean;
  /** Whether the drop zone is disabled */
  disabled?: boolean;
  /** Optional class for the outer wrapper */
  wrapperClassName?: string;
  /** Content to show when files exist (preview grid, etc.) */
  children?: React.ReactNode;
}

export default function ImageDropZone({
  inputId,
  accept,
  multiple,
  isSingleMode,
  supportedFormatsText,
  onDrop,
  isEmpty,
  isSingleItem,
  disabled = false,
  wrapperClassName,
  children,
}: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (disabled || !e.dataTransfer.files?.length) return;
      onDrop(Array.from(e.dataTransfer.files));
    },
    [onDrop, disabled]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (fileList?.length) onDrop(Array.from(fileList));
      e.target.value = "";
    },
    [onDrop]
  );

  const innerClassName = isEmpty
    ? "flex-1 min-h-[200px]"
    : isSingleItem
      ? "flex-initial lg:flex-1 lg:min-h-0 overflow-hidden"
      : "flex-1 overflow-auto";

  const defaultWrapperClassName =
    "flex flex-col min-h-0 overflow-hidden max-h-[calc(100vh-8rem)] lg:max-h-[50vh]";
  const wrapperClasses = wrapperClassName ?? defaultWrapperClassName;
  const wrapperWithMinHeight = isEmpty
    ? wrapperClasses
    : `${wrapperClasses} lg:min-h-0`;

  return (
    <div className={wrapperWithMinHeight}>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        id={inputId}
        disabled={disabled}
      />
      <div
        className={`min-h-0 flex flex-col relative ${innerClassName}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isEmpty ? (
          <label
            htmlFor={inputId}
            className={`cursor-pointer flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors flex-1 min-h-[200px] ${
              isDragging
                ? "border-brand-orange bg-brand-grey"
                : "border-brand-orange bg-brand-charcoal hover:bg-brand-grey"
            }`}
          >
            <Upload className="h-10 w-10 text-brand-white/60" />
            <span className="text-sm text-brand-white">
              {isSingleMode
                ? "Drop an image or click to select"
                : "Drop images or click to select"}
            </span>
            <span className="text-xs text-brand-white/70">
              {supportedFormatsText}
            </span>
          </label>
        ) : (
          <>
            <div
              className={`relative min-h-0 w-full ${
                isSingleItem
                  ? "flex-1 min-h-0 overflow-hidden lg:absolute lg:inset-0 lg:flex-none"
                  : "flex-1 min-h-0 flex flex-col lg:flex-initial lg:flex-shrink-0"
              }`}
            >
              {isDragging && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-brand-grey/80 border-2 border-dashed border-brand-orange pointer-events-none">
                  <span className="text-sm font-medium text-brand-white bg-brand-grey px-4 py-2 rounded-lg shadow border border-brand-charcoal">
                    {isSingleMode
                      ? "Drop an image to replace"
                      : "Drop to add more images"}
                  </span>
                </div>
              )}
              {children}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
