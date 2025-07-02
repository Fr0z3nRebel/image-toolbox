"use client";

import { useCallback } from "react";
import { Upload, ImageIcon, X } from "lucide-react";

export interface FileWithPreview extends File {
  preview?: string;
  id: string;
  originalSize?: number;
}

interface FileUploadZoneProps {
  files: FileWithPreview[];
  onFilesChange: (files: FileWithPreview[]) => void;
  acceptedFileTypes?: string;
  supportedFormatsText?: string;
  showFileSize?: boolean;
  maxDisplayHeight?: string;
  disabled?: boolean;
  children?: React.ReactNode; // For additional controls like format selection or quality slider
}

export default function FileUploadZone({
  files,
  onFilesChange,
  acceptedFileTypes = "image/*,.avif",
  supportedFormatsText = "Supports AVIF, JPEG, PNG, and WebP images",
  showFileSize = true,
  maxDisplayHeight = "max-h-40",
  disabled = false,
  children
}: FileUploadZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => {
      const fileWithPreview = file as FileWithPreview;
      fileWithPreview.id = Math.random().toString(36).substr(2, 9);
      fileWithPreview.preview = URL.createObjectURL(file);
      fileWithPreview.originalSize = file.size;
      return fileWithPreview;
    });
    onFilesChange([...files, ...newFiles]);
  }, [files, onFilesChange]);

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

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Upload Images
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Additional Controls (format selection, quality slider, etc.) */}
        {children}

        {/* Drop Zone */}
        <div className={children ? "lg:col-span-2" : "lg:col-span-3"}>
          <div
            className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer h-full flex flex-col justify-center ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => {
              if (!disabled) {
                document.getElementById("file-input")?.click();
              }
            }}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              Drop images here or click to select
            </p>
            <p className="text-sm text-gray-500">
              {supportedFormatsText}
            </p>
            <input
              id="file-input"
              type="file"
              multiple
              accept={acceptedFileTypes}
              onChange={handleFileSelect}
              className="hidden"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-gray-700">
              Selected Files ({files.length})
            </h3>
            {showFileSize && (
              <div className="text-sm text-blue-800 bg-blue-50 px-3 py-1 rounded-lg">
                Total size: {formatFileSize(totalSize)}
              </div>
            )}
          </div>
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ${maxDisplayHeight} overflow-y-auto`}>
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <ImageIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  {showFileSize && (
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.originalSize || file.size)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 