// ============================================================
// FILE: src/components/BotDashboard.tsx (REPLACE existing file)
// Full bot dashboard with strategy switching, stats, positions
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { BotState, StrategyType } from '@/types';
import { getCryptoBot } from '@/lib/bot-trading';
import { getStrategy, getAllStrategies } from '@/lib/strategies';
import StrategySelector from './StrategySelector';
import TradeHistory from './TradeHistory';

export default function BotDashboard() {
  const [state, setState] = useState<BotState | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'trades' | 'settings'>('overview');
  const [showStrategyPicker, setShowStrategyPicker] = useState(false);

  useEffect(() => {
    const bot = getCryptoBot();
    setState(bot.getState());
    bot.onUpdate((newState) => setState(newState));

    return () => {
      bot.onUpdate(() => {});
    };
  }, []);

  const handleToggleBot = useCallback(() => {
    const bot = getCryptoBot();
    if (state?.isRunning) {
      bot.stop();
    } else {
      bot.start();
    }
  }, [state?.isRunning]);

  const handleStrategySwitch = useCallback((strategyId: StrategyType) => {
    const bot = getCryptoBot();
    bot.switchStrategy(strategyId);
    setShowStrategyPicker(false);
  }, []);

  const handleToggleAutonomous = useCallback(() => {
    const bot = getCryptoBot();
    bot.setAutonomous(!state?.settings.autonomous_enabled);
  }, [state?.settings.autonomous_enabled]);

  const handleReset = useCallback(() => {
    if (confirm('Reset bot? This clears all trades, positions, and resets balance to $10,000.')) {
      const bot = getCryptoBot();
      bot.resetBot();
    }
  }, []);

  if (!state) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const strategy = getStrategy(state.settings.strategy);
  const totalValue =
    state.settings.current_balance +
    state.positions.reduce((sum, p) => sum + p.position_value, 0);
  const totalPnl = totalValue - state.settings.initial_balance;
  const totalPnlPercent = (totalPnl / state.settings.initial_balance) * 100;

  return (
    <div className="space-y-6">
      {/* ── TOP CONTROL BAR ──────────────────────────── */}
      <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Left: Bot status & strategy */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
                  state.isRunning
                    ? 'bg-green-500/20 animate-pulse'
                    : 'bg-gray-700/50'
                }`}
              >
                {strategy.icon}
              </div>
              <div
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 ${
                  state.isRunning ? 'bg-green-500' : 'bg-gray-600'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {strategy.name}
                </h2>
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `${strategy.color}30`,
                    color: strategy.color,
                  }}
                >
                  {state.settings.mode === 'paper' ? 'PAPER' : 'LIVE'}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {state.isRunning ? (
                  <>
                    Running • Analyzing every{' '}
                    {strategy.intervalMs < 60000
                      ? `${strategy.intervalMs / 1000}s`
                      : `${strategy.intervalMs / 60000}m`}
                  </>
                ) : (
                  'Stopped'
                )}
              </p>
              {state.lastAnalysis && (
                <p className="text-[10px] text-gray-500">
                  Last scan:{' '}
                  {new Date(state.lastAnalysis).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowStrategyPicker(!showStrategyPicker)}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors"
            >
              🎮 Switch Strategy
            </button>

            <button
              onClick={handleToggleAutonomous}
              className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                state.settings.autonomous_enabled
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {state.settings.autonomous_enabled ? '🤖 Auto ON' : '🤖 Auto OFF'}
            </button>

            <button
              onClick={handleToggleBot}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                state.isRunning
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {state.isRunning ? '⏹ Stop Bot' : '▶ Start Bot'}
            </button>
          </div>
        </div>

        {/* Autonomous mode info */}
        {state.settings.autonomous_enabled && (
          <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-xs text-purple-300">
              🤖 <strong>Autonomous Mode Active</strong> — The bot will continue
              trading even when you close this page. Trades execute server-side
              on a schedule matching your strategy.
            </p>
          </div>
        )}
      </div>

      {/* ── STRATEGY PICKER (expandable) ─────────────── */}
      {showStrategyPicker && (
        <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-4">
          <StrategySelector
            activeStrategy={state.settings.strategy}
            onSelect={handleStrategySwitch}
            disabled={state.isRunning}
          />
          {state.isRunning && (
            <p className="text-xs text-amber-400 mt-3">
              ⚠️ Stop the bot before switching strategies.
            </p>
          )}
        </div>
      )}

      {/* ── PORTFOLIO SUMMARY CARDS ──────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Portfolio Value"
          value={`$${totalValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          sub={`Started: $${state.settings.initial_balance.toLocaleString()}`}
          color="white"
        />
        <StatCard
          label="Total P&L"
          value={`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`}
          sub={`${totalPnlPercent >= 0 ? '+' : ''}${totalPnlPercent.toFixed(2)}%`}
          color={totalPnl >= 0 ? '#10b981' : '#ef4444'}
        />
        <StatCard
          label="Win Rate"
          value={`${state.stats.winRate.toFixed(1)}%`}
          sub={`${state.stats.winningTrades}W / ${state.stats.losingTrades}L`}
          color={state.stats.winRate >= 50 ? '#10b981' : '#f59e0b'}
        />
        <StatCard
          label="Today"
          value={`${state.stats.todayPnl >= 0 ? '+' : ''}$${state.stats.todayPnl.toFixed(2)}`}
          sub={`${state.stats.todayTrades} trades today`}
          color={state.stats.todayPnl >= 0 ? '#10b981' : '#ef4444'}
        />
      </div>

      {/* ── TAB NAVIGATION ───────────────────────────── */}
      <div className="flex gap-1 bg-gray-800/50 p-1 rounded-xl">
        {(['overview', 'positions', 'trades', 'settings'] as const).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab === 'overview' && '📊 '}
              {tab === 'positions' && '💼 '}
              {tab === 'trades' && '📜 '}
              {tab === 'settings' && '⚙️ '}
              {tab}
              {tab === 'positions' && state.positions.length > 0 && (
                <span className="ml-1 bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full text-[10px]">
                  {state.positions.length}
                </span>
              )}
            </button>
          )
        )}
      </div>

      {/* ── TAB CONTENT ──────────────────────────────── */}
      <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-4">
        {activeTab === 'overview' && <OverviewTab state={state} strategy={strategy} />}
        {activeTab === 'positions' && <PositionsTab state={state} />}
        {activeTab === 'trades' && <TradeHistory trades={state.recentTrades} />}
        {activeTab === 'settings' && (
          <SettingsTab state={state} onReset={handleReset} />
        )}
      </div>

      {/* ── ERRORS ───────────────────────────────────── */}
      {state.errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          <h4 className="text-xs font-bold text-red-400 mb-1">⚠️ Errors</h4>
          {state.errors.map((err, i) => (
            <p key={i} className="text-xs text-red-300">
              {err}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── STAT CARD COMPONENT ─────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-lg font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-[11px] text-gray-400">{sub}</div>
    </div>
  );
}

// ── OVERVIEW TAB ────────────────────────────────────────────

function OverviewTab({
  state,
  strategy,
}: {
  state: BotState;
  strategy: any;
}) {
  return (
    <div className="space-y-4">
      {/* Extended stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Total Trades" value={state.stats.totalTrades.toString()} />
        <MiniStat
          label="Avg Return"
          value={`$${state.stats.avgTradeReturn.toFixed(2)}`}
        />
        <MiniStat
          label="Best Trade"
          value={`+$${state.stats.bestTrade.toFixed(2)}`}
          color="#10b981"
        />
        <MiniStat
          label="Worst Trade"
          value={`$${state.stats.worstTrade.toFixed(2)}`}
          color="#ef4444"
        />
        <MiniStat
          label="Max Drawdown"
          value={`${state.stats.maxDrawdown.toFixed(1)}%`}
          color="#f59e0b"
        />
        <MiniStat
          label="Sharpe Ratio"
          value={state.stats.sharpeRatio.toFixed(2)}
        />
        <MiniStat
          label="Streak"
          value={
            state.stats.streak > 0
              ? `🔥 ${state.stats.streak}W`
              : state.stats.streak < 0
              ? `❄️ ${Math.abs(state.stats.streak)}L`
              : '—'
          }
          color={state.stats.streak > 0 ? '#10b981' : '#ef4444'}
        />
        <MiniStat
          label="Cash Available"
          value={`$${state.settings.current_balance.toFixed(2)}`}
        />
      </div>

      {/* Strategy info */}
      <div className="bg-gray-900/50 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{strategy.icon}</span>
          <h4 className="text-sm font-bold text-white">{strategy.name}</h4>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${strategy.color}20`,
              color: strategy.color,
            }}
          >
            Active Strategy
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-2">{strategy.description}</p>
        <div className="flex flex-wrap gap-4 text-[11px] text-gray-500">
          <span>
            SL: <strong className="text-red-400">{strategy.riskParams.stopLossPercent || 'None'}%</strong>
          </span>
          <span>
            TP: <strong className="text-green-400">{strategy.riskParams.takeProfitPercent || 'Hold'}%</strong>
          </span>
          <span>
            Trailing: <strong className="text-cyan-400">{strategy.riskParams.trailingStop ? 'Yes' : 'No'}</strong>
          </span>
          <span>
            Max positions: <strong className="text-white">{strategy.riskParams.maxOpenPositions}</strong>
          </span>
          <span>
            Interval:{' '}
            <strong className="text-white">
              {strategy.intervalMs < 60000
                ? `${strategy.intervalMs / 1000}s`
                : `${strategy.intervalMs / 60000}m`}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color = '#fff',
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-gray-900/30 rounded-lg p-2">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className="text-sm font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

// ── POSITIONS TAB ───────────────────────────────────────────

function PositionsTab({ state }: { state: BotState }) {
  if (state.positions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-2">💼</div>
        <p className="text-sm">No open positions</p>
        <p className="text-xs">The bot will open positions when it finds strong signals.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400 mb-2">
        {state.positions.length} open position{state.positions.length > 1 ? 's' : ''}
      </div>
      {state.positions.map((pos) => (
        <div
          key={pos.coin_id}
          className="bg-gray-900/50 rounded-xl p-3 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={pos.coin_image}
                alt={pos.coin_name}
                className="w-8 h-8 rounded-full"
              />
              <div>
                <div className="font-bold text-white text-sm">
                  {pos.coin_symbol}
                </div>
                <div className="text-[10px] text-gray-500">{pos.coin_name}</div>
              </div>
            </div>
            <div className="text-right">
              <div
                className="text-sm font-bold"
                style={{
                  color: pos.unrealized_pnl >= 0 ? '#10b981' : '#ef4444',
                }}
              >
                {pos.unrealized_pnl >= 0 ? '+' : ''}$
                {pos.unrealized_pnl.toFixed(2)}
              </div>
              <div
                className="text-[11px]"
                style={{
                  color: pos.unrealized_pnl_percent >= 0 ? '#10b981' : '#ef4444',
                }}
              >
                {pos.unrealized_pnl_percent >= 0 ? '+' : ''}
                {pos.unrealized_pnl_percent.toFixed(2)}%
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
            <span>
              Entry: <strong className="text-gray-300">${pos.entry_price.toLocaleString()}</strong>
            </span>
            <span>
              Current: <strong className="text-gray-300">${pos.current_price.toLocaleString()}</strong>
            </span>
            <span>
              SL: <strong className="text-red-400">${pos.stop_loss_price.toLocaleString()}</strong>
            </span>
            <span>
              TP: <strong className="text-green-400">${pos.take_profit_price.toLocaleString()}</strong>
            </span>
            {pos.trailing_stop_price && (
              <span>
                Trail: <strong className="text-amber-400">${pos.trailing_stop_price.toLocaleString()}</strong>
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SETTINGS TAB ────────────────────────────────────────────

function SettingsTab({
  state,
  onReset,
}: {
  state: BotState;
  onReset: () => void;
}) {
  const bot = getCryptoBot();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Balance */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">
            Starting Balance ($)
          </label>
          <input
            type="number"
            value={state.settings.initial_balance}
            onChange={(e) =>
              bot.updateSettings({
                initial_balance: Number(e.target.value),
                current_balance: Number(e.target.value),
              })
            }
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            disabled={state.isRunning}
          />
        </div>

        {/* Max daily trades */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">
            Max Daily Trades
          </label>
          <input
            type="number"
            value={state.settings.max_daily_trades}
            onChange={(e) =>
              bot.updateSettings({ max_daily_trades: Number(e.target.value) })
            }
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>

        {/* Daily loss limit */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">
            Daily Loss Limit (%)
          </label>
          <input
            type="number"
            value={state.settings.daily_loss_limit_percent}
            onChange={(e) =>
              bot.updateSettings({
                daily_loss_limit_percent: Number(e.target.value),
              })
            }
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          />
        </div>

        {/* Mode */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">
            Trading Mode
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => bot.updateSettings({ mode: 'paper' })}
              className={`flex-1 py-2 text-xs rounded-lg ${
                state.settings.mode === 'paper'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              📄 Paper Trading
            </button>
            <button
              onClick={() => bot.updateSettings({ mode: 'live' })}
              className={`flex-1 py-2 text-xs rounded-lg ${
                state.settings.mode === 'live'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-gray-700 text-gray-300'
              }`}
              disabled
              title="Live trading requires exchange API keys (coming soon)"
            >
              🔴 Live (Coming Soon)
            </button>
          </div>
        </div>
      </div>

      {/* Reset */}
      <div className="pt-4 border-t border-gray-700">
        <button
          onClick={onReset}
          className="px-4 py-2 bg-red-600/20 text-red-400 text-xs rounded-lg hover:bg-red-600/30 transition-colors"
        >
          🔄 Reset Bot (Clear All Data)
        </button>
      </div>
    </div>
  );
}
