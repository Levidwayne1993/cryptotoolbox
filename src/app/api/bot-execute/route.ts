// ============================================================
// FILE: src/app/api/bot-execute/route.ts (NEW FILE)
// Server-side autonomous bot execution endpoint
// Called by Vercel Cron OR manually by the client
// This is what makes the bot trade when the user is OFFLINE
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  BotSettings,
  BotTrade,
  BotPosition,
  BotExecutionResult,
  AnalysisResult,
  StrategyType,
} from '@/types';
import { getStrategy } from '@/lib/strategies';
import {
  fetchMarketData,
  analyzeCoin,
  shouldExecuteTrade,
  createBuyTrade,
  createSellTrade,
  checkExitConditions,
  updateTrailingStop,
} from '@/lib/bot-engine';

// ── Supabase Admin Client (server-side) ─────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase env vars');
  }
  return createClient(url, key);
}

// ── Verify Cron Secret (security) ───────────────────────────

function verifyCronAuth(req: NextRequest): boolean {
  // Vercel Cron sends this header automatically
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // If no secret configured, allow (development)
  if (!cronSecret) return true;

  return authHeader === `Bearer ${cronSecret}`;
}

// ── GET: Cron trigger (Vercel calls this on schedule) ───────

export async function GET(req: NextRequest) {
  // Verify this is a legitimate cron call
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();

    // 1. Get all active bot settings with autonomous mode ON
    const { data: allSettings, error: settingsError } = await supabase
      .from('bot_settings')
      .select('*')
      .eq('enabled', true)
      .eq('autonomous_enabled', true);

    if (settingsError || !allSettings || allSettings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active autonomous bots',
        bots_processed: 0,
      });
    }

    const results: BotExecutionResult[] = [];

    // 2. Process each active bot
    for (const settings of allSettings) {
      try {
        const result = await executeBot(supabase, settings as BotSettings);
        results.push(result);
      } catch (err: any) {
        results.push({
          success: false,
          strategy: settings.strategy,
          analyses: [],
          trades_executed: [],
          errors: [err.message || 'Unknown error'],
          timestamp: new Date().toISOString(),
          next_run: 'scheduled',
        });
      }
    }

    // 3. Log execution
    await supabase.from('bot_logs').insert({
      event: 'cron_execution',
      data: {
        bots_processed: results.length,
        trades_total: results.reduce(
          (sum, r) => sum + r.trades_executed.length,
          0
        ),
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      bots_processed: results.length,
      results,
    });
  } catch (err: any) {
    console.error('Bot execution error:', err);
    return NextResponse.json(
      { error: err.message || 'Execution failed' },
      { status: 500 }
    );
  }
}

// ── POST: Manual trigger or registration ────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Handle registration (when user enables autonomous mode from client)
    if (body.action === 'register') {
      const supabase = getSupabase();

      // Upsert bot settings to Supabase
      const { error } = await supabase.from('bot_settings').upsert(
        {
          user_id: body.settings.user_id || 'local_user',
          enabled: body.settings.enabled,
          strategy: body.settings.strategy,
          mode: body.settings.mode,
          initial_balance: body.settings.initial_balance,
          current_balance: body.settings.current_balance,
          selected_coins: body.settings.selected_coins,
          autonomous_enabled: true,
          max_daily_trades: body.settings.max_daily_trades,
          daily_loss_limit_percent: body.settings.daily_loss_limit_percent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        return NextResponse.json(
          { error: 'Failed to register: ' + error.message },
          { status: 500 }
        );
      }

      // Also sync positions
      if (body.positions && body.positions.length > 0) {
        // Clear old positions and insert current
        await supabase
          .from('bot_positions')
          .delete()
          .eq('user_id', body.settings.user_id || 'local_user');

        await supabase.from('bot_positions').insert(
          body.positions.map((p: any) => ({
            user_id: body.settings.user_id || 'local_user',
            ...p,
          }))
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Autonomous mode registered',
      });
    }

    // Handle manual execution trigger
    if (body.action === 'execute') {
      const supabase = getSupabase();
      const settings = body.settings as BotSettings;
      const result = await executeBot(supabase, settings);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Request failed' },
      { status: 500 }
    );
  }
}

// ── CORE BOT EXECUTION ──────────────────────────────────────

async function executeBot(
  supabase: any,
  settings: BotSettings
): Promise<BotExecutionResult> {
  const strategy = getStrategy(settings.strategy);
  const errors: string[] = [];
  const executedTrades: BotTrade[] = [];
  const analyses: AnalysisResult[] = [];

  try {
    // 1. Fetch current market data
    const marketData = await fetchMarketData(settings.selected_coins);

    // 2. Load current positions from DB
    const { data: dbPositions } = await supabase
      .from('bot_positions')
      .select('*')
      .eq('user_id', settings.user_id);

    let positions: BotPosition[] = dbPositions || [];

    // 3. Load recent trades for cooldown checks
    const { data: dbTrades } = await supabase
      .from('bot_trades')
      .select('*')
      .eq('user_id', settings.user_id)
      .order('opened_at', { ascending: false })
      .limit(100);

    const recentTrades: BotTrade[] = dbTrades || [];

    // 4. Check exit conditions on existing positions
    for (const position of [...positions]) {
      const coin = marketData.prices.find((p) => p.id === position.coin_id);
      if (!coin) continue;

      // Update trailing stop
      const updatedPosition = updateTrailingStop(
        position,
        coin.current_price,
        strategy
      );

      // Check SL/TP/trailing
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
          settings,
          strategy,
          exitCheck.reason
        );
        sellTrade.autonomous = true;

        // Update balance
        settings.current_balance +=
          coin.current_price * updatedPosition.quantity;

        // Save trade to DB
        await supabase.from('bot_trades').insert(sellTrade);
        executedTrades.push(sellTrade);

        // Remove position
        positions = positions.filter(
          (p) => p.coin_id !== position.coin_id
        );
        await supabase
          .from('bot_positions')
          .delete()
          .eq('user_id', settings.user_id)
          .eq('coin_id', position.coin_id);

        analyses.push({ ...analysis, action: 'SELL' });
      } else {
        // Update position in DB (trailing stop, current price)
        await supabase
          .from('bot_positions')
          .update({
            current_price: coin.current_price,
            position_value: coin.current_price * updatedPosition.quantity,
            unrealized_pnl:
              (coin.current_price - updatedPosition.entry_price) *
              updatedPosition.quantity,
            unrealized_pnl_percent:
              ((coin.current_price - updatedPosition.entry_price) /
                updatedPosition.entry_price) *
              100,
            highest_price: Math.max(
              updatedPosition.highest_price,
              coin.current_price
            ),
            trailing_stop_price: updatedPosition.trailing_stop_price,
          })
          .eq('user_id', settings.user_id)
          .eq('coin_id', position.coin_id);
      }
    }

    // 5. Analyze coins for new entries
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

      const { execute } = shouldExecuteTrade(
        analysis,
        settings,
        positions,
        recentTrades,
        strategy
      );

      if (!execute) continue;

      if (analysis.action === 'BUY') {
        const trade = createBuyTrade(analysis, settings, strategy);
        trade.autonomous = true;

        // Update balance
        settings.current_balance -= trade.position_value;

        // Save trade
        await supabase.from('bot_trades').insert(trade);
        executedTrades.push(trade);

        // Save position
        const newPosition: BotPosition = {
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
        };

        positions.push(newPosition);
        await supabase.from('bot_positions').insert({
          user_id: settings.user_id,
          ...newPosition,
        });
      }
    }

    // 6. Update settings in DB (new balance)
    await supabase
      .from('bot_settings')
      .update({
        current_balance: settings.current_balance,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', settings.user_id);

    return {
      success: true,
      strategy: settings.strategy,
      analyses,
      trades_executed: executedTrades,
      errors,
      timestamp: new Date().toISOString(),
      next_run: `In ${strategy.intervalMs / 60000} minutes`,
    };
  } catch (err: any) {
    errors.push(err.message || 'Execution error');
    return {
      success: false,
      strategy: settings.strategy,
      analyses,
      trades_executed: executedTrades,
      errors,
      timestamp: new Date().toISOString(),
      next_run: 'retry on next cron',
    };
  }
}
