import { ImageIcon, Ruler, LayoutGrid, FileText } from "lucide-react";
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
    <div className={`group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 ${
      disabled 
        ? 'opacity-60 cursor-not-allowed' 
        : `hover:shadow-lg hover:scale-[1.02] cursor-pointer ${color}`
    }`}>
      {/* Badge */}
      {badge && (
        <div className={`absolute top-3 right-3 px-2 py-1 text-xs font-medium rounded-full ${
          badge === 'New' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-orange-100 text-orange-800'
        }`}>
          {badge}
        </div>
      )}
      
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 transition-colors ${
          !disabled && 'group-hover:bg-gray-200'
        }`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold text-gray-900 transition-colors ${
            !disabled && 'group-hover:text-gray-700'
          }`}>
            {title}
          </h3>
          <p className={`text-sm text-gray-600 transition-colors ${
            !disabled && 'group-hover:text-gray-500'
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
      badge: "New"
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
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 flex-1">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Professional Image Processing Tools
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
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
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            More Tools Coming Soon
          </h2>
          <p className="text-gray-600">
            We&apos;re working on adding more powerful image processing tools.
          </p>
        </div>
      </div>
    </div>
  );
}
