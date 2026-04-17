'use client';

import Link from 'next/link';
import { CryptoPrice } from '@/types';
import { formatCurrency, formatPercent } from '@/lib/trading';
import SparklineChart from './SparklineChart';

export default function PriceCard({ coin }: { coin: CryptoPrice }) {
  const isUp = coin.price_change_percentage_24h >= 0;

  return (
    <Link href={`/trade?coin=${coin.id}`}>
      <div className={`bg-crypto-card border border-crypto-border rounded-xl p-4 hover:border-crypto-accent/50 transition-all cursor-pointer ${isUp ? 'hover:glow-green' : 'hover:glow-red'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
            <div>
              <p className="font-semibold text-sm">{coin.name}</p>
              <p className="text-xs text-gray-500 uppercase">{coin.symbol}</p>
            </div>
          </div>
          <span className="text-xs text-gray-500">#{coin.market_cap_rank}</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-lg font-bold">{formatCurrency(coin.current_price)}</p>
            <p className={`text-xs font-medium ${isUp ? 'text-crypto-green' : 'text-crypto-red'}`}>
              {isUp ? 'â–²' : 'â–¼'} {formatPercent(coin.price_change_percentage_24h)}
            </p>
          </div>
          {coin.sparkline_in_7d && (
            <div className="w-24 h-12">
              <SparklineChart data={coin.sparkline_in_7d.price} isUp={isUp} />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
