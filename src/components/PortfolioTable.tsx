'use client';

import { Holding, CryptoPrice } from '@/types';
import { formatCurrency, formatPercent } from '@/lib/trading';

interface PortfolioTableProps {
  holdings: Holding[];
  prices: CryptoPrice[];
}

export default function PortfolioTable({ holdings, prices }: PortfolioTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="bg-crypto-card border border-crypto-border rounded-xl p-8 text-center">
        <p className="text-4xl mb-3">ðŸ“­</p>
        <p className="text-gray-400">No holdings yet. Start trading to build your portfolio!</p>
      </div>
    );
  }

  return (
    <div className="bg-crypto-card border border-crypto-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-crypto-border">
              <th className="text-left text-xs text-gray-500 uppercase tracking-wider px-6 py-4">Asset</th>
              <th className="text-right text-xs text-gray-500 uppercase tracking-wider px-6 py-4">Holdings</th>
              <th className="text-right text-xs text-gray-500 uppercase tracking-wider px-6 py-4">Avg Buy</th>
              <th className="text-right text-xs text-gray-500 uppercase tracking-wider px-6 py-4">Current</th>
              <th className="text-right text-xs text-gray-500 uppercase tracking-wider px-6 py-4">Value</th>
              <th className="text-right text-xs text-gray-500 uppercase tracking-wider px-6 py-4">P&L</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map(holding => {
              const price = prices.find(p => p.id === holding.coinId);
              const currentPrice = price?.current_price || 0;
              const currentValue = holding.amount * currentPrice;
              const pnl = currentValue - holding.totalInvested;
              const pnlPercent = holding.totalInvested > 0 ? (pnl / holding.totalInvested) * 100 : 0;
              const isUp = pnl >= 0;

              return (
                <tr key={holding.coinId} className="border-b border-crypto-border/50 hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <img src={holding.image} alt={holding.name} className="w-8 h-8 rounded-full" />
                      <div>
                        <p className="font-medium text-sm">{holding.name}</p>
                        <p className="text-xs text-gray-500 uppercase">{holding.symbol}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-right px-6 py-4 text-sm">
                    {holding.amount < 0.001 ? holding.amount.toFixed(8) : holding.amount.toFixed(4)} {holding.symbol.toUpperCase()}
                  </td>
                  <td className="text-right px-6 py-4 text-sm text-gray-400">
                    {formatCurrency(holding.avgBuyPrice)}
                  </td>
                  <td className="text-right px-6 py-4 text-sm">
                    {formatCurrency(currentPrice)}
                  </td>
                  <td className="text-right px-6 py-4 text-sm font-medium">
                    {formatCurrency(currentValue)}
                  </td>
                  <td className={`text-right px-6 py-4 text-sm font-bold ${isUp ? 'text-crypto-green' : 'text-crypto-red'}`}>
                    <div>{formatCurrency(pnl)}</div>
                    <div className="text-xs">{formatPercent(pnlPercent)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
