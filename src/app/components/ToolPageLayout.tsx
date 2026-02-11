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
        <div className="mb-8">
          {showBackButton && (
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-brand-white hover:text-brand-orange transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Toolbox
            </Link>
          )}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-brand-white mb-2">
              {title}
            </h1>
            <p className="text-brand-white">
              {description}
            </p>
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
} 