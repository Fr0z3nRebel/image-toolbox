import Link from "next/link";
import { Facebook } from "lucide-react";

/** X (Twitter) social media logo SVG — stylized X brand mark */
function XLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M2 2l8.5 8.5L2 19h3l6.5-6.5L18 19h3l-8.5-8.5L21 2h-3l-6.5 6.5L6 2H2z" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="bg-gray-900 text-gray-300 border-b border-gray-800">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Brand/Logo Section */}
          <Link href="/" className="flex items-center space-x-3 hover:text-white transition-colors">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
              <span className="text-white font-bold text-lg">IT</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Image Toolbox</h1>
              <p className="text-xs text-gray-400">by Lefty Studios</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <a
              href="https://www.facebook.com/groups/1619414616070949/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-6 h-6" />
            </a>
            <a
              href="https://x.com/LeftyStudios"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
              aria-label="X"
            >
              <XLogo className="w-5 h-5" />
            </a>
          </nav>

          {/* Mobile Menu Button (for future mobile nav implementation) */}
          <button className="md:hidden text-gray-300 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
} 