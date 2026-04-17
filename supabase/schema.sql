-- ============================================
-- CryptoToolbox Schema (ct_ prefix for shared DB)
-- ============================================

-- News articles cached from Reddit/sources
CREATE TABLE IF NOT EXISTS ct_news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  thumbnail TEXT,
  sentiment TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ct_news_created ON ct_news(created_at DESC);
CREATE INDEX idx_ct_news_sentiment ON ct_news(sentiment);

-- Price alerts set by users
CREATE TABLE IF NOT EXISTS ct_price_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  coin_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  target_price NUMERIC NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('above', 'below')),
  triggered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  triggered_at TIMESTAMPTZ
);

CREATE INDEX idx_ct_alerts_user ON ct_price_alerts(user_id);
CREATE INDEX idx_ct_alerts_coin ON ct_price_alerts(coin_id);
CREATE INDEX idx_ct_alerts_active ON ct_price_alerts(triggered) WHERE triggered = FALSE;

-- Cached signals for faster loading
CREATE TABLE IF NOT EXISTS ct_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coin_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  image TEXT,
  signal TEXT NOT NULL CHECK (signal IN ('BUY', 'SELL', 'HOLD')),
  strength INTEGER NOT NULL,
  rsi NUMERIC,
  price_change_24h NUMERIC,
  price_change_7d NUMERIC,
  volume_change NUMERIC,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ct_signals_coin ON ct_signals(coin_id);
CREATE INDEX idx_ct_signals_signal ON ct_signals(signal);
CREATE INDEX idx_ct_signals_created ON ct_signals(created_at DESC);

-- Watchlist items
CREATE TABLE IF NOT EXISTS ct_watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  coin_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, coin_id)
);

CREATE INDEX idx_ct_watchlist_user ON ct_watchlist(user_id);

-- Row Level Security
ALTER TABLE ct_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_watchlist ENABLE ROW LEVEL SECURITY;

-- Public read access for news and signals
CREATE POLICY "Public read ct_news" ON ct_news FOR SELECT USING (true);
CREATE POLICY "Public read ct_signals" ON ct_signals FOR SELECT USING (true);
CREATE POLICY "Public read ct_watchlist" ON ct_watchlist FOR SELECT USING (true);
CREATE POLICY "Public read ct_price_alerts" ON ct_price_alerts FOR SELECT USING (true);

-- Service role write access
CREATE POLICY "Service write ct_news" ON ct_news FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write ct_signals" ON ct_signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write ct_watchlist" ON ct_watchlist FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write ct_price_alerts" ON ct_price_alerts FOR ALL USING (true) WITH CHECK (true);
