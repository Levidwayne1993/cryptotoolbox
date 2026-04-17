export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = 'https://api.coingecko.com/api/v3';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const ids = searchParams.get('ids');
  const page = searchParams.get('page') || '1';

  try {
    if (type === 'global') {
      const [globalRes, fgRes] = await Promise.all([
        fetch(`${BASE_URL}/global`, { next: { revalidate: 120 } }),
        fetch('https://api.alternative.me/fng/', { next: { revalidate: 300 } }).catch(() => null),
      ]);

      if (!globalRes.ok) throw new Error('Failed to fetch global data');
      const globalData = await globalRes.json();

      let fearGreedIndex = 50;
      let fearGreedLabel = 'Neutral';
      if (fgRes && fgRes.ok) {
        try {
          const fgData = await fgRes.json();
          fearGreedIndex = parseInt(fgData.data[0].value);
          fearGreedLabel = fgData.data[0].value_classification;
        } catch {
          // optional
        }
      }

      return NextResponse.json({
        totalMarketCap: globalData.data.total_market_cap.usd,
        totalVolume: globalData.data.total_volume.usd,
        btcDominance: globalData.data.market_cap_percentage.btc,
        marketCapChange24h: globalData.data.market_cap_change_percentage_24h_usd,
        fearGreedIndex,
        fearGreedLabel,
      });
    }

    let url = `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=${page}&sparkline=true&price_change_percentage=7d`;
    if (ids) {
      url = `${BASE_URL}/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=7d`;
    }

    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error('CoinGecko API error');
    const data = await res.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Prices API error:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
