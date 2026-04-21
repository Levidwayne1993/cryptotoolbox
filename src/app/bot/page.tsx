// ============================================================
// FILE: src/app/bot/page.tsx (REPLACE existing file)
// Bot page — wraps the BotDashboard component
// ============================================================

'use client';

import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';

// Dynamic import to avoid SSR issues with localStorage
const BotDashboard = dynamic(() => import('@/components/BotDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Loading CryptoBot...</p>
      </div>
    </div>
  ),
});

export default function BotPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                CryptoBot Trading Engine
              </h1>
              <p className="text-sm text-gray-400">
                AI-powered autonomous trading with 6 switchable strategies
              </p>
            </div>
          </div>

          {/* Paper trading disclaimer */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mt-3">
            <p className="text-xs text-amber-300">
              ⚠️ <strong>Paper Trading Mode</strong> — All trades are simulated
              with virtual funds. No real money is used. This is for learning and
              strategy testing. Past performance does not guarantee future results.
            </p>
          </div>
        </div>

        {/* Bot Dashboard */}
        <BotDashboard />

        {/* Strategy quick reference */}
        <div className="mt-8 bg-gray-800/30 border border-gray-700/50 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-300 mb-3">
            📖 Strategy Quick Reference
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-gray-400">
            <div className="flex gap-2">
              <span>⚡</span>
              <div>
                <strong className="text-amber-400">Day Trader</strong> — Fast
                entries/exits, 2-min scans, 3% SL / 5% TP. Best for volatile
                markets.
              </div>
            </div>
            <div className="flex gap-2">
              <span>🌊</span>
              <div>
                <strong className="text-blue-400">Swing Trader</strong> — Holds
                days to weeks, 4-hr scans, 10% SL / 25% TP. Best for trending
                markets.
              </div>
            </div>
            <div className="flex gap-2">
              <span>🎯</span>
              <div>
                <strong className="text-red-400">Scalper</strong> — Ultra-fast
                micro-trades, 1-min scans, 1.5% SL / 2.5% TP. Skims tiny
                profits.
              </div>
            </div>
            <div className="flex gap-2">
              <span>📊</span>
              <div>
                <strong className="text-green-400">DCA Bot</strong> — Scheduled
                buys every 4 hrs regardless of price. Smart DCA adjusts by Fear
                &amp; Greed.
              </div>
            </div>
            <div className="flex gap-2">
              <span>🔄</span>
              <div>
                <strong className="text-purple-400">Contrarian</strong> — Buys
                fear, sells greed. 30-min scans, 15% SL / 30% TP. Warren
                Buffett style.
              </div>
            </div>
            <div className="flex gap-2">
              <span>🚀</span>
              <div>
                <strong className="text-pink-400">Momentum Rider</strong> —
                Rides breakouts and surges, 10-min scans, 7% SL / 18% TP.
                Catches big moves.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
