import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'CryptoToolbox - Paper Trading & Analytics',
  description: 'Practice crypto trading with fake money using real market prices. Analytical tools, signals, and news aggregation.',
  keywords: ['crypto', 'paper trading', 'bitcoin', 'analytics', 'trading simulator'],
  openGraph: {
    title: 'CryptoToolbox - Paper Trading & Analytics',
    description: 'Practice crypto trading risk-free with $10,000 in paper money.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-crypto-dark">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
