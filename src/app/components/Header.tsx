import Link from "next/link";

export function Header() {
  return (
    <header className="bg-brand-header-black text-brand-white border-b border-brand-grey">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Brand/Logo Section */}
          <Link href="/" className="flex items-center space-x-3 hover:text-brand-orange transition-colors">
            <div className="flex items-center justify-center w-8 h-8 bg-brand-orange rounded-lg">
              <span className="text-white font-bold text-lg">IT</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-brand-white">Image Toolbox</h1>
              <p className="text-xs text-brand-white/80">by Lefty Studios</p>
            </div>
          </Link>

          {/* Buy Me a Coffee */}
          <a
            href="https://buymeacoffee.com/john.adams"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.5 3H6c-1.1 0-2 .9-2 2v5.71c0 3.83 2.95 7.18 6.78 7.29 3.96.12 7.22-3.06 7.22-7v-1h.5c1.38 0 2.5-1.12 2.5-2.5S19.88 3 18.5 3zM16 5v3H6V5h10zm2.5 3H18V5h.5c.28 0 .5.22.5.5s-.22.5-.5.5zM4 19h16v2H4v-2z"/>
            </svg>
            <span>Buy Me a Coffee</span>
          </a>
        </div>
      </div>
    </header>
  );
}
