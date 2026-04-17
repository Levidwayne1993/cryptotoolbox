'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard', icon: 'ðŸ“Š' },
  { href: '/trade', label: 'Trade', icon: 'ðŸ’±' },
  { href: '/portfolio', label: 'Portfolio', icon: 'ðŸ’¼' },
  { href: '/signals', label: 'Signals', icon: 'ðŸ“¡' },
  { href: '/news', label: 'News', icon: 'ðŸ“°' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-crypto-card border-b border-crypto-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">ðŸ”§</span>
            <span className="text-xl font-bold bg-gradient-to-r from-crypto-accent to-crypto-purple bg-clip-text text-transparent">
              CryptoToolbox
            </span>
          </Link>
          <div className="hidden md:flex items-center space-x-1">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === link.href
                    ? 'bg-crypto-accent/20 text-crypto-accent'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="mr-1.5">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
          {/* Mobile menu */}
          <div className="md:hidden flex items-center space-x-1 overflow-x-auto">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`p-2 rounded-lg text-xs whitespace-nowrap ${
                  pathname === link.href
                    ? 'bg-crypto-accent/20 text-crypto-accent'
                    : 'text-gray-400'
                }`}
              >
                {link.icon}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
