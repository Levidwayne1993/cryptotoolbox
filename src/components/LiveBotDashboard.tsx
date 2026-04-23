// ============================================================
// CRYPTOTOOLBOX — src/components/LiveBotDashboard.tsx (REPLACE entire file)
// Location: cryptotoolbox/src/components/LiveBotDashboard.tsx
//
// Changes:
//   1. Updated all styling from raw gray utilities (bg-gray-800/60,
//      border-gray-700, etc.) to crypto-* theme classes for consistency
//      with the rest of the app (bg-crypto-card, border-crypto-border, etc.)
//   2. Replaced cyan accent colors with crypto-accent theme variable
//   3. No logic changes — still a read-only Supabase dashboard
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ── Interfaces ────────────────────────────────────────────────
interface BotSignal {
  id: string;
  pair: string;
  action: string;
  strategy: string;
  confidence: number;
  current_price: number;
  indicators: any;
  created_at: string;
  score?: number;
  multi_timeframe_alignment?: number;
  adx?: number;
  atr_percent?: number;
  whale_flow?: string;
  kelly_fraction?: number;
}

interface BotTrade {
  id: string;
  pair: string;
  action: string;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  position_value: number;
  pnl: number;
  pnl_percent: number;
  strategy: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
  score?: number;
  confidence?: number;
  reasoning?: string[];
  exit_reason?: string;
  kelly_size?: number;
  mode?: string;
}

interface BotPosition {
  id: string;
  pair: string;
  symbol: string;
  entry_price: number;
  quantity: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  strategy: string;
  opened_at: string;
  stop_loss_price?: number;
  take_profit_price?: number;
  trailing_stop_price?: number;
  highest_price?: number;
  position_value?: number;
}

interface BotSettings {
  id: string;
  mode: string;
  strategy: string;
  current_balance: number;
  selected_pairs: string[];
  updated_at: string;
  initial_balance?: number;
  circuit_breaker_active?: boolean;
  circuit_breaker_until?: string;
  consecutive_losses?: number;
  correlation_warnings?: string[];
}

// ── Helpers ───────────────────────────────────────────────────
function formatUSD(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '$0.00';
  return n < 0
    ? `-$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '0.00%';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function pnlColor(n: number | null | undefined): string {
  if (!n || n === 0) return 'text-gray-400';
  return n > 0 ? 'text-crypto-green' : 'text-crypto-red';
}

// ── Component ─────────────────────────────────────────────────
export default function LiveBotDashboard() {
  const [signals, setSignals] = useState<BotSignal[]>([]);
  const [trades, setTrades] = useState<BotTrade[]>([]);
  const [positions, setPositions] = useState<BotPosition[]>([]);
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'signals' | 'trades'>('overview');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // ── Data fetching ───────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [signalsRes, tradesRes, positionsRes, settingsRes] = await Promise.all([
        supabase.from('bot_signals').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('bot_trades').select('*').order('opened_at', { ascending: false }).limit(50),
        supabase.from('bot_positions').select('*').order('opened_at', { ascending: false }),
        supabase.from('bot_settings').select('*').eq('id', 'default').single(),
      ]);

      if (signalsRes.data) setSignals(signalsRes.data);
      if (tradesRes.data) setTrades(tradesRes.data);
      if (positionsRes.data) setPositions(positionsRes.data);
      if (settingsRes.data) setSettings(settingsRes.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch bot data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Loading ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-crypto-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  // ── Derived stats ───────────────────────────────────────────
  const balance = settings?.current_balance ?? 0;
  const initialBalance = settings?.initial_balance ?? balance;
  const positionValue = positions.reduce(
    (sum, p) => sum + (p.current_price ?? p.entry_price ?? 0) * (p.quantity ?? 0),
    0
  );
  const portfolioValue = balance + positionValue;

  const closedTrades = trades.filter(t => t.status === 'closed');
  const winningTrades = closedTrades.filter(t => (t.pnl ?? 0) > 0);
  const losingTrades = closedTrades.filter(t => (t.pnl ?? 0) < 0);
  const totalRealizedPnl = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const totalUnrealizedPnl = positions.reduce((s, p) => s + (p.unrealized_pnl ?? 0), 0);
  const winRate = closedTrades.length > 0
    ? (winningTrades.length / closedTrades.length) * 100
    : 0;
  const avgReturn = closedTrades.length > 0
    ? totalRealizedPnl / closedTrades.length
    : 0;
  const bestTrade = closedTrades.length > 0
    ? Math.max(...closedTrades.map(t => t.pnl ?? 0))
    : 0;
  const worstTrade = closedTrades.length > 0
    ? Math.min(...closedTrades.map(t => t.pnl ?? 0))
    : 0;
  const circuitBreakerActive = settings?.circuit_breaker_active ?? false;
  const circuitBreakerUntil = settings?.circuit_breaker_until;

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Live Trading Bot</h1>
        <p className="text-gray-400">
          Real-time data from your bot running on Railway &mdash; powered by Supabase
        </p>
        <div className="flex items-center justify-center gap-3">
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-crypto-accent/20 text-crypto-accent">
            {settings?.strategy ?? 'unknown'} ({(settings?.mode ?? 'paper').toUpperCase()})
          </span>
          <span className="text-sm text-gray-500">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="text-sm text-crypto-accent hover:text-crypto-accent/80 underline"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Circuit Breaker Banner */}
      {circuitBreakerActive && (
        <div className="bg-crypto-red/10 border border-crypto-red/30 rounded-xl p-4 text-center">
          <p className="text-crypto-red font-semibold text-lg">⚠️ Circuit Breaker Active</p>
          <p className="text-red-300 text-sm mt-1">
            Trading paused due to consecutive losses.
            {circuitBreakerUntil && (
              <> Resumes {new Date(circuitBreakerUntil).toLocaleString()}</>
            )}
          </p>
        </div>
      )}

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Portfolio Value */}
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-4">
          <p className="text-gray-400 text-sm">Portfolio Value</p>
          <p className="text-2xl font-bold text-white">{formatUSD(portfolioValue)}</p>
          <p className="text-xs text-gray-500 mt-1">
            Cash: {formatUSD(balance)}
          </p>
        </div>

        {/* Realized P&L */}
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-4">
          <p className="text-gray-400 text-sm">Realized P&amp;L</p>
          <p className={`text-2xl font-bold ${pnlColor(totalRealizedPnl)}`}>
            {totalRealizedPnl >= 0 ? '+ ' : ''}{formatUSD(totalRealizedPnl)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {closedTrades.length} closed trade{closedTrades.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Win Rate */}
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-4">
          <p className="text-gray-400 text-sm">Win Rate</p>
          <p className={`text-2xl font-bold ${winRate >= 50 ? 'text-crypto-green' : winRate > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
            {winRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {winningTrades.length}W / {losingTrades.length}L
          </p>
        </div>

        {/* Unrealized P&L */}
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-4">
          <p className="text-gray-400 text-sm">Unrealized P&amp;L</p>
          <p className={`text-2xl font-bold ${pnlColor(totalUnrealizedPnl)}`}>
            {totalUnrealizedPnl >= 0 ? '+ ' : ''}{formatUSD(totalUnrealizedPnl)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {positions.length} open position{positions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-crypto-border pb-2">
        {(['overview', 'positions', 'signals', 'trades'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-crypto-accent/20 text-crypto-accent border-b-2 border-crypto-accent'
                : 'text-gray-400 hover:text-white hover:bg-crypto-card/60'
            }`}
          >
            {tab === 'overview' ? '📊 Overview' :
             tab === 'positions' ? '📈 Positions' :
             tab === 'signals' ? '📡 Signals' :
             '💰 Trades'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-crypto-card/60 border border-crypto-border rounded-xl p-6">
        {activeTab === 'overview' && (
          <OverviewTab
            trades={closedTrades}
            positions={positions}
            settings={settings}
            avgReturn={avgReturn}
            bestTrade={bestTrade}
            worstTrade={worstTrade}
            portfolioValue={portfolioValue}
            initialBalance={initialBalance}
          />
        )}
        {activeTab === 'positions' && (
          <PositionsTab positions={positions} />
        )}
        {activeTab === 'signals' && (
          <SignalsTab signals={signals} />
        )}
        {activeTab === 'trades' && (
          <TradesTab trades={trades} />
        )}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────
function OverviewTab({
  trades,
  positions,
  settings,
  avgReturn,
  bestTrade,
  worstTrade,
  portfolioValue,
  initialBalance,
}: {
  trades: BotTrade[];
  positions: BotPosition[];
  settings: BotSettings | null;
  avgReturn: number;
  bestTrade: number;
  worstTrade: number;
  portfolioValue: number;
  initialBalance: number;
}) {
  const totalReturnPct =
    initialBalance > 0
      ? ((portfolioValue - initialBalance) / initialBalance) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Performance Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Trades" value={String(trades.length)} />
        <StatCard label="Avg Return" value={formatUSD(avgReturn)} color={pnlColor(avgReturn)} />
        <StatCard label="Best Trade" value={`+ ${formatUSD(bestTrade)}`} color="text-crypto-green" />
        <StatCard label="Worst Trade" value={formatUSD(worstTrade)} color="text-crypto-red" />
      </div>

      {/* Overall Return */}
      <div className="bg-crypto-card/40 rounded-lg p-4">
        <p className="text-gray-400 text-sm mb-1">Overall Return</p>
        <div className="flex items-baseline gap-3">
          <span className={`text-3xl font-bold ${pnlColor(totalReturnPct)}`}>
            {formatPercent(totalReturnPct)}
          </span>
          <span className="text-gray-500 text-sm">
            from {formatUSD(initialBalance)} initial balance
          </span>
        </div>
      </div>

      {/* Bot Configuration */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Bot Configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ConfigCard label="Mode" value={(settings?.mode ?? 'paper').toUpperCase()} />
          <ConfigCard label="Strategy" value={settings?.strategy ?? 'N/A'} />
          <ConfigCard
            label="Pairs"
            value={
              settings?.selected_pairs && settings.selected_pairs.length > 0
                ? settings.selected_pairs.join(', ')
                : 'N/A'
            }
          />
          <ConfigCard label="Open Positions" value={String(positions.length)} />
        </div>
      </div>

      {/* Recent Activity */}
      {trades.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Recent Trades</h3>
          <div className="space-y-2">
            {trades.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between bg-crypto-card/40 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    t.action === 'BUY'
                      ? 'bg-crypto-green/20 text-crypto-green'
                      : 'bg-crypto-red/20 text-crypto-red'
                  }`}>
                    {t.action}
                  </span>
                  <span className="text-white font-medium">{t.pair}</span>
                </div>
                <div className="text-right">
                  <span className={`font-medium ${pnlColor(t.pnl)}`}>
                    {formatUSD(t.pnl)}
                  </span>
                  <p className="text-xs text-gray-500">{timeAgo(t.opened_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Positions Tab ─────────────────────────────────────────────
function PositionsTab({ positions }: { positions: BotPosition[] }) {
  if (positions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-lg">No open positions</p>
        <p className="text-sm mt-1">The bot will open positions when it detects strong signals</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">
        Open Positions ({positions.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-crypto-border">
              <th className="text-left py-3 px-2">Pair</th>
              <th className="text-right py-3 px-2">Entry</th>
              <th className="text-right py-3 px-2">Current</th>
              <th className="text-right py-3 px-2">Qty</th>
              <th className="text-right py-3 px-2">Value</th>
              <th className="text-right py-3 px-2">P&amp;L</th>
              <th className="text-right py-3 px-2">P&amp;L %</th>
              <th className="text-right py-3 px-2">Stop Loss</th>
              <th className="text-right py-3 px-2">Take Profit</th>
              <th className="text-right py-3 px-2">Opened</th>
            </tr>
          </thead>
          <tbody>
            {positions.map(pos => {
              const value = (pos.current_price ?? pos.entry_price ?? 0) * (pos.quantity ?? 0);
              const pnl = pos.unrealized_pnl ?? 0;
              const pnlPct = pos.unrealized_pnl_percent ?? 0;
              return (
                <tr key={pos.id} className="border-b border-crypto-border/50 hover:bg-crypto-card/30">
                  <td className="py-3 px-2">
                    <span className="text-white font-medium">{pos.pair ?? pos.symbol ?? '—'}</span>
                  </td>
                  <td className="text-right py-3 px-2 text-gray-300">
                    {formatUSD(pos.entry_price)}
                  </td>
                  <td className="text-right py-3 px-2 text-gray-300">
                    {formatUSD(pos.current_price)}
                  </td>
                  <td className="text-right py-3 px-2 text-gray-300">
                    {pos.quantity?.toFixed(6) ?? '0'}
                  </td>
                  <td className="text-right py-3 px-2 text-gray-300">
                    {formatUSD(value)}
                  </td>
                  <td className={`text-right py-3 px-2 font-medium ${pnlColor(pnl)}`}>
                    {formatUSD(pnl)}
                  </td>
                  <td className={`text-right py-3 px-2 font-medium ${pnlColor(pnlPct)}`}>
                    {formatPercent(pnlPct)}
                  </td>
                  <td className="text-right py-3 px-2 text-yellow-400">
                    {pos.stop_loss_price ? formatUSD(pos.stop_loss_price) : '—'}
                  </td>
                  <td className="text-right py-3 px-2 text-crypto-accent">
                    {pos.take_profit_price ? formatUSD(pos.take_profit_price) : '—'}
                  </td>
                  <td className="text-right py-3 px-2 text-gray-500">
                    {timeAgo(pos.opened_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Signals Tab ───────────────────────────────────────────────
function SignalsTab({ signals }: { signals: BotSignal[] }) {
  if (signals.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-3">📡</p>
        <p className="text-lg">No signals yet</p>
        <p className="text-sm mt-1">Signals appear as the bot analyzes market conditions</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">
        Recent Signals ({signals.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-crypto-border">
              <th className="text-left py-3 px-2">Time</th>
              <th className="text-left py-3 px-2">Pair</th>
              <th className="text-left py-3 px-2">Action</th>
              <th className="text-right py-3 px-2">Score</th>
              <th className="text-right py-3 px-2">Confidence</th>
              <th className="text-right py-3 px-2">Price</th>
              <th className="text-right py-3 px-2">ADX</th>
              <th className="text-right py-3 px-2">Multi-TF</th>
              <th className="text-left py-3 px-2">Whale</th>
            </tr>
          </thead>
          <tbody>
            {signals.map(sig => (
              <tr key={sig.id} className="border-b border-crypto-border/50 hover:bg-crypto-card/30">
                <td className="py-3 px-2 text-gray-500">{timeAgo(sig.created_at)}</td>
                <td className="py-3 px-2 text-white font-medium">{sig.pair}</td>
                <td className="py-3 px-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    sig.action === 'BUY'
                      ? 'bg-crypto-green/20 text-crypto-green'
                      : sig.action === 'SELL'
                      ? 'bg-crypto-red/20 text-crypto-red'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {sig.action}
                  </span>
                </td>
                <td className="text-right py-3 px-2">
                  <span className={pnlColor(sig.score ?? 0)}>
                    {sig.score?.toFixed(1) ?? '—'}
                  </span>
                </td>
                <td className="text-right py-3 px-2">
                  <span className={`${
                    (sig.confidence ?? 0) >= 60 ? 'text-crypto-green' :
                    (sig.confidence ?? 0) >= 40 ? 'text-yellow-400' :
                    'text-gray-400'
                  }`}>
                    {sig.confidence?.toFixed(0) ?? '—'}%
                  </span>
                </td>
                <td className="text-right py-3 px-2 text-gray-300">
                  {formatUSD(sig.current_price)}
                </td>
                <td className="text-right py-3 px-2 text-gray-300">
                  {sig.adx?.toFixed(1) ?? '—'}
                </td>
                <td className="text-right py-3 px-2">
                  {sig.multi_timeframe_alignment != null ? (
                    <span className={`${
                      sig.multi_timeframe_alignment >= 70 ? 'text-crypto-green' :
                      sig.multi_timeframe_alignment >= 50 ? 'text-yellow-400' :
                      'text-crypto-red'
                    }`}>
                      {sig.multi_timeframe_alignment.toFixed(0)}%
                    </span>
                  ) : '—'}
                </td>
                <td className="py-3 px-2">
                  {sig.whale_flow ? (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      sig.whale_flow === 'bullish'
                        ? 'bg-crypto-green/20 text-crypto-green'
                        : sig.whale_flow === 'bearish'
                        ? 'bg-crypto-red/20 text-crypto-red'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      🐋 {sig.whale_flow}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Trades Tab ────────────────────────────────────────────────
function TradesTab({ trades }: { trades: BotTrade[] }) {
  if (trades.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-3">💰</p>
        <p className="text-lg">No trades yet</p>
        <p className="text-sm mt-1">Trades appear when the bot opens and closes positions</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">
        Trade History ({trades.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-crypto-border">
              <th className="text-left py-3 px-2">Time</th>
              <th className="text-left py-3 px-2">Pair</th>
              <th className="text-left py-3 px-2">Action</th>
              <th className="text-left py-3 px-2">Status</th>
              <th className="text-right py-3 px-2">Entry</th>
              <th className="text-right py-3 px-2">Exit</th>
              <th className="text-right py-3 px-2">Qty</th>
              <th className="text-right py-3 px-2">Value</th>
              <th className="text-right py-3 px-2">P&amp;L</th>
              <th className="text-right py-3 px-2">P&amp;L %</th>
              <th className="text-left py-3 px-2">Exit Reason</th>
            </tr>
          </thead>
          <tbody>
            {trades.map(t => (
              <tr key={t.id} className="border-b border-crypto-border/50 hover:bg-crypto-card/30">
                <td className="py-3 px-2 text-gray-500">{timeAgo(t.opened_at)}</td>
                <td className="py-3 px-2 text-white font-medium">{t.pair}</td>
                <td className="py-3 px-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    t.action === 'BUY'
                      ? 'bg-crypto-green/20 text-crypto-green'
                      : 'bg-crypto-red/20 text-crypto-red'
                  }`}>
                    {t.action}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    t.status === 'closed'
                      ? 'bg-gray-500/20 text-gray-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="text-right py-3 px-2 text-gray-300">
                  {formatUSD(t.entry_price)}
                </td>
                <td className="text-right py-3 px-2 text-gray-300">
                  {t.exit_price != null ? formatUSD(t.exit_price) : '—'}
                </td>
                <td className="text-right py-3 px-2 text-gray-300">
                  {t.quantity?.toFixed(6) ?? '0'}
                </td>
                <td className="text-right py-3 px-2 text-gray-300">
                  {formatUSD(t.position_value)}
                </td>
                <td className={`text-right py-3 px-2 font-medium ${pnlColor(t.pnl)}`}>
                  {formatUSD(t.pnl)}
                </td>
                <td className={`text-right py-3 px-2 font-medium ${pnlColor(t.pnl_percent)}`}>
                  {formatPercent(t.pnl_percent)}
                </td>
                <td className="py-3 px-2 text-gray-500 text-xs max-w-[120px] truncate">
                  {t.exit_reason ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Small reusable cards ──────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-crypto-card/40 rounded-lg p-3">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className={`text-lg font-bold ${color ?? 'text-white'}`}>{value}</p>
    </div>
  );
}

function ConfigCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-crypto-card/40 rounded-lg p-3">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <p className="text-white text-sm font-medium break-words">{value}</p>
    </div>
  );
}
