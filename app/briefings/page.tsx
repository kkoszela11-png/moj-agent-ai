"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Briefing = {
  id: string;
  created_at: string;
  content: string;
  date: string;
};

function formatBriefingDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  const formatted = date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function BriefingsPage() {
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadBriefings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/briefings");
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setBriefings(data.briefings ?? []);
    } catch (err: any) {
      setError(err.message ?? "Nie udało się pobrać briefingów.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBriefings();
  }, [loadBriefings]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/cron/morning");
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error ?? "Nie udało się wygenerować briefingu.");
      }
      await loadBriefings();
    } catch (err: any) {
      setError(err.message ?? "Nie udało się wygenerować briefingu.");
    } finally {
      setGenerating(false);
    }
  }

  const selected = briefings.find((b) => b.id === selectedId) ?? null;

  async function handleCopy() {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSelect(id: string) {
    setCopied(false);
    setSelectedId(id);
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1>📰 Briefingi</h1>
          <p style={{ color: "#94a3b8" }}>Automatyczne podsumowania dnia od Twojego agenta</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid #334155",
            background: generating ? "#1e293b" : "#2563eb",
            color: "#fff",
            cursor: generating ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {generating ? "⏳ Generuję..." : "🔄 Wygeneruj teraz"}
        </button>
      </div>

      {error && <p style={{ color: "#f87171", marginTop: 16 }}>{error}</p>}
      {loading && <p style={{ marginTop: 16 }}>Ładuję briefingi...</p>}

      {selected && (
        <div
          style={{
            marginTop: 16,
            padding: 24,
            borderRadius: 18,
            background: "#0f172a",
            border: "1px solid #334155",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
            <button
              onClick={() => setSelectedId(null)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "transparent",
                color: "#e4e4e7",
                cursor: "pointer",
              }}
            >
              ← Wróć do listy
            </button>
            <button
              onClick={() => void handleCopy()}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "transparent",
                color: "#e4e4e7",
                cursor: "pointer",
              }}
            >
              {copied ? "✅ Skopiowano" : "📋 Kopiuj"}
            </button>
          </div>
          <div className="report-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown>
          </div>
        </div>
      )}

      {!loading && !selected && briefings.length === 0 && (
        <div
          style={{
            marginTop: 24,
            padding: 24,
            background: "#111827",
            borderRadius: 16,
            textAlign: "center",
          }}
        >
          <p>Brak briefingów. Cron job wygeneruje pierwszy jutro rano!</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              marginTop: 12,
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid #334155",
              background: generating ? "#1e293b" : "#2563eb",
              color: "#fff",
              cursor: generating ? "not-allowed" : "pointer",
            }}
          >
            {generating ? "⏳ Generuję..." : "🔄 Wygeneruj teraz"}
          </button>
        </div>
      )}

      {!loading && !selected && briefings.length > 0 && (
        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
          {briefings.map((briefing) => (
            <button
              key={briefing.id}
              onClick={() => handleSelect(briefing.id)}
              style={{
                textAlign: "left",
                padding: 18,
                borderRadius: 18,
                background: "#0f172a",
                border: "1px solid #334155",
                cursor: "pointer",
                color: "inherit",
                font: "inherit",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>{formatBriefingDate(briefing.date)}</span>
                <span style={{ color: "#4ade80", fontSize: 13, whiteSpace: "nowrap" }}>
                  ✅ wygenerowany automatycznie (z cron)
                </span>
              </div>
              <p style={{ marginTop: 12, color: "#cbd5e1" }}>
                {briefing.content.slice(0, 150)}
                {briefing.content.length > 150 ? "…" : ""}
              </p>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
