import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-gray-700 bg-gray-900 mt-12">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div>
            <h3 className="text-white font-semibold mb-2">Muse x402</h3>
            <p className="text-gray-400 text-sm max-w-xs">
              A trivia game demonstrating the x402 Payment Protocol with Solana micropayments.
            </p>
          </div>

          <div>
            <h4 className="text-gray-300 font-medium text-sm mb-2">Resources</h4>
            <ul className="space-y-1">
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-300 font-medium text-sm mb-2">Legal</h4>
            <ul className="space-y-1">
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-300 font-medium text-sm mb-2">Built By</h4>
            <ul className="space-y-1">
              <li>
                <a href="https://x402info.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition-colors">
                  x402info.com
                </a>
              </li>
              <li>
                <a href="https://alldayai.com/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition-colors">
                  alldayai.com
                </a>
              </li>
              <li>
                <a href="https://nocodeapi.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition-colors">
                  nocodeapi.com
                </a>
              </li>
              <li>
                <a href="https://osvue.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition-colors">
                  osvue.com
                </a>
              </li>
              <li>
                <a href="https://tarvit.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white text-sm transition-colors">
                  tarvit.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-6 pt-4 text-center text-gray-500 text-xs">
          &copy; {new Date().getFullYear()} Muse x402. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
