"use client";

import { Download, ImageIcon } from "lucide-react";

export interface ProcessedFile {
  name: string;
  url: string;
  blob: Blob;
  originalSize?: number;
  processedSize?: number;
  compressionRatio?: number;
}

interface ProcessedFilesDisplayProps {
  title: string;
  emptyStateMessage: string;
  files: ProcessedFile[];
  onDownloadAll: () => void;
  isCreatingZip: boolean;
  downloadAllButtonText: string;
  showStats?: boolean;
  onFileSelect?: (index: number) => void;
  selectedIndex?: number;
  shouldDisableIndividualDownload?: (fileName: string) => boolean;
  formatFileSize?: (bytes: number) => string;
  children?: React.ReactNode; // For additional content like comparison view
}

const defaultFormatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default function ProcessedFilesDisplay({
  title,
  emptyStateMessage,
  files,
  onDownloadAll,
  isCreatingZip,
  downloadAllButtonText,
  showStats = false,
  onFileSelect,
  selectedIndex,
  shouldDisableIndividualDownload,
  formatFileSize = defaultFormatFileSize,
  children
}: ProcessedFilesDisplayProps) {
  const totalOriginalSize = files.reduce((sum, file) => sum + (file.originalSize || 0), 0);
  const totalProcessedSize = files.reduce((sum, file) => sum + (file.processedSize || file.blob.size), 0);
  const overallSavings = totalOriginalSize > 0 ? ((totalOriginalSize - totalProcessedSize) / totalOriginalSize) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        {title}
      </h2>

      {files.length === 0 ? (
        <div className="text-center py-12">
          <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {emptyStateMessage}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overall Stats */}
          {showStats && totalOriginalSize > 0 && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-green-600">Original: {formatFileSize(totalOriginalSize)}</p>
                </div>
                <div>
                  <p className="text-green-600">Processed: {formatFileSize(totalProcessedSize)}</p>
                </div>
                <div>
                  <p className="text-green-600">Savings: {overallSavings.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-green-600">Saved: {formatFileSize(totalOriginalSize - totalProcessedSize)}</p>
                </div>
              </div>
            </div>
          )}

          {/* File List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  onFileSelect && selectedIndex === index
                    ? "border-2 border-blue-500 bg-blue-50 cursor-pointer"
                    : onFileSelect
                    ? "bg-gray-50 hover:bg-gray-100 cursor-pointer"
                    : "bg-gray-50"
                }`}
                onClick={() => onFileSelect?.(index)}
              >
                <ImageIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <div className="text-xs text-gray-500 space-y-1">
                    {file.processedSize && file.originalSize ? (
                      <>
                        <p>{formatFileSize(file.processedSize)} (was {formatFileSize(file.originalSize)})</p>
                        {file.compressionRatio !== undefined && (
                          <p className="text-green-600 font-medium">
                            {file.compressionRatio.toFixed(1)}% smaller
                          </p>
                        )}
                      </>
                    ) : (
                      <p>{formatFileSize(file.blob.size)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {onFileSelect && selectedIndex === index && (
                    <div className="text-xs text-blue-600 font-medium hidden sm:block">
                      Comparing
                    </div>
                  )}
                  {!shouldDisableIndividualDownload?.(file.name) ? (
                    <a
                      href={file.url}
                      download={file.name}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  ) : (
                    <div 
                      className="text-gray-400" 
                      title="Individual download not supported for this file type in your browser"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="h-4 w-4" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onDownloadAll}
            disabled={isCreatingZip}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isCreatingZip ? "Creating ZIP..." : downloadAllButtonText}
          </button>
        </div>
      )}

      {/* Additional content like comparison view */}
      {children}
    </div>
  );
} 