export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

interface RedditPost {
  data: {
    id: string;
    title: string;
    url: string;
    subreddit: string;
    created_utc: number;
    thumbnail: string;
    ups: number;
    num_comments: number;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const subreddits = ['cryptocurrency', 'bitcoin', 'ethereum', 'CryptoMarkets'];
    const allArticles: Array<{
      id: string;
      title: string;
      url: string;
      source: string;
      thumbnail?: string;
      created_at: string;
      sentiment?: string;
    }> = [];

    const results = await Promise.allSettled(
      subreddits.map(sub =>
        fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=10`, {
          headers: { 'User-Agent': 'CryptoToolbox/1.0' },
          next: { revalidate: 300 },
        }).then(r => r.json())
      )
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value?.data?.children) {
        result.value.data.children.forEach((post: RedditPost) => {
          const d = post.data;
          if (!d.title) return;

          const titleLower = d.title.toLowerCase();
          let sentiment: string = 'neutral';
          const bullish = ['bull', 'moon', 'surge', 'soar', 'pump', 'rally', 'gain', 'high', 'record', 'buy', 'breakout', 'all-time'];
          const bearish = ['bear', 'crash', 'dump', 'drop', 'fall', 'plunge', 'sell', 'fear', 'scam', 'hack', 'fraud', 'loss'];
          if (bullish.some(w => titleLower.includes(w))) sentiment = 'positive';
          if (bearish.some(w => titleLower.includes(w))) sentiment = 'negative';

          allArticles.push({
            id: d.id,
            title: d.title,
            url: `https://reddit.com${d.url || ''}`,
            source: `r/${subreddits[idx]}`,
            thumbnail: d.thumbnail && d.thumbnail.startsWith('http') ? d.thumbnail : undefined,
            created_at: new Date(d.created_utc * 1000).toISOString(),
            sentiment,
          });
        });
      }
    });

    // Sort by date, remove duplicates
    const seen = new Set<string>();
    const unique = allArticles
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      })
      .slice(0, limit);

    return NextResponse.json({ articles: unique });
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json({ articles: [] });
  }
}
