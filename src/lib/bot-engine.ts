// ============================================================
// FILE: src/lib/bot-engine.ts (NEW FILE)
// Core autonomous bot engine — runs server-side or client-side
// This is the brain that analyzes and decides trades
// ============================================================

import {
  StrategyType,
  StrategyConfig,
  BotSettings,
  BotTrade,
  BotPosition,
  BotStats,
  AnalysisResult,
  IndicatorSnapshot,
  TradeAction,
  CryptoData,
  MarketDataBundle,
} from '@/types';
import { getStrategy } from './strategies';
import {
  calculateAllIndicators,
  rsi,
  macd,
  ema,
  bollingerBands,
  momentum,
  volumeChange,
  stochasticRsi,
  priceVsEma,
  priceVsBollinger,
  FullIndicators,
} from './indicators';

// ── MARKET DATA FETCHER (server-safe) ───────────────────────

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const FEAR_GREED_URL = 'https://api.alternative.me/fng/?limit=1';

export async function fetchMarketData(
  coinIds: string[]
): Promise<MarketDataBundle> {
  const idsParam = coinIds.join(',');

  // Fetch current prices + sparkline (7d history)
  const pricesRes = await fetch(
    `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${idsParam}&order=market_cap_desc&sparkline=true&price_change_percentage=24h,7d`,
    { next: { revalidate: 0 } }
  );

  let prices: CryptoData[] = [];
  if (pricesRes.ok) {
    prices = await pricesRes.json();
  }

  // Build price and volume history from sparkline
  const priceHistory: Record<string, number[]> = {};
  const volumeHistory: Record<string, number[]> = {};
  for (const coin of prices) {
    priceHistory[coin.id] = coin.sparkline_in_7d?.price || [];
    // Approximate volume history from total_volume (we only get current)
    // In production, you'd use /coins/{id}/market_chart for real volume history
    const fakeVolumes = Array(168).fill(coin.total_volume);
    volumeHistory[coin.id] = fakeVolumes;
  }

  // Fetch Fear & Greed Index
  let fearGreedIndex = 50;
  try {
    const fgRes = await fetch(FEAR_GREED_URL, { next: { revalidate: 0 } });
    if (fgRes.ok) {
      const fgData = await fgRes.json();
      fearGreedIndex = parseInt(fgData.data?.[0]?.value || '50');
    }
  } catch {
    fearGreedIndex = 50;
  }

  // Generate sentiment scores from price action
  const sentimentScores: Record<string, number> = {};
  for (const coin of prices) {
    const pChange = coin.price_change_percentage_24h || 0;
    const volumeRatio = coin.total_volume / coin.market_cap;
    sentimentScores[coin.id] = Math.max(
      -100,
      Math.min(100, pChange * 5 + volumeRatio * 20 - 50)
    );
  }

  return {
    prices,
    priceHistory,
    volumeHistory,
    fearGreedIndex,
    sentimentScores,
    timestamp: new Date().toISOString(),
  };
}

// ── ANALYSIS ENGINE ─────────────────────────────────────────

export function analyzeCoin(
  coin: CryptoData,
  priceHistory: number[],
  volumeHistory: number[],
  fearGreed: number,
  sentimentScore: number,
  strategy: StrategyConfig
): AnalysisResult {
  // Calculate all technical indicators
  const indicators = calculateAllIndicators(priceHistory, volumeHistory);

  // Build indicator snapshot for logging
  const snapshot: IndicatorSnapshot = {
    rsi: indicators.rsi,
    macd: indicators.macd,
    ema_short: indicators.emaShort,
    ema_long: indicators.emaLong,
    bollinger: indicators.bollingerBands,
    volume_change: indicators.volumeChange,
    momentum: indicators.momentum,
    stochastic_rsi: indicators.stochasticRsi,
    fear_greed: fearGreed,
    sentiment_score: sentimentScore,
    price_vs_ema: indicators.priceVsEma,
    price_vs_bollinger: indicators.priceVsBollinger,
  };

  // Score each factor based on strategy weights
  const { score, reasoning, confidence } = scoreWithStrategy(
    indicators,
    fearGreed,
    sentimentScore,
    strategy,
    coin
  );

  // Determine action
  let action: TradeAction = 'HOLD';
  if (
    score >= strategy.signalThresholds.buyScore &&
    confidence >= strategy.signalThresholds.minConfidence
  ) {
    action = 'BUY';
  } else if (score <= strategy.signalThresholds.sellScore) {
    action = 'SELL';
  }

  return {
    coin_id: coin.id,
    coin_symbol: coin.symbol.toUpperCase(),
    coin_name: coin.name,
    coin_image: coin.image,
    current_price: coin.current_price,
    action,
    score,
    confidence,
    reasoning,
    indicators: snapshot,
    strategy: strategy.id,
    timestamp: new Date().toISOString(),
  };
}

// ── SCORING ENGINE ──────────────────────────────────────────

function scoreWithStrategy(
  ind: FullIndicators,
  fearGreed: number,
  sentiment: number,
  strategy: StrategyConfig,
  coin: CryptoData
): { score: number; reasoning: string[]; confidence: number } {
  const weights = strategy.indicatorWeights;
  const reasoning: string[] = [];
  let totalScore = 0;
  let totalWeight = 0;
  let bullishFactors = 0;
  let bearishFactors = 0;

  // ── RSI Score ───────────────────────────────────
  if (weights.rsi > 0) {
    let rsiScore = 0;
    if (ind.rsi < 30) {
      rsiScore = 80 + (30 - ind.rsi) * 2; // oversold = bullish
      reasoning.push(`RSI ${ind.rsi.toFixed(1)} — oversold, buy signal`);
      bullishFactors++;
    } else if (ind.rsi > 70) {
      rsiScore = -(80 + (ind.rsi - 70) * 2); // overbought = bearish
      reasoning.push(`RSI ${ind.rsi.toFixed(1)} — overbought, sell signal`);
      bearishFactors++;
    } else if (ind.rsi < 45) {
      rsiScore = 30;
      reasoning.push(`RSI ${ind.rsi.toFixed(1)} — leaning bullish`);
      bullishFactors++;
    } else if (ind.rsi > 55) {
      rsiScore = -30;
      reasoning.push(`RSI ${ind.rsi.toFixed(1)} — leaning bearish`);
      bearishFactors++;
    } else {
      reasoning.push(`RSI ${ind.rsi.toFixed(1)} — neutral`);
    }
    totalScore += rsiScore * (weights.rsi / 100);
    totalWeight += weights.rsi;
  }

  // ── MACD Score ──────────────────────────────────
  if (weights.macd > 0) {
    let macdScore = 0;
    if (ind.macd.histogram > 0 && ind.macd.value > ind.macd.signal) {
      macdScore = 60 + Math.min(40, Math.abs(ind.macd.histogram) * 1000);
      reasoning.push(`MACD bullish crossover — histogram positive`);
      bullishFactors++;
    } else if (ind.macd.histogram < 0 && ind.macd.value < ind.macd.signal) {
      macdScore = -(60 + Math.min(40, Math.abs(ind.macd.histogram) * 1000));
      reasoning.push(`MACD bearish crossover — histogram negative`);
      bearishFactors++;
    } else {
      reasoning.push(`MACD neutral — no clear crossover`);
    }
    totalScore += macdScore * (weights.macd / 100);
    totalWeight += weights.macd;
  }

  // ── EMA Score ───────────────────────────────────
  if (weights.ema > 0) {
    let emaScore = 0;
    if (ind.emaShort > ind.emaLong) {
      const spread = ((ind.emaShort - ind.emaLong) / ind.emaLong) * 100;
      emaScore = 50 + Math.min(50, spread * 10);
      reasoning.push(`EMA bullish — short above long (${spread.toFixed(2)}% spread)`);
      bullishFactors++;
    } else {
      const spread = ((ind.emaLong - ind.emaShort) / ind.emaLong) * 100;
      emaScore = -(50 + Math.min(50, spread * 10));
      reasoning.push(`EMA bearish — short below long (${spread.toFixed(2)}% spread)`);
      bearishFactors++;
    }
    totalScore += emaScore * (weights.ema / 100);
    totalWeight += weights.ema;
  }

  // ── Bollinger Bands Score ───────────────────────
  if (weights.bollingerBands > 0) {
    let bbScore = 0;
    if (ind.priceVsBollinger === 'below_lower') {
      bbScore = 80;
      reasoning.push(`Price below lower Bollinger Band — potential bounce`);
      bullishFactors++;
    } else if (ind.priceVsBollinger === 'above_upper') {
      bbScore = -80;
      reasoning.push(`Price above upper Bollinger Band — potential pullback`);
      bearishFactors++;
    } else {
      const price = coin.current_price;
      const mid = ind.bollingerBands.middle;
      if (price < mid) {
        bbScore = 20;
        reasoning.push(`Price below BB middle — room to grow`);
      } else {
        bbScore = -20;
        reasoning.push(`Price above BB middle — extended`);
      }
    }
    totalScore += bbScore * (weights.bollingerBands / 100);
    totalWeight += weights.bollingerBands;
  }

  // ── Volume Score ────────────────────────────────
  if (weights.volume > 0) {
    let volScore = 0;
    if (ind.volumeChange > 50) {
      volScore = 60;
      reasoning.push(`Volume surge +${ind.volumeChange.toFixed(0)}% — strong interest`);
      bullishFactors++;
    } else if (ind.volumeChange > 20) {
      volScore = 30;
      reasoning.push(`Volume rising +${ind.volumeChange.toFixed(0)}%`);
    } else if (ind.volumeChange < -30) {
      volScore = -40;
      reasoning.push(`Volume declining ${ind.volumeChange.toFixed(0)}% — fading interest`);
      bearishFactors++;
    } else {
      reasoning.push(`Volume stable`);
    }
    totalScore += volScore * (weights.volume / 100);
    totalWeight += weights.volume;
  }

  // ── Sentiment Score ─────────────────────────────
  if (weights.sentiment > 0) {
    let sentScore = 0;
    // For contrarian, flip the sentiment
    const effectiveSentiment =
      strategy.id === 'contrarian' ? -sentiment : sentiment;

    if (effectiveSentiment > 30) {
      sentScore = 50;
      reasoning.push(
        strategy.id === 'contrarian'
          ? `Market fear detected — contrarian buy zone`
          : `Positive sentiment — bullish`
      );
      bullishFactors++;
    } else if (effectiveSentiment < -30) {
      sentScore = -50;
      reasoning.push(
        strategy.id === 'contrarian'
          ? `Market greed detected — contrarian sell zone`
          : `Negative sentiment — bearish`
      );
      bearishFactors++;
    }
    totalScore += sentScore * (weights.sentiment / 100);
    totalWeight += weights.sentiment;
  }

  // ── Fear & Greed Score ──────────────────────────
  if (weights.fearGreed > 0) {
    let fgScore = 0;
    // For contrarian & DCA, low F&G = buy signal
    const isContrarian =
      strategy.id === 'contrarian' || strategy.id === 'dca';

    if (fearGreed < 25) {
      fgScore = isContrarian ? 90 : -30;
      reasoning.push(
        isContrarian
          ? `Extreme Fear (${fearGreed}) — strong buy zone`
          : `Extreme Fear (${fearGreed}) — risky market`
      );
      if (isContrarian) bullishFactors++;
      else bearishFactors++;
    } else if (fearGreed > 75) {
      fgScore = isContrarian ? -70 : 30;
      reasoning.push(
        isContrarian
          ? `Extreme Greed (${fearGreed}) — danger zone, sell`
          : `Extreme Greed (${fearGreed}) — market euphoria`
      );
      if (isContrarian) bearishFactors++;
      else bullishFactors++;
    } else {
      reasoning.push(`Fear & Greed neutral (${fearGreed})`);
    }
    totalScore += fgScore * (weights.fearGreed / 100);
    totalWeight += weights.fearGreed;
  }

  // ── Momentum Score ──────────────────────────────
  if (weights.momentum > 0) {
    let momScore = 0;
    if (ind.momentum > 5) {
      momScore = 60;
      reasoning.push(`Strong upward momentum +${ind.momentum.toFixed(1)}%`);
      bullishFactors++;
    } else if (ind.momentum > 2) {
      momScore = 30;
      reasoning.push(`Positive momentum +${ind.momentum.toFixed(1)}%`);
    } else if (ind.momentum < -5) {
      momScore = -60;
      reasoning.push(`Strong downward momentum ${ind.momentum.toFixed(1)}%`);
      bearishFactors++;
    } else if (ind.momentum < -2) {
      momScore = -30;
      reasoning.push(`Negative momentum ${ind.momentum.toFixed(1)}%`);
    } else {
      reasoning.push(`Flat momentum`);
    }
    totalScore += momScore * (weights.momentum / 100);
    totalWeight += weights.momentum;
  }

  // ── Stochastic RSI Score ────────────────────────
  if (weights.stochasticRsi > 0) {
    let stochScore = 0;
    if (ind.stochasticRsi < 20) {
      stochScore = 70;
      reasoning.push(`StochRSI oversold (${ind.stochasticRsi.toFixed(0)})`);
      bullishFactors++;
    } else if (ind.stochasticRsi > 80) {
      stochScore = -70;
      reasoning.push(`StochRSI overbought (${ind.stochasticRsi.toFixed(0)})`);
      bearishFactors++;
    }
    totalScore += stochScore * (weights.stochasticRsi / 100);
    totalWeight += weights.stochasticRsi;
  }

  // ── DCA Special: Always buy ─────────────────────
  if (strategy.id === 'dca') {
    totalScore = Math.max(totalScore, 10); // DCA always leans buy
    reasoning.push(`DCA mode — scheduled buy regardless of conditions`);

    // Smart DCA: buy MORE in fear, LESS in greed
    if (fearGreed < 30) {
      reasoning.push(`Smart DCA: 1.5x buy amount (market fear discount)`);
    } else if (fearGreed > 70) {
      reasoning.push(`Smart DCA: 0.5x buy amount (market overheated)`);
    }
  }

  // ── Calculate confidence ────────────────────────
  const totalFactors = bullishFactors + bearishFactors;
  const alignment =
    totalFactors > 0
      ? Math.abs(bullishFactors - bearishFactors) / totalFactors
      : 0;
  const confidence = Math.min(
    100,
    Math.round(50 + alignment * 30 + Math.abs(totalScore) * 0.2)
  );

  return {
    score: Math.round(totalScore),
    reasoning,
    confidence: Math.min(100, confidence),
  };
}

// ── TRADE EXECUTION LOGIC ───────────────────────────────────

export function shouldExecuteTrade(
  analysis: AnalysisResult,
  settings: BotSettings,
  positions: BotPosition[],
  recentTrades: BotTrade[],
  strategy: StrategyConfig
): { execute: boolean; reason: string } {
  // Check if bot is enabled
  if (!settings.enabled) {
    return { execute: false, reason: 'Bot is disabled' };
  }

  // Check daily trade limit
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTrades = recentTrades.filter(
    (t) => new Date(t.opened_at) >= todayStart
  ).length;
  if (todayTrades >= settings.max_daily_trades) {
    return { execute: false, reason: `Daily trade limit reached (${settings.max_daily_trades})` };
  }

  // Check daily loss limit
  const todayPnl = recentTrades
    .filter((t) => new Date(t.opened_at) >= todayStart && t.pnl !== undefined)
    .reduce((sum, t) => sum + (t.pnl || 0), 0);
  const lossLimit = settings.initial_balance * (settings.daily_loss_limit_percent / 100);
  if (todayPnl < -lossLimit) {
    return { execute: false, reason: `Daily loss limit hit ($${lossLimit.toFixed(2)})` };
  }

  if (analysis.action === 'BUY') {
    // Check if already at max positions
    if (positions.length >= strategy.riskParams.maxOpenPositions) {
      return { execute: false, reason: `Max positions (${strategy.riskParams.maxOpenPositions}) reached` };
    }

    // Check if already holding this coin
    if (positions.some((p) => p.coin_id === analysis.coin_id)) {
      return { execute: false, reason: `Already holding ${analysis.coin_symbol}` };
    }

    // Check cooldown (don't re-buy a coin we just sold)
    const lastTrade = recentTrades.find(
      (t) => t.coin_id === analysis.coin_id && t.status === 'closed'
    );
    if (lastTrade && lastTrade.closed_at) {
      const timeSince = Date.now() - new Date(lastTrade.closed_at).getTime();
      if (timeSince < strategy.riskParams.cooldownMs) {
        const remaining = Math.round(
          (strategy.riskParams.cooldownMs - timeSince) / 60000
        );
        return {
          execute: false,
          reason: `Cooldown: ${remaining} min remaining for ${analysis.coin_symbol}`,
        };
      }
    }

    // Check sufficient balance
    const positionSize =
      settings.current_balance * (strategy.riskParams.maxPositionPercent / 100);
    if (positionSize < 1) {
      return { execute: false, reason: 'Insufficient balance for position' };
    }

    return { execute: true, reason: 'All checks passed' };
  }

  if (analysis.action === 'SELL') {
    // Check if we actually hold this coin
    if (!positions.some((p) => p.coin_id === analysis.coin_id)) {
      return { execute: false, reason: `Not holding ${analysis.coin_symbol}` };
    }
    return { execute: true, reason: 'All checks passed' };
  }

  return { execute: false, reason: 'HOLD signal — no trade' };
}

// ── CREATE TRADE OBJECTS ────────────────────────────────────

export function createBuyTrade(
  analysis: AnalysisResult,
  settings: BotSettings,
  strategy: StrategyConfig
): BotTrade {
  // Calculate position size
  let positionSize =
    settings.current_balance * (strategy.riskParams.maxPositionPercent / 100);

  // DCA Smart sizing
  if (strategy.id === 'dca') {
    const baseDcaAmount = settings.current_balance * 0.05; // 5% per DCA buy
    if (analysis.indicators.fear_greed < 30) {
      positionSize = baseDcaAmount * 1.5; // buy more in fear
    } else if (analysis.indicators.fear_greed > 70) {
      positionSize = baseDcaAmount * 0.5; // buy less in greed
    } else {
      positionSize = baseDcaAmount;
    }
  }

  positionSize = Math.min(positionSize, settings.current_balance);
  const quantity = positionSize / analysis.current_price;

  // Calculate stop loss and take profit prices
  const stopLossPrice =
    strategy.riskParams.stopLossPercent > 0
      ? analysis.current_price * (1 - strategy.riskParams.stopLossPercent / 100)
      : 0;
  const takeProfitPrice =
    strategy.riskParams.takeProfitPercent > 0
      ? analysis.current_price * (1 + strategy.riskParams.takeProfitPercent / 100)
      : 0;

  return {
    user_id: settings.user_id,
    coin_id: analysis.coin_id,
    coin_symbol: analysis.coin_symbol,
    coin_name: analysis.coin_name,
    action: 'BUY',
    strategy: strategy.id,
    entry_price: analysis.current_price,
    quantity,
    position_value: positionSize,
    score: analysis.score,
    confidence: analysis.confidence,
    reasoning: analysis.reasoning,
    status: 'open',
    stop_loss_price: stopLossPrice,
    take_profit_price: takeProfitPrice,
    trailing_stop_price: strategy.riskParams.trailingStop
      ? analysis.current_price * (1 - strategy.riskParams.trailingStopPercent / 100)
      : undefined,
    opened_at: new Date().toISOString(),
    autonomous: true,
  };
}

export function createSellTrade(
  position: BotPosition,
  analysis: AnalysisResult,
  settings: BotSettings,
  strategy: StrategyConfig,
  sellReason: string
): BotTrade {
  const pnl =
    (analysis.current_price - position.entry_price) * position.quantity;
  const pnlPercent =
    ((analysis.current_price - position.entry_price) / position.entry_price) *
    100;

  return {
    user_id: settings.user_id,
    coin_id: analysis.coin_id,
    coin_symbol: analysis.coin_symbol,
    coin_name: analysis.coin_name,
    action: 'SELL',
    strategy: strategy.id,
    entry_price: position.entry_price,
    exit_price: analysis.current_price,
    quantity: position.quantity,
    position_value: analysis.current_price * position.quantity,
    pnl,
    pnl_percent: pnlPercent,
    score: analysis.score,
    confidence: analysis.confidence,
    reasoning: [...analysis.reasoning, `Sell reason: ${sellReason}`],
    status: 'closed',
    stop_loss_price: position.stop_loss_price,
    take_profit_price: position.take_profit_price,
    opened_at: position.opened_at,
    closed_at: new Date().toISOString(),
    autonomous: true,
  };
}

// ── CHECK STOP LOSS / TAKE PROFIT / TRAILING STOP ───────────

export function checkExitConditions(
  position: BotPosition,
  currentPrice: number,
  strategy: StrategyConfig
): { shouldSell: boolean; reason: string } {
  // Stop Loss hit
  if (
    strategy.riskParams.stopLossPercent > 0 &&
    currentPrice <= position.stop_loss_price
  ) {
    return { shouldSell: true, reason: 'Stop Loss triggered' };
  }

  // Take Profit hit
  if (
    strategy.riskParams.takeProfitPercent > 0 &&
    position.take_profit_price > 0 &&
    currentPrice >= position.take_profit_price
  ) {
    return { shouldSell: true, reason: 'Take Profit reached' };
  }

  // Trailing Stop hit
  if (
    strategy.riskParams.trailingStop &&
    position.trailing_stop_price &&
    currentPrice <= position.trailing_stop_price
  ) {
    return { shouldSell: true, reason: 'Trailing Stop triggered' };
  }

  return { shouldSell: false, reason: '' };
}

// ── UPDATE TRAILING STOP ────────────────────────────────────

export function updateTrailingStop(
  position: BotPosition,
  currentPrice: number,
  strategy: StrategyConfig
): BotPosition {
  if (!strategy.riskParams.trailingStop) return position;

  // Only move trailing stop UP, never down
  if (currentPrice > position.highest_price) {
    const newTrailingStop =
      currentPrice * (1 - strategy.riskParams.trailingStopPercent / 100);

    return {
      ...position,
      current_price: currentPrice,
      highest_price: currentPrice,
      trailing_stop_price: Math.max(
        position.trailing_stop_price || 0,
        newTrailingStop
      ),
      unrealized_pnl:
        (currentPrice - position.entry_price) * position.quantity,
      unrealized_pnl_percent:
        ((currentPrice - position.entry_price) / position.entry_price) * 100,
    };
  }

  return {
    ...position,
    current_price: currentPrice,
    unrealized_pnl:
      (currentPrice - position.entry_price) * position.quantity,
    unrealized_pnl_percent:
      ((currentPrice - position.entry_price) / position.entry_price) * 100,
  };
}

// ── CALCULATE STATS ─────────────────────────────────────────

export function calculateBotStats(
  trades: BotTrade[],
  settings: BotSettings
): BotStats {
  const closedTrades = trades.filter((t) => t.status === 'closed');
  const wins = closedTrades.filter((t) => (t.pnl || 0) > 0);
  const losses = closedTrades.filter((t) => (t.pnl || 0) < 0);

  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const pnls = closedTrades.map((t) => t.pnl || 0);

  // Today's stats
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTrades = closedTrades.filter(
    (t) => t.closed_at && new Date(t.closed_at) >= todayStart
  );
  const todayPnl = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

  // Win/loss streak
  let streak = 0;
  for (let i = closedTrades.length - 1; i >= 0; i--) {
    const pnl = closedTrades[i].pnl || 0;
    if (i === closedTrades.length - 1) {
      streak = pnl > 0 ? 1 : -1;
    } else {
      if (pnl > 0 && streak > 0) streak++;
      else if (pnl < 0 && streak < 0) streak--;
      else break;
    }
  }

  // Max drawdown
  let peak = settings.initial_balance;
  let maxDrawdown = 0;
  let runningBalance = settings.initial_balance;
  for (const trade of closedTrades) {
    runningBalance += trade.pnl || 0;
    if (runningBalance > peak) peak = runningBalance;
    const drawdown = ((peak - runningBalance) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // Sharpe ratio (simplified)
  const avgReturn =
    pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0;
  const stdDev =
    pnls.length > 1
      ? Math.sqrt(
          pnls.reduce((sum, p) => sum + Math.pow(p - avgReturn, 2), 0) /
            (pnls.length - 1)
        )
      : 1;
  const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

  return {
    totalTrades: closedTrades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    winRate:
      closedTrades.length > 0
        ? (wins.length / closedTrades.length) * 100
        : 0,
    totalPnl,
    totalPnlPercent:
      settings.initial_balance > 0
        ? (totalPnl / settings.initial_balance) * 100
        : 0,
    bestTrade: pnls.length > 0 ? Math.max(...pnls) : 0,
    worstTrade: pnls.length > 0 ? Math.min(...pnls) : 0,
    avgTradeReturn:
      pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    todayTrades: todayTrades.length,
    todayPnl,
    streak,
  };
}
