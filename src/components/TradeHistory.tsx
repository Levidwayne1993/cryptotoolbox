// ============================================================
// FILE: src/components/TradeHistory.tsx (NEW FILE)
// Trade log component — shows all executed trades
// ============================================================

'use client';

import { useState } from 'react';
import { BotTrade } from '@/types';

interface TradeHistoryProps {
  trades: BotTrade[];
}

export default function TradeHistory({ trades }: TradeHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (trades.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-4xl mb-2">📜</div>
        <p className="text-sm">No trades yet</p>
        <p className="text-xs">
          Start the bot and trades will appear here in real-time.
        </p>
      </div>
    );
  }

  const filteredTrades = trades
    .filter((t) => {
      if (filter === 'wins') return (t.pnl || 0) > 0;
      if (filter === 'losses') return (t.pnl || 0) < 0;
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()
    );

  const wins = trades.filter((t) => (t.pnl || 0) > 0).length;
  const losses = trades.filter((t) => (t.pnl || 0) < 0).length;

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          All ({trades.length})
        </button>
        <button
          onClick={() => setFilter('wins')}
          className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
            filter === 'wins'
              ? 'bg-green-500/20 text-green-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          ✅ Wins ({wins})
        </button>
        <button
          onClick={() => setFilter('losses')}
          className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
            filter === 'losses'
              ? 'bg-red-500/20 text-red-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          ❌ Losses ({losses})
        </button>
      </div>

      {/* Trade list */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {filteredTrades.map((trade, idx) => {
          const isExpanded = expandedId === `${trade.coin_id}-${trade.opened_at}`;
          const pnl = trade.pnl || 0;
          const isWin = pnl > 0;
          const isBuy = trade.action === 'BUY';

          return (
            <div
              key={`${trade.coin_id}-${trade.opened_at}-${idx}`}
              className="bg-gray-900/50 rounded-xl border border-gray-700 overflow-hidden"
            >
              {/* Trade row */}
              <div
                className="p-3 cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() =>
                  setExpandedId(
                    isExpanded ? null : `${trade.coin_id}-${trade.opened_at}`
                  )
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Action badge */}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isBuy
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {isBuy ? 'BUY' : 'SELL'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {trade.coin_symbol}
                        </span>
                        <span className="text-[10px] text-gray-500 capitalize bg-gray-800 px-1.5 py-0.5 rounded">
                          {trade.strategy.replace('_', ' ')}
                        </span>
                        {trade.autonomous && (
                          <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                            🤖 Auto
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {new Date(trade.opened_at).toLocaleString()}
                        {trade.closed_at &&
                          ` → ${new Date(trade.closed_at).toLocaleTimeString()}`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {trade.status === 'closed' ? (
                      <>
                        <div
                          className="text-sm font-bold"
                          style={{
                            color: isWin ? '#10b981' : '#ef4444',
                          }}
                        >
                          {isWin ? '+' : ''}${pnl.toFixed(2)}
                        </div>
                        <div
                          className="text-[11px]"
                          style={{
                            color: isWin ? '#10b981' : '#ef4444',
                          }}
                        >
                          {(trade.pnl_percent || 0) >= 0 ? '+' : ''}
                          {(trade.pnl_percent || 0).toFixed(2)}%
                        </div>
                      </>
                    ) : (
                      <span className="text-xs text-amber-400">Open</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-800 pt-2 space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-gray-500">Entry Price</span>
                      <div className="text-white font-medium">
                        ${trade.entry_price.toLocaleString()}
                      </div>
                    </div>
                    {trade.exit_price && (
                      <div>
                        <span className="text-gray-500">Exit Price</span>
                        <div className="text-white font-medium">
                          ${trade.exit_price.toLocaleString()}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Quantity</span>
                      <div className="text-white font-medium">
                        {trade.quantity.toFixed(6)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Position Size</span>
                      <div className="text-white font-medium">
                        ${trade.position_value.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Score</span>
                      <div className="text-white font-medium">
                        {trade.score}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Confidence</span>
                      <div className="text-white font-medium">
                        {trade.confidence}%
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Stop Loss</span>
                      <div className="text-red-400 font-medium">
                        ${trade.stop_loss_price.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Take Profit</span>
                      <div className="text-green-400 font-medium">
                        ${trade.take_profit_price.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div className="bg-gray-800/50 rounded-lg p-2">
                    <div className="text-[10px] text-gray-500 font-semibold mb-1">
                      BOT REASONING
                    </div>
                    {trade.reasoning.map((reason, i) => (
                      <div key={i} className="text-[11px] text-gray-400 pl-2">
                        • {reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
