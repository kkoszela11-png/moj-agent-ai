import { NextResponse } from 'next/server'
import { splitIntoChunks } from '../../../lib/chunking'
import { createClient } from '@supabase/supabase-js'

type Req = { title: string; content: string }

export async function POST(req: Request) {
  try {
    const body: Req = await req.json()
    const { title, content, user_id } = body as Req & { user_id?: string }
    if (!title || !content || !user_id) {
      return NextResponse.json({ error: 'Missing title, content or user_id' }, { status: 400 })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          error:
            'Missing Supabase env vars. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY',
        },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const chunks = splitIntoChunks(content, 500, 50)
    const total = chunks.length
    const logs: string[] = []

    // derive origin to call internal embed endpoint
    let origin: string
    try {
      origin = new URL(req.url).origin
    } catch (e) {
      origin = ''
    }

    for (let i = 0; i < total; i++) {
      const chunk = chunks[i]
      const idx = i + 1
      const progressMsg = `Przetwarzam fragment ${idx} z ${total}...`
      logs.push(progressMsg)

      // call internal embed endpoint
      const embedUrl = origin ? `${origin}/api/embed` : '/api/embed'
      const embedRes = await fetch(embedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chunk }),
      })

      if (!embedRes.ok) {
        const detail = await embedRes.text().catch(() => '')
        return NextResponse.json({ error: 'Embedding failed', detail, logs }, { status: 502 })
      }

      const embedData = await embedRes.json()
      const embedding: number[] = embedData?.embedding || embedData?.embedding?.values || null
      if (!Array.isArray(embedding)) {
        return NextResponse.json({ error: 'Invalid embedding response', raw: embedData, logs }, { status: 502 })
      }

      // insert into Supabase
      const metadata = { source: title, chunk_index: i, total_chunks: total }
      const insertRes = await supabase.from('documents').insert([
        {
          title,
          content: chunk,
          embedding,
          metadata,
          user_id,
        },
      ])

      if (insertRes.error) {
        return NextResponse.json({ error: 'Supabase insert error', detail: insertRes.error.message, logs }, { status: 500 })
      }

      logs.push(`Zapisano fragment ${idx}`)
    }

    return NextResponse.json({ success: true, chunks_saved: total, logs })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

