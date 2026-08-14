"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { FormEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/app/lib/supabase";

const EXAMPLES = [
  "Rynek AI w Polsce — trendy, firmy, prognozy na 2026",
  "Porównanie platform e-commerce: Shopify vs WooCommerce vs PrestaShop",
  "Wpływ pracy zdalnej na produktywność — badania i statystyki",
  "Rynek nieruchomości w Krakowie — ceny, trendy, prognozy",
];

function getMessageText(message: { parts?: Array<{ type: string; text?: string }> }) {
  return (message.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

export default function ReportPage() {
  const [topic, setTopic] = useState("");
  const [notice, setNotice] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/report" }), []);
  const { messages, sendMessage, status } = useChat({ transport });
  const report = [...messages].reverse().find((message) => message.role === "assistant");
  const reportText = report ? getMessageText(report) : "";
  const isLoading = status === "submitted" || status === "streaming";

  async function generateReport(event: FormEvent) {
    event.preventDefault();
    const trimmedTopic = topic.trim();
    if (!trimmedTopic || isLoading) return;
    setNotice("");
    setIsCopied(false);
    await sendMessage({ text: trimmedTopic });
  }

  async function copyReport() {
    if (!reportText) return;
    await navigator.clipboard.writeText(reportText);
    setIsCopied(true);
    setNotice("Raport skopiowany do schowka.");
  }

  async function saveReport() {
    if (!reportText) return;
    setNotice("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setNotice("Zaloguj się, aby zapisać raport w bazie.");
      return;
    }

    const { error } = await supabase.from("reports").insert({
      user_id: user.id,
      title: topic.trim(),
      content: reportText,
    });

    setNotice(error ? `Nie udało się zapisać raportu: ${error.message}` : "Raport zapisany w bazie.");
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 64px" }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ color: "#38bdf8", fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
          Research / Automatyzacja
        </div>
        <h1 style={{ fontSize: "clamp(32px, 6vw, 54px)", lineHeight: 1.05, margin: "8px 0 10px" }}>
          📊 Generator raportów
        </h1>
        <p style={{ color: "#a1a1aa", fontSize: 17, margin: 0 }}>
          Opisz temat — agent napisze raport biznesowy
        </p>
      </header>

      <form onSubmit={generateReport}>
        <label htmlFor="report-topic" style={{ display: "block", marginBottom: 8, fontWeight: 700 }}>
          O czym ma być raport?
        </label>
        <input
          id="report-topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Np. Rynek AI w Polsce w 2026 roku..."
          style={{ width: "100%", boxSizing: "border-box", padding: "15px 16px", borderRadius: 12, border: "1px solid #3f3f46", background: "#18181b", color: "#f4f4f5", font: "inherit", outline: "none" }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: 14 }}>
          <button
            type="submit"
            disabled={isLoading || !topic.trim()}
            style={{ border: 0, borderRadius: 10, padding: "12px 18px", background: isLoading || !topic.trim() ? "#3f3f46" : "#38bdf8", color: "#082f49", fontWeight: 800, cursor: isLoading || !topic.trim() ? "default" : "pointer" }}
          >
            {isLoading ? "⏳ Generuję raport..." : "📊 Generuj raport"}
          </button>
        </div>
      </form>

      <section style={{ marginTop: 18 }} aria-label="Przykładowe tematy raportów">
        <p style={{ color: "#a1a1aa", margin: "0 0 10px", fontSize: 14 }}>Szybki start</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setTopic(example)}
              style={{ border: "1px solid #3f3f46", borderRadius: 9, padding: "9px 12px", background: "#18181b", color: "#d4d4d8", textAlign: "left", cursor: "pointer" }}
            >
              {example}
            </button>
          ))}
        </div>
      </section>

      {reportText && (
        <section aria-live="polite" style={{ marginTop: 36 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: "0 auto 0 0", fontSize: 23 }}>Raport</h2>
            <button type="button" onClick={() => void copyReport()} style={{ border: "1px solid #52525b", borderRadius: 9, padding: "9px 12px", background: "transparent", color: "#e4e4e7", cursor: "pointer" }}>
              {isCopied ? "✅ Skopiowano" : "📋 Kopiuj do schowka"}
            </button>
            <button type="button" onClick={() => void saveReport()} style={{ border: "1px solid #0ea5e9", borderRadius: 9, padding: "9px 12px", background: "#082f49", color: "#bae6fd", cursor: "pointer" }}>
              💾 Zapisz w bazie
            </button>
          </div>
          <article style={{ padding: "24px clamp(18px, 4vw, 38px)", border: "1px solid #334155", borderRadius: 14, background: "#111827", lineHeight: 1.65 }}>
            <div className="report-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportText}</ReactMarkdown>
            </div>
          </article>
        </section>
      )}

      {notice && <p role="status" style={{ marginTop: 16, color: "#bae6fd" }}>{notice}</p>}
    </main>
  );
}
