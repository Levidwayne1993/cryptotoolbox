// src/components/Navbar.tsx — v3.0 (CryptoBot as homepage, renamed from Bot vs You)
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { name: 'CryptoBot', href: '/', icon: '\u{1F916}' },
  { name: 'Dashboard', href: '/dashboard', icon: '\u{1F4CA}' },
  { name: 'Trade', href: '/trade', icon: '\u{1F4B1}' },
  { name: 'Portfolio', href: '/portfolio', icon: '\u{1F4BC}' },
  { name: 'Signals', href: '/signals', icon: '\u{1F4E1}' },
  { name: 'News', href: '/news', icon: '\u{1F4F0}' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="bg-crypto-card border-b border-crypto-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-crypto-accent">
              {'\u{1F527}'} CryptoToolbox
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === item.href
                    ? 'bg-crypto-accent/20 text-crypto-accent'
                    : 'text-gray-400 hover:text-white hover:bg-crypto-border'
                }`}>
                <span className="mr-1.5">{item.icon}</span>{item.name}
              </Link>
            ))}
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-crypto-border">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === item.href
                    ? 'bg-crypto-accent/20 text-crypto-accent'
                    : 'text-gray-400 hover:text-white hover:bg-crypto-border'
                }`}>
                <span className="mr-2">{item.icon}</span>{item.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
