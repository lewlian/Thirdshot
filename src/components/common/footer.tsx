import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <div className="text-sm text-gray-600 text-center sm:text-left">
            © {currentYear} Thirdshot. All rights reserved.
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/terms"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-gray-400">•</span>
            <Link
              href="/privacy"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
