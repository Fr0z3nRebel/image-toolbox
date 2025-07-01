"use client";

import { useState, useCallback, useEffect } from "react";
import { Upload, Download, ImageIcon, X } from "lucide-react";
import JSZip from "jszip";

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

/**
 * Standard Canvas-based image conversion for JPG, PNG, WebP
 * 
 * These formats are natively supported by all modern browsers via canvas.toBlob().
 */
const convertImageToStandardFormat = (file: File, targetFormat: string): Promise<{ name: string; url: string; blob: Blob }> => {
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

      // Convert to target format using native browser support
      const mimeType = `image/${targetFormat === 'jpg' ? 'jpeg' : targetFormat}`;
      
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error(`Failed to convert image to ${targetFormat.toUpperCase()}.`));
          return;
        }

        const fileName = file.name.replace(/\.[^/.]+$/, "") + `.${targetFormat}`;
        const url = URL.createObjectURL(blob);

        resolve({
          name: fileName,
          url: url,
          blob: blob
        });
      }, mimeType, 1.0); // Quality 1.0 = no compression
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    
    // Load the image
    img.src = URL.createObjectURL(file);
  });
};

/**
 * AVIF encoding using libavif WebAssembly library
 * 
 * Uses @jsquash/avif which provides the mature libavif encoder compiled to WebAssembly.
 * This is the same high-quality encoder used by tools like cavif.
 * Works in all modern browsers including Firefox, Chrome, and Safari.
 */
const convertToAVIF = async (imageData: ImageData): Promise<Blob> => {
  const { encode } = await import('@jsquash/avif');
  
  // Encode using libavif with default settings (good quality/performance balance)
  const avifArrayBuffer = await encode(imageData);
  
  return new Blob([avifArrayBuffer], { type: 'image/avif' });
};

/**
 * Main image conversion function that routes to appropriate converter
 * 
 * Uses native canvas.toBlob() for JPG/PNG/WebP and libavif WebAssembly for AVIF.
 * AVIF encoding now works in all modern browsers via WebAssembly.
 */
const convertImageToFormat = async (file: File, targetFormat: string): Promise<{ name: string; url: string; blob: Blob }> => {
  if (targetFormat === 'avif') {
    // AVIF encoding using libavif WebAssembly
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
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

          // Get image data for AVIF encoder
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Convert to AVIF using libavif WebAssembly
          const blob = await convertToAVIF(imageData);
          
          const fileName = file.name.replace(/\.[^/.]+$/, "") + `.avif`;
          const url = URL.createObjectURL(blob);

          resolve({
            name: fileName,
            url: url,
            blob: blob
          });
        } catch (error) {
          reject(new Error(`Failed to convert to AVIF: ${error}`));
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  } else {
    // Use standard canvas conversion for JPG, PNG, WebP
    return convertImageToStandardFormat(file, targetFormat);
  }
};

export default function FormatConverter() {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [targetFormat, setTargetFormat] = useState<"jpg" | "png" | "webp" | "avif">("jpg");
  const [isConverting, setIsConverting] = useState(false);
  const [isCreatingZip, setIsCreatingZip] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState<{ name: string; url: string; blob: Blob }[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => {
      const fileWithPreview = file as FileWithPreview;
      fileWithPreview.id = Math.random().toString(36).substr(2, 9);
      fileWithPreview.preview = URL.createObjectURL(file);
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

  const convertImages = async () => {
    if (files.length === 0) return;

    setIsConverting(true);
    
    try {
      const converted: { name: string; url: string; blob: Blob }[] = [];
      
      // Convert each file client-side
      for (const file of files) {
        try {
          const result = await convertImageToFormat(file, targetFormat);
          converted.push(result);
        } catch (error) {
          console.error(`Failed to convert ${file.name}:`, error);
        }
      }
      
      setConvertedFiles(converted);
    } catch (error) {
      console.error("Error converting images:", error);
    } finally {
      setIsConverting(false);
    }
  };

  const downloadSingleFile = (file: { name: string; url: string; blob: Blob }) => {
    // Create a fresh blob URL to ensure proper download
    const blobUrl = URL.createObjectURL(file.blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = file.name;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the blob URL after a short delay
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 100);
  };

  const downloadAll = async () => {
    if (convertedFiles.length === 0) return;

    setIsCreatingZip(true);
    try {
      const zip = new JSZip();
      
      // Add each file to the zip using the blob directly
      convertedFiles.forEach((file) => {
        zip.file(file.name, file.blob);
      });
      
      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      // Create download link for the zip
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = zipUrl;
      link.download = `converted-images-${targetFormat}.zip`;
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

  // Clean up URLs when component unmounts or files change
  const cleanupConvertedFiles = useCallback(() => {
    convertedFiles.forEach(file => {
      URL.revokeObjectURL(file.url);
    });
  }, [convertedFiles]);

  // Clean up object URLs on unmount and when convertedFiles change
  useEffect(() => {
    return () => {
      cleanupConvertedFiles();
    };
  }, [cleanupConvertedFiles]);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 flex-1">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Image Format Converter
          </h1>
          <p className="text-gray-600">
            Convert your images between JPG, PNG, WebP, and AVIF formats
          </p>
        </div>

        {/* Row 1: Upload Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Upload Images
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Convert to:
              </label>
              <select
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value as "jpg" | "png" | "webp" | "avif")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              >
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
                <option value="avif">AVIF</option>
              </select>
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
                  Supports JPG, PNG, WebP, AVIF, GIF, and more • No file size limits
                  <br />
                  <span className="text-xs">Note: AVIF encoding uses libavif WebAssembly and works in all modern browsers including Firefox!</span>
                </p>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept="image/*,.avif,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.svg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Selected Files ({files.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-40 overflow-y-auto">
                {files.map((file: FileWithPreview) => (
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
                        {(file.size / 1024 / 1024).toFixed(2)} MB
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

          {/* Convert Button */}
          <button
            onClick={convertImages}
            disabled={files.length === 0 || isConverting}
            className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isConverting ? "Converting..." : "Convert Images"}
          </button>
        </div>

        {/* Row 2: Converted Images */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Converted Images
          </h2>

          {convertedFiles.length === 0 ? (
            <div className="text-center py-12">
              <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Converted images will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto">
                {convertedFiles.map((file: { name: string; url: string; blob: Blob }, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <ImageIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadSingleFile(file)}
                      className="text-blue-600 hover:text-blue-700 transition-colors flex-shrink-0"
                      title="Download this file"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={downloadAll}
                disabled={isCreatingZip}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingZip ? "Creating ZIP..." : "Download All"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 