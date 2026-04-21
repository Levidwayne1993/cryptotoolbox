// ============================================================
// FILE: src/types/index.ts  (PATCHED v3.0)
// REPLACE your existing types/index.ts with this ENTIRE file
// Contains ALL old types (backward-compatible) + ALL new bot types
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

// ── News (original format — used by news page) ──────────────

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  created_at?: string;
  thumbnail?: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
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

// ── Strategy Types (NEW) ────────────────────────────────────

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
  intervalMs: number;
  cronSchedule: string; // Vercel cron expression
  riskParams: RiskParams;
  signalThresholds: SignalThresholds;
  indicatorWeights: IndicatorWeights;
  pros: string[];
  cons: string[];
  recommendedFor: string;
}

export interface RiskParams {
  stopLossPercent: number;
  takeProfitPercent: number;
  maxPositionPercent: number;
  maxOpenPositions: number;
  trailingStop: boolean;
  trailingStopPercent: number;
  cooldownMs: number; // min time between trades on same coin
}

export interface SignalThresholds {
  buyScore: number;
  sellScore: number;
  minConfidence: number;
}

export interface IndicatorWeights {
  rsi: number;
  macd: number;
  ema: number;
  bollingerBands: number;
  volume: number;
  sentiment: number;
  fearGreed: number;
  momentum: number;
  stochasticRsi: number;
}

// ── Bot Types (NEW) ─────────────────────────────────────────

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
  selected_coins: string[]; // coin IDs to trade
  autonomous_enabled: boolean; // runs when user is offline
  max_daily_trades: number;
  daily_loss_limit_percent: number; // stop bot if daily loss exceeds this
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
  autonomous: boolean; // was this executed while user was offline?
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
  highest_price: number; // for trailing stop
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
  streak: number; // positive = win streak, negative = loss streak
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
  price_vs_ema: number; // % above/below EMA
  price_vs_bollinger: string; // 'above_upper' | 'below_lower' | 'within'
}

// ── Market Data Types ───────────────────────────────────────

export interface MarketDataBundle {
  prices: CryptoData[];
  priceHistory: Record<string, number[]>; // coin_id -> price array
  volumeHistory: Record<string, number[]>;
  fearGreedIndex: number;
  sentimentScores: Record<string, number>;
  timestamp: string;
}

// ── API Response Types ──────────────────────────────────────

export interface BotExecutionResult {
  success: boolean;
  strategy: StrategyType;
  analyses: AnalysisResult[];
  trades_executed: BotTrade[];
  errors: string[];
  timestamp: string;
  next_run: string;
}
