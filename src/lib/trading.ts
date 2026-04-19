import { Portfolio, Holding, Trade, CryptoPrice } from '@/types';

const STORAGE_KEY = 'cryptotoolbox_portfolio';
const DEFAULT_CASH = 10000;

export function getPortfolio(): Portfolio {
  if (typeof window === 'undefined') {
    return { cash: DEFAULT_CASH, startingCash: DEFAULT_CASH, holdings: [], trades: [] };
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { cash: DEFAULT_CASH, startingCash: DEFAULT_CASH, holdings: [], trades: [] };
  }
  try {
    return JSON.parse(stored);
  } catch {
    return { cash: DEFAULT_CASH, startingCash: DEFAULT_CASH, holdings: [], trades: [] };
  }
}

export function savePortfolio(portfolio: Portfolio): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
}

export function resetPortfolio(startingCash: number = DEFAULT_CASH): Portfolio {
  const portfolio: Portfolio = {
    cash: startingCash,
    startingCash: startingCash,
    holdings: [],
    trades: [],
  };
  savePortfolio(portfolio);
  return portfolio;
}

export function executeBuy(
  portfolio: Portfolio,
  coin: CryptoPrice,
  amount: number
): { portfolio: Portfolio; error?: string } {
  const total = amount * coin.current_price;
  
  if (total > portfolio.cash) {
    return { portfolio, error: 'Insufficient funds' };
  }
  
  if (amount <= 0) {
    return { portfolio, error: 'Amount must be greater than 0' };
  }

  const existing = portfolio.holdings.find(h => h.coinId === coin.id);
  
  if (existing) {
    const newTotalInvested = existing.totalInvested + total;
    const newAmount = existing.amount + amount;
    existing.amount = newAmount;
    existing.totalInvested = newTotalInvested;
    existing.avgBuyPrice = newTotalInvested / newAmount;
  } else {
    portfolio.holdings.push({
      coinId: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      image: coin.image,
      amount,
      avgBuyPrice: coin.current_price,
      totalInvested: total,
    });
  }

  portfolio.cash -= total;

  const trade: Trade = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    coinId: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    type: 'buy',
    amount,
    price: coin.current_price,
    total,
    timestamp: new Date().toISOString(),

  };
  portfolio.trades.unshift(trade);

  savePortfolio(portfolio);
  return { portfolio };
}

export function executeSell(
  portfolio: Portfolio,
  coin: CryptoPrice,
  amount: number
): { portfolio: Portfolio; error?: string } {
  const holding = portfolio.holdings.find(h => h.coinId === coin.id);
  
  if (!holding) {
    return { portfolio, error: 'You don\'t hold this coin' };
  }
  
  if (amount > holding.amount) {
    return { portfolio, error: `You only hold ${holding.amount} ${coin.symbol.toUpperCase()}` };
  }
  
  if (amount <= 0) {
    return { portfolio, error: 'Amount must be greater than 0' };
  }

  const total = amount * coin.current_price;
  
  const fractionSold = amount / holding.amount;
  holding.totalInvested -= holding.totalInvested * fractionSold;
  holding.amount -= amount;

  if (holding.amount < 0.00000001) {
    portfolio.holdings = portfolio.holdings.filter(h => h.coinId !== coin.id);
  }

  portfolio.cash += total;

  const trade: Trade = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    coinId: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    type: 'sell',
    amount,
    price: coin.current_price,
    total,
    timestamp: new Date().toISOString(),

  };
  portfolio.trades.unshift(trade);

  savePortfolio(portfolio);
  return { portfolio };
}

export function calculatePnL(holdings: Holding[], prices: CryptoPrice[]): {
  totalValue: number;
  totalInvested: number;
  totalPnL: number;
  totalPnLPercent: number;
} {
  let totalValue = 0;
  let totalInvested = 0;

  holdings.forEach(holding => {
    const price = prices.find(p => p.id === holding.coinId);
    if (price) {
      totalValue += holding.amount * price.current_price;
    }
    totalInvested += holding.totalInvested;
  });

  const totalPnL = totalValue - totalInvested;
  const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  return { totalValue, totalInvested, totalPnL, totalPnLPercent };
}

export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
}

export function formatNumber(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12)?.toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9)?.toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6)?.toFixed(2)}M`;
  return formatCurrency(value);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value?.toFixed(2)}%`;
}
