'use client';

import { useEffect, useState } from 'react';
import { NewsItem } from '@/types';

export default function NewsFeed({ limit = 10 }: { limit?: number }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/news?limit=${limit}`)
      .then(r => r.json())
      .then(data => { setNews(data.articles || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [limit]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-crypto-card border border-crypto-border rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-700 rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="bg-crypto-card border border-crypto-border rounded-xl p-8 text-center">
        <p className="text-4xl mb-3">ðŸ“°</p>
        <p className="text-gray-400">No news available right now. Check back soon!</p>
      </div>
    );
  }

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return <span className="text-xs bg-crypto-green/20 text-crypto-green px-2 py-0.5 rounded-full">Bullish</span>;
      case 'negative': return <span className="text-xs bg-crypto-red/20 text-crypto-red px-2 py-0.5 rounded-full">Bearish</span>;
      default: return <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">Neutral</span>;
    }
  };

  return (
    <div className="space-y-3">
      {news.map((item) => (
        <a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-crypto-card border border-crypto-border rounded-xl p-4 hover:border-crypto-accent/50 transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-medium text-sm mb-2 line-clamp-2">{item.title}</h3>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{item.source}</span>
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                {getSentimentBadge(item.sentiment)}
              </div>
            </div>
            {item.thumbnail && (
              <img src={item.thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
            )}
          </div>
        </a>
      ))}
    </div>
  );
}
