'use client';

import { useState } from 'react';
import { CryptoPrice, Portfolio } from '@/types';
import { executeBuy, executeSell, formatCurrency } from '@/lib/trading';

interface TradeFormProps {
  coin: CryptoPrice;
  portfolio: Portfolio;
  onTrade: (portfolio: Portfolio) => void;
}

export default function TradeForm({ coin, portfolio, onTrade }: TradeFormProps) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const holding = portfolio.holdings.find(h => h.coinId === coin.id);
  const total = parseFloat(amount || '0') * coin.current_price;

  const handleTrade = () => {
    setError('');
    setSuccess('');
    const qty = parseFloat(amount);
    if (isNaN(qty) || qty <= 0) {
      setError('Enter a valid amount');
      return;
    }

    let result;
    if (side === 'buy') {
      result = executeBuy({ ...portfolio }, coin, qty);
    } else {
      result = executeSell({ ...portfolio }, coin, qty);
    }

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(`${side === 'buy' ? 'Bought' : 'Sold'} ${qty} ${coin.symbol.toUpperCase()} at ${formatCurrency(coin.current_price)}`);
    setAmount('');
    onTrade(result.portfolio);
  };

  const setPercentage = (pct: number) => {
    if (side === 'buy') {
      const maxAmount = portfolio.cash / coin.current_price;
      setAmount((maxAmount * pct).toFixed(8));
    } else if (holding) {
      setAmount((holding.amount * pct).toFixed(8));
    }
  };

  return (
    <div className="bg-crypto-card border border-crypto-border rounded-xl p-6">
      <div className="flex rounded-lg overflow-hidden mb-6">
        <button
          onClick={() => { setSide('buy'); setError(''); setSuccess(''); }}
          className={`flex-1 py-3 font-bold text-sm transition-all ${
            side === 'buy'
              ? 'bg-crypto-green text-white'
              : 'bg-crypto-border text-gray-400 hover:text-white'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => { setSide('sell'); setError(''); setSuccess(''); }}
          className={`flex-1 py-3 font-bold text-sm transition-all ${
            side === 'sell'
              ? 'bg-crypto-red text-white'
              : 'bg-crypto-border text-gray-400 hover:text-white'
          }`}
        >
          SELL
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider">
            Amount ({coin.symbol.toUpperCase()})
          </label>
          <input
            type="number"
            value={amount}
            onChange={e => { setAmount(e.target.value); setError(''); setSuccess(''); }}
            placeholder="0.00"
            className="w-full bg-crypto-dark border border-crypto-border rounded-lg px-4 py-3 mt-1 text-white placeholder-gray-600 focus:border-crypto-accent focus:outline-none"
            step="any"
            min="0"
          />
        </div>

        <div className="flex gap-2">
          {[0.25, 0.5, 0.75, 1].map(pct => (
            <button
              key={pct}
              onClick={() => setPercentage(pct)}
              className="flex-1 text-xs py-1.5 bg-crypto-border rounded hover:bg-gray-600 transition-colors"
            >
              {pct === 1 ? 'MAX' : `${pct * 100}%`}
            </button>
          ))}
        </div>

        <div className="bg-crypto-dark rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Price</span>
            <span>{formatCurrency(coin.current_price)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total</span>
            <span className="font-bold">{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Available</span>
            <span>{side === 'buy' ? formatCurrency(portfolio.cash) : `${holding?.amount.toFixed(6) || '0'} ${coin.symbol.toUpperCase()}`}</span>
          </div>
        </div>

        {error && (
          <div className="bg-crypto-red/10 border border-crypto-red/30 rounded-lg p-3 text-sm text-crypto-red">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-crypto-green/10 border border-crypto-green/30 rounded-lg p-3 text-sm text-crypto-green">
            {success}
          </div>
        )}

        <button
          onClick={handleTrade}
          className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
            side === 'buy'
              ? 'bg-crypto-green hover:bg-crypto-green/80'
              : 'bg-crypto-red hover:bg-crypto-red/80'
          }`}
        >
          {side === 'buy' ? 'Buy' : 'Sell'} {coin.symbol.toUpperCase()}
        </button>
      </div>
    </div>
  );
}
