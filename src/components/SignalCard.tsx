'use client';

import { Signal } from '@/types';

export default function SignalCard({ signal }: { signal: Signal }) {
  const getSignalColor = (s: string) => {
    switch (s) {
      case 'BUY': return 'border-crypto-green bg-crypto-green/5';
      case 'SELL': return 'border-crypto-red bg-crypto-red/5';
      default: return 'border-crypto-yellow bg-crypto-yellow/5';
    }
  };

  const getSignalBadge = (s: string) => {
    switch (s) {
      case 'BUY': return <span className="bg-crypto-green text-white text-xs font-bold px-3 py-1 rounded-full">BUY</span>;
      case 'SELL': return <span className="bg-crypto-red text-white text-xs font-bold px-3 py-1 rounded-full">SELL</span>;
      default: return <span className="bg-crypto-yellow text-black text-xs font-bold px-3 py-1 rounded-full">HOLD</span>;
    }
  };

  const getStrengthBar = (strength: number) => {
    const width = Math.min(Math.max(strength, 0), 100);
    let color = 'bg-crypto-yellow';
    if (strength >= 70) color = 'bg-crypto-green';
    else if (strength <= 30) color = 'bg-crypto-red';
    
    return (
      <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${width}%` }} />
      </div>
    );
  };

  const getRSIColor = (rsi: number) => {
    if (rsi >= 70) return 'text-crypto-red';
    if (rsi <= 30) return 'text-crypto-green';
    return 'text-gray-400';
  };

  return (
    <div className={`border rounded-xl p-5 ${getSignalColor(signal.signal)} transition-all hover:scale-[1.01]`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <img src={signal.image} alt={signal.name} className="w-10 h-10 rounded-full" />
          <div>
            <p className="font-bold">{signal.name}</p>
            <p className="text-xs text-gray-500 uppercase">{signal.symbol}</p>
          </div>
        </div>
        {getSignalBadge(signal.signal)}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">RSI (14)</p>
          <p className={`font-bold ${getRSIColor(signal.rsi)}`}>{signal.rsi.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">24h Change</p>
          <p className={`font-bold ${signal.priceChange24h >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
            {signal.priceChange24h >= 0 ? '+' : ''}{signal.priceChange24h.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">7d Change</p>
          <p className={`font-bold ${signal.priceChange7d >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
            {signal.priceChange7d >= 0 ? '+' : ''}{signal.priceChange7d.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Signal Strength</span>
          <span>{signal.strength}%</span>
        </div>
        {getStrengthBar(signal.strength)}
      </div>

      <p className="text-xs text-gray-400 italic">{signal.reason}</p>
    </div>
  );
}
