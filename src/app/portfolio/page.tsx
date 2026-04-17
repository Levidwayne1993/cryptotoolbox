'use client';

import { useEffect, useState } from 'react';
import { CryptoPrice, Portfolio } from '@/types';
import { getPortfolio, resetPortfolio, formatCurrency, formatPercent, calculatePnL } from '@/lib/trading';
import PortfolioTable from '@/components/PortfolioTable';

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio>(getPortfolio());
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [showReset, setShowReset] = useState(false);
  const [customCash, setCustomCash] = useState('10000');

  useEffect(() => {
    fetch('/api/prices')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPrices(data); })
      .catch(() => {});

    const interval = setInterval(() => {
      fetch('/api/prices')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setPrices(data); })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const { totalValue, totalInvested, totalPnL, totalPnLPercent } = calculatePnL(portfolio.holdings, prices);
  const totalPortfolioValue = portfolio.cash + totalValue;
  const overallPnL = totalPortfolioValue - portfolio.startingCash;
  const overallPnLPercent = portfolio.startingCash > 0 ? (overallPnL / portfolio.startingCash) * 100 : 0;

  const handleReset = () => {
    const cash = parseFloat(customCash) || 10000;
    const updated = resetPortfolio(cash);
    setPortfolio(updated);
    setShowReset(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <button
          onClick={() => setShowReset(!showReset)}
          className="px-4 py-2 bg-crypto-border rounded-lg text-sm hover:bg-gray-600 transition-colors"
        >
          {showReset ? 'Cancel' : 'ðŸ”„ Reset Portfolio'}
        </button>
      </div>

      {/* Reset modal */}
      {showReset && (
        <div className="bg-crypto-card border border-crypto-yellow/30 rounded-xl p-6 mb-6 animate-slide-up">
          <h3 className="font-bold text-crypto-yellow mb-3">âš ï¸ Reset Portfolio</h3>
          <p className="text-sm text-gray-400 mb-4">This will delete all holdings and trade history. Choose your starting balance:</p>
          <div className="flex gap-3 mb-4">
            {[1000, 5000, 10000, 50000, 100000].map(amt => (
              <button
                key={amt}
                onClick={() => setCustomCash(amt.toString())}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  customCash === amt.toString() ? 'bg-crypto-accent text-white' : 'bg-crypto-border text-gray-400 hover:text-white'
                }`}
              >
                {formatCurrency(amt)}
              </button>
            ))}
          </div>
          <div className="flex gap-3 items-center">
            <input
              type="number"
              value={customCash}
              onChange={e => setCustomCash(e.target.value)}
              className="bg-crypto-dark border border-crypto-border rounded-lg px-4 py-2 text-white w-40 focus:border-crypto-accent focus:outline-none"
              min="1"
            />
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-crypto-yellow text-black font-bold rounded-lg hover:bg-crypto-yellow/80 transition-colors"
            >
              Reset with {formatCurrency(parseFloat(customCash) || 10000)}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Value</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(totalPortfolioValue)}</p>
        </div>
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Cash</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(portfolio.cash)}</p>
        </div>
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Invested</p>
          <p className="text-xl font-bold mt-1">{formatCurrency(totalInvested)}</p>
        </div>
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Holdings P&L</p>
          <p className={`text-xl font-bold mt-1 ${totalPnL >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
            {formatCurrency(totalPnL)}
          </p>
          <p className={`text-xs mt-1 ${totalPnL >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
            {formatPercent(totalPnLPercent)}
          </p>
        </div>
        <div className={`bg-crypto-card border rounded-xl p-5 ${overallPnL >= 0 ? 'border-crypto-green/30' : 'border-crypto-red/30'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Overall P&L</p>
          <p className={`text-xl font-bold mt-1 ${overallPnL >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
            {formatCurrency(overallPnL)}
          </p>
          <p className={`text-xs mt-1 ${overallPnL >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
            {formatPercent(overallPnLPercent)}
          </p>
        </div>
      </div>

      {/* Holdings Table */}
      <h2 className="text-xl font-bold mb-4">Holdings</h2>
      <PortfolioTable holdings={portfolio.holdings} prices={prices} />

      {/* Trade History */}
      <h2 className="text-xl font-bold mt-8 mb-4">Trade History</h2>
      {portfolio.trades.length === 0 ? (
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-8 text-center">
          <p className="text-4xl mb-3">ðŸ“œ</p>
          <p className="text-gray-400">No trades yet. Head to the Trade page to get started!</p>
        </div>
      ) : (
        <div className="bg-crypto-card border border-crypto-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-crypto-border">
                  <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-6 py-4">Date</th>
                  <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-6 py-4">Type</th>
                  <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-6 py-4">Coin</th>
                  <th className="text-right text-xs text-gray-500 uppercase tracking-wider px-6 py-4">Amount</th>
                  <th className="text-right text-xs text-gray-500 uppercase tracking-wider px-6 py-4">Price</th>
                  <th className="text-right text-xs text-gray-500 uppercase tracking-wider px-6 py-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.trades.slice(0, 50).map(trade => (
                  <tr key={trade.id} className="border-b border-crypto-border/50 hover:bg-white/[0.02]">
                    <td className="px-6 py-3 text-xs text-gray-400">
                      {new Date(trade.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        trade.type === 'buy' ? 'bg-crypto-green/20 text-crypto-green' : 'bg-crypto-red/20 text-crypto-red'
                      }`}>
                        {trade.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm font-medium">{trade.name}</td>
                    <td className="text-right px-6 py-3 text-sm">{trade.amount.toFixed(6)}</td>
                    <td className="text-right px-6 py-3 text-sm text-gray-400">{formatCurrency(trade.price)}</td>
                    <td className="text-right px-6 py-3 text-sm font-medium">{formatCurrency(trade.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
