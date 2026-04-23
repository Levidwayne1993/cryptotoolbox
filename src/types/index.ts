// ============================================================
// CRYPTOTOOLBOX — src/types/index.ts (REPLACE entire file)
// Location: cryptotoolbox/src/types/index.ts
//
// Changes:
//   1. Fixed NewsItem sentiment to match API output ('positive' | 'negative' | 'neutral')
//   2. Simplified StrategyConfig to display-only fields (removed engine fields:
//      intervalMs, cronSchedule, riskParams, signalThresholds, indicatorWeights)
//   3. Removed RiskParams, SignalThresholds, IndicatorWeights interfaces (engine-only)
//   4. Removed MarketDataBundle interface (only used by removed bot-engine)
//   5. Removed BotExecutionResult interface (only used by removed /api/bot-execute)
// ============================================================

// ── Core Crypto Data ────────────────────────────────────────
export interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  total_volume: number;
  sparkline_in_7d?: { price: number[] };
  high_24h: number;
  low_24h: number;
  // Extended fields (optional for backward compat)
  circulating_supply?: number;
  max_supply?: number | null;
  ath?: number;
  ath_change_percentage?: number;
  last_updated?: string;
}

// Backward-compatible alias — old pages import this name
export type CryptoPrice = CryptoData;

// ── Manual Trading Types (trade page, portfolio, trading.ts) ─
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

// ── Signals (original format — used by signals page) ────────
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

// ── News (fixed to match API output) ────────────────────────
export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  created_at?: string;
  thumbnail?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

// ── Market Stats (MarketOverview component) ─────────────────
export interface MarketStats {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  marketCapChange24h: number;
  fearGreedIndex: number;
  fearGreedLabel: string;
}

// ── Strategy Types (display-only — engine config lives in Railway) ──
export type StrategyType =
  | 'day_trader'
  | 'swing_trader'
  | 'scalper'
  | 'dca'
  | 'contrarian'
  | 'momentum';

export interface StrategyConfig {
  id: StrategyType;
  name: string;
  shortName: string;
  description: string;
  longDescription: string;
  icon: string;
  color: string;
  pros: string[];
  cons: string[];
  recommendedFor: string;
}

// ── Bot Types (read from Supabase — written by Railway bot) ─────
export type BotMode = 'paper' | 'live';
export type TradeAction = 'BUY' | 'SELL' | 'HOLD';
export type TradeStatus = 'open' | 'closed' | 'cancelled';

export interface BotSettings {
  id?: string;
  user_id: string;
  enabled: boolean;
  strategy: StrategyType;
  mode: BotMode;
  initial_balance: number;
  current_balance: number;
  selected_coins: string[];
  autonomous_enabled: boolean;
  max_daily_trades: number;
  daily_loss_limit_percent: number;
  created_at?: string;
  updated_at?: string;
}

export interface BotTrade {
  id?: string;
  user_id: string;
  coin_id: string;
  coin_symbol: string;
  coin_name: string;
  action: TradeAction;
  strategy: StrategyType;
  entry_price: number;
  exit_price?: number;
  quantity: number;
  position_value: number;
  pnl?: number;
  pnl_percent?: number;
  score: number;
  confidence: number;
  reasoning: string[];
  status: TradeStatus;
  stop_loss_price: number;
  take_profit_price: number;
  trailing_stop_price?: number;
  opened_at: string;
  closed_at?: string;
  autonomous: boolean;
}

export interface BotPosition {
  coin_id: string;
  coin_symbol: string;
  coin_name: string;
  coin_image: string;
  entry_price: number;
  current_price: number;
  quantity: number;
  position_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  stop_loss_price: number;
  take_profit_price: number;
  trailing_stop_price?: number;
  highest_price: number;
  strategy: StrategyType;
  opened_at: string;
}

export interface BotState {
  settings: BotSettings;
  positions: BotPosition[];
  recentTrades: BotTrade[];
  stats: BotStats;
  isRunning: boolean;
  lastAnalysis: string | null;
  errors: string[];
}

export interface BotStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  bestTrade: number;
  worstTrade: number;
  avgTradeReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  todayTrades: number;
  todayPnl: number;
  streak: number;
}

export interface AnalysisResult {
  coin_id: string;
  coin_symbol: string;
  coin_name: string;
  coin_image: string;
  current_price: number;
  action: TradeAction;
  score: number;
  confidence: number;
  reasoning: string[];
  indicators: IndicatorSnapshot;
  strategy: StrategyType;
  timestamp: string;
}

export interface IndicatorSnapshot {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  ema_short: number;
  ema_long: number;
  bollinger: { upper: number; middle: number; lower: number };
  volume_change: number;
  momentum: number;
  stochastic_rsi: number;
  fear_greed: number;
  sentiment_score: number;
  price_vs_ema: number;
  price_vs_bollinger: string;
}
