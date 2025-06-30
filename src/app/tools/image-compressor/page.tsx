"use client";

import { useState, useCallback } from "react";
import { ArrowLeft, Upload, Download, ImageIcon, X, Minimize2 } from "lucide-react";
import Link from "next/link";
import JSZip from "jszip";

interface FileWithPreview extends File {
  preview?: string;
  id: string;
  originalSize: number;
}

interface CompressedFile {
  name: string;
  url: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  blob: Blob;
}

// Client-side image compression function
const compressImage = (file: File, quality: number): Promise<CompressedFile> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set canvas dimensions to match image
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw image to canvas
      ctx.drawImage(img, 0, 0);

      // Determine output format based on original file type
      const originalFormat = file.type.toLowerCase();
      let outputFormat = 'image/jpeg'; // Default to JPEG for compression
      let fileExtension = 'jpg';
      
      // Keep PNG format if it's PNG, otherwise convert to JPEG for better compression
      if (originalFormat.includes('png')) {
        outputFormat = 'image/png';
        fileExtension = 'png';
      } else if (originalFormat.includes('webp')) {
        outputFormat = 'image/webp';
        fileExtension = 'webp';
      }

      // Convert quality percentage to decimal (Canvas API expects 0.0 to 1.0)
      const canvasQuality = Math.max(0.1, Math.min(1.0, quality / 100));
      
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to compress image'));
          return;
        }

        const originalSize = file.size;
        const compressedSize = blob.size;
        const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
        
        // Generate filename
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const fileName = `${baseName}_compressed.${fileExtension}`;
        const url = URL.createObjectURL(blob);

        resolve({
          name: fileName,
          url: url,
          originalSize: originalSize,
          compressedSize: compressedSize,
          compressionRatio: Math.max(0, compressionRatio),
          blob: blob
        });
      }, outputFormat, canvasQuality);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    
    // Load the image
    img.src = URL.createObjectURL(file);
  });
};

export default function ImageCompressor() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [quality, setQuality] = useState<number>(80);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [compressedFiles, setCompressedFiles] = useState<CompressedFile[]>([]);
  const [selectedComparisonIndex, setSelectedComparisonIndex] = useState<number>(0);
  const [sliderPosition, setSliderPosition] = useState<number>(50);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => {
      const fileWithPreview = file as FileWithPreview;
      fileWithPreview.id = Math.random().toString(36).substr(2, 9);
      fileWithPreview.preview = URL.createObjectURL(file);
      fileWithPreview.originalSize = file.size;
      return fileWithPreview;
    });
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
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
    const droppedFiles = Array.from(event.dataTransfer.files);
    onDrop(droppedFiles);
  };

  const compressImages = async () => {
    if (files.length === 0) return;

    setIsCompressing(true);
    
    try {
      const compressed: CompressedFile[] = [];
      
      // Compress each file client-side
      for (const file of files) {
        try {
          const result = await compressImage(file, quality);
          compressed.push(result);
        } catch (error) {
          console.error(`Failed to compress ${file.name}:`, error);
        }
      }
      
      setCompressedFiles(compressed);
    } catch (error) {
      console.error("Error compressing images:", error);
    } finally {
      setIsCompressing(false);
    }
  };

  const downloadAll = async () => {
    if (compressedFiles.length === 0) return;

    setIsCreatingZip(true);
    try {
      const zip = new JSZip();
      
      // Add each file to the zip using the blob directly
      compressedFiles.forEach((file) => {
        zip.file(file.name, file.blob);
      });
      
      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      // Create download link for the zip
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = `compressed-images-${quality}%.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      URL.revokeObjectURL(zipUrl);
    } catch (error) {
      console.error("Error creating zip file:", error);
    } finally {
      setIsCreatingZip(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const totalOriginalSize = files.reduce((sum, file) => sum + file.originalSize, 0);
  const totalCompressedSize = compressedFiles.reduce((sum, file) => sum + file.compressedSize, 0);
  const overallCompressionRatio = totalOriginalSize > 0 ? ((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100 : 0;

  const getOriginalFileForComparison = (index: number) => {
    if (index >= 0 && index < files.length && index < compressedFiles.length) {
      return files[index];
    }
    return null;
  };

  const handleSliderDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleSliderMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.buttons === 1) { // Left mouse button is pressed
      event.preventDefault();
      handleSliderDrag(event);
    }
  };

  const handleMouseUp = () => {
    // Re-enable text selection when dragging stops
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    // Prevent text selection during drag
    event.preventDefault();
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    handleSliderDrag(event);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Toolbox
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Image Compressor
          </h1>
          <p className="text-gray-600">
            Reduce file sizes while maintaining image quality
          </p>
        </div>

        {/* Row 1: Upload Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Upload Images
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quality Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Compression Quality: {quality}%
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Smaller file (10%)</span>
                <span>Better quality (100%)</span>
              </div>
            </div>

            {/* Drop Zone */}
            <div className="lg:col-span-2">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer h-full flex flex-col justify-center"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Drop images here or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supports JPG, PNG, WebP, and more • No file size limits
                </p>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
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
                <div className="text-sm text-blue-800 bg-blue-50 px-3 py-1 rounded-lg">
                  Total size: {formatFileSize(totalOriginalSize)}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-40 overflow-y-auto">
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
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.originalSize)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compress Button */}
          <button
            onClick={compressImages}
            disabled={files.length === 0 || isCompressing}
            className="w-full mt-6 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Minimize2 className="h-4 w-4" />
            {isCompressing ? "Compressing..." : "Compress Images"}
          </button>
        </div>

        {/* Row 2: Compressed Images */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Compressed Images
          </h2>

          {compressedFiles.length === 0 ? (
            <div className="text-center py-12">
              <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Compressed images will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overall Stats */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                   <div>
                     <p className="text-green-600">Original: {formatFileSize(totalOriginalSize)}</p>
                   </div>
                   <div>
                     <p className="text-green-600">Compressed: {formatFileSize(totalCompressedSize)}</p>
                   </div>
                   <div>
                     <p className="text-green-600">Savings: {overallCompressionRatio.toFixed(1)}%</p>
                   </div>
                   <div>
                     <p className="text-green-600">Saved: {formatFileSize(totalOriginalSize - totalCompressedSize)}</p>
                   </div>
                 </div>
              </div>

              {/* File List */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                 {compressedFiles.map((file, index) => (
                   <div
                     key={index}
                     className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                       selectedComparisonIndex === index
                         ? "border-2 border-blue-500 bg-blue-50"
                         : "bg-gray-50 hover:bg-gray-100"
                     }`}
                     onClick={() => setSelectedComparisonIndex(index)}
                   >
                     <ImageIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-medium text-gray-900 truncate">
                         {file.name}
                       </p>
                       <div className="text-xs text-gray-500 space-y-1">
                         <p>{formatFileSize(file.compressedSize)} (was {formatFileSize(file.originalSize)})</p>
                         <p className="text-green-600 font-medium">
                           {file.compressionRatio.toFixed(1)}% smaller
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-2 flex-shrink-0">
                       {selectedComparisonIndex === index && (
                         <div className="text-xs text-blue-600 font-medium hidden sm:block">
                           Comparing
                         </div>
                       )}
                       <a
                         href={file.url}
                         download={file.name}
                         className="text-blue-600 hover:text-blue-700 transition-colors"
                         onClick={(e) => e.stopPropagation()}
                       >
                         <Download className="h-4 w-4" />
                       </a>
                     </div>
                   </div>
                 ))}
               </div>

              <button
                onClick={downloadAll}
                disabled={isCreatingZip}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingZip ? "Creating ZIP..." : "Download All"}
              </button>
            </div>
          )}
        </div>

        {/* Row 3: Before/After Comparison */}
        {compressedFiles.length > 0 && getOriginalFileForComparison(selectedComparisonIndex) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Before / After Comparison
            </h2>
            <p className="text-gray-600 mb-4">
              Comparing: {compressedFiles[selectedComparisonIndex]?.name}
            </p>

            <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-0">
               <div 
                 className="relative overflow-hidden rounded-lg border border-gray-300 bg-gray-100 select-none h-64 sm:h-96"
                 style={{ aspectRatio: "16/9" }}
                 onMouseDown={handleMouseDown}
                 onMouseMove={handleSliderMouseMove}
                 onMouseUp={handleMouseUp}
                 onMouseLeave={handleMouseUp}
               >
                 {/* Compressed Image (Background - Right side) */}
                 <div className="absolute inset-0">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img
                     src={compressedFiles[selectedComparisonIndex]?.url}
                     alt="Compressed"
                     className="w-full h-full object-contain"
                     draggable={false}
                   />
                   <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-green-600 text-white px-2 py-1 sm:px-3 sm:py-1 rounded text-xs sm:text-sm font-medium">
                     <span className="hidden sm:inline">Compressed ({formatFileSize(compressedFiles[selectedComparisonIndex]?.compressedSize || 0)})</span>
                     <span className="sm:hidden">Compressed</span>
                   </div>
                 </div>

                 {/* Original Image (Foreground with clip - Left side) */}
                 <div 
                   className="absolute inset-0"
                   style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                 >
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img
                     src={getOriginalFileForComparison(selectedComparisonIndex)?.preview}
                     alt="Original"
                     className="w-full h-full object-contain"
                     draggable={false}
                   />
                   <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-red-600 text-white px-2 py-1 sm:px-3 sm:py-1 rounded text-xs sm:text-sm font-medium">
                     <span className="hidden sm:inline">Original ({formatFileSize(compressedFiles[selectedComparisonIndex]?.originalSize || 0)})</span>
                     <span className="sm:hidden">Original</span>
                   </div>
                 </div>

                 {/* Slider Handle */}
                 <div 
                   className="absolute top-0 bottom-0 w-0.5 sm:w-1 bg-white shadow-lg cursor-col-resize flex items-center justify-center pointer-events-none"
                   style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                 >
                   <div className="w-4 h-4 sm:w-6 sm:h-6 bg-white rounded-full shadow-lg border-2 border-gray-300 flex items-center justify-center">
                     <div className="w-1 h-1 sm:w-2 sm:h-2 bg-gray-400 rounded-full"></div>
                   </div>
                 </div>
               </div>

               {/* Slider Instructions */}
               <div className="mt-4 text-center text-sm text-gray-600">
                 <p>Click and drag the slider or click anywhere on the image to compare original vs compressed</p>
                 <div className="flex justify-center gap-8 mt-2">
                   <span className="flex items-center gap-2">
                     <div className="w-3 h-3 bg-red-600 rounded"></div>
                     Original (Left)
                   </span>
                   <span className="flex items-center gap-2">
                     <div className="w-3 h-3 bg-green-600 rounded"></div>
                     Compressed (Right)
                   </span>
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 