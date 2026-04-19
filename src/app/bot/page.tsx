// src/app/bot/page.tsx — Bot vs You Challenge Page
'use client';

import { useState, useEffect, useCallback } from 'react';
import { CryptoPrice, MarketStats, Portfolio, BotPortfolioData, BotSuggestion } from '@/types';
import { getPortfolio, formatCurrency } from '@/lib/trading';
import {
  getBotPortfolio, resetBotPortfolio, runBotAnalysis,
  getBotSuggestions, getBotPortfolioValue,
} from '@/lib/bot-trading';
import BotDashboard from '@/components/BotDashboard';

export default function BotPage() {
  const [coins, setCoins] = useState<CryptoPrice[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [userPortfolio, setUserPortfolio] = useState<Portfolio>(getPortfolio());
  const [botPortfolio, setBotPortfolio] = useState<BotPortfolioData>(getBotPortfolio());
  const [suggestions, setSuggestions] = useState<BotSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastTradeCount, setLastTradeCount] = useState(0);
  const [showReset, setShowReset] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [priceRes, globalRes] = await Promise.all([
        fetch('/api/prices'), fetch('/api/prices?type=global'),
      ]);
      const priceData = await priceRes.json();
      const globalData = await globalRes.json();
      if (Array.isArray(priceData)) setCoins(priceData);
      if (globalData && !Array.isArray(globalData)) setMarketStats(globalData);
    } catch (err) { console.error('Failed to fetch:', err); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 60000); return () => clearInterval(i); }, [fetchData]);
  useEffect(() => { setUserPortfolio(getPortfolio()); }, [coins]);

  const runBot = useCallback(() => {
    if (coins.length === 0) return;
    setAnalyzing(true);
    setTimeout(() => {
      const result = runBotAnalysis(coins, marketStats, botPortfolio);
      setBotPortfolio(result.portfolio);
      setLastTradeCount(result.trades.length);
      setSuggestions(getBotSuggestions(coins, marketStats, userPortfolio));
      setAnalyzing(false);
    }, 500);
  }, [coins, marketStats, botPortfolio, userPortfolio]);

  useEffect(() => {
    if (coins.length > 0 && !analyzing) {
      runBot();
      const i = setInterval(runBot, 300000);
      return () => clearInterval(i);
    }
  }, [coins.length > 0]);

  const handleReset = () => {
    setBotPortfolio(resetBotPortfolio(userPortfolio.startingCash));
    setShowReset(false); setSuggestions([]); setLastTradeCount(0);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crypto-accent mx-auto mb-4"></div>
        <p className="text-gray-400">Loading market data...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{'\u{1F916}'} Bot vs You</h1>
          <p className="text-gray-400 mt-1">Can you beat the algorithm? Both started with {formatCurrency(botPortfolio.startingCash)}.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={runBot} disabled={analyzing}
            className="px-4 py-2 bg-crypto-accent hover:bg-crypto-accent/80 rounded-lg font-medium transition-all disabled:opacity-50">
            {analyzing ? '\u{2699}\u{FE0F} Analyzing...' : '\u{1F9E0} Run Bot Analysis'}
          </button>
          <button onClick={() => setShowReset(!showReset)}
            className="px-4 py-2 bg-crypto-border hover:bg-gray-600 rounded-lg text-sm transition-all">
            {'\u{1F504}'} Reset Bot
          </button>
        </div>
      </div>

      {showReset && (
        <div className="bg-crypto-red/10 border border-crypto-red/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm">Reset bot to {formatCurrency(userPortfolio.startingCash)}? All bot trades cleared.</span>
          <div className="flex gap-2">
            <button onClick={handleReset} className="px-3 py-1.5 bg-crypto-red rounded text-sm font-medium">Yes, Reset</button>
            <button onClick={() => setShowReset(false)} className="px-3 py-1.5 bg-crypto-border rounded text-sm">Cancel</button>
          </div>
        </div>
      )}

      {lastTradeCount > 0 && (
        <div className="bg-crypto-accent/10 border border-crypto-accent/30 rounded-xl p-4 text-sm">
          {'\u{26A1}'} Bot made <strong>{lastTradeCount}</strong> trade{lastTradeCount > 1 ? 's' : ''} in its last analysis.
        </div>
      )}

      <BotDashboard userPortfolio={userPortfolio} botPortfolio={botPortfolio} coins={coins} suggestions={suggestions} />

      <div className="bg-crypto-card border border-crypto-border rounded-xl p-6">
        <h3 className="text-lg font-bold mb-3">{'\u{1F4CA}'} How the Bot Thinks</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
          <div>
            <h4 className="text-white font-medium mb-2">Analysis Factors</h4>
            <ul className="space-y-1">
              <li>- RSI (Relative Strength Index)</li>
              <li>- 24h price momentum</li>
              <li>- 7-day trend direction</li>
              <li>- Volume spike detection</li>
              <li>- Market cap stability rank</li>
              <li>- Fear & Greed contrarian signals</li>
              <li>- 24h high/low range position</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Risk Management</h4>
            <ul className="space-y-1">
              <li>- Max 20% of portfolio per position</li>
              <li>- Max 5 simultaneous holdings</li>
              <li>- 12% stop-loss (auto-sell on dips)</li>
              <li>- 18% take-profit (lock in gains)</li>
              <li>- 10% cash reserve always maintained</li>
              <li>- Score threshold: only acts on strong signals</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-4">Disclaimer: Paper trading with fake money. Not financial advice.</p>
      </div>
    </div>
  );
}
