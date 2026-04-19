export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

const BASE_URL = 'https://api.coingecko.com/api/v3';

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function generateSignal(coin: {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  total_volume: number;
  market_cap: number;
  sparkline_in_7d?: { price: number[] };
}) {
  const prices = coin.sparkline_in_7d?.price || [];
  const rsi = calculateRSI(prices);
  const change24h = coin.price_change_percentage_24h || 0;
  const change7d = coin.price_change_percentage_7d_in_currency || 0;
  
  // Volume to market cap ratio (higher = more activity)
  const volumeRatio = coin.market_cap > 0 ? (coin.total_volume / coin.market_cap) * 100 : 0;
  
  let score = 50; // neutral baseline
  let reasons: string[] = [];
  
  // RSI signals
  if (rsi <= 30) { score += 25; reasons.push('RSI oversold'); }
  else if (rsi <= 40) { score += 10; reasons.push('RSI approaching oversold'); }
  else if (rsi >= 70) { score -= 25; reasons.push('RSI overbought'); }
  else if (rsi >= 60) { score -= 10; reasons.push('RSI approaching overbought'); }
  
  // Price momentum
  if (change24h > 5) { score += 10; reasons.push('Strong 24h momentum'); }
  else if (change24h > 2) { score += 5; reasons.push('Positive 24h trend'); }
  else if (change24h < -5) { score -= 10; reasons.push('Sharp 24h decline'); }
  else if (change24h < -2) { score -= 5; reasons.push('Negative 24h trend'); }
  
  // 7-day trend
  if (change7d > 10) { score += 10; reasons.push('Strong weekly uptrend'); }
  else if (change7d > 3) { score += 5; reasons.push('Positive weekly trend'); }
  else if (change7d < -10) { score -= 10; reasons.push('Sharp weekly decline'); }
  else if (change7d < -3) { score -= 5; reasons.push('Negative weekly trend'); }
  
  // Volume analysis
  if (volumeRatio > 15) { score += 5; reasons.push('High trading volume'); }
  else if (volumeRatio < 3) { score -= 5; reasons.push('Low trading volume'); }
  
  // Clamp score
  score = Math.max(0, Math.min(100, score));
  
  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  if (score >= 65) signal = 'BUY';
  else if (score <= 35) signal = 'SELL';
  
  return {
    coinId: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    image: coin.image,
    signal,
    strength: score,
    rsi,
    priceChange24h: change24h,
    priceChange7d: change7d,
    volumeChange: volumeRatio,
    reason: reasons.join('. ') || 'No strong signals detected',
    timestamp: new Date().toISOString(),

  };
}

export async function GET() {
  try {
    const res = await fetch(
      `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=true&price_change_percentage=7d`,
      { next: { revalidate: 120 } }
    );
    
    if (!res.ok) throw new Error('CoinGecko API error');
    const coins = await res.json();
    
    const signals = coins.map(generateSignal);
    
    // Sort: BUY first, then SELL, then HOLD, by strength
    signals.sort((a: { signal: string; strength: number }, b: { signal: string; strength: number }) => {
      const order = { BUY: 0, SELL: 1, HOLD: 2 };
      const orderA = order[a.signal as keyof typeof order] ?? 2;
      const orderB = order[b.signal as keyof typeof order] ?? 2;
      if (orderA !== orderB) return orderA - orderB;
      return b.strength - a.strength;
    });
    
    return NextResponse.json({ signals });
  } catch (error) {
    console.error('Signals API error:', error);
    return NextResponse.json({ signals: [] });
  }
}
