"use client"

import React, { useEffect, useState } from 'react'
import { splitIntoChunks } from '../../lib/chunking'
import { supabase } from '@/app/lib/supabase'

export default function UploadPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [current, setCurrent] = useState(0)
  const [total, setTotal] = useState(0)
  const [message, setMessage] = useState('')
  const [documents, setDocuments] = useState<Array<any>>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setMessage('Brak zalogowanego użytkownika')
        return
      }

      setUserId(user.id)
      await fetchDocuments(user.id)
    }

    void init()
  }, [])

  async function fetchDocuments(currentUserId = userId) {
    if (!currentUserId) return

    try {
      const res = await fetch(`/api/documents?user_id=${encodeURIComponent(currentUserId)}`)
      const j = await res.json()
      setDocuments(j.documents || [])
    } catch (e) {
      console.error(e)
    }
  }

  function fillExample(kind: string) {
    if (kind === 'cennik') {
      setTitle('Cennik')
      setContent('Pakiet Basic: 99 zł/mies. Pakiet Premium: 299 zł/mies...')
    } else if (kind === 'faq') {
      setTitle('FAQ')
      setContent('Q: Jak mogę anulować subskrypcję? A: Wyślij email na...')
    } else if (kind === 'regulamin') {
      setTitle('Regulamin')
      setContent('§1. Postanowienia ogólne. 1.1 Niniejszy regulamin...')
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) {
      setMessage('Brak zalogowanego użytkownika')
      return
    }

    setMessage('')
    setCurrent(0)
    setTotal(0)

    const chunks = splitIntoChunks(content || '', 500, 50)
    setTotal(chunks.length)
    if (!title || chunks.length === 0) {
      setMessage('Wypełnij tytuł i treść dokumentu')
      return
    }

    setIsProcessing(true)
    try {
      for (let i = 0; i < chunks.length; i++) {
        setCurrent(i + 1)
        // request embedding
        const embedRes = await fetch('/api/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: chunks[i] }),
        })
        if (!embedRes.ok) {
          const txt = await embedRes.text().catch(() => '')
          throw new Error('Embedding failed: ' + txt)
        }
        const embedJ = await embedRes.json()
        const embedding = embedJ.embedding || embedJ.embedding?.values
        if (!Array.isArray(embedding)) throw new Error('Invalid embedding')

        // save chunk
        const saveRes = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content: chunks[i], embedding, metadata: { source: title, chunk_index: i, total_chunks: chunks.length }, user_id: userId }),
        })
        if (!saveRes.ok) {
          const txt = await saveRes.text().catch(() => '')
          throw new Error('Save failed: ' + txt)
        }
      }

      setMessage(`✅ Zapisano ${chunks.length} fragmentów!`)
      await fetchDocuments()
    } catch (err: any) {
      setMessage(String(err.message || err))
    } finally {
      setIsProcessing(false)
      setCurrent(0)
      setTotal(0)
    }
  }

  async function handleDelete(titleToDelete: string) {
    if (!userId) return
    if (!confirm(`Usuń dokument "${titleToDelete}"?`)) return
    try {
      const res = await fetch('/api/documents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: titleToDelete, user_id: userId }) })
      if (!res.ok) throw new Error('Delete failed')
      await fetchDocuments()
    } catch (e) {
      console.error(e)
      alert('Błąd podczas usuwania')
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', padding: 16 }}>
      <h1>📚 Baza wiedzy</h1>
      <p>Wklej tekst — agent będzie z niego korzystał</p>

      <form onSubmit={handleSave}>
        <div style={{ marginBottom: 12 }}>
          <label>Tytuł dokumentu</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Np. Cennik 2026, FAQ, Regulamin firmy" style={{ width: '100%', padding: 8, marginTop: 6 }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Treść dokumentu</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Wklej tutaj treść dokumentu..." style={{ width: '100%', minHeight: 300, padding: 8, marginTop: 6 }} />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="submit" disabled={isProcessing} style={{ padding: '8px 12px' }}>
            📤 Zapisz w bazie wiedzy
          </button>
          <div>
            <button type="button" onClick={() => fillExample('cennik')} style={{ marginRight: 6 }}>Cennik</button>
            <button type="button" onClick={() => fillExample('faq')} style={{ marginRight: 6 }}>FAQ</button>
            <button type="button" onClick={() => fillExample('regulamin')}>Regulamin</button>
          </div>
        </div>
      </form>

      <div style={{ marginTop: 12 }}>
        {isProcessing && <div>Przetwarzam fragment {current} z {total}...</div>}
        {message && <div style={{ marginTop: 8 }}>{message}</div>}
      </div>

      <hr style={{ margin: '24px 0' }} />

      <h2>Zapisane dokumenty</h2>
      <div>
        {documents.length === 0 && <div>Brak dokumentów</div>}
        {documents.map((d: any) => (
          <div key={d.title} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid #eee' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{d.title}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{d.count} fragmentów • {d.created_at ? new Date(d.created_at).toLocaleString() : ''}</div>
            </div>
            <div>
              <button onClick={() => handleDelete(d.title)} style={{ color: 'red' }}>🗑️ Usuń</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

