"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { FormEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const EXAMPLES = [
  ["Shopify", "WooCommerce", "PrestaShop"],
  ["Notion", "Obsidian", "Evernote"],
  ["Vercel", "Netlify", "Railway"],
  ["ChatGPT", "Claude", "Gemini"],
];

function getMessageText(message: { parts?: Array<{ type: string; text?: string }> }) {
  return (message.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

export default function CompetitorPage() {
  const [companies, setCompanies] = useState(["", "", ""]);
  const [context, setContext] = useState("");
  const [notice, setNotice] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/competitor" }), []);
  const { messages, sendMessage, status } = useChat({ transport });
  const analysisMessage = [...messages].reverse().find((message) => message.role === "assistant");
  const analysis = analysisMessage ? getMessageText(analysisMessage) : "";
  const isLoading = status === "submitted" || status === "streaming";

  function updateCompany(index: number, value: string) {
    setCompanies((current) => current.map((company, companyIndex) => (companyIndex === index ? value : company)));
  }

  async function compare(event: FormEvent) {
    event.preventDefault();
    const selectedCompanies = companies.map((company) => company.trim()).filter(Boolean);
    if (selectedCompanies.length < 2 || isLoading) return;

    setNotice("");
    setIsCopied(false);
    const prompt = `Firmy do porównania: ${selectedCompanies.join(", ")}${context.trim() ? `\nKontekst użytkownika: ${context.trim()}` : ""}`;
    await sendMessage({ text: prompt });
  }

  function applyExample(example: string[]) {
    setCompanies(example);
    setContext("");
    setNotice("");
  }

  async function copyAnalysis() {
    if (!analysis) return;
    await navigator.clipboard.writeText(analysis);
    setIsCopied(true);
    setNotice("Analiza skopiowana do schowka.");
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "32px 20px 64px" }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ color: "#c084fc", fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
          Research / Strategia
        </div>
        <h1 style={{ fontSize: "clamp(32px, 6vw, 54px)", lineHeight: 1.05, margin: "8px 0 10px" }}>
          🏢 Analiza konkurencji
        </h1>
        <p style={{ color: "#a1a1aa", fontSize: 17, margin: 0 }}>
          Podaj firmy — agent porówna je za Ciebie
        </p>
      </header>

      <form onSubmit={compare}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {companies.map((company, index) => (
            <label key={index} style={{ display: "grid", gap: 8, fontWeight: 700 }}>
              Firma {index + 1}
              <input
                value={company}
                onChange={(event) => updateCompany(index, event.target.value)}
                placeholder={["Np. Shopify", "Np. WooCommerce", "Np. PrestaShop"][index]}
                aria-label={`Firma ${index + 1}`}
                style={{ width: "100%", boxSizing: "border-box", padding: "14px 15px", borderRadius: 12, border: "1px solid #3f3f46", background: "#18181b", color: "#f4f4f5", font: "inherit", outline: "none" }}
              />
            </label>
          ))}
        </div>

        <label htmlFor="competitor-context" style={{ display: "grid", gap: 8, marginTop: 16, fontWeight: 700 }}>
          Kontekst <span style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 400 }}>(opcjonalnie)</span>
          <textarea
            id="competitor-context"
            value={context}
            onChange={(event) => setContext(event.target.value)}
            placeholder="Szukam platformy e-commerce dla małego sklepu"
            rows={3}
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical", padding: 15, borderRadius: 12, border: "1px solid #3f3f46", background: "#18181b", color: "#f4f4f5", font: "inherit", lineHeight: 1.5, outline: "none" }}
          />
        </label>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: 14 }}>
          <button type="submit" disabled={isLoading || companies.filter((company) => company.trim()).length < 2} style={{ border: 0, borderRadius: 10, padding: "12px 18px", background: isLoading ? "#3f3f46" : "#c084fc", color: "#2e1065", fontWeight: 800, cursor: isLoading ? "default" : "pointer" }}>
            {isLoading ? "⏳ Porównuję..." : "🔍 Porównaj"}
          </button>
        </div>
      </form>

      <section style={{ marginTop: 18 }} aria-label="Przykładowe porównania">
        <p style={{ color: "#a1a1aa", margin: "0 0 10px", fontSize: 14 }}>Szybki start</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {EXAMPLES.map((example) => (
            <button key={example.join(" vs ")} type="button" onClick={() => applyExample(example)} style={{ border: "1px solid #3f3f46", borderRadius: 9, padding: "9px 12px", background: "#18181b", color: "#d4d4d8", textAlign: "left", cursor: "pointer" }}>
              {example.join(" vs ")}
            </button>
          ))}
        </div>
      </section>

      {analysis && (
        <section aria-live="polite" style={{ marginTop: 36 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: "0 auto 0 0", fontSize: 23 }}>Wynik analizy</h2>
            <button type="button" onClick={() => void copyAnalysis()} style={{ border: "1px solid #52525b", borderRadius: 9, padding: "9px 12px", background: "transparent", color: "#e4e4e7", cursor: "pointer" }}>
              {isCopied ? "✅ Skopiowano" : "📋 Kopiuj analizę"}
            </button>
          </div>
          <article style={{ padding: "24px clamp(18px, 4vw, 38px)", border: "1px solid #334155", borderRadius: 14, background: "#111827", lineHeight: 1.65 }}>
            <div className="report-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysis}</ReactMarkdown>
            </div>
          </article>
        </section>
      )}

      {notice && <p role="status" style={{ marginTop: 16, color: "#d8b4fe" }}>{notice}</p>}
    </main>
  );
}