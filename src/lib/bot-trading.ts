// src/lib/bot-trading.ts — AI Paper Trading Bot v2.0
//
// Multi-factor scoring: RSI, 24h momentum, 7d trend, volume spikes,
// market cap rank, Fear & Greed, price range position
// Risk: Max 20% per position, max 5 holdings, 12% stop-loss, 18% take-profit

import {
  CryptoPrice, MarketStats, Portfolio, Holding,
  BotPortfolioData, BotTrade, CoinScore, BotSuggestion,
} from '@/types';

const BOT_STORAGE_KEY = 'cryptotoolbox-bot-portfolio';
const DEFAULT_STARTING_CASH = 10000;
const MAX_POSITION_PCT = 0.20;
const MAX_HOLDINGS = 5;
const STOP_LOSS_PCT = -0.12;
const TAKE_PROFIT_PCT = 0.18;
const BUY_SCORE_THRESHOLD = 60;
const SELL_SCORE_THRESHOLD = -40;
const MIN_TRADE_USD = 50;

// --- Portfolio Management ---

export function getBotPortfolio(): BotPortfolioData {
  if (typeof window === 'undefined') return getDefaultBotPortfolio();
  const stored = localStorage.getItem(BOT_STORAGE_KEY);
  if (!stored) return getDefaultBotPortfolio();
  try { return JSON.parse(stored); } catch { return getDefaultBotPortfolio(); }
}

export function saveBotPortfolio(portfolio: BotPortfolioData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BOT_STORAGE_KEY, JSON.stringify(portfolio));
}

export function resetBotPortfolio(startingCash: number = DEFAULT_STARTING_CASH): BotPortfolioData {
  const portfolio = getDefaultBotPortfolio(startingCash);
  saveBotPortfolio(portfolio);
  return portfolio;
}

function getDefaultBotPortfolio(startingCash: number = DEFAULT_STARTING_CASH): BotPortfolioData {
  return {
    cash: startingCash, startingCash, holdings: [], trades: [],
    lastAnalysisTime: '', totalAnalyses: 0,
  };
}

// --- Scoring Engine ---

function calculateRSI(sparkline: number[]): number | null {
  if (!sparkline || sparkline.length < 14) return null;
  const prices = sparkline.slice(-14);
  let gains = 0, losses = 0;
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change; else losses += Math.abs(change);
  }
  const avgGain = gains / 13;
  const avgLoss = losses / 13;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function detectVolumeSpike(coin: CryptoPrice, allCoins: CryptoPrice[]): number {
  if (!coin.market_cap || coin.market_cap === 0) return 1;
  const ratio = coin.total_volume / coin.market_cap;
  const avgRatios = allCoins.filter(c => c.market_cap > 0).map(c => c.total_volume / c.market_cap);
  const avgRatio = avgRatios.reduce((a, b) => a + b, 0) / avgRatios.length;
  return avgRatio > 0 ? ratio / avgRatio : 1;
}

export function scoreCoin(
  coin: CryptoPrice, allCoins: CryptoPrice[],
  marketStats: MarketStats | null, botHoldings: Holding[]
): CoinScore {
  let score = 0;
  const reasons: string[] = [];
  const sparkline = coin.sparkline_in_7d?.price || [];
  const rsi = calculateRSI(sparkline);
  const change24h = coin.price_change_percentage_24h || 0;
  const change7d = coin.price_change_percentage_7d_in_currency || 0;
  const volumeRatio = detectVolumeSpike(coin, allCoins);

  // Factor 1: RSI (weight: 25)
  if (rsi !== null) {
    if (rsi < 30) { score += 25; reasons.push(`RSI ${rsi.toFixed(0)} = oversold (buy signal)`); }
    else if (rsi < 40) { score += 15; reasons.push(`RSI ${rsi.toFixed(0)} = approaching oversold`); }
    else if (rsi > 70) { score -= 25; reasons.push(`RSI ${rsi.toFixed(0)} = overbought (sell signal)`); }
    else if (rsi > 60) { score -= 10; reasons.push(`RSI ${rsi.toFixed(0)} = approaching overbought`); }
    else { reasons.push(`RSI ${rsi.toFixed(0)} = neutral`); }
  }

  // Factor 2: 24h Momentum (weight: 20)
  if (change24h < -8) { score += 20; reasons.push(`24h dip ${change24h.toFixed(1)}% = potential rebound`); }
  else if (change24h < -4) { score += 10; reasons.push(`24h decline ${change24h.toFixed(1)}%`); }
  else if (change24h > 8) { score -= 15; reasons.push(`24h surge ${change24h.toFixed(1)}% = overextended`); }
  else if (change24h > 4) { score += 5; reasons.push(`24h momentum +${change24h.toFixed(1)}%`); }

  // Factor 3: 7d Trend (weight: 15)
  if (change7d > 5) { score += 10; reasons.push(`7d uptrend +${change7d.toFixed(1)}%`); }
  else if (change7d < -10) { score += 15; reasons.push(`7d deep dip ${change7d.toFixed(1)}% = potential recovery`); }
  else if (change7d < -5) { score += 5; reasons.push(`7d decline ${change7d.toFixed(1)}%`); }

  // Factor 4: Volume Spike (weight: 15)
  if (volumeRatio > 2.5) { score += 15; reasons.push(`Volume spike ${volumeRatio.toFixed(1)}x average`); }
  else if (volumeRatio > 1.5) { score += 8; reasons.push(`Above average volume ${volumeRatio.toFixed(1)}x`); }
  else if (volumeRatio < 0.3) { score -= 10; reasons.push(`Low volume = low interest`); }

  // Factor 5: Market Cap Rank (weight: 10)
  if (coin.market_cap_rank <= 10) { score += 10; reasons.push(`Top 10 = high stability`); }
  else if (coin.market_cap_rank <= 25) { score += 5; reasons.push(`Top 25 = moderate stability`); }
  else if (coin.market_cap_rank > 40) { score -= 5; reasons.push(`Rank #${coin.market_cap_rank} = higher risk`); }

  // Factor 6: Fear & Greed (weight: 15)
  if (marketStats) {
    const fg = marketStats.fearGreedIndex;
    if (fg < 25) { score += 15; reasons.push(`Extreme fear (${fg}) = contrarian buy`); }
    else if (fg < 40) { score += 8; reasons.push(`Market fear (${fg}) = favorable`); }
    else if (fg > 75) { score -= 15; reasons.push(`Extreme greed (${fg}) = contrarian sell`); }
    else if (fg > 60) { score -= 8; reasons.push(`Market greed (${fg}) = caution`); }
  }

  // Factor 7: Price Position in 24h Range
  if (coin.high_24h && coin.low_24h && coin.high_24h !== coin.low_24h) {
    const position = (coin.current_price - coin.low_24h) / (coin.high_24h - coin.low_24h);
    if (position < 0.2) { score += 10; reasons.push(`Near 24h low = potential support`); }
    else if (position > 0.9) { score -= 10; reasons.push(`Near 24h high = potential resistance`); }
  }

  // Determine action
  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  const holding = botHoldings.find(h => h.coinId === coin.id);
  if (holding) {
    const pnlPct = (coin.current_price - holding.avgBuyPrice) / holding.avgBuyPrice;
    if (pnlPct <= STOP_LOSS_PCT) {
      action = 'SELL'; score = -100;
      reasons.unshift(`STOP-LOSS: ${(pnlPct * 100).toFixed(1)}% loss`);
    } else if (pnlPct >= TAKE_PROFIT_PCT) {
      action = 'SELL'; score = -80;
      reasons.unshift(`TAKE-PROFIT: +${(pnlPct * 100).toFixed(1)}% gain`);
    } else if (score <= SELL_SCORE_THRESHOLD) { action = 'SELL'; }
  } else if (score >= BUY_SCORE_THRESHOLD) { action = 'BUY'; }

  const absScore = Math.abs(score);
  const confidence: 'HIGH' | 'MEDIUM' | 'LOW' =
    absScore >= 60 ? 'HIGH' : absScore >= 35 ? 'MEDIUM' : 'LOW';

  return {
    coinId: coin.id, symbol: coin.symbol, name: coin.name, image: coin.image,
    price: coin.current_price, score, action, reasons, confidence,
    rsi, change24h, change7d: change7d || 0, volumeRatio,
  };
}

// --- Bot Execution ---

export function runBotAnalysis(
  coins: CryptoPrice[], marketStats: MarketStats | null, portfolio: BotPortfolioData
): { portfolio: BotPortfolioData; scores: CoinScore[]; trades: BotTrade[] } {
  const newTrades: BotTrade[] = [];
  let p = { ...portfolio, holdings: [...portfolio.holdings], trades: [...portfolio.trades] };

  const scores = coins.filter(c => c.current_price > 0)
    .map(c => scoreCoin(c, coins, marketStats, p.holdings))
    .sort((a, b) => b.score - a.score);

  // Phase 1: SELL signals
  for (const s of scores.filter(s => s.action === 'SELL')) {
    const idx = p.holdings.findIndex(h => h.coinId === s.coinId);
    if (idx === -1) continue;
    const h = p.holdings[idx];
    const total = h.amount * s.price;
    const trade: BotTrade = {
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      coinId: s.coinId, symbol: s.symbol, name: s.name, type: 'sell',
      amount: h.amount, price: s.price, total,
      timestamp: new Date().toISOString(),
      reason: s.reasons[0] || 'Sell signal', score: s.score,
    };
    p.cash += total;
    p.holdings.splice(idx, 1);
    p.trades.push(trade);
    newTrades.push(trade);
  }

  // Phase 2: BUY signals
  const totalValue = getBotPortfolioValue(p, coins);
  for (const s of scores.filter(s => s.action === 'BUY')) {
    if (p.holdings.length >= MAX_HOLDINGS) break;
    if (p.holdings.some(h => h.coinId === s.coinId)) continue;
    const maxSize = totalValue * MAX_POSITION_PCT;
    const tradeSize = Math.min(maxSize, p.cash * 0.9);
    if (tradeSize < MIN_TRADE_USD) continue;
    const amount = tradeSize / s.price;
    const total = amount * s.price;
    const trade: BotTrade = {
      id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      coinId: s.coinId, symbol: s.symbol, name: s.name, type: 'buy',
      amount, price: s.price, total,
      timestamp: new Date().toISOString(),
      reason: s.reasons[0] || 'Buy signal', score: s.score,
    };
    p.cash -= total;
    p.holdings.push({
      coinId: s.coinId, symbol: s.symbol, name: s.name, image: s.image,
      amount, avgBuyPrice: s.price, totalInvested: total,
    });
    p.trades.push(trade);
    newTrades.push(trade);
  }

  p.lastAnalysisTime = new Date().toISOString();
  p.totalAnalyses += 1;
  if (p.trades.length > 100) p.trades = p.trades.slice(-100);
  saveBotPortfolio(p);
  return { portfolio: p, scores, trades: newTrades };
}

// --- Suggestions for the User ---

export function getBotSuggestions(
  coins: CryptoPrice[], marketStats: MarketStats | null, userPortfolio: Portfolio
): BotSuggestion[] {
  return coins.filter(c => c.current_price > 0)
    .map(c => scoreCoin(c, coins, marketStats, userPortfolio.holdings))
    .filter(s => s.action !== 'HOLD' && Math.abs(s.score) >= 30)
    .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
    .slice(0, 6)
    .map(s => ({
      coinId: s.coinId, symbol: s.symbol, name: s.name, image: s.image,
      action: s.action, score: s.score, reasons: s.reasons,
      confidence: s.confidence, currentPrice: s.price,
    }));
}

// --- Value Helpers ---

export function getBotPortfolioValue(portfolio: BotPortfolioData, coins: CryptoPrice[]): number {
  let v = 0;
  for (const h of portfolio.holdings) {
    const coin = coins.find(c => c.id === h.coinId);
    v += coin ? h.amount * coin.current_price : h.amount * h.avgBuyPrice;
  }
  return portfolio.cash + v;
}

export function getBotPnL(portfolio: BotPortfolioData, coins: CryptoPrice[]): { amount: number; percent: number } {
  const total = getBotPortfolioValue(portfolio, coins);
  const amount = total - portfolio.startingCash;
  return { amount, percent: portfolio.startingCash > 0 ? (amount / portfolio.startingCash) * 100 : 0 };
}
