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