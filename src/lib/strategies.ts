// ============================================================
// FILE: src/lib/strategies.ts (NEW FILE)
// All 6 trading strategy configurations
// ============================================================

import { StrategyConfig, StrategyType } from '@/types';

export const STRATEGIES: Record<StrategyType, StrategyConfig> = {

  // ── DAY TRADER ────────────────────────────────────────────
  day_trader: {
    id: 'day_trader',
    name: 'Day Trader',
    shortName: 'DAY',
    description: 'Fast entries & exits within the same day. Targets small consistent profits with tight risk controls.',
    longDescription: 'The Day Trader strategy analyzes 5-minute price candles, RSI, MACD crossovers, and volume spikes to find quick entry points. It buys on dips with strong reversal signals and sells within minutes to hours. Tight stop-losses protect capital. This is the most active strategy — expect 5-20 trades per day.',
    icon: '⚡',
    color: '#f59e0b',
    intervalMs: 2 * 60 * 1000, // analyze every 2 minutes
    cronSchedule: '*/2 * * * *',
    riskParams: {
      stopLossPercent: 3,
      takeProfitPercent: 5,
      maxPositionPercent: 15,
      maxOpenPositions: 6,
      trailingStop: true,
      trailingStopPercent: 2,
      cooldownMs: 5 * 60 * 1000, // 5 min cooldown per coin
    },
    signalThresholds: {
      buyScore: 55,
      sellScore: -35,
      minConfidence: 60,
    },
    indicatorWeights: {
      rsi: 20,
      macd: 20,
      ema: 15,
      bollingerBands: 10,
      volume: 15,
      sentiment: 5,
      fearGreed: 3,
      momentum: 10,
      stochasticRsi: 2,
    },
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
    recommendedFor: 'Active traders who want maximum engagement and can handle frequent small wins/losses.',
  },

  // ── SWING TRADER ──────────────────────────────────────────
  swing_trader: {
    id: 'swing_trader',
    name: 'Swing Trader',
    shortName: 'SWING',
    description: 'Holds positions for days to weeks. Follows trends and captures larger price swings.',
    longDescription: 'The Swing Trader looks for established trends using EMA crossovers, support/resistance levels, and daily momentum. It enters when a trend confirms and holds for multiple days, riding the wave. Wider stop-losses allow the trade room to breathe. Expect 2-5 trades per week.',
    icon: '🌊',
    color: '#3b82f6',
    intervalMs: 4 * 60 * 60 * 1000, // analyze every 4 hours
    cronSchedule: '0 */4 * * *',
    riskParams: {
      stopLossPercent: 10,
      takeProfitPercent: 25,
      maxPositionPercent: 25,
      maxOpenPositions: 4,
      trailingStop: true,
      trailingStopPercent: 6,
      cooldownMs: 4 * 60 * 60 * 1000, // 4 hour cooldown
    },
    signalThresholds: {
      buyScore: 65,
      sellScore: -45,
      minConfidence: 70,
    },
    indicatorWeights: {
      rsi: 10,
      macd: 15,
      ema: 25,
      bollingerBands: 10,
      volume: 10,
      sentiment: 10,
      fearGreed: 8,
      momentum: 10,
      stochasticRsi: 2,
    },
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
    recommendedFor: 'Patient traders who want steady growth without constant monitoring.',
  },

  // ── SCALPER ───────────────────────────────────────────────
  scalper: {
    id: 'scalper',
    name: 'Scalper',
    shortName: 'SCALP',
    description: 'Ultra-fast micro-trades. Skims tiny profits from rapid price fluctuations.',
    longDescription: 'The Scalper fires on 1-minute intervals, looking for micro-movements of 1-3%. It uses RSI extremes, Bollinger Band bounces, and volume spikes to enter and exit within minutes. High win rate but small individual profits. Expect 20-50 trades per day in active markets.',
    icon: '🎯',
    color: '#ef4444',
    intervalMs: 1 * 60 * 1000, // analyze every 1 minute
    cronSchedule: '* * * * *',
    riskParams: {
      stopLossPercent: 1.5,
      takeProfitPercent: 2.5,
      maxPositionPercent: 10,
      maxOpenPositions: 8,
      trailingStop: false,
      trailingStopPercent: 0,
      cooldownMs: 2 * 60 * 1000, // 2 min cooldown
    },
    signalThresholds: {
      buyScore: 50,
      sellScore: -30,
      minConfidence: 55,
    },
    indicatorWeights: {
      rsi: 25,
      macd: 10,
      ema: 5,
      bollingerBands: 25,
      volume: 20,
      sentiment: 2,
      fearGreed: 1,
      momentum: 10,
      stochasticRsi: 2,
    },
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
    recommendedFor: 'Users who want rapid-fire trading with minimal per-trade risk.',
  },

  // ── DCA (Dollar Cost Averaging) ───────────────────────────
  dca: {
    id: 'dca',
    name: 'DCA Bot',
    shortName: 'DCA',
    description: 'Buys at regular intervals regardless of price. Simple, effective long-term accumulation.',
    longDescription: 'The DCA Bot automatically buys your selected coins at set intervals (every 4 hours by default). It invests a fixed dollar amount each time, averaging your entry price over time. Optional "Smart DCA" buys more when prices dip and less when prices are high. This is the safest, simplest strategy.',
    icon: '📊',
    color: '#10b981',
    intervalMs: 4 * 60 * 60 * 1000, // buy every 4 hours
    cronSchedule: '0 */4 * * *',
    riskParams: {
      stopLossPercent: 0, // no stop loss — long term hold
      takeProfitPercent: 0, // no take profit — accumulate
      maxPositionPercent: 100, // can go all in over time
      maxOpenPositions: 10,
      trailingStop: false,
      trailingStopPercent: 0,
      cooldownMs: 4 * 60 * 60 * 1000,
    },
    signalThresholds: {
      buyScore: 0, // always buys (DCA)
      sellScore: -999, // never auto-sells
      minConfidence: 0,
    },
    indicatorWeights: {
      rsi: 5,
      macd: 0,
      ema: 0,
      bollingerBands: 5,
      volume: 0,
      sentiment: 0,
      fearGreed: 10, // smart DCA adjusts amount by F&G
      momentum: 0,
      stochasticRsi: 0,
    },
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
    recommendedFor: 'Beginners or anyone who wants hands-off, long-term crypto accumulation.',
  },

  // ── CONTRARIAN ────────────────────────────────────────────
  contrarian: {
    id: 'contrarian',
    name: 'Contrarian',
    shortName: 'CONTRA',
    description: 'Buys fear, sells greed. Trades against the crowd using sentiment and Fear & Greed data.',
    longDescription: 'The Contrarian strategy does the opposite of the market crowd. When the Fear & Greed index shows "Extreme Fear" and social sentiment is negative, it buys aggressively. When the index shows "Extreme Greed" and everyone is euphoric, it sells. Based on Warren Buffett\'s famous advice: "Be fearful when others are greedy, and greedy when others are fearful."',
    icon: '🔄',
    color: '#8b5cf6',
    intervalMs: 30 * 60 * 1000, // check every 30 minutes
    cronSchedule: '*/30 * * * *',
    riskParams: {
      stopLossPercent: 15,
      takeProfitPercent: 30,
      maxPositionPercent: 20,
      maxOpenPositions: 5,
      trailingStop: true,
      trailingStopPercent: 8,
      cooldownMs: 60 * 60 * 1000, // 1 hour cooldown
    },
    signalThresholds: {
      buyScore: 60,
      sellScore: -50,
      minConfidence: 65,
    },
    indicatorWeights: {
      rsi: 10,
      macd: 5,
      ema: 5,
      bollingerBands: 5,
      volume: 10,
      sentiment: 25,
      fearGreed: 30,
      momentum: 5,
      stochasticRsi: 5,
    },
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
    recommendedFor: 'Experienced traders who can stomach buying when everyone else is panicking.',
  },

  // ── MOMENTUM ──────────────────────────────────────────────
  momentum: {
    id: 'momentum',
    name: 'Momentum Rider',
    shortName: 'MOMO',
    description: 'Rides strong trends and breakouts. Follows price momentum and volume surges.',
    longDescription: 'The Momentum Rider detects when a coin breaks out of a range with strong volume. It jumps on the trend and rides it until momentum fades. Uses EMA alignment (short above long = uptrend), MACD histogram direction, and volume confirmation. Performs best during strong bull or bear markets.',
    icon: '🚀',
    color: '#ec4899',
    intervalMs: 10 * 60 * 1000, // analyze every 10 minutes
    cronSchedule: '*/10 * * * *',
    riskParams: {
      stopLossPercent: 7,
      takeProfitPercent: 18,
      maxPositionPercent: 20,
      maxOpenPositions: 5,
      trailingStop: true,
      trailingStopPercent: 5,
      cooldownMs: 15 * 60 * 1000, // 15 min cooldown
    },
    signalThresholds: {
      buyScore: 60,
      sellScore: -40,
      minConfidence: 65,
    },
    indicatorWeights: {
      rsi: 10,
      macd: 20,
      ema: 20,
      bollingerBands: 5,
      volume: 20,
      sentiment: 5,
      fearGreed: 5,
      momentum: 15,
      stochasticRsi: 0,
    },
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
    recommendedFor: 'Traders who want to catch the biggest winners and ride explosive moves.',
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
