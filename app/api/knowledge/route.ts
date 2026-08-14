import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

const MAX_STEPS = 3;

export async function GET() {
  try {
    const { data, error } = await supabase.from('documents').select('id,title,created_at,metadata');
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
