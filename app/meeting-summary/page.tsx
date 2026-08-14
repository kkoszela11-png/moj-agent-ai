"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { FormEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const EXAMPLES = [
  "Spotkanie zespołu produktu, 12 czerwca. Anna pokazała prototyp panelu klienta. Decyzja: wdrażamy filtrowanie po statusie. Marek przygotuje API do piątku. Kasia sprawdzi teksty w interfejsie.",
  "Rozmowa z klientem ABC o wdrożeniu CRM. Klient chce importu danych i raportów sprzedaży. Ustaliliśmy warsztat techniczny w przyszłym tygodniu. Tomek wyśle wycenę, ale termin nie został jeszcze ustalony.",
];

function getMessageText(message: { parts?: Array<{ type: string; text?: string }> }) {
  return (message.parts ?? []).filter((part) => part.type === "text").map((part) => part.text ?? "").join("").trim();
}

export default function MeetingSummaryPage() {
  const [notes, setNotes] = useState("");
  const [notice, setNotice] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/meeting-summary" }), []);
  const { messages, sendMessage, status } = useChat({ transport });
  const summaryMessage = [...messages].reverse().find((message) => message.role === "assistant");
  const summary = summaryMessage ? getMessageText(summaryMessage) : "";
  const isLoading = status === "submitted" || status === "streaming";

  async function summarize(event: FormEvent) {
    event.preventDefault();
    if (!notes.trim() || isLoading) return;
    setNotice("");
    setIsCopied(false);
    await sendMessage({ text: notes.trim() });
  }

  async function copySummary() {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setIsCopied(true);
    setNotice("Podsumowanie skopiowane do schowka.");
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 64px" }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ color: "#f59e0b", fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Praca zespołowa / Automatyzacja</div>
        <h1 style={{ fontSize: "clamp(32px, 6vw, 54px)", lineHeight: 1.05, margin: "8px 0 10px" }}>📋 Podsumowanie spotkań</h1>
        <p style={{ color: "#a1a1aa", fontSize: 17, margin: 0 }}>Wklej notatki, a agent uporządkuje ustalenia i zadania</p>
      </header>

      <form onSubmit={summarize}>
        <label htmlFor="meeting-notes" style={{ display: "grid", gap: 8, fontWeight: 700 }}>
          Notatki ze spotkania
          <textarea id="meeting-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Wklej notatki ze spotkania..." aria-label="Notatki ze spotkania" style={{ width: "100%", minHeight: 240, boxSizing: "border-box", resize: "vertical", padding: 16, borderRadius: 14, border: "1px solid #3f3f46", background: "#18181b", color: "#f4f4f5", font: "inherit", lineHeight: 1.55, outline: "none" }} />
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
          <button type="submit" disabled={isLoading || !notes.trim()} style={{ border: 0, borderRadius: 10, padding: "12px 18px", background: isLoading || !notes.trim() ? "#3f3f46" : "#f59e0b", color: "#18181b", fontWeight: 800, cursor: isLoading || !notes.trim() ? "default" : "pointer" }}>{isLoading ? "⏳ Podsumowuję..." : "📋 Podsumuj spotkanie"}</button>
        </div>
      </form>

      <section style={{ marginTop: 18 }} aria-label="Przykładowe notatki">
        <p style={{ color: "#a1a1aa", margin: "0 0 10px", fontSize: 14 }}>Szybki start</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{EXAMPLES.map((example, index) => <button key={example} type="button" onClick={() => setNotes(example)} style={{ border: "1px solid #3f3f46", borderRadius: 9, padding: "9px 12px", background: "#18181b", color: "#d4d4d8", cursor: "pointer" }}>Przykład {index + 1}</button>)}</div>
      </section>

      {summary && <section aria-live="polite" style={{ marginTop: 36 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: "0 auto 0 0", fontSize: 23 }}>Podsumowanie</h2>
          <button type="button" onClick={() => void copySummary()} style={{ border: "1px solid #52525b", borderRadius: 9, padding: "9px 12px", background: "transparent", color: "#e4e4e7", cursor: "pointer" }}>{isCopied ? "✅ Skopiowano" : "📋 Kopiuj podsumowanie"}</button>
        </div>
        <article style={{ padding: "24px clamp(18px, 4vw, 38px)", border: "1px solid #334155", borderRadius: 14, background: "#111827", lineHeight: 1.65 }}><div className="report-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown></div></article>
      </section>}
      {notice && <p role="status" style={{ marginTop: 16, color: "#fcd34d" }}>{notice}</p>}
    </main>
  );
}