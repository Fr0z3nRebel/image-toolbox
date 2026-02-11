"use client";

import { useCallback, useRef } from "react";
import { Upload, ImageIcon, X } from "lucide-react";

export interface FileWithPreview extends File {
  preview?: string;
  id: string;
  originalSize?: number;
}

interface FileUploadZoneProps {
  title?: string;
  variant?: "card" | "subtle" | "subtleWhite";
  files: FileWithPreview[];
  onFilesChange: (files: FileWithPreview[]) => void;
  acceptedFileTypes?: string;
  supportedFormatsText?: string;
  dropPromptText?: string;
  showFileSize?: boolean;
  maxDisplayHeight?: string;
  showThumbnails?: boolean;
  fileListColumns?: 2 | 3;
  disabled?: boolean;
  multiple?: boolean;
  maxFiles?: number;
  compactDropZone?: boolean;
  belowDropZone?: React.ReactNode;
  children?: React.ReactNode; // For additional controls like format selection or quality slider
  actionButton: React.ReactNode; // For action buttons like Convert, Compress, etc.
  processedFileIds?: Set<string>; // IDs of files that have been processed
  fadeAll?: boolean; // If true, fade all images regardless of processing status
}

export default function FileUploadZone({
  title = "Upload Images",
  variant = "card",
  files,
  onFilesChange,
  acceptedFileTypes = "image/*,.avif",
  supportedFormatsText = "Supports AVIF, JPEG, PNG, and WebP images",
  dropPromptText = "Drop images here or click to select",
  showFileSize = true,
  maxDisplayHeight = "max-h-40",
  showThumbnails = false,
  fileListColumns,
  disabled = false,
  multiple = true,
  maxFiles,
  compactDropZone = false,
  belowDropZone,
  children,
  actionButton,
  fadeAll = false
}: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const revokeAllPreviews = (toRevoke: FileWithPreview[]) => {
    toRevoke.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => {
      const fileWithPreview = file as FileWithPreview;
      fileWithPreview.id = Math.random().toString(36).substr(2, 9);
      fileWithPreview.preview = URL.createObjectURL(file);
      fileWithPreview.originalSize = file.size;
      return fileWithPreview;
    });

    // Single-file mode: replace existing file(s)
    if (!multiple || maxFiles === 1) {
      revokeAllPreviews(files);
      onFilesChange(newFiles.slice(-1));
      return;
    }

    const combined = [...files, ...newFiles];
    const limited = typeof maxFiles === "number" ? combined.slice(0, Math.max(0, maxFiles)) : combined;
    onFilesChange(limited);
  }, [files, maxFiles, multiple, onFilesChange]);

  const removeFile = (id: string) => {
    const fileToRemove = files.find((f) => f.id === id);
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    onDrop(selectedFiles);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (disabled) return;
    const droppedFiles = Array.from(event.dataTransfer.files);
    onDrop(droppedFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const totalSize = files.reduce((sum, file) => sum + (file.originalSize || file.size), 0);

  const outerClassName =
    variant === "subtle"
      ? "w-full"
      : variant === "subtleWhite"
        ? "w-full"
        : "bg-brand-grey rounded-xl border border-brand-charcoal p-6";

  const titleClassName =
    variant === "subtle" || variant === "subtleWhite"
      ? "text-sm font-semibold text-brand-white mb-3"
      : "text-xl font-semibold text-brand-white mb-4";

  const dropZonePadding = compactDropZone ? "p-4" : "p-8";
  const dropZoneIconClass = compactDropZone ? "h-8 w-8" : "h-12 w-12";
  const dropZoneTextClass = compactDropZone ? "text-sm" : "text-base";
  const dropZoneHeightClass = compactDropZone ? "" : "h-full";

  return (
    <div className={outerClassName}>
      <h2 className={titleClassName}>{title}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Additional Controls (format selection, quality slider, etc.) */}
        {children}

        {/* Drop Zone */}
        <div className={children ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed border-brand-charcoal rounded-lg ${dropZonePadding} text-center hover:border-brand-grey transition-colors cursor-pointer ${dropZoneHeightClass} flex flex-col justify-center ${
                disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => {
                if (!disabled) {
                  fileInputRef.current?.click();
                }
              }}
            >
              <Upload className={`${dropZoneIconClass} text-brand-white/80 mx-auto mb-3`} />
              <p className={`${dropZoneTextClass} text-brand-white mb-1`}>
                {dropPromptText}
              </p>
              {supportedFormatsText ? (
                <p className="text-xs text-brand-white/90">
                  {supportedFormatsText}
                </p>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                multiple={multiple}
                accept={acceptedFileTypes}
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled}
              />
            </div>

            {belowDropZone ? <div>{belowDropZone}</div> : null}
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-brand-white">
              Selected Files ({files.length})
            </h3>
            {showFileSize && (
              <div className="text-sm text-brand-white bg-brand-charcoal px-3 py-1 rounded-lg border border-brand-grey">
                Total size: {formatFileSize(totalSize)}
              </div>
            )}
          </div>
          <div
            className={`grid gap-x-2 gap-y-2 ${maxDisplayHeight} overflow-y-auto ${
              fileListColumns === 2
                ? "grid-cols-2"
                : fileListColumns === 3
                  ? "grid-cols-3"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {files.map((file) => {
              // If fadeAll is true, fade ALL images unconditionally (used when processing is active)
              // This ensures all images are faded during processing, not just unprocessed ones
              const shouldFade = Boolean(fadeAll);
              
              return (
                <div
                  key={file.id}
                  className={`flex items-center gap-2 p-2 bg-brand-charcoal rounded-lg border border-brand-grey transition-opacity ${
                    shouldFade ? "opacity-50" : ""
                  }`}
                >
                  {showThumbnails && file.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element -- blob URL from File API, next/image doesn't support object URLs
                    <img
                      src={file.preview}
                      alt=""
                      className="h-14 w-14 flex-shrink-0 rounded object-cover bg-brand-grey"
                    />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-brand-white/70 flex-shrink-0" />
                  )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-white truncate">
                    {file.name}
                  </p>
                  {showFileSize && (
                    <p className="text-xs text-brand-white/90">
                      {formatFileSize(file.originalSize || file.size)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-brand-white/70 hover:text-brand-white transition-colors flex-shrink-0"
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
            })}
          </div>
        </div>
      )}

      {/* Action Button */}
      {actionButton ? <div className="mt-6">{actionButton}</div> : null}
    </div>
  );
} 