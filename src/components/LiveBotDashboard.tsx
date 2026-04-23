'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';

// ============================================================
// TYPES
// ============================================================
interface BotSignal {
  id?: string;
  pair: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  score: number;
  confidence: number;
  current_price: number;
  reasoning: string[];
  strategy?: string;
  adx?: number;
  atr_percent?: number;
  multi_timeframe_alignment?: number;
  whale_flow?: number;
  kelly_fraction?: number;
  created_at: string;
}

interface BotTrade {
  id?: string;
  coin_id: string;
  symbol: string;
  pair: string;
  action: 'BUY' | 'SELL';
  strategy: string;
  entry_price: number;
  exit_price?: number;
  quantity: number;
  position_value: number;
  pnl?: number;
  pnl_percent?: number;
  score: number;
  confidence: number;
  reasoning: string[];
  status: 'open' | 'closed';
  stop_loss_price?: number;
  take_profit_price?: number;
  trailing_stop_price?: number;
  opened_at: string;
  closed_at?: string;
  order_id?: string;
  mode: string;
  exit_reason?: string;
  kelly_fraction?: number;
  kelly_size?: number;
  atr_at_entry?: number;
  risk_amount?: number;
}

interface BotPosition {
  id?: string;
  coin_id: string;
  symbol: string;
  pair: string;
  entry_price: number;
  current_price: number;
  quantity: number;
  position_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  stop_loss_price?: number;
  take_profit_price?: number;
  trailing_stop_price?: number;
  highest_price?: number;
  strategy: string;
  opened_at: string;
  atr_at_entry?: number;
  kelly_fraction?: number;
  risk_amount?: number;
}

interface BotSettings {
  id?: string;
  enabled: boolean;
  strategy: string;
  mode: string;
  initial_balance: number;
  current_balance: number;
  selected_pairs: string[];
  max_daily_trades: number;
  daily_loss_limit_percent: number;
  alerts_enabled: boolean;
  correlation_guard_enabled?: boolean;
  kelly_sizing_enabled?: boolean;
  whale_tracking_enabled?: boolean;
}

type ExpandedCard = 'portfolio' | 'pnl' | 'winrate' | 'unrealized' | null;

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function formatCurrency(val: number): string {
  if (Math.abs(val) >= 1) return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  return '$' + val.toFixed(6);
}

function formatPercent(val: number): string {
  return (val >= 0 ? '+' : '') + val.toFixed(2) + '%';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function LiveBotDashboard() {
  const [signals, setSignals] = useState<BotSignal[]>([]);
  const [trades, setTrades] = useState<BotTrade[]>([]);
  const [positions, setPositions] = useState<BotPosition[]>([]);
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'signals' | 'trades'>('overview');
  const [expandedCard, setExpandedCard] = useState<ExpandedCard>(null);
  const [tradeFilter, setTradeFilter] = useState<'today' | 'all'>('today');

  // ------- DATA FETCHING -------
  const fetchData = useCallback(async () => {
    try {
      const supabase = getSupabase();

      const [signalsRes, tradesRes, positionsRes, settingsRes] = await Promise.all([
        supabase.from('bot_signals').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('bot_trades').select('*').order('opened_at', { ascending: false }).limit(200),
        supabase.from('bot_positions').select('*').order('opened_at', { ascending: false }),
        supabase.from('bot_settings').select('*').limit(1).single(),
      ]);

      if (signalsRes.data) setSignals(signalsRes.data);
      if (tradesRes.data) setTrades(tradesRes.data);
      if (positionsRes.data) setPositions(positionsRes.data);
      if (settingsRes.data) setSettings(settingsRes.data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ------- COMPUTED VALUES -------
  const closedTrades = trades.filter(t => t.status === 'closed');
  const openTrades = trades.filter(t => t.status === 'open');
  const todayTrades = trades.filter(t => isToday(t.opened_at));
  const todayClosedTrades = closedTrades.filter(t => t.closed_at && isToday(t.closed_at));

  const totalRealizedPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealized_pnl, 0);
  const totalPositionValue = positions.reduce((sum, p) => sum + p.position_value, 0);

  const wins = closedTrades.filter(t => (t.pnl || 0) > 0);
  const losses = closedTrades.filter(t => (t.pnl || 0) <= 0);
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

  const cashBalance = settings?.current_balance || 0;
  const portfolioValue = cashBalance + totalPositionValue;
  const initialBalance = settings?.initial_balance || 1000;
  const overallReturn = ((portfolioValue - initialBalance) / initialBalance) * 100;

  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.pnl || 0), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + (t.pnl || 0), 0) / losses.length : 0;
  const bestTrade = closedTrades.length > 0 ? Math.max(...closedTrades.map(t => t.pnl || 0)) : 0;
  const worstTrade = closedTrades.length > 0 ? Math.min(...closedTrades.map(t => t.pnl || 0)) : 0;
  const profitFactor = Math.abs(avgLoss) > 0 ? Math.abs(avgWin / avgLoss) : avgWin > 0 ? Infinity : 0;

  // P&L by pair
  const pnlByPair = closedTrades.reduce((acc, t) => {
    if (!acc[t.pair]) acc[t.pair] = { pair: t.pair, pnl: 0, trades: 0, wins: 0 };
    acc[t.pair].pnl += t.pnl || 0;
    acc[t.pair].trades++;
    if ((t.pnl || 0) > 0) acc[t.pair].wins++;
    return acc;
  }, {} as Record<string, { pair: string; pnl: number; trades: number; wins: number }>);

  // Today P&L
  const todayRealizedPnl = todayClosedTrades.reduce((s, t) => s + (t.pnl || 0), 0);
  const todayWins = todayClosedTrades.filter(t => (t.pnl || 0) > 0).length;
  const todayLosses = todayClosedTrades.filter(t => (t.pnl || 0) <= 0).length;

  // Toggle expanded card
  const toggleCard = (card: ExpandedCard) => {
    setExpandedCard(prev => prev === card ? null : card);
  };

  // ------- LOADING STATE -------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading CryptoBot...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">🤖</span> Live Trading Bot
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time data from your bot running on Railway &mdash; powered by Supabase
          </p>
          <p className="text-cyan-400 text-xs mt-1 font-mono">
            {settings?.strategy || 'day_trader'} ({settings?.mode?.toUpperCase() || 'PAPER'})
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-xs">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </p>
          <button
            onClick={fetchData}
            className="text-cyan-400 text-xs hover:text-cyan-300 mt-1 underline"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* STAT CARDS — clickable with expanded detail panels            */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* CARD 1: Portfolio Value */}
        <button
          onClick={() => toggleCard('portfolio')}
          className={`bg-crypto-card border rounded-lg p-4 text-left transition-all hover:border-cyan-500/50 ${expandedCard === 'portfolio' ? 'border-cyan-500 ring-1 ring-cyan-500/30' : 'border-crypto-border'}`}
        >
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
            Portfolio Value
            <span className="text-[10px]">{expandedCard === 'portfolio' ? '▲' : '▼'}</span>
          </p>
          <p className="text-xl font-bold text-white">{formatCurrency(portfolioValue)}</p>
          <p className="text-gray-500 text-xs mt-1">Cash: {formatCurrency(cashBalance)}</p>
        </button>

        {/* CARD 2: Realized P&L */}
        <button
          onClick={() => toggleCard('pnl')}
          className={`bg-crypto-card border rounded-lg p-4 text-left transition-all hover:border-cyan-500/50 ${expandedCard === 'pnl' ? 'border-cyan-500 ring-1 ring-cyan-500/30' : 'border-crypto-border'}`}
        >
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
            Realized P&amp;L
            <span className="text-[10px]">{expandedCard === 'pnl' ? '▲' : '▼'}</span>
          </p>
          <p className={`text-xl font-bold ${totalRealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalRealizedPnl >= 0 ? '+' : ''}{formatCurrency(totalRealizedPnl)}
          </p>
          <p className="text-gray-500 text-xs mt-1">{closedTrades.length} closed trade{closedTrades.length !== 1 ? 's' : ''}</p>
        </button>

        {/* CARD 3: Win Rate */}
        <button
          onClick={() => toggleCard('winrate')}
          className={`bg-crypto-card border rounded-lg p-4 text-left transition-all hover:border-cyan-500/50 ${expandedCard === 'winrate' ? 'border-cyan-500 ring-1 ring-cyan-500/30' : 'border-crypto-border'}`}
        >
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
            Win Rate
            <span className="text-[10px]">{expandedCard === 'winrate' ? '▲' : '▼'}</span>
          </p>
          <p className={`text-xl font-bold ${winRate >= 50 ? 'text-green-400' : winRate > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
            {winRate.toFixed(1)}%
          </p>
          <p className="text-gray-500 text-xs mt-1">{wins.length}W / {losses.length}L</p>
        </button>

        {/* CARD 4: Unrealized P&L */}
        <button
          onClick={() => toggleCard('unrealized')}
          className={`bg-crypto-card border rounded-lg p-4 text-left transition-all hover:border-cyan-500/50 ${expandedCard === 'unrealized' ? 'border-cyan-500 ring-1 ring-cyan-500/30' : 'border-crypto-border'}`}
        >
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
            Unrealized P&amp;L
            <span className="text-[10px]">{expandedCard === 'unrealized' ? '▲' : '▼'}</span>
          </p>
          <p className={`text-xl font-bold ${totalUnrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalUnrealizedPnl >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedPnl)}
          </p>
          <p className="text-gray-500 text-xs mt-1">{positions.length} open position{positions.length !== 1 ? 's' : ''}</p>
        </button>
      </div>

      {/* ============================================================ */}
      {/* EXPANDED DETAIL PANELS                                       */}
      {/* ============================================================ */}

      {/* PORTFOLIO VALUE — Expanded */}
      {expandedCard === 'portfolio' && (
        <div className="bg-crypto-card border border-cyan-500/30 rounded-lg p-5 animate-in fade-in duration-200">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span>📊</span> Portfolio Breakdown
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="bg-crypto-dark rounded-lg p-3">
              <p className="text-gray-500 text-xs">Initial Balance</p>
              <p className="text-white font-semibold">{formatCurrency(initialBalance)}</p>
            </div>
            <div className="bg-crypto-dark rounded-lg p-3">
              <p className="text-gray-500 text-xs">Current Cash</p>
              <p className="text-white font-semibold">{formatCurrency(cashBalance)}</p>
            </div>
            <div className="bg-crypto-dark rounded-lg p-3">
              <p className="text-gray-500 text-xs">In Positions</p>
              <p className="text-cyan-400 font-semibold">{formatCurrency(totalPositionValue)}</p>
            </div>
            <div className="bg-crypto-dark rounded-lg p-3">
              <p className="text-gray-500 text-xs">Overall Return</p>
              <p className={`font-semibold ${overallReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(overallReturn)}
              </p>
            </div>
          </div>

          {/* Portfolio composition bar */}
          <div className="mb-4">
            <p className="text-gray-400 text-xs mb-2">Portfolio Composition</p>
            <div className="w-full h-4 bg-crypto-dark rounded-full overflow-hidden flex">
              {portfolioValue > 0 && (
                <>
                  <div
                    className="h-full bg-green-500/70 transition-all"
                    style={{ width: `${(cashBalance / portfolioValue) * 100}%` }}
                    title={`Cash: ${formatCurrency(cashBalance)}`}
                  />
                  <div
                    className="h-full bg-cyan-500/70 transition-all"
                    style={{ width: `${(totalPositionValue / portfolioValue) * 100}%` }}
                    title={`Positions: ${formatCurrency(totalPositionValue)}`}
                  />
                </>
              )}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500/70 inline-block" /> Cash ({portfolioValue > 0 ? ((cashBalance / portfolioValue) * 100).toFixed(1) : 0}%)
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-500/70 inline-block" /> Invested ({portfolioValue > 0 ? ((totalPositionValue / portfolioValue) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          </div>

          {/* Position breakdown */}
          {positions.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs mb-2">Holdings by Coin</p>
              <div className="space-y-2">
                {positions.map(p => (
                  <div key={p.pair} className="flex items-center justify-between bg-crypto-dark rounded-lg px-3 py-2">
                    <span className="text-white text-sm font-medium">{p.symbol}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 text-sm">{formatCurrency(p.position_value)}</span>
                      <span className="text-gray-500 text-xs">
                        {portfolioValue > 0 ? ((p.position_value / portfolioValue) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* REALIZED P&L — Expanded */}
      {expandedCard === 'pnl' && (
        <div className="bg-crypto-card border border-cyan-500/30 rounded-lg p-5 animate-in fade-in duration-200">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span>💰</span> Realized P&amp;L Details
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="bg-crypto-dark rounded-lg p-3">
              <p className="text-gray-500 text-xs">Total Realized</p>
              <p className={`font-semibold ${totalRealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalRealizedPnl >= 0 ? '+' : ''}{formatCurrency(totalRealizedPnl)}
              </p>
            </div>
            <div className="bg-crypto-dark rounded-lg p-3">
              <p className="text-gray-500 text-xs">Today&apos;s P&amp;L</p>
              <p className={`font-semibold ${todayRealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {todayRealizedPnl >= 0 ? '+' : ''}{formatCurrency(todayRealizedPnl)}
              </p>
            </div>
            <div className="bg-crypto-dark rounded-lg p-3">
              <p className="text-gray-500 text-xs">Best Trade</p>
              <p className="text-green-400 font-semibold">+{formatCurrency(bestTrade)}</p>
            </div>
            <div className="bg-crypto-dark rounded-lg p-3">
              <p className="text-gray-500 text-xs">Worst Trade</p>
              <p className="text-red-400 font-semibold">{formatCurrency(worstTrade)}</p>
            </div>
          </div>

          {/* P&L by pair table */}
          {Object.keys(pnlByPair).length > 0 ? (
            <div>
              <p className="text-gray-400 text-xs mb-2">P&amp;L by Pair</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-crypto-border">
                      <th className="text-left py-2 px-2">Pair</th>
                      <th className="text-right py-2 px-2">Trades</th>
                      <th className="text-right py-2 px-2">Wins</th>
                      <th className="text-right py-2 px-2">Win Rate</th>
                      <th className="text-right py-2 px-2">P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(pnlByPair)
                      .sort((a, b) => b.pnl - a.pnl)
                      .map(row => (
                        <tr key={row.pair} className="border-b border-crypto-border/50">
                          <td className="py-2 px-2 text-white font-medium">{row.pair}</td>
                          <td className="py-2 px-2 text-right text-gray-400">{row.trades}</td>
                          <td className="py-2 px-2 text-right text-gray-400">{row.wins}</td>
                          <td className="py-2 px-2 text-right text-gray-400">
                            {row.trades > 0 ? ((row.wins / row.trades) * 100).toFixed(0) : 0}%
                          </td>
                          <td className={`py-2 px-2 text-right font-medium ${row.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {row.pnl >= 0 ? '+' : ''}{formatCurrency(row.pnl)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">No closed trades yet — P&amp;L breakdown will appear here.</p>
          )}
        </div>
      )}

      {/* WIN RATE — Expanded */}
      {expandedCard === 'winrate' && (
        <div className="bg-crypto-card border border-cyan-500/30 rounded-lg p-5 animate-in fade-in duration-200">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span>🎯</span> Win Rate &amp; Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="bg-crypto-dark rounded-lg p-3">
              <p className="text-gray-500 text-xs">Avg Win</p>
              <p className="text-green-400 font-semibold">+{formatCurrency(avgWin)}</p>
            </div>
            <div className="bg-crypto-dark rounded-lg p-3">
              <p className="text-gray-500 text-xs">Avg Loss</p>
              <p className="text-red-400 font-semibold">{formatCurrency(avgLoss)}</p>
            </div>
            <div className="bg-crypto-dark rounded-lg p-3">
              <p className="text-gray-500 text-xs">Profit Factor</p>
              <p className={`font-semibold ${profitFactor >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                {profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}
              </p>
            </div>
            <div className="bg-crypto-dark rounded-lg p-3">
              <p className="text-gray-500 text-xs">Total Closed</p>
              <p className="text-white font-semibold">{closedTrades.length}</p>
            </div>
          </div>

          {/* Today stats */}
          <div className="mb-5">
            <p className="text-gray-400 text-xs mb-2">Today&apos;s Performance</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-crypto-dark rounded-lg p-3 text-center">
                <p className="text-gray-500 text-xs">Trades</p>
                <p className="text-white font-semibold">{todayClosedTrades.length}</p>
              </div>
              <div className="bg-crypto-dark rounded-lg p-3 text-center">
                <p className="text-gray-500 text-xs">Wins</p>
                <p className="text-green-400 font-semibold">{todayWins}</p>
              </div>
              <div className="bg-crypto-dark rounded-lg p-3 text-center">
                <p className="text-gray-500 text-xs">Losses</p>
                <p className="text-red-400 font-semibold">{todayLosses}</p>
              </div>
            </div>
          </div>

          {/* Win/Loss visual bar */}
          {closedTrades.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs mb-2">Win / Loss Distribution</p>
              <div className="w-full h-6 bg-crypto-dark rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-green-500/70 flex items-center justify-center text-[10px] text-white font-bold transition-all"
                  style={{ width: `${winRate}%` }}
                >
                  {winRate > 15 ? `${wins.length}W` : ''}
                </div>
                <div
                  className="h-full bg-red-500/70 flex items-center justify-center text-[10px] text-white font-bold transition-all"
                  style={{ width: `${100 - winRate}%` }}
                >
                  {(100 - winRate) > 15 ? `${losses.length}L` : ''}
                </div>
              </div>
            </div>
          )}

          {closedTrades.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">No closed trades yet — win rate stats will appear here.</p>
          )}
        </div>
      )}

      {/* UNREALIZED P&L — Expanded */}
      {expandedCard === 'unrealized' && (
        <div className="bg-crypto-card border border-cyan-500/30 rounded-lg p-5 animate-in fade-in duration-200">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span>📈</span> Unrealized P&amp;L Breakdown
          </h3>

          {positions.length > 0 ? (
            <div className="space-y-3">
              {positions
                .sort((a, b) => b.unrealized_pnl - a.unrealized_pnl)
                .map(p => (
                  <div key={p.pair} className="bg-crypto-dark rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{p.symbol}</span>
                        <span className="text-gray-500 text-xs">{p.pair}</span>
                      </div>
                      <span className={`text-lg font-bold ${p.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {p.unrealized_pnl >= 0 ? '+' : ''}{formatCurrency(p.unrealized_pnl)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Entry:</span>{' '}
                        <span className="text-gray-300">{formatCurrency(p.entry_price)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Current:</span>{' '}
                        <span className="text-gray-300">{formatCurrency(p.current_price)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Qty:</span>{' '}
                        <span className="text-gray-300">{p.quantity.toFixed(6)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Value:</span>{' '}
                        <span className="text-gray-300">{formatCurrency(p.position_value)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Return:</span>{' '}
                        <span className={p.unrealized_pnl_percent >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {formatPercent(p.unrealized_pnl_percent)}
                        </span>
                      </div>
                    </div>
                    {/* Stop / TP info */}
                    <div className="flex gap-4 mt-2 text-xs">
                      {p.stop_loss_price ? (
                        <span className="text-red-400/70">SL: {formatCurrency(p.stop_loss_price)}</span>
                      ) : null}
                      {p.take_profit_price ? (
                        <span className="text-green-400/70">TP: {formatCurrency(p.take_profit_price)}</span>
                      ) : null}
                      {p.trailing_stop_price ? (
                        <span className="text-yellow-400/70">Trail: {formatCurrency(p.trailing_stop_price)}</span>
                      ) : null}
                      <span className="text-gray-600">Opened {timeAgo(p.opened_at)}</span>
                    </div>
                  </div>
                ))}

              {/* Total bar */}
              <div className="flex items-center justify-between bg-crypto-dark/50 rounded-lg px-4 py-3 border border-crypto-border">
                <span className="text-gray-400 text-sm font-medium">Total Unrealized</span>
                <span className={`text-lg font-bold ${totalUnrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalUnrealizedPnl >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedPnl)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">No open positions — unrealized P&amp;L will appear when the bot opens trades.</p>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TABS                                                         */}
      {/* ============================================================ */}
      <div className="border-b border-crypto-border">
        <div className="flex gap-1">
          {(['overview', 'positions', 'signals', 'trades'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB: OVERVIEW                                                */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-crypto-card border border-crypto-border rounded-lg p-4">
              <p className="text-gray-500 text-xs">Total Trades</p>
              <p className="text-white text-lg font-bold">{closedTrades.length}</p>
            </div>
            <div className="bg-crypto-card border border-crypto-border rounded-lg p-4">
              <p className="text-gray-500 text-xs">Avg Return</p>
              <p className={`text-lg font-bold ${closedTrades.length > 0 ? (totalRealizedPnl / closedTrades.length >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                {closedTrades.length > 0 ? formatCurrency(totalRealizedPnl / closedTrades.length) : '$0.00'}
              </p>
            </div>
            <div className="bg-crypto-card border border-crypto-border rounded-lg p-4">
              <p className="text-gray-500 text-xs">Best Trade</p>
              <p className="text-green-400 text-lg font-bold">+{formatCurrency(bestTrade)}</p>
            </div>
            <div className="bg-crypto-card border border-crypto-border rounded-lg p-4">
              <p className="text-gray-500 text-xs">Worst Trade</p>
              <p className="text-red-400 text-lg font-bold">{formatCurrency(worstTrade)}</p>
            </div>
          </div>

          {/* Overall return + config */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-crypto-card border border-crypto-border rounded-lg p-4">
              <p className="text-gray-500 text-xs mb-1">Overall Return</p>
              <p className={`text-2xl font-bold ${overallReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(overallReturn)}
              </p>
              <p className="text-gray-500 text-xs mt-1">from {formatCurrency(initialBalance)} initial balance</p>
            </div>
            <div className="bg-crypto-card border border-crypto-border rounded-lg p-4">
              <p className="text-gray-500 text-xs mb-2">Bot Configuration</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Mode</span>
                  <span className="text-white">{settings?.mode?.toUpperCase() || 'PAPER'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Strategy</span>
                  <span className="text-white">{settings?.strategy || 'day_trader'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pairs</span>
                  <span className="text-white">{settings?.selected_pairs?.length || 9}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Open Positions</span>
                  <span className="text-cyan-400">{positions.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: POSITIONS — kept exactly as user likes it               */}
      {/* ============================================================ */}
      {activeTab === 'positions' && (
        <div>
          <h3 className="text-white font-semibold mb-3">Open Positions ({positions.length})</h3>
          {positions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-crypto-border">
                    <th className="text-left py-2 px-2">Pair</th>
                    <th className="text-right py-2 px-2">Entry</th>
                    <th className="text-right py-2 px-2">Current</th>
                    <th className="text-right py-2 px-2">Take Profit</th>
                    <th className="text-right py-2 px-2">Stop Loss</th>
                    <th className="text-right py-2 px-2">Qty</th>
                    <th className="text-right py-2 px-2">Value</th>
                    <th className="text-right py-2 px-2">P&amp;L</th>
                    <th className="text-right py-2 px-2">P&amp;L %</th>
                    <th className="text-right py-2 px-2">Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map(p => (
                    <tr key={p.pair} className="border-b border-crypto-border/50 hover:bg-crypto-dark/30">
                      <td className="py-2 px-2 text-white font-medium">{p.pair}</td>
                      <td className="py-2 px-2 text-right text-gray-300">{formatCurrency(p.entry_price)}</td>
                      <td className="py-2 px-2 text-right text-gray-300">{formatCurrency(p.current_price)}</td>
                      <td className="py-2 px-2 text-right text-green-400/70 text-xs">
                        {p.take_profit_price ? formatCurrency(p.take_profit_price) : '—'}
                      </td>
                      <td className="py-2 px-2 text-right text-red-400/70 text-xs">
                        {p.stop_loss_price ? formatCurrency(p.stop_loss_price) : '—'}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-400 font-mono text-xs">{p.quantity.toFixed(6)}</td>
                      <td className="py-2 px-2 text-right text-gray-300">{formatCurrency(p.position_value)}</td>
                      <td className={`py-2 px-2 text-right font-medium ${p.unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {p.unrealized_pnl >= 0 ? '+' : ''}{formatCurrency(p.unrealized_pnl)}
                      </td>
                      <td className={`py-2 px-2 text-right ${p.unrealized_pnl_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPercent(p.unrealized_pnl_percent)}
                      </td>
                      <td className="py-2 px-2 text-right text-gray-500 text-xs">{timeAgo(p.opened_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-4xl mb-2">📭</p>
              <p className="text-gray-400">No open positions</p>
              <p className="text-gray-600 text-sm">Positions appear when the bot opens trades</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: SIGNALS                                                 */}
      {/* ============================================================ */}
      {activeTab === 'signals' && (
        <div>
          <h3 className="text-white font-semibold mb-3">Recent Signals ({signals.length})</h3>
          {signals.length > 0 ? (
            <div className="space-y-2">
              {signals.map((sig, i) => (
                <div key={sig.id || i} className="bg-crypto-card border border-crypto-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        sig.action === 'BUY' ? 'bg-green-500/20 text-green-400' :
                        sig.action === 'SELL' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {sig.action}
                      </span>
                      <span className="text-white font-medium text-sm">{sig.symbol}</span>
                      <span className="text-gray-500 text-xs">{sig.pair}</span>
                    </div>
                    <span className="text-gray-500 text-xs">{timeAgo(sig.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-400">Score: <span className="text-white">{sig.score}</span></span>
                    <span className="text-gray-400">Conf: <span className="text-white">{sig.confidence}%</span></span>
                    <span className="text-gray-400">Price: <span className="text-white">{formatCurrency(sig.current_price)}</span></span>
                    {sig.strategy && <span className="text-gray-400">Strategy: <span className="text-cyan-400">{sig.strategy}</span></span>}
                  </div>
                  {sig.adx !== undefined && (
                    <div className="flex items-center gap-4 text-xs mt-1">
                      {sig.adx !== undefined && <span className="text-gray-500">ADX: {sig.adx.toFixed(1)}</span>}
                      {sig.atr_percent !== undefined && <span className="text-gray-500">ATR: {sig.atr_percent.toFixed(2)}%</span>}
                      {sig.multi_timeframe_alignment !== undefined && <span className="text-gray-500">MTF: {sig.multi_timeframe_alignment.toFixed(0)}%</span>}
                      {sig.whale_flow !== undefined && <span className="text-gray-500">Whale: {sig.whale_flow.toFixed(0)}</span>}
                    </div>
                  )}
                  {sig.reasoning && sig.reasoning.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {sig.reasoning.slice(0, 3).map((r, idx) => (
                        <p key={idx}>• {r}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-4xl mb-2">📡</p>
              <p className="text-gray-400">No signals yet</p>
              <p className="text-gray-600 text-sm">Signals appear as the bot analyzes the market</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: TRADES — with Today / All filter                        */}
      {/* ============================================================ */}
      {activeTab === 'trades' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Trade History</h3>
            <div className="flex bg-crypto-dark rounded-lg overflow-hidden">
              <button
                onClick={() => setTradeFilter('today')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  tradeFilter === 'today' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setTradeFilter('all')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  tradeFilter === 'all' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                All Time
              </button>
            </div>
          </div>

          {(() => {
            const filteredTrades = tradeFilter === 'today' ? todayTrades : trades;
            const displayTrades = filteredTrades.sort(
              (a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()
            );

            if (displayTrades.length === 0) {
              return (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-4xl mb-2">🪙</p>
                  <p className="text-gray-400">
                    {tradeFilter === 'today' ? 'No trades today' : 'No trades yet'}
                  </p>
                  <p className="text-gray-600 text-sm">
                    Trades appear when the bot opens and closes positions
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-2">
                {displayTrades.map((trade, i) => (
                  <TradeCard key={trade.id || i} trade={trade} />
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ============================================================
// TRADE CARD SUB-COMPONENT
// ============================================================
function TradeCard({ trade }: { trade: BotTrade }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-crypto-card border border-crypto-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-left hover:bg-crypto-dark/30 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              trade.action === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {trade.action}
            </span>
            <span className="text-white font-medium text-sm">{trade.symbol}</span>
            <span className="text-gray-600 text-xs">{trade.strategy}</span>
            {trade.status === 'open' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-400 font-medium">OPEN</span>
            )}
            {trade.status === 'closed' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-500/20 text-gray-400 font-medium">CLOSED</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {trade.pnl !== undefined && trade.pnl !== null && trade.status === 'closed' && (
              <span className={`text-sm font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
              </span>
            )}
            <span className="text-gray-500 text-xs">{timeAgo(trade.opened_at)}</span>
            <span className="text-gray-600 text-xs">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-crypto-border p-3 bg-crypto-dark/20 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-500">Entry Price</span>
              <p className="text-gray-300">{formatCurrency(trade.entry_price)}</p>
            </div>
            {trade.exit_price && (
              <div>
                <span className="text-gray-500">Exit Price</span>
                <p className="text-gray-300">{formatCurrency(trade.exit_price)}</p>
              </div>
            )}
            <div>
              <span className="text-gray-500">Quantity</span>
              <p className="text-gray-300 font-mono">{trade.quantity.toFixed(6)}</p>
            </div>
            <div>
              <span className="text-gray-500">Position Size</span>
              <p className="text-gray-300">{formatCurrency(trade.position_value)}</p>
            </div>
            <div>
              <span className="text-gray-500">Score / Confidence</span>
              <p className="text-gray-300">{trade.score} / {trade.confidence}%</p>
            </div>
            {trade.stop_loss_price ? (
              <div>
                <span className="text-gray-500">Stop Loss</span>
                <p className="text-red-400/80">{formatCurrency(trade.stop_loss_price)}</p>
              </div>
            ) : null}
            {trade.take_profit_price ? (
              <div>
                <span className="text-gray-500">Take Profit</span>
                <p className="text-green-400/80">{formatCurrency(trade.take_profit_price)}</p>
              </div>
            ) : null}
            {trade.kelly_fraction !== undefined && trade.kelly_fraction !== null ? (
              <div>
                <span className="text-gray-500">Kelly</span>
                <p className="text-gray-300">{trade.kelly_fraction.toFixed(1)}%</p>
              </div>
            ) : null}
            {trade.exit_reason ? (
              <div>
                <span className="text-gray-500">Exit Reason</span>
                <p className="text-yellow-400">{trade.exit_reason}</p>
              </div>
            ) : null}
            {trade.pnl_percent !== undefined && trade.pnl_percent !== null ? (
              <div>
                <span className="text-gray-500">Return</span>
                <p className={trade.pnl_percent >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatPercent(trade.pnl_percent)}
                </p>
              </div>
            ) : null}
          </div>

          {trade.reasoning && trade.reasoning.length > 0 && (
            <div className="mt-2 pt-2 border-t border-crypto-border/50">
              <p className="text-gray-500 text-xs mb-1">Bot Reasoning</p>
              {trade.reasoning.map((r, idx) => (
                <p key={idx} className="text-gray-400 text-xs">• {r}</p>
              ))}
            </div>
          )}

          <div className="text-xs text-gray-600 mt-1">
            Opened: {new Date(trade.opened_at).toLocaleString()}
            {trade.closed_at && ` • Closed: ${new Date(trade.closed_at).toLocaleString()}`}
          </div>
        </div>
      )}
    </div>
  );
}
