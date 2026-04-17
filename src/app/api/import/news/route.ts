import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.CITYSCRAPER_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const articles = Array.isArray(body) ? body : body.articles;

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json({ error: 'No articles provided' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const rows = articles.map((a: Record<string, unknown>) => ({
      external_id: (a.external_id || a.id) as string,
      title: a.title as string,
      url: a.url as string,
      source: a.source as string,
      thumbnail: (a.thumbnail as string) || null,
      sentiment: (a.sentiment as string) || 'neutral',
    }));

    const { data, error } = await supabase
      .from('ct_news')
      .upsert(rows, { onConflict: 'external_id' })
      .select();

    if (error) {
      console.error('Supabase upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      message: `Imported ${data?.length || 0} news articles`,
    });
  } catch (err) {
    console.error('Import news error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
