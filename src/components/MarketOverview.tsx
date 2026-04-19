'use client';

import { useEffect, useState } from 'react';
import { MarketStats } from '@/types';
import { formatNumber } from '@/lib/trading';

export default function MarketOverview() {
  const [stats, setStats] = useState<MarketStats | null>(null);

  useEffect(() => {
    fetch('/api/prices?type=global')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-crypto-card border border-crypto-border rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-20 mb-2" />
            <div className="h-6 bg-gray-700 rounded w-28" />
          </div>
        ))}
      </div>
    );
  }

  const getFearGreedColor = (value: number) => {
    if (value <= 25) return 'text-crypto-red';
    if (value <= 45) return 'text-orange-400';
    if (value <= 55) return 'text-crypto-yellow';
    if (value <= 75) return 'text-lime-400';
    return 'text-crypto-green';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      <div className="bg-crypto-card border border-crypto-border rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Market Cap</p>
        <p className="text-lg font-bold mt-1">{formatNumber(stats.totalMarketCap)}</p>
        <p className={`text-xs mt-1 ${stats.marketCapChange24h >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
          {stats.marketCapChange24h >= 0 ? '▲' : '▼'} {Math.abs(stats.marketCapChange24h).toFixed(2)}%
        </p>
      </div>
      <div className="bg-crypto-card border border-crypto-border rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider">24h Volume</p>
        <p className="text-lg font-bold mt-1">{formatNumber(stats.totalVolume)}</p>
      </div>
      <div className="bg-crypto-card border border-crypto-border rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider">BTC Dominance</p>
        <p className="text-lg font-bold mt-1">{stats.btcDominance.toFixed(1)}%</p>
      </div>
      <div className="bg-crypto-card border border-crypto-border rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Fear &amp; Greed</p>
        <p className={`text-lg font-bold mt-1 ${getFearGreedColor(stats.fearGreedIndex)}`}>
          {stats.fearGreedIndex}
        </p>
        <p className={`text-xs mt-1 ${getFearGreedColor(stats.fearGreedIndex)}`}>
          {stats.fearGreedLabel}
        </p>
      </div>
      <div className="bg-crypto-card border border-crypto-border rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Market Trend</p>
        <p className={`text-lg font-bold mt-1 ${stats.marketCapChange24h >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
          {stats.marketCapChange24h >= 0 ? '🟢 Bullish' : 'ðŸ”´ Bearish'}
        </p>
      </div>
    </div>
  );
}
