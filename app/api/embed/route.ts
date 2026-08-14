import { NextResponse } from 'next/server'

type Req = { text: string }

export async function POST(req: Request) {
  const body: Req = await req.json()
  const text = body?.text || ''

  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'Missing GOOGLE_GENERATIVE_AI_API_KEY' }, { status: 500 })
  }

  try {
    const tryEmbed = async (modelName: string) => {
      return fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:embedContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: `models/${modelName}`, content: { parts: [{ text }] } }),
        }
      )
    }

    let res = await tryEmbed('text-embedding-004')
    // Some API keys/projects do not have text-embedding-004 enabled; fallback to other embedding models.
    if (res.status === 404) {
      res = await tryEmbed('embedding-001')
    }
    if (res.status === 404) {
      res = await tryEmbed('gemini-embedding-001')
    }

    if (!res.ok) {
      const textErr = await res.text().catch(() => null)
      return NextResponse.json({ error: 'Embedding API error', detail: textErr }, { status: 502 })
    }

    const data = await res.json().catch(() => null)

    // robust extraction of numeric vector
    let embedding: number[] | null = null
    if (Array.isArray((data as any)?.embedding?.values)) embedding = (data as any).embedding.values
    else if (Array.isArray((data as any)?.embeddings?.[0]?.embedding?.values)) embedding = (data as any).embeddings[0].embedding.values
    else if (Array.isArray((data as any)?.result?.embedding?.values)) embedding = (data as any).result.embedding.values
    else if (Array.isArray((data as any)?.data?.[0]?.embedding)) embedding = (data as any).data[0].embedding
    else {
      const findArray = (obj: any): number[] | null => {
        if (!obj || typeof obj !== 'object') return null
        for (const k of Object.keys(obj)) {
          const v = obj[k]
          if (Array.isArray(v) && v.every((x) => typeof x === 'number')) return v
          if (typeof v === 'object') {
            const found = findArray(v)
            if (found) return found
          }
        }
        return null
      }
      embedding = findArray(data)
    }

    if (!embedding || !Array.isArray(embedding)) {
      return NextResponse.json({ error: 'No embedding in response', raw: data }, { status: 502 })
    }

    return NextResponse.json({ embedding })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
