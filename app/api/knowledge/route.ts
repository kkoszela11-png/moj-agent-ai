import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(req: Request) {
  try {
    const userId = new URL(req.url).searchParams.get('user_id');
    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id query parameter' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('documents')
      .select('id,title,created_at,metadata')
      .eq('user_id', userId);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    // Aggregate by title
    const map: Record<string, { title: string; count: number; created_at?: string }> = {};
    for (const row of data as any[]) {
      const t = row.title || 'Untitled';
      if (!map[t]) map[t] = { title: t, count: 0, created_at: row.created_at };
      map[t].count++;
      if (!map[t].created_at || new Date(row.created_at) < new Date(map[t].created_at!)) map[t].created_at = row.created_at;
    }

    const list = Object.values(map).sort((a, b) => (b.count - a.count));
    return NextResponse.json({ documents: list });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
