// src/app/dashboard/page.tsx — Market overview (moved from old homepage)
'use client';

import { useEffect, useState } from 'react';
import { CryptoPrice } from '@/types';
import { getPortfolio, formatCurrency, formatPercent, calculatePnL } from '@/lib/trading';
import MarketOverview from '@/components/MarketOverview';
import PriceCard from '@/components/PriceCard';
import Link from 'next/link';

export default function Dashboard() {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/prices')
      .then(r => r.json())
      .then(data => { setPrices(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));

    const interval = setInterval(() => {
      fetch('/api/prices')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setPrices(data); })
        .catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const portfolio = getPortfolio();
  const { totalValue, totalPnL, totalPnLPercent } = calculatePnL(portfolio.holdings, prices);
  const totalPortfolioValue = portfolio.cash + totalValue;

  const topGainers = [...prices].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, 3);
  const topLosers = [...prices].sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, 3);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          <span className="bg-gradient-to-r from-crypto-accent to-crypto-purple bg-clip-text text-transparent">
            CryptoToolbox
          </span>
        </h1>
        <p className="text-gray-400">Paper trade crypto with real market prices. Start with $10,000 — or set any amount.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-5 glow-blue">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Portfolio Value</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalPortfolioValue)}</p>
          <p className="text-xs text-gray-500 mt-1">Started with {formatCurrency(portfolio.startingCash)}</p>
        </div>
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Cash Available</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(portfolio.cash)}</p>
        </div>
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Holdings Value</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-gray-500 mt-1">{portfolio.holdings.length} assets</p>
        </div>
        <div className={`bg-crypto-card border rounded-xl p-5 ${totalPnL >= 0 ? 'border-crypto-green/30 glow-green' : 'border-crypto-red/30 glow-red'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total P&amp;L</p>
          <p className={`text-2xl font-bold mt-1 ${totalPnL >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
            {formatCurrency(totalPnL)}
          </p>
          <p className={`text-xs mt-1 ${totalPnL >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
            {formatPercent(totalPnLPercent)}
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">Market Overview</h2>
      <MarketOverview />

      {!loading && prices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-bold mb-4 text-crypto-green">Top Gainers (24h)</h3>
            <div className="space-y-3">
              {topGainers.map(coin => (
                <Link key={coin.id} href={`/trade?coin=${coin.id}`} className="flex items-center justify-between bg-crypto-card border border-crypto-border rounded-xl p-4 hover:border-crypto-green/50 transition-all">
                  <div className="flex items-center space-x-3">
                    <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                    <div>
                      <p className="font-medium text-sm">{coin.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(coin.current_price)}</p>
                    </div>
                  </div>
                  <span className="text-crypto-green font-bold">{formatPercent(coin.price_change_percentage_24h)}</span>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4 text-crypto-red">Top Losers (24h)</h3>
            <div className="space-y-3">
              {topLosers.map(coin => (
                <Link key={coin.id} href={`/trade?coin=${coin.id}`} className="flex items-center justify-between bg-crypto-card border border-crypto-border rounded-xl p-4 hover:border-crypto-red/50 transition-all">
                  <div className="flex items-center space-x-3">
                    <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
                    <div>
                      <p className="font-medium text-sm">{coin.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(coin.current_price)}</p>
                    </div>
                  </div>
                  <span className="text-crypto-red font-bold">{formatPercent(coin.price_change_percentage_24h)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">Top 50 Cryptocurrencies</h2>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-crypto-card border border-crypto-border rounded-xl p-4 animate-pulse">
              <div className="h-8 bg-gray-700 rounded w-2/3 mb-4" />
              <div className="h-6 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {prices.map(coin => (
            <PriceCard key={coin.id} coin={coin} />
          ))}
        </div>
      )}
    </div>
  );
}
