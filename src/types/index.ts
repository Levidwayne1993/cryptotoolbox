// src/types/index.ts — v2.0 (includes Bot types)

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  sparkline_in_7d?: { price: number[] };
  high_24h: number;
  low_24h: number;
}

export interface Holding {
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  amount: number;
  avgBuyPrice: number;
  totalInvested: number;
}

export interface Trade {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  timestamp: string;
}

export interface Portfolio {
  cash: number;
  startingCash: number;
  holdings: Holding[];
  trades: Trade[];
}

export interface Signal {
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  strength: number;
  rsi: number;
  priceChange24h: number;
  priceChange7d: number;
  volumeChange: number;
  reason: string;
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  thumbnail?: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface MarketStats {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  marketCapChange24h: number;
  fearGreedIndex: number;
  fearGreedLabel: string;
}

// BOT TYPES
export interface BotTrade {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  total: number;
  timestamp: string;
  reason: string;
  score: number;
}

export interface BotPortfolioData {
  cash: number;
  startingCash: number;
  holdings: Holding[];
  trades: BotTrade[];
  lastAnalysisTime: string;
  totalAnalyses: number;
}

export interface CoinScore {
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  score: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  reasons: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  rsi: number | null;
  change24h: number;
  change7d: number;
  volumeRatio: number;
}

export interface BotSuggestion {
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  score: number;
  reasons: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  currentPrice: number;
}
