import { ImageIcon, Ruler, LayoutGrid, FileText, ScanLine, Eraser, Crop, Square } from "lucide-react";
import Link from "next/link";

interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  badge?: string;
  disabled?: boolean;
}

function ToolCard({ title, description, icon, href, color, badge, disabled = false }: ToolCardProps) {
  const cardContent = (
    <div className={`group relative overflow-hidden rounded-xl border border-brand-grey bg-brand-charcoal p-6 shadow-sm transition-all duration-200 ${
      disabled 
        ? 'opacity-60 cursor-not-allowed' 
        : 'hover:shadow-lg hover:scale-[1.02] cursor-pointer hover:border-brand-orange'
    }`}>
      {/* Badge */}
      {badge && (
        <div className={`absolute top-3 right-3 px-2 py-1 text-xs font-medium rounded-full ${
          badge === 'New' 
            ? 'bg-brand-orange/20 text-brand-orange' 
            : 'bg-brand-orange/20 text-brand-orange'
        }`}>
          {badge}
        </div>
      )}
      
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-brand-grey transition-colors ${
          !disabled && 'group-hover:bg-brand-grey/80'
        }`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold text-brand-white transition-colors ${
            !disabled && 'group-hover:text-brand-white'
          }`}>
            {title}
          </h3>
          <p className={`text-sm text-brand-white transition-colors ${
            !disabled && 'group-hover:text-brand-white'
          }`}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );

  if (disabled) {
    return cardContent;
  }

  return <Link href={href}>{cardContent}</Link>;
}

export default function Home() {
  const tools = [
    {
      title: "Format Converter",
      description: "Convert images between AVIF, JPEG, PNG, and WebP formats",
      icon: <ImageIcon className="h-6 w-6 text-blue-600" />,
      href: "/tools/format-converter",
      color: "hover:border-blue-200"
    },
    {
      title: "Image Compressor",
      description: "Reduce file sizes while maintaining image quality",
      icon: <ImageIcon className="h-6 w-6 text-green-600" />,
      href: "/tools/image-compressor",
      color: "hover:border-green-200"
    },
    {
      title: "Resolution Changer",
      description: "Set your images to 300 DPI for high-quality printing",
      icon: <Ruler className="h-6 w-6 text-purple-600" />,
      href: "/tools/resolution-changer",
      color: "hover:border-purple-200",
    },
    {
      title: "Background Remover",
      description: "Remove backgrounds from images in your browser — private, client-side AI",
      icon: <Eraser className="h-6 w-6 text-violet-600" />,
      href: "/tools/background-remover",
      color: "hover:border-violet-200",
      badge: "Beta"
    },
    {
      title: "Raster Vectorizer",
      description: "Convert images to SVG with filters and optional single-color output",
      icon: <ScanLine className="h-6 w-6 text-brand-600" />,
      href: "/tools/raster-vectorizer",
      color: "hover:border-brand-200",
      badge: "Beta"
    },
    {
      title: "Auto-Cropper",
      description: "Crop images and SVGs to remove unused transparent or white space",
      icon: <Crop className="h-6 w-6 text-indigo-600" />,
      href: "/tools/auto-cropper",
      color: "hover:border-indigo-200"
    },
    {
      title: "Rationalizer",
      description: "Add transparent padding so images become perfect 1:1 squares",
      icon: <Square className="h-6 w-6 text-sky-600" />,
      href: "/tools/rationalizer",
      color: "hover:border-sky-200"
    },
    {
      title: "Bundle Builder",
      description: "Combine multiple images into one bundle-ready cover image",
      icon: <LayoutGrid className="h-6 w-6 text-amber-600" />,
      href: "/tools/bundle-builder",
      color: "hover:border-amber-200",
      badge: "New"
    },
    {
      title: "Clipart License Generator",
      description:
        "Create a PDF with download link and license terms for digital products",
      icon: <FileText className="h-6 w-6 text-emerald-600" />,
      href: "/tools/clipart-license-generator",
      color: "hover:border-emerald-200",
      badge: "New"
    },
    // More tools can be added here in the future
  ];

  return (
    <div className="bg-brand-charcoal flex-1">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-brand-white mb-4">
            Professional Image Processing Tools
          </h1>
          <p className="text-xl text-brand-white max-w-2xl mx-auto">
            Professional image tools. Convert formats, 
            compress images, and more. Most tools work client-side for 
            maximum privacy and speed.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {tools.map((tool, index) => (
            <ToolCard key={index} {...tool} />
          ))}
        </div>

        {/* Coming Soon Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold text-brand-white mb-4">
            More Tools Coming Soon
          </h2>
          <p className="text-brand-white">
            We&apos;re working on adding more powerful image processing tools.
          </p>
        </div>
      </div>
    </div>
  );
}
