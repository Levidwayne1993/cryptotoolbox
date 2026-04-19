'use client';

import NewsFeed from '@/components/NewsFeed';

export default function NewsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Crypto News</h1>
        <p className="text-gray-400 text-sm">
          Live news aggregated from r/cryptocurrency, r/bitcoin, r/ethereum, and r/CryptoMarkets.
          Sentiment analysis powered by keyword detection.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-4 text-center">
          <p className="text-2xl mb-1">🟢</p>
          <p className="text-xs text-gray-500 uppercase">Bullish</p>
          <p className="text-sm text-gray-400 mt-1">Positive sentiment keywords detected</p>
        </div>
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-4 text-center">
          <p className="text-2xl mb-1">âšª</p>
          <p className="text-xs text-gray-500 uppercase">Neutral</p>
          <p className="text-sm text-gray-400 mt-1">No strong sentiment detected</p>
        </div>
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-4 text-center">
          <p className="text-2xl mb-1">ðŸ”´</p>
          <p className="text-xs text-gray-500 uppercase">Bearish</p>
          <p className="text-sm text-gray-400 mt-1">Negative sentiment keywords detected</p>
        </div>
      </div>

      <NewsFeed limit={30} />
    </div>
  );
}
