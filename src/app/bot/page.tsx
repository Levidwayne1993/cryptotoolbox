// ============================================================
// CRYPTOTOOLBOX — src/app/bot/page.tsx (REPLACE entire file)
// Location: cryptotoolbox/src/app/bot/page.tsx
//
// Changes:
//   1. Removed duplicate <Navbar /> (root layout.tsx already renders it)
//   2. Removed duplicate header (LiveBotDashboard has its own header
//      with strategy badge, mode indicator, and refresh button)
//   3. Switched from bg-gray-950 to bg-crypto-dark for theme consistency
// ============================================================

import dynamic from 'next/dynamic';

const LiveBotDashboard = dynamic(
  () => import('@/components/LiveBotDashboard'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    ),
  }
);

export default function BotPage() {
  return (
    <main className="min-h-screen bg-crypto-dark text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <LiveBotDashboard />
      </div>
    </main>
  );
}
