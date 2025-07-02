"use client";

import { AlertTriangle } from "lucide-react";

interface FirefoxWarningProps {
  variant?: "avif-conversion" | "avif-compression";
  className?: string;
}

export default function FirefoxWarning({ 
  variant = "avif-conversion", 
  className = "mb-6" 
}: FirefoxWarningProps) {
  const getWarningContent = () => {
    switch (variant) {
      case "avif-conversion":
        return {
          title: undefined,
          message: "Firefox doesn't support saving individual AVIF files directly. You can still download all converted images as a ZIP file."
        };
      case "avif-compression":
        return {
          title: "Firefox AVIF Download Limitation",
          message: "Firefox doesn't support saving individual AVIF files directly. You can still download all compressed images as a ZIP file."
        };
      default:
        return {
          title: undefined,
          message: "Firefox doesn't support saving individual AVIF files directly. You can still download all files as a ZIP."
        };
    }
  };

  const { title, message } = getWarningContent();

  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          {title && (
            <h3 className="text-sm font-medium text-amber-800 mb-1">{title}</h3>
          )}
          <p className="text-sm text-amber-700">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
} 