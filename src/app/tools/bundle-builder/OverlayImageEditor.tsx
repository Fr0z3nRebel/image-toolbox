"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { FileWithPreview } from "../../components/FileUploadZone";
import FileUploadZone from "../../components/FileUploadZone";
import type { AspectRatio } from "./types";

export interface OverlayImage {
  id: string;
  file: FileWithPreview;
  x: number; // Percentage of canvas width
  y: number; // Percentage of canvas height
  width: number; // Percentage of canvas width
  height: number; // Percentage of canvas height
  rotation: number; // Degrees
  aspectRatio?: number; // Natural aspect ratio of the image (width/height)
  mirrorHorizontal?: boolean; // Flip horizontally
  mirrorVertical?: boolean; // Flip vertically
}

interface OverlayImageEditorProps {
  overlayImages: OverlayImage[];
  onOverlayImagesChange: (images: OverlayImage[]) => void;
  aspectRatio: AspectRatio;
  previewContainerRef: React.RefObject<HTMLDivElement | null>;
}

export default function OverlayImageEditor({
  overlayImages,
  onOverlayImagesChange,
  aspectRatio: _aspectRatio,
  previewContainerRef: _previewContainerRef
}: OverlayImageEditorProps) {
  const [uploadedFiles, setUploadedFiles] = useState<FileWithPreview[]>([]);

  // Convert uploaded files to overlay images
  useEffect(() => {
    const processFiles = async () => {
      const newOverlays: OverlayImage[] = await Promise.all(
        uploadedFiles
          .filter((file) => !overlayImages.some((overlay) => overlay.file.id === file.id))
          .map(async (file) => {
            let aspectRatio = 1; // Default aspect ratio
            if (file.preview) {
              try {
                const img = new Image();
                await new Promise<void>((resolve, reject) => {
                  img.onload = () => {
                    aspectRatio = img.naturalWidth / img.naturalHeight;
                    resolve();
                  };
                  img.onerror = reject;
                  if (!file.preview) {
                    reject(new Error("File preview not available"));
                    return;
                  }
                  img.src = file.preview;
                });
              } catch {
                // Use default if image fails to load
              }
            }

            return {
              id: file.id,
              file,
              x: 50, // Center horizontally
              y: 50, // Center vertically
              width: 20, // 20% of canvas width
              height: 20 / aspectRatio, // Maintain aspect ratio
              rotation: 0,
              aspectRatio,
              mirrorHorizontal: false,
              mirrorVertical: false
            };
          })
      );

      if (newOverlays.length > 0) {
        onOverlayImagesChange([...overlayImages, ...newOverlays]);
        // Clear uploaded files after adding them
        setUploadedFiles([]);
      }
    };

    if (uploadedFiles.length > 0) {
      processFiles();
    }
  }, [uploadedFiles, overlayImages, onOverlayImagesChange]);

  const handleDeleteOverlay = (id: string) => {
    onOverlayImagesChange(overlayImages.filter((img) => img.id !== id));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">Overlay Images</label>
        <p className="text-xs text-gray-500 mb-2">Add images to overlay on top of your bundle. Click and drag to position, use handles to resize and rotate.</p>
        <FileUploadZone
          title=""
          variant="subtle"
          dropPromptText="Drop overlay images or click"
          files={uploadedFiles}
          onFilesChange={setUploadedFiles}
          disabled={false}
          actionButton={null}
          acceptedFileTypes="image/*"
          supportedFormatsText=""
          maxDisplayHeight="max-h-24"
          compactDropZone={true}
        />
      </div>

      {overlayImages.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Overlay Images ({overlayImages.length}):</p>
          {overlayImages.map((overlay) => (
            <div
              key={overlay.id}
              className="relative border-2 rounded-lg p-2 border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600 truncate flex-1">
                  {overlay.file.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteOverlay(overlay.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  aria-label="Delete overlay"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Position:</span>{" "}
                  <span className="font-mono">{overlay.x.toFixed(1)}%, {overlay.y.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-gray-500">Size:</span>{" "}
                  <span className="font-mono">{overlay.width.toFixed(1)}% × {overlay.height.toFixed(1)}%</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Rotation:</span>{" "}
                  <span className="font-mono">{overlay.rotation.toFixed(1)}°</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
