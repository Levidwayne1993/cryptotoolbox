// ============================================================
// CRYPTOTOOLBOX — src/lib/strategies.ts (REPLACE entire file)
// Location: cryptotoolbox/src/lib/strategies.ts
//
// Changes:
//   Stripped all engine-only fields (intervalMs, cronSchedule,
//   riskParams, signalThresholds, indicatorWeights).
//   This file now only provides display metadata for the dashboard UI.
//   All trading logic lives in Railway (cryptotrader).
// ============================================================

import { StrategyConfig, StrategyType } from '@/types';

export const STRATEGIES: Record<StrategyType, StrategyConfig> = {
  // ── DAY TRADER ────────────────────────────────────────────
  day_trader: {
    id: 'day_trader',
    name: 'Day Trader',
    shortName: 'DAY',
    description:
      'Fast entries & exits within the same day. Targets small consistent profits with tight risk controls.',
    longDescription:
      'The Day Trader strategy analyzes 5-minute price candles, RSI, MACD crossovers, and volume spikes to find quick entry points. It buys on dips with strong reversal signals and sells within minutes to hours. Tight stop-losses protect capital. This is the most active strategy — expect 5-20 trades per day.',
    icon: '⚡',
    color: '#f59e0b',
    pros: [
      'Highest potential trade volume',
      'Quick profit capture',
      'Tight risk management',
      'Works in volatile markets',
    ],
    cons: [
      'Higher transaction fees from frequent trades',
      'Requires strong market movement',
      'Can overtrade in sideways markets',
    ],
    recommendedFor:
      'Active traders who want maximum engagement and can handle frequent small wins/losses.',
  },

  // ── SWING TRADER ──────────────────────────────────────────
  swing_trader: {
    id: 'swing_trader',
    name: 'Swing Trader',
    shortName: 'SWING',
    description:
      'Holds positions for days to weeks. Follows trends and captures larger price swings.',
    longDescription:
      'The Swing Trader looks for established trends using EMA crossovers, support/resistance levels, and daily momentum. It enters when a trend confirms and holds for multiple days, riding the wave. Wider stop-losses allow the trade room to breathe. Expect 2-5 trades per week.',
    icon: '🌊',
    color: '#3b82f6',
    pros: [
      'Lower stress, fewer trades',
      'Captures larger price moves',
      'Lower fees from less trading',
      'Works well in trending markets',
    ],
    cons: [
      'Exposed to overnight/weekend risk',
      'Slower profit realization',
      'Requires patience',
    ],
    recommendedFor:
      'Patient traders who want steady growth without constant monitoring.',
  },

  // ── SCALPER ───────────────────────────────────────────────
  scalper: {
    id: 'scalper',
    name: 'Scalper',
    shortName: 'SCALP',
    description:
      'Ultra-fast micro-trades. Skims tiny profits from rapid price fluctuations.',
    longDescription:
      'The Scalper fires on 1-minute intervals, looking for micro-movements of 1-3%. It uses RSI extremes, Bollinger Band bounces, and volume spikes to enter and exit within minutes. High win rate but small individual profits. Expect 20-50 trades per day in active markets.',
    icon: '🎯',
    color: '#ef4444',
    pros: [
      'Highest win rate potential',
      'Very short market exposure',
      'Profits from tiny moves',
      'Works in any market condition',
    ],
    cons: [
      'Fees can eat into small profits',
      'Requires very liquid coins',
      'Most CPU-intensive strategy',
    ],
    recommendedFor:
      'Users who want rapid-fire trading with minimal per-trade risk.',
  },

  // ── DCA (Dollar Cost Averaging) ───────────────────────────
  dca: {
    id: 'dca',
    name: 'DCA Bot',
    shortName: 'DCA',
    description:
      'Buys at regular intervals regardless of price. Simple, effective long-term accumulation.',
    longDescription:
      'The DCA Bot automatically buys your selected coins at set intervals (every 4 hours by default). It invests a fixed dollar amount each time, averaging your entry price over time. Optional "Smart DCA" buys more when prices dip and less when prices are high. This is the safest, simplest strategy.',
    icon: '📊',
    color: '#10b981',
    pros: [
      'Simplest strategy — zero skill needed',
      'Removes emotion from investing',
      'Great for long-term growth',
      'Lowest risk of all strategies',
    ],
    cons: [
      'Misses timing opportunities',
      'No downside protection',
      'Slower returns in bull markets',
    ],
    recommendedFor:
      'Beginners or anyone who wants hands-off, long-term crypto accumulation.',
  },

  // ── CONTRARIAN ────────────────────────────────────────────
  contrarian: {
    id: 'contrarian',
    name: 'Contrarian',
    shortName: 'CONTRA',
    description:
      'Buys fear, sells greed. Trades against the crowd using sentiment and Fear & Greed data.',
    longDescription:
      'The Contrarian strategy does the opposite of the market crowd. When the Fear & Greed index shows "Extreme Fear" and social sentiment is negative, it buys aggressively. When the index shows "Extreme Greed" and everyone is euphoric, it sells. Based on Warren Buffett\'s famous advice: "Be fearful when others are greedy, and greedy when others are fearful."',
    icon: '🔄',
    color: '#8b5cf6',
    pros: [
      'Historically the most profitable long-term approach',
      'Buys at market bottoms',
      'Backed by proven investment philosophy',
      'Lower trade frequency, lower fees',
    ],
    cons: [
      'Can be early (buy too soon in a crash)',
      'Requires strong conviction during fear',
      'Sentiment data can lag',
    ],
    recommendedFor:
      'Experienced traders who can stomach buying when everyone else is panicking.',
  },

  // ── MOMENTUM ──────────────────────────────────────────────
  momentum: {
    id: 'momentum',
    name: 'Momentum Rider',
    shortName: 'MOMO',
    description:
      'Rides strong trends and breakouts. Follows price momentum and volume surges.',
    longDescription:
      'The Momentum Rider detects when a coin breaks out of a range with strong volume. It jumps on the trend and rides it until momentum fades. Uses EMA alignment (short above long = uptrend), MACD histogram direction, and volume confirmation. Performs best during strong bull or bear markets.',
    icon: '🚀',
    color: '#ec4899',
    pros: [
      'Captures the biggest moves',
      'Strong trend confirmation before entry',
      'Trailing stops lock in profits',
      'Works great in breakout markets',
    ],
    cons: [
      'Gets whipsawed in choppy/sideways markets',
      'Can enter late in a move',
      'Higher individual trade risk',
    ],
    recommendedFor:
      'Traders who want to catch the biggest winners and ride explosive moves.',
  },
};

// ── Helper Functions ────────────────────────────────────────
export function getStrategy(id: StrategyType): StrategyConfig {
  return STRATEGIES[id];
}

export function getAllStrategies(): StrategyConfig[] {
  return Object.values(STRATEGIES);
}

export function getStrategyNames(): { id: StrategyType; name: string }[] {
  return Object.values(STRATEGIES).map((s) => ({ id: s.id, name: s.name }));
}
