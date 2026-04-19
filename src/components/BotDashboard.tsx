// src/components/BotDashboard.tsx — Bot vs You scoreboard
'use client';

import { CryptoPrice, Portfolio, BotPortfolioData, BotSuggestion } from '@/types';
import { formatCurrency } from '@/lib/trading';
import { getBotPortfolioValue, getBotPnL } from '@/lib/bot-trading';

interface BotDashboardProps {
  userPortfolio: Portfolio;
  botPortfolio: BotPortfolioData;
  coins: CryptoPrice[];
  suggestions: BotSuggestion[];
}

export default function BotDashboard({ userPortfolio, botPortfolio, coins, suggestions }: BotDashboardProps) {
  let userHoldingsValue = 0;
  for (const h of userPortfolio.holdings) {
    const coin = coins.find(c => c.id === h.coinId);
    userHoldingsValue += coin ? h.amount * coin.current_price : h.totalInvested;
  }
  const userTotal = userPortfolio.cash + userHoldingsValue;
  const userPnLAmount = userTotal - userPortfolio.startingCash;
  const userPnLPct = userPortfolio.startingCash > 0 ? (userPnLAmount / userPortfolio.startingCash) * 100 : 0;
  const botTotal = getBotPortfolioValue(botPortfolio, coins);
  const botPnLData = getBotPnL(botPortfolio, coins);
  const userWinning = userPnLAmount > botPnLData.amount;
  const tied = Math.abs(userPnLAmount - botPnLData.amount) < 1;

  return (
    <div className="space-y-6">
      {/* Scoreboard */}
      <div className="bg-crypto-card border border-crypto-border rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4 text-center">
          {tied ? '\u{1F91D} Tied!' : userWinning ? '\u{1F3C6} You are winning!' : '\u{1F916} Bot is winning!'}
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div className={`rounded-lg p-4 border-2 ${userWinning && !tied ? 'border-crypto-green bg-crypto-green/5' : 'border-crypto-border'}`}>
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">You</div>
              <div className="text-2xl font-bold">{formatCurrency(userTotal)}</div>
              <div className={`text-sm font-medium mt-1 ${userPnLAmount >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
                {userPnLAmount >= 0 ? '+' : ''}{formatCurrency(userPnLAmount)} ({userPnLPct >= 0 ? '+' : ''}{userPnLPct.toFixed(2)}%)
              </div>
              <div className="text-xs text-gray-500 mt-2">{userPortfolio.holdings.length} holdings | {userPortfolio.trades.length} trades</div>
            </div>
          </div>
          <div className={`rounded-lg p-4 border-2 ${!userWinning && !tied ? 'border-crypto-accent bg-crypto-accent/5' : 'border-crypto-border'}`}>
            <div className="text-center">
              <div className="text-sm text-gray-400 mb-1">{'\u{1F916}'} CryptoBot</div>
              <div className="text-2xl font-bold">{formatCurrency(botTotal)}</div>
              <div className={`text-sm font-medium mt-1 ${botPnLData.amount >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
                {botPnLData.amount >= 0 ? '+' : ''}{formatCurrency(botPnLData.amount)} ({botPnLData.percent >= 0 ? '+' : ''}{botPnLData.percent.toFixed(2)}%)
              </div>
              <div className="text-xs text-gray-500 mt-2">{botPortfolio.holdings.length} holdings | {botPortfolio.trades.length} trades</div>
            </div>
          </div>
        </div>
        <div className="text-center mt-4 text-xs text-gray-500">
          Difference: {formatCurrency(Math.abs(userPnLAmount - botPnLData.amount))} | Started with {formatCurrency(userPortfolio.startingCash)} each
        </div>
      </div>

      {/* Bot Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">{'\u{1F916}'} Bot Suggestions for You</h3>
          <p className="text-xs text-gray-500 mb-4">Based on current market analysis. Not financial advice.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((s) => (
              <div key={s.coinId} className="bg-crypto-dark rounded-lg p-4 border border-crypto-border">
                <div className="flex items-center gap-3 mb-2">
                  {s.image && <img src={s.image} alt={s.name} className="w-6 h-6 rounded-full" />}
                  <span className="font-bold">{s.symbol.toUpperCase()}</span>
                  <span className={`ml-auto px-2 py-0.5 rounded text-xs font-bold ${
                    s.action === 'BUY' ? 'bg-crypto-green/20 text-crypto-green' :
                    s.action === 'SELL' ? 'bg-crypto-red/20 text-crypto-red' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>{s.action}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    s.confidence === 'HIGH' ? 'bg-yellow-500/20 text-yellow-400' :
                    s.confidence === 'MEDIUM' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>{s.confidence}</span>
                </div>
                <div className="text-sm text-gray-400 mb-1">{formatCurrency(s.currentPrice)}</div>
                <ul className="text-xs text-gray-500 space-y-0.5">
                  {s.reasons.slice(0, 3).map((r, i) => <li key={i}>- {r}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bot Holdings */}
      {botPortfolio.holdings.length > 0 && (
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">{'\u{1F916}'} Bot Holdings</h3>
          <div className="space-y-2">
            {botPortfolio.holdings.map((h) => {
              const coin = coins.find(c => c.id === h.coinId);
              const cv = coin ? h.amount * coin.current_price : h.totalInvested;
              const pnl = cv - h.totalInvested;
              const pp = h.totalInvested > 0 ? (pnl / h.totalInvested) * 100 : 0;
              return (
                <div key={h.coinId} className="flex items-center justify-between bg-crypto-dark rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    {h.image && <img src={h.image} alt={h.name} className="w-5 h-5 rounded-full" />}
                    <span className="font-medium">{h.symbol.toUpperCase()}</span>
                    <span className="text-sm text-gray-500">{h.amount.toFixed(6)}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">{formatCurrency(cv)}</div>
                    <div className={`text-xs ${pnl >= 0 ? 'text-crypto-green' : 'text-crypto-red'}`}>
                      {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)} ({pp.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-sm text-gray-500">Cash reserve: {formatCurrency(botPortfolio.cash)}</div>
        </div>
      )}

      {/* Bot Trade History */}
      {botPortfolio.trades.length > 0 && (
        <div className="bg-crypto-card border border-crypto-border rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">{'\u{1F916}'} Bot Trade History</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {[...botPortfolio.trades].reverse().slice(0, 20).map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-crypto-dark rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    t.type === 'buy' ? 'bg-crypto-green/20 text-crypto-green' : 'bg-crypto-red/20 text-crypto-red'
                  }`}>{t.type.toUpperCase()}</span>
                  <span className="font-medium">{t.symbol.toUpperCase()}</span>
                </div>
                <div className="text-right">
                  <div>{formatCurrency(t.total)}</div>
                  <div className="text-xs text-gray-500">{t.reason}</div>
                  <div className="text-xs text-gray-600">
                    {new Date(t.timestamp).toLocaleDateString('en-US')} {new Date(t.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-600 text-center">
            {botPortfolio.totalAnalyses} analyses run | Last: {botPortfolio.lastAnalysisTime ? new Date(botPortfolio.lastAnalysisTime).toLocaleString('en-US') : 'Never'}
          </div>
        </div>
      )}
    </div>
  );
}
