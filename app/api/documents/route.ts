import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'Missing Supabase env. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }
  return createClient(url, key)
}

export async function GET() {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('documents').select('title, metadata, created_at, id, content')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // aggregate by title
    const map = new Map<string, { title: string; count: number; created_at: string | null }>()
    for (const row of data as any[]) {
      const t = row.title || 'Untitled'
      const existing = map.get(t)
      const created = row.created_at || null
      if (!existing) map.set(t, { title: t, count: 1, created_at: created })
      else {
        existing.count++
        if (created && (!existing.created_at || new Date(created) < new Date(existing.created_at))) existing.created_at = created
      }
    }

    const list = Array.from(map.values()).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    return NextResponse.json({ documents: list })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title, content, embedding, metadata } = body || {}
    if (!title || !content || !Array.isArray(embedding)) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { error } = await supabase.from('documents').insert([{ title, content, embedding, metadata }])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const title = body?.title || new URL(req.url).searchParams.get('title')
    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 })

    const supabase = getSupabase()
    const { error } = await supabase.from('documents').delete().eq('title', title)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
