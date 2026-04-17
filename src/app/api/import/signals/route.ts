import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.CITYSCRAPER_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const signals = Array.isArray(body) ? body : body.signals;

    if (!signals || !Array.isArray(signals) || signals.length === 0) {
      return NextResponse.json({ error: 'No signals provided' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const rows = signals.map((s: Record<string, unknown>) => ({
      coin_id: (s.coin_id || s.coinId) as string,
      symbol: s.symbol as string,
      name: s.name as string,
      image: (s.image as string) || null,
      signal: s.signal as string,
      strength: s.strength as number,
      rsi: (s.rsi as number) ?? null,
      price_change_24h: (s.price_change_24h ?? s.priceChange24h ?? null) as number | null,
      price_change_7d: (s.price_change_7d ?? s.priceChange7d ?? null) as number | null,
      volume_change: (s.volume_change ?? s.volumeChange ?? null) as number | null,
      reason: (s.reason as string) || null,
    }));

    const { data, error } = await supabase
      .from('ct_signals')
      .insert(rows)
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      message: `Imported ${data?.length || 0} signals`,
    });
  } catch (err) {
    console.error('Import signals error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
