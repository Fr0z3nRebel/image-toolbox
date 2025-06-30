import { ImageIcon, Download, Upload } from "lucide-react";
import Link from "next/link";

interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

function ToolCard({ title, description, icon, href, color }: ToolCardProps) {
  return (
    <Link href={href}>
      <div className={`group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${color}`}>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-gray-600 group-hover:text-gray-500 transition-colors">
              {description}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const tools = [
    {
      title: "Format Converter",
      description: "Convert images between JPG, PNG, and WebP formats",
      icon: <ImageIcon className="h-6 w-6 text-blue-600" />,
      href: "/tools/format-converter",
      color: "hover:border-blue-200"
    },
    // More tools can be added here in the future
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Image Toolbox
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A collection of powerful tools to help you work with images. 
            Convert formats, resize, compress, and more.
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
            We're working on adding more powerful image processing tools.
          </p>
        </div>
      </div>
    </div>
  );
}
