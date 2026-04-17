'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CryptoPrice, Portfolio } from '@/types';
import { getPortfolio, formatCurrency, formatPercent } from '@/lib/trading';
import TradeForm from '@/components/TradeForm';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function TradeContent() {
  const searchParams = useSearchParams();
  const coinParam = searchParams.get('coin') || 'bitcoin';

  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CryptoPrice | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio>(getPortfolio());
  const [search, setSearch] = useState('');
  const [chartData, setChartData] = useState<Array<{ time: string; price: number }>>([]);
  const [chartDays, setChartDays] = useState(7);
  const [loading, setLoading] = useState(true);

  const loadPrices = useCallback(async () => {
    try {
      const res = await fetch('/api/prices');
      const data = await res.json();
      if (Array.isArray(data)) {
        setPrices(data);
        const coin = data.find((c: CryptoPrice) => c.id === coinParam) || data[0];
        if (coin && !selectedCoin) setSelectedCoin(coin);
      }
    } catch {} finally { setLoading(false); }
  }, [coinParam, selectedCoin]);

  useEffect(() => { loadPrices(); }, [loadPrices]);

  // Auto-refresh prices every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/prices');
        const data = await res.json();
        if (Array.isArray(data)) {
          setPrices(data);
          if (selectedCoin) {
            const updated = data.find((c: CryptoPrice) => c.id === selectedCoin.id);
            if (updated) setSelectedCoin(updated);
          }
        }
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedCoin]);

  // Load chart data
  useEffect(() => {
    if (!selectedCoin) return;
    fetch(`https://api.coingecko.com/api/v3/coins/${selectedCoin.id}/market_chart?vs_currency=usd&days=${chartDays}`)
      .then(r => r.json())
      .then(data => {
        if (data.prices) {
          const points = data.prices.map((p: number[]) => ({
            time: new Date(p[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: p[1],
          }));
          // Sample to ~50 points
          const step = Math.max(1, Math.floor(points.length / 50));
          setChartData(points.filter((_: unknown, i: number) => i % step === 0));
        }
      })
      .catch(() => {});
  }, [selectedCoin, chartDays]);

  const filteredCoins = prices.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const handleTrade = (updated: Portfolio) => {
    setPortfolio(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse-slow">ðŸ’±</div>
          <p className="text-gray-400">Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Trade</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coin selector */}
        <div className="lg:col-span-1">
          <input
            type="text"
            placeholder="Search coins..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-crypto-card border border-crypto-border rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-crypto-accent focus:outline-none mb-4"
          />
          <div className="bg-crypto-card border border-crypto-border rounded-xl max-h-[500px] overflow-y-auto">
            {filteredCoins.map(coin => (
              <button
                key={coin.id}
                onClick={() => setSelectedCoin(coin)}
                className={`w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors border-b border-crypto-border/50 last:border-0 ${
                  selectedCoin?.id === coin.id ? 'bg-crypto-accent/10 border-l-2 border-l-crypto-accent' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />
                  <div className="text-left">
                    <p className="text-sm font-medium">{coin.symbol.toUpperCase()}</p>
                    <p className="text-xs text-gray-500">{coin.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm">{formatCurrency(coin.current_price)}</p>
                  <p className={`text-xs ${coin.price_change_percentage_24h >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
                    {formatPercent(coin.price_change_percentage_24h)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chart + Trade */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCoin && (
            <>
              {/* Coin header */}
              <div className="bg-crypto-card border border-crypto-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <img src={selectedCoin.image} alt={selectedCoin.name} className="w-12 h-12 rounded-full" />
                    <div>
                      <h2 className="text-xl font-bold">{selectedCoin.name}</h2>
                      <p className="text-gray-500 uppercase">{selectedCoin.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{formatCurrency(selectedCoin.current_price)}</p>
                    <p className={`text-sm font-medium ${selectedCoin.price_change_percentage_24h >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
                      {formatPercent(selectedCoin.price_change_percentage_24h)} (24h)
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">24h High</p>
                    <p className="text-sm font-medium">{formatCurrency(selectedCoin.high_24h)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">24h Low</p>
                    <p className="text-sm font-medium">{formatCurrency(selectedCoin.low_24h)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Market Cap</p>
                    <p className="text-sm font-medium">${(selectedCoin.market_cap / 1e9).toFixed(2)}B</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Volume (24h)</p>
                    <p className="text-sm font-medium">${(selectedCoin.total_volume / 1e9).toFixed(2)}B</p>
                  </div>
                </div>

                {/* Chart timeframe */}
                <div className="flex gap-2 mb-4">
                  {[1, 7, 30, 90, 365].map(d => (
                    <button
                      key={d}
                      onClick={() => setChartDays(d)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        chartDays === d ? 'bg-crypto-accent text-white' : 'bg-crypto-border text-gray-400 hover:text-white'
                      }`}
                    >
                      {d === 1 ? '24H' : d === 7 ? '7D' : d === 30 ? '1M' : d === 90 ? '3M' : '1Y'}
                    </button>
                  ))}
                </div>

                {/* Chart */}
                {chartData.length > 0 && (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis dataKey="time" tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis
                          tick={{ fill: '#6b7280', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          domain={['auto', 'auto']}
                          tickFormatter={(v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v.toFixed(2)}`}
                        />
                        <Tooltip
                          contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px' }}
                          labelStyle={{ color: '#9ca3af' }}
                          formatter={(value: number) => [formatCurrency(value), 'Price']}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke={selectedCoin.price_change_percentage_24h >= 0 ? '#10b981' : '#ef4444'}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Trade Form */}
              <TradeForm coin={selectedCoin} portfolio={portfolio} onTrade={handleTrade} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="text-4xl animate-pulse-slow">ðŸ’±</div></div>}>
      <TradeContent />
    </Suspense>
  );
}
