"use client";

import { FormEvent, useMemo, useState } from "react";

const EXAMPLE_EMAILS = `Mail 1 - PILNY:
Od: jan.kowalski@firma.pl
Temat: PILNE - Problem z fakturą
Treść: Dzień dobry, mam problem z fakturą FV/2026/001. Kwota jest nieprawidłowa — powinno być 5000 zł a jest 3000 zł. Proszę o PILNĄ korektę. Termin płatności mija jutro.

Mail 2 - SPAM:
Od: winner@lucky-prize.com
Temat: Congratulations! You won $1,000,000
Treść: Click here to claim your prize! Limited time offer. Act now!

Mail 3 - OFERTA:
Od: anna.nowak@partner.pl
Temat: Propozycja współpracy
Treść: Dzień dobry, reprezentuję firmę ABC Solutions. Chcielibyśmy omówić możliwość współpracy w zakresie dostarczania usług IT. Czy możemy umówić się na spotkanie w przyszłym tygodniu?

Mail 4 - REKLAMACJA:
Od: klient123@gmail.com
Temat: Nie działa usługa od 3 dni
Treść: Witam, od poniedziałku nie mogę się zalogować do panelu klienta. Próbowałem resetować hasło ale nie dostaje maila. To już trzeci dzień! Jeśli nie rozwiążecie tego dziś, zrezygnuję z usługi.

Mail 5 - INFO:
Od: newsletter@branżowy-portal.pl
Temat: Nowe trendy AI w biznesie - raport 2026
Treść: Zapraszamy do lektury naszego najnowszego raportu o zastosowaniach AI w polskich firmach. Pobierz za darmo na naszej stronie.`;

type EmailCard = {
  number: string;
  subject: string;
  category: string;
  priority: string;
  reason: string;
  draft: string;
};

function parseCards(text: string): EmailCard[] {
  return [...text.matchAll(/### Mail\s+(\d+)\s*:\s*([^\n]+)([\s\S]*?)(?=\n### Mail|\n---|$)/g)].map(
    ([, number, subject, content]) => ({
      number,
      subject: subject.trim(),
      category: content.match(/\|\s*Kategoria\s*\|\s*([^|\n]+)\|/i)?.[1]?.trim() ?? "Analizowanie...",
      priority: content.match(/\|\s*Priorytet\s*\|\s*([^|\n]+)\|/i)?.[1]?.trim() ?? "Analizowanie...",
      reason: content.match(/\|\s*Uzasadnienie\s*\|\s*([^|\n]+)\|/i)?.[1]?.trim() ?? "",
      draft: content.match(/\*\*Proponowana odpowiedź:\*\*\s*\n?\s*>\s*([\s\S]*?)(?=\n\n|\n---|$)/i)?.[1]?.replace(/^>\s?/gm, "").trim() ?? "",
    }),
  );
}

function priorityStyle(priority: string) {
  if (priority.includes("Wysoki") || priority.includes("🔴")) return { border: "#ef4444", tint: "#3f1515", icon: "🔴" };
  if (priority.includes("Średni") || priority.includes("🟡")) return { border: "#eab308", tint: "#3d3210", icon: "🟡" };
  return { border: "#22c55e", tint: "#12351f", icon: "🟢" };
}

function summaryFrom(text: string) {
  return {
    urgent: text.match(/🔴\s*Pilne:\s*(\d+)/i)?.[1] ?? "0",
    medium: text.match(/🟡\s*Średnie?:\s*(\d+)/i)?.[1] ?? "0",
    low: text.match(/🟢\s*Niskie?:\s*(\d+)/i)?.[1] ?? "0",
  };
}

export default function EmailTriagePage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const cards = useMemo(() => parseCards(result), [result]);
  const summary = useMemo(() => summaryFrom(result), [result]);

  async function analyze(event: FormEvent) {
    event.preventDefault();
    const emails = input.split(/\n\s*\n/).map((email) => email.trim()).filter(Boolean);
    if (!emails.length || isLoading) return;

    setError("");
    setResult("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/email-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      if (!response.ok) throw new Error((await response.json()).error ?? "Nie udało się przeanalizować maili.");
      if (!response.body) throw new Error("Brak strumienia odpowiedzi.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setResult(fullText);
      }
      fullText += decoder.decode();
      setResult(fullText);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Wystąpił nieoczekiwany błąd.");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyDraft(draft: string) {
    await navigator.clipboard.writeText(draft);
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 20px 64px" }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ color: "#f59e0b", fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Inbox / Automatyzacja</div>
        <h1 style={{ fontSize: "clamp(32px, 6vw, 54px)", lineHeight: 1.05, margin: "8px 0 10px", letterSpacing: 0 }}>📧 E-mail Triage</h1>
        <p style={{ color: "#a1a1aa", fontSize: 17 }}>Wklej maile — agent posortuje i napisze odpowiedzi</p>
      </header>

      <form onSubmit={analyze}>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} placeholder="Wklej maile tutaj — oddziel je pustą linią..." aria-label="Treść maili do analizy" style={{ width: "100%", minHeight: 200, resize: "vertical", padding: 18, borderRadius: 14, border: "1px solid #3f3f46", background: "#18181b", color: "#f4f4f5", font: "inherit", lineHeight: 1.55, outline: "none" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: 12 }}>
          <button type="submit" disabled={isLoading || !input.trim()} style={{ border: 0, borderRadius: 10, padding: "12px 18px", background: isLoading || !input.trim() ? "#3f3f46" : "#f59e0b", color: "#18181b", fontWeight: 800, cursor: isLoading || !input.trim() ? "default" : "pointer" }}>{isLoading ? "⏳ Analizuję..." : "📧 Analizuj maile"}</button>
          <button type="button" onClick={() => setInput(EXAMPLE_EMAILS)} style={{ border: "1px solid #52525b", borderRadius: 10, padding: "11px 16px", background: "transparent", color: "#e4e4e7", fontWeight: 600, cursor: "pointer" }}>📋 Wklej przykład</button>
        </div>
      </form>

      {error && <div role="alert" style={{ marginTop: 20, padding: 14, borderRadius: 10, border: "1px solid #ef4444", color: "#fecaca", background: "#2a1111" }}>{error}</div>}
      {result && <section aria-live="polite" style={{ marginTop: 36 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ marginRight: "auto", fontSize: 22 }}>Podsumowanie</h2>
          <span style={{ padding: "8px 12px", borderRadius: 999, background: "#3f1515", color: "#fca5a5" }}>🔴 {summary.urgent} pilne</span>
          <span style={{ padding: "8px 12px", borderRadius: 999, background: "#3d3210", color: "#fde047" }}>🟡 {summary.medium} średnie</span>
          <span style={{ padding: "8px 12px", borderRadius: 999, background: "#12351f", color: "#86efac" }}>🟢 {summary.low} niskie</span>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {cards.map((card) => {
            const style = priorityStyle(card.priority);
            return <article key={card.number} style={{ border: `1px solid ${style.border}`, borderLeft: `6px solid ${style.border}`, borderRadius: 14, padding: 20, background: "#18181b" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 14 }}><span style={{ color: style.border, fontSize: 20 }}>{style.icon}</span><h3 style={{ fontSize: 19, margin: 0 }}>Mail {card.number}: {card.subject}</h3></div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(110px, 0.35fr) 1fr", borderTop: "1px solid #3f3f46", borderBottom: "1px solid #3f3f46", marginBottom: 16 }}>
                <strong style={{ padding: "10px 0", color: "#a1a1aa" }}>Kategoria</strong><span style={{ padding: "10px 0" }}>{card.category}</span>
                <strong style={{ padding: "10px 0", color: "#a1a1aa" }}>Priorytet</strong><span style={{ padding: "10px 0", color: style.border }}>{card.priority}</span>
                <strong style={{ padding: "10px 0", color: "#a1a1aa" }}>Uzasadnienie</strong><span style={{ padding: "10px 0" }}>{card.reason || "Analizowanie..."}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><strong>Proponowana odpowiedź</strong>{card.draft && <button type="button" onClick={() => void copyDraft(card.draft)} style={{ border: "1px solid #52525b", borderRadius: 8, padding: "7px 10px", background: "transparent", color: "#e4e4e7", cursor: "pointer", whiteSpace: "nowrap" }}>📋 Kopiuj draft</button>}</div>
              <blockquote style={{ borderLeft: `3px solid ${style.border}`, margin: "10px 0 0", padding: "10px 14px", color: "#d4d4d8", background: style.tint, whiteSpace: "pre-wrap" }}>{card.draft || "Agent przygotowuje odpowiedź..."}</blockquote>
            </article>;
          })}
        </div>
        {!cards.length && <pre style={{ whiteSpace: "pre-wrap", color: "#d4d4d8" }}>{result}</pre>}
        {cards.length > 0 && result.includes("✅ Rekomendacja") && <p style={{ marginTop: 20, padding: 16, borderRadius: 10, background: "#27272a", color: "#d4d4d8", whiteSpace: "pre-wrap" }}>{result.match(/✅ Rekomendacja:[^\n]*/)?.[0]}</p>}
      </section>}
    </main>
  );
}