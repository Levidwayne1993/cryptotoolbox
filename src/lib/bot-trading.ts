// ============================================================
// FILE: src/lib/bot-trading.ts (REPLACE existing file)
// Client-side bot controller — wraps the engine for the UI
// Persists to Supabase when available, falls back to localStorage
// ============================================================

'use client';

import {
  StrategyType,
  BotSettings,
  BotTrade,
  BotPosition,
  BotState,
  BotStats,
  AnalysisResult,
  CryptoData,
} from '@/types';
import { getStrategy } from './strategies';
import {
  fetchMarketData,
  analyzeCoin,
  shouldExecuteTrade,
  createBuyTrade,
  createSellTrade,
  checkExitConditions,
  updateTrailingStop,
  calculateBotStats,
} from './bot-engine';

// ── STORAGE KEYS ────────────────────────────────────────────

const STORAGE_KEYS = {
  SETTINGS: 'cryptobot_settings',
  TRADES: 'cryptobot_trades',
  POSITIONS: 'cryptobot_positions',
};

// ── DEFAULT SETTINGS ────────────────────────────────────────

export const DEFAULT_COINS = [
  'bitcoin',
  'ethereum',
  'solana',
  'dogecoin',
  'cardano',
  'ripple',
  'polkadot',
  'avalanche-2',
  'chainlink',
  'polygon',
];

export function getDefaultSettings(): BotSettings {
  return {
    user_id: 'local_user',
    enabled: false,
    strategy: 'day_trader',
    mode: 'paper',
    initial_balance: 10000,
    current_balance: 10000,
    selected_coins: DEFAULT_COINS,
    autonomous_enabled: false,
    max_daily_trades: 30,
    daily_loss_limit_percent: 5,
  };
}

// ── LOCAL STORAGE HELPERS ───────────────────────────────────

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, data: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

// ── BOT CONTROLLER CLASS ────────────────────────────────────

export class CryptoBot {
  private settings: BotSettings;
  private positions: BotPosition[];
  private trades: BotTrade[];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isAnalyzing: boolean = false;
  private lastAnalysis: string | null = null;
  private errors: string[] = [];
  private onStateChange: ((state: BotState) => void) | null = null;

  constructor() {
    this.settings = loadFromStorage(STORAGE_KEYS.SETTINGS, getDefaultSettings());
    this.positions = loadFromStorage(STORAGE_KEYS.POSITIONS, []);
    this.trades = loadFromStorage(STORAGE_KEYS.TRADES, []);
  }

  // ── Public API ──────────────────────────────────

  getState(): BotState {
    return {
      settings: { ...this.settings },
      positions: [...this.positions],
      recentTrades: this.trades.slice(-50), // last 50 trades
      stats: calculateBotStats(this.trades, this.settings),
      isRunning: this.intervalId !== null,
      lastAnalysis: this.lastAnalysis,
      errors: [...this.errors],
    };
  }

  onUpdate(callback: (state: BotState) => void): void {
    this.onStateChange = callback;
  }

  // ── Strategy Switching ──────────────────────────

  switchStrategy(strategyId: StrategyType): void {
    this.settings.strategy = strategyId;
    this.saveAll();
    this.emitState();

    // If running, restart with new interval
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }

  getActiveStrategy() {
    return getStrategy(this.settings.strategy);
  }

  // ── Settings Updates ────────────────────────────

  updateSettings(partial: Partial<BotSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.saveAll();
    this.emitState();
  }

  resetBot(): void {
    this.stop();
    this.settings = getDefaultSettings();
    this.positions = [];
    this.trades = [];
    this.errors = [];
    this.lastAnalysis = null;
    this.saveAll();
    this.emitState();
  }

  // ── Start / Stop ───────────────────────────────

  start(): void {
    if (this.intervalId) return;

    this.settings.enabled = true;
    this.saveAll();

    const strategy = getStrategy(this.settings.strategy);

    // Run immediately, then on interval
    this.runAnalysisCycle();

    this.intervalId = setInterval(() => {
      this.runAnalysisCycle();
    }, strategy.intervalMs);

    this.emitState();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.settings.enabled = false;
    this.saveAll();
    this.emitState();
  }

  // ── Enable/Disable Autonomous Mode ─────────────

  setAutonomous(enabled: boolean): void {
    this.settings.autonomous_enabled = enabled;
    this.saveAll();
    this.emitState();

    // When enabling autonomous, ping the server API to register
    if (enabled) {
      this.registerAutonomousExecution().catch(console.error);
    }
  }

  private async registerAutonomousExecution(): Promise<void> {
    try {
      const res = await fetch('/api/bot-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          settings: this.settings,
          positions: this.positions,
        }),
      });
      if (!res.ok) {
        this.errors.push('Failed to enable autonomous mode');
        this.emitState();
      }
    } catch (err) {
      this.errors.push('Autonomous mode registration failed');
      this.emitState();
    }
  }

  // ── Core Analysis Cycle ─────────────────────────

  async runAnalysisCycle(): Promise<AnalysisResult[]> {
    if (this.isAnalyzing) return [];
    this.isAnalyzing = true;
    this.errors = [];

    try {
      const strategy = getStrategy(this.settings.strategy);

      // 1. Fetch market data
      const marketData = await fetchMarketData(this.settings.selected_coins);
      this.lastAnalysis = new Date().toISOString();

      const analyses: AnalysisResult[] = [];

      // 2. Check exit conditions on existing positions first
      for (const position of [...this.positions]) {
        const coin = marketData.prices.find((p) => p.id === position.coin_id);
        if (!coin) continue;

        // Update trailing stop
        const updatedPosition = updateTrailingStop(
          position,
          coin.current_price,
          strategy
        );
        const posIdx = this.positions.findIndex(
          (p) => p.coin_id === position.coin_id
        );
        if (posIdx >= 0) this.positions[posIdx] = updatedPosition;

        // Check stop loss / take profit / trailing stop
        const exitCheck = checkExitConditions(
          updatedPosition,
          coin.current_price,
          strategy
        );
        if (exitCheck.shouldSell) {
          const analysis = analyzeCoin(
            coin,
            marketData.priceHistory[coin.id] || [],
            marketData.volumeHistory[coin.id] || [],
            marketData.fearGreedIndex,
            marketData.sentimentScores[coin.id] || 0,
            strategy
          );

          const sellTrade = createSellTrade(
            updatedPosition,
            analysis,
            this.settings,
            strategy,
            exitCheck.reason
          );

          // Execute sell
          this.settings.current_balance +=
            coin.current_price * updatedPosition.quantity;
          this.trades.push(sellTrade);
          this.positions = this.positions.filter(
            (p) => p.coin_id !== position.coin_id
          );
          analyses.push({ ...analysis, action: 'SELL' });
        }
      }

      // 3. Analyze each coin for new entries
      for (const coin of marketData.prices) {
        const analysis = analyzeCoin(
          coin,
          marketData.priceHistory[coin.id] || [],
          marketData.volumeHistory[coin.id] || [],
          marketData.fearGreedIndex,
          marketData.sentimentScores[coin.id] || 0,
          strategy
        );
        analyses.push(analysis);

        // Check if we should execute
        const { execute, reason } = shouldExecuteTrade(
          analysis,
          this.settings,
          this.positions,
          this.trades,
          strategy
        );

        if (!execute) continue;

        if (analysis.action === 'BUY') {
          const trade = createBuyTrade(analysis, this.settings, strategy);

          // Execute buy
          this.settings.current_balance -= trade.position_value;
          this.trades.push(trade);
          this.positions.push({
            coin_id: analysis.coin_id,
            coin_symbol: analysis.coin_symbol,
            coin_name: analysis.coin_name,
            coin_image: analysis.coin_image,
            entry_price: analysis.current_price,
            current_price: analysis.current_price,
            quantity: trade.quantity,
            position_value: trade.position_value,
            unrealized_pnl: 0,
            unrealized_pnl_percent: 0,
            stop_loss_price: trade.stop_loss_price,
            take_profit_price: trade.take_profit_price,
            trailing_stop_price: trade.trailing_stop_price,
            highest_price: analysis.current_price,
            strategy: strategy.id,
            opened_at: trade.opened_at,
          });
        } else if (analysis.action === 'SELL') {
          const position = this.positions.find(
            (p) => p.coin_id === analysis.coin_id
          );
          if (position) {
            const sellTrade = createSellTrade(
              position,
              analysis,
              this.settings,
              strategy,
              'Signal score below sell threshold'
            );
            this.settings.current_balance +=
              analysis.current_price * position.quantity;
            this.trades.push(sellTrade);
            this.positions = this.positions.filter(
              (p) => p.coin_id !== analysis.coin_id
            );
          }
        }
      }

      // 4. Update position prices
      for (let i = 0; i < this.positions.length; i++) {
        const coin = marketData.prices.find(
          (p) => p.id === this.positions[i].coin_id
        );
        if (coin) {
          this.positions[i].current_price = coin.current_price;
          this.positions[i].position_value =
            coin.current_price * this.positions[i].quantity;
          this.positions[i].unrealized_pnl =
            (coin.current_price - this.positions[i].entry_price) *
            this.positions[i].quantity;
          this.positions[i].unrealized_pnl_percent =
            ((coin.current_price - this.positions[i].entry_price) /
              this.positions[i].entry_price) *
            100;
        }
      }

      this.saveAll();
      this.emitState();
      return analyses;
    } catch (err: any) {
      this.errors.push(err.message || 'Analysis cycle failed');
      this.emitState();
      return [];
    } finally {
      this.isAnalyzing = false;
    }
  }

  // ── Persistence ─────────────────────────────────

  private saveAll(): void {
    saveToStorage(STORAGE_KEYS.SETTINGS, this.settings);
    saveToStorage(STORAGE_KEYS.POSITIONS, this.positions);
    saveToStorage(STORAGE_KEYS.TRADES, this.trades);
  }

  private emitState(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }
}

// ── SINGLETON INSTANCE ──────────────────────────────────────

let botInstance: CryptoBot | null = null;

export function getCryptoBot(): CryptoBot {
  if (!botInstance) {
    botInstance = new CryptoBot();
  }
  return botInstance;
}
