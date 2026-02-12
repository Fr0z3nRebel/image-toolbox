"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ToolPageLayoutProps {
  title: string;
  description: string;
  showBackButton?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function ToolPageLayout({
  title,
  description,
  showBackButton = false,
  children,
  className = ""
}: ToolPageLayoutProps) {
  return (
    <div className={`min-h-screen bg-brand-charcoal ${className}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="w-36 flex-shrink-0 pt-1">
            {showBackButton && (
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-brand-white hover:text-brand-orange transition-colors whitespace-nowrap"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Toolbox
              </Link>
            )}
          </div>
          <div className="flex-1 text-center min-w-0">
            <h1 className="text-3xl font-bold text-brand-white mb-2">
              {title}
            </h1>
            <p className="text-brand-white">
              {description}
            </p>
          </div>
          <div className="w-36 flex-shrink-0" aria-hidden />
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
} 