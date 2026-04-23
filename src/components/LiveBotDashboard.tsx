'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface BotSignal {
  id: string;
  pair: string;
  signal: string;
  strategy: string;
  confidence: number;
  price: number;
  indicators: any;
  created_at: string;
}

interface BotTrade {
  id: string;
  pair: string;
  side: string;
  price: number;
  amount: number;
  cost: number;
  pnl: number;
  pnl_pct: number;
  strategy: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
}

interface BotPosition {
  id: string;
  pair: string;
  side: string;
  entry_price: number;
  amount: number;
  current_price: number;
  pnl: number;
  pnl_pct: number;
  strategy: string;
  opened_at: string;
}

interface BotSettings {
  id: string;
  mode: string;
  strategy: string;
  current_balance: number;
  pairs: string[];
  updated_at: string;
}

export default function LiveBotDashboard() {
  const [signals, setSignals] = useState<BotSignal[]>([]);
  const [trades, setTrades] = useState<BotTrade[]>([]);
  const [positions, setPositions] = useState<BotPosition[]>([]);
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'positions' | 'signals' | 'trades'>('overview');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const closedTrades = trades.filter(t => t.status === 'closed');
  const winningTrades = closedTrades.filter(t => t.pnl > 0);
  const losingTrades = closedTrades.filter(t => t.pnl < 0);
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
  const totalRealizedPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + (p.pnl || 0), 0);
  const positionValue = positions.reduce((sum, p) => sum + (p.current_price || 0) * (p.amount || 0), 0);
  const balance = settings?.current_balance || 0;
  const totalValue = balance + positionValue;

  return (
    <div className="space-y-6">
      {/* TOP STATUS BAR */}
      <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl bg-green-500/20 animate-pulse">
                ðŸ¤–
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 bg-green-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {settings?.strategy === 'swing' ? 'ðŸŒŠ Swing Trader' : settings?.strategy || 'Bot'}
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  {settings?.mode?.toUpperCase() || 'PAPER'}
                </span>
              </div>
              <p className="text-xs text-gray-400">Running on Railway â€¢ Auto-refreshes every 30s</p>
              <p className="text-[10px] text-gray-500">Last refresh: {lastRefresh.toLocaleTimeString()}</p>
            </div>
          </div>
          <button onClick={fetchData} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded-lg transition-colors">
            ðŸ”„ Refresh Now
          </button>
        </div>
      </div>

      {/* PORTFOLIO SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Portfolio Value" value={`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub={`Cash: $${balance.toLocaleString()}`} color="white" />
        <StatCard label="Realized P&L" value={`${totalRealizedPnl >= 0 ? '+' : ''}$${totalRealizedPnl.toFixed(2)}`} sub={`${closedTrades.length} closed trades`} color={totalRealizedPnl >= 0 ? '#10b981' : '#ef4444'} />
        <StatCard label="Win Rate" value={`${winRate.toFixed(1)}%`} sub={`${winningTrades.length}W / ${losingTrades.length}L`} color={winRate >= 50 ? '#10b981' : '#f59e0b'} />
        <StatCard label="Unrealized P&L" value={`${totalUnrealizedPnl >= 0 ? '+' : ''}$${totalUnrealizedPnl.toFixed(2)}`} sub={`${positions.length} open positions`} color={totalUnrealizedPnl >= 0 ? '#10b981' : '#ef4444'} />
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-gray-800/50 p-1 rounded-xl">
        {(['overview', 'positions', 'signals', 'trades'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg transition-colors capitalize ${activeTab === tab ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'}`}>
            {tab === 'overview' && 'ðŸ“Š '}{tab === 'positions' && 'ðŸ’¼ '}{tab === 'signals' && 'ðŸ“¡ '}{tab === 'trades' && 'ðŸ“œ '}{tab}
            {tab === 'positions' && positions.length > 0 && (<span className="ml-1 bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full text-[10px]">{positions.length}</span>)}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-4">
        {activeTab === 'overview' && <OverviewTab settings={settings} closedTrades={closedTrades} totalRealizedPnl={totalRealizedPnl} positions={positions} />}
        {activeTab === 'positions' && <PositionsTab positions={positions} />}
        {activeTab === 'signals' && <SignalsTab signals={signals} />}
        {activeTab === 'trades' && <TradesTab trades={trades} />}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-[11px] text-gray-400">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, color = '#fff' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-gray-900/30 rounded-lg p-2">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className="text-sm font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function OverviewTab({ settings, closedTrades, totalRealizedPnl, positions }: { settings: BotSettings | null; closedTrades: BotTrade[]; totalRealizedPnl: number; positions: BotPosition[] }) {
  const bestTrade = closedTrades.length > 0 ? Math.max(...closedTrades.map(t => t.pnl || 0)) : 0;
  const worstTrade = closedTrades.length > 0 ? Math.min(...closedTrades.map(t => t.pnl || 0)) : 0;
  const avgReturn = closedTrades.length > 0 ? totalRealizedPnl / closedTrades.length : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Total Trades" value={closedTrades.length.toString()} />
        <MiniStat label="Avg Return" value={`$${avgReturn.toFixed(2)}`} />
        <MiniStat label="Best Trade" value={`+$${bestTrade.toFixed(2)}`} color="#10b981" />
        <MiniStat label="Worst Trade" value={`$${worstTrade.toFixed(2)}`} color="#ef4444" />
      </div>
      <div className="bg-gray-900/50 rounded-xl p-3">
        <h4 className="text-sm font-bold text-white mb-2">âš™ï¸ Bot Configuration</h4>
        <div className="flex flex-wrap gap-4 text-[11px] text-gray-500">
          <span>Mode: <strong className="text-amber-400">{settings?.mode?.toUpperCase()}</strong></span>
          <span>Strategy: <strong className="text-cyan-400">{settings?.strategy}</strong></span>
          <span>Pairs: <strong className="text-white">{settings?.selected_pairs?.join(', ') || 'N/A'}</strong></span>
          <span>Open Positions: <strong className="text-white">{positions.length}</strong></span>
        </div>
      </div>
    </div>
  );
}

function PositionsTab({ positions }: { positions: BotPosition[] }) {
  if (positions.length === 0) {
    return (<div className="text-center py-12 text-gray-500"><div className="text-4xl mb-2">ðŸ’¼</div><p className="text-sm">No open positions</p><p className="text-xs">The bot will open positions when it finds strong signals.</p></div>);
  }
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400 mb-2">{positions.length} open position{positions.length > 1 ? 's' : ''}</div>
      {positions.map((pos) => (
        <div key={pos.id} className="bg-gray-900/50 rounded-xl p-3 border border-gray-700">
          <div className="flex items-center justify-between">
            <div><div className="font-bold text-white text-sm">{pos.pair}</div><div className="text-[10px] text-gray-500">{pos.side.toUpperCase()} â€¢ {pos.strategy}</div></div>
            <div className="text-right">
              <div className="text-sm font-bold" style={{ color: (pos.pnl || 0) >= 0 ? '#10b981' : '#ef4444' }}>{(pos.pnl || 0) >= 0 ? '+' : ''}${(pos.pnl || 0).toFixed(2)}</div>
              <div className="text-[11px]" style={{ color: (pos.pnl_pct || 0) >= 0 ? '#10b981' : '#ef4444' }}>{(pos.pnl_pct || 0) >= 0 ? '+' : ''}{(pos.pnl_pct || 0).toFixed(2)}%</div>
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
            <span>Entry: <strong className="text-gray-300">${pos.entry_price?.toLocaleString()}</strong></span>
            <span>Current: <strong className="text-gray-300">${pos.current_price?.toLocaleString()}</strong></span>
            <span>Amount: <strong className="text-gray-300">{pos.amount}</strong></span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SignalsTab({ signals }: { signals: BotSignal[] }) {
  if (signals.length === 0) {
    return (<div className="text-center py-12 text-gray-500"><div className="text-4xl mb-2">ðŸ“¡</div><p className="text-sm">No signals yet</p><p className="text-xs">Signals will appear as the bot analyzes markets.</p></div>);
  }
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400 mb-2">Latest {signals.length} signals</div>
      {signals.map((sig) => (
        <div key={sig.id} className="bg-gray-900/50 rounded-xl p-3 border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-1 rounded ${sig.signal === 'BUY' ? 'bg-green-500/20 text-green-400' : sig.signal === 'SELL' ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'}`}>{sig.signal}</span>
              <div><div className="font-bold text-white text-sm">{sig.pair}</div><div className="text-[10px] text-gray-500">{sig.strategy}</div></div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white">${sig.price?.toLocaleString()}</div>
              <div className="text-[10px] text-gray-500">Confidence: <strong className="text-cyan-400">{((sig.confidence || 0) * 100).toFixed(0)}%</strong></div>
            </div>
          </div>
          <div className="text-[10px] text-gray-600 mt-1">{new Date(sig.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

function TradesTab({ trades }: { trades: BotTrade[] }) {
  if (trades.length === 0) {
    return (<div className="text-center py-12 text-gray-500"><div className="text-4xl mb-2">ðŸ“œ</div><p className="text-sm">No trades yet</p><p className="text-xs">Trades will appear when the bot executes orders.</p></div>);
  }
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400 mb-2">{trades.length} trades</div>
      {trades.map((trade) => (
        <div key={trade.id} className="bg-gray-900/50 rounded-xl p-3 border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-1 rounded ${trade.side === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{trade.side.toUpperCase()}</span>
              <div><div className="font-bold text-white text-sm">{trade.pair}</div><div className="text-[10px] text-gray-500">{trade.strategy} â€¢ {trade.status}</div></div>
            </div>
            <div className="text-right">
              {trade.pnl != null ? (
                <><div className="text-sm font-bold" style={{ color: trade.pnl >= 0 ? '#10b981' : '#ef4444' }}>{trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}</div>
                <div className="text-[10px]" style={{ color: (trade.pnl_pct || 0) >= 0 ? '#10b981' : '#ef4444' }}>{(trade.pnl_pct || 0) >= 0 ? '+' : ''}{(trade.pnl_pct || 0).toFixed(2)}%</div></>
              ) : (<div className="text-sm text-gray-400">${trade.price?.toLocaleString()}</div>)}
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
            <span>Price: <strong className="text-gray-300">${trade.price?.toLocaleString()}</strong></span>
            <span>Amount: <strong className="text-gray-300">{trade.amount}</strong></span>
            <span>{new Date(trade.opened_at).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
