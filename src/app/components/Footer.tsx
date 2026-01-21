import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">
              Image Toolbox
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Professional image tools for format conversion, compression, and 
              processing. Most tools work client-side for maximum privacy and speed.
            </p>
            <p className="text-gray-500 text-xs">
              © {new Date().getFullYear()} Lefty Studios. All rights reserved.
            </p>
          </div>

          {/* Links Section */}
          <div>
            <h4 className="text-white font-medium mb-4">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/privacy-policy" 
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h4 className="text-white font-medium mb-4">
              Contact
            </h4>
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">
                Questions or concerns?
              </p>
              <a 
                href="mailto:contactus@leftystudios.com"
                className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
              >
                contactus@leftystudios.com
              </a>
              <div className="pt-2">
                <a
                  href="https://buymeacoffee.com/john.adams"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.5 3H6c-1.1 0-2 .9-2 2v5.71c0 3.83 2.95 7.18 6.78 7.29 3.96.12 7.22-3.06 7.22-7v-1h.5c1.38 0 2.5-1.12 2.5-2.5S19.88 3 18.5 3zM16 5v3H6V5h10zm2.5 3H18V5h.5c.28 0 .5.22.5.5s-.22.5-.5.5zM4 19h16v2H4v-2z"/>
                  </svg>
                  <span>Buy Me a Coffee</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-xs mb-4 md:mb-0">
              Your privacy is our priority. Images are processed locally when 
              possible and never stored permanently.
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-gray-500 text-xs">
                Made with ❤️ by Lefty Studios
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 