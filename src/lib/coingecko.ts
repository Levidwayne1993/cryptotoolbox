import { CryptoPrice, MarketStats } from '@/types';

const BASE_URL = 'https://api.coingecko.com/api/v3';

export async function fetchPrices(page: number = 1, perPage: number = 50): Promise<CryptoPrice[]> {
  const res = await fetch(
    `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=true&price_change_percentage=7d`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error('Failed to fetch prices');
  return res.json();
}

export async function fetchCoinPrice(coinId: string): Promise<CryptoPrice> {
  const res = await fetch(
    `${BASE_URL}/coins/markets?vs_currency=usd&ids=${coinId}&sparkline=true&price_change_percentage=7d`,
    { next: { revalidate: 30 } }
  );
  if (!res.ok) throw new Error('Failed to fetch coin price');
  const data = await res.json();
  return data[0];
}

export async function fetchMarketStats(): Promise<MarketStats> {
  const res = await fetch(`${BASE_URL}/global`, { next: { revalidate: 120 } });
  if (!res.ok) throw new Error('Failed to fetch market stats');
  const data = await res.json();
  
  let fearGreedIndex = 50;
  let fearGreedLabel = 'Neutral';
  
  try {
    const fgRes = await fetch('https://api.alternative.me/fng/', { next: { revalidate: 300 } });
    if (fgRes.ok) {
      const fgData = await fgRes.json();
      fearGreedIndex = parseInt(fgData.data[0].value);
      fearGreedLabel = fgData.data[0].value_classification;
    }
  } catch {
    // Fear & Greed API is optional
  }
  
  return {
    totalMarketCap: data.data.total_market_cap.usd,
    totalVolume: data.data.total_volume.usd,
    btcDominance: data.data.market_cap_percentage.btc,
    marketCapChange24h: data.data.market_cap_change_percentage_24h_usd,
    fearGreedIndex,
    fearGreedLabel,
  };
}

export async function searchCoins(query: string): Promise<Array<{ id: string; name: string; symbol: string; thumb: string }>> {
  const res = await fetch(`${BASE_URL}/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.coins?.slice(0, 10) || [];
}

export async function fetchCoinHistory(coinId: string, days: number = 7): Promise<Array<{ time: number; price: number }>> {
  const res = await fetch(
    `${BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.prices || []).map((p: number[]) => ({ time: p[0], price: p[1] }));
}
