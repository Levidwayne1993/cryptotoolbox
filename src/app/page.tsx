// src/app/page.tsx — v3.0 (CryptoBot is now the homepage)
'use client';

import dynamic from 'next/dynamic';

const LiveBotDashboard = dynamic(() => import('@/components/LiveBotDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crypto-accent mx-auto mb-4"></div>
        <p className="text-gray-400">Loading CryptoBot...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <LiveBotDashboard />;
}
