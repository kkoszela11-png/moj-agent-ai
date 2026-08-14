"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import { FormEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const TYPES = ["Zapowiedź koncertu", "Relacja po koncercie", "Nabór muzyków", "Kulisy prób"];
const EXAMPLES = [
  { type: TYPES[0], details: "Gramy koncert w klubie jazzowym Blue Note w Poznaniu. W repertuarze standardy swingu i utwory z naszej nowej próby. Bilety są dostępne na stronie klubu." },
  { type: TYPES[2], details: "Big Band Po Godzinach prowadzi nabór na saksofon altowy. Szukamy osoby, która lubi jazz i może przychodzić na próby w tygodniu. Zgłoszenia przez wiadomość prywatną." },
  { type: TYPES[1], details: "Wczoraj zagraliśmy na przeglądzie big bandów. Była świetna publiczność, zagraliśmy trzy utwory i spotkaliśmy zaprzyjaźnione zespoły. Dziękujemy organizatorom i wszystkim, którzy byli z nami." },
];

function getMessageText(message: { parts?: Array<{ type: string; text?: string }> }) {
  return (message.parts ?? []).filter((part) => part.type === "text").map((part) => part.text ?? "").join("").trim();
}

export default function PostyPage() {
  const [type, setType] = useState(TYPES[0]);
  const [details, setDetails] = useState("");
  const [url, setUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState("");
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/posty" }), []);
  const { messages, sendMessage, status } = useChat({ transport });
  const resultMessage = [...messages].reverse().find((message) => message.role === "assistant");
  const result = resultMessage ? getMessageText(resultMessage) : "";
  const isLoading = status === "submitted" || status === "streaming";
  const channels = ["Facebook", "Instagram", "Instagram Stories"];

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!details.trim() || isLoading) return;
    setNotice("");
    setCopied("");
    await sendMessage({ text: `Typ posta: ${type}\nInformacje o wydarzeniu: ${details.trim()}${url.trim() ? `\nURL wydarzenia lub miejsca: ${url.trim()}` : ""}` });
  }

  function applyExample(example: (typeof EXAMPLES)[number]) {
    setType(example.type);
    setDetails(example.details);
    setUrl("");
    setNotice("");
  }

  function extractChannel(channel: string) {
    const next = result.match(new RegExp(`## ${channel}\\s*([\\s\\S]*?)(?=\\n## |$)`, "i"));
    return next?.[1]?.trim() ?? "";
  }

  async function copyPost(channel: string) {
    const text = extractChannel(channel);
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(channel);
    setNotice(`${channel}: skopiowano.`);
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 64px" }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ color: "#fb7185", fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Big Band Po Godzinach / Social media</div>
        <h1 style={{ fontSize: "clamp(32px, 6vw, 54px)", lineHeight: 1.05, margin: "8px 0 10px" }}>🎺 Posty</h1>
        <p style={{ color: "#a1a1aa", fontSize: 17, margin: 0 }}>Trzy wersje posta, jeden opis wydarzenia</p>
      </header>

      <form onSubmit={generate}>
        <div style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 8, fontWeight: 700 }}>Typ posta
            <select value={type} onChange={(event) => setType(event.target.value)} style={{ width: "100%", padding: "14px 15px", borderRadius: 12, border: "1px solid #3f3f46", background: "#18181b", color: "#f4f4f5", font: "inherit" }}>{TYPES.map((item) => <option key={item}>{item}</option>)}</select>
          </label>
          <label style={{ display: "grid", gap: 8, fontWeight: 700 }}>Opisz wydarzenie — data, miejsce, repertuar, cokolwiek wiesz
            <textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Opisz wydarzenie — data, miejsce, repertuar, cokolwiek wiesz" style={{ width: "100%", minHeight: 170, boxSizing: "border-box", resize: "vertical", padding: 16, borderRadius: 14, border: "1px solid #3f3f46", background: "#18181b", color: "#f4f4f5", font: "inherit", lineHeight: 1.55, outline: "none" }} />
          </label>
          <label style={{ display: "grid", gap: 8, fontWeight: 700 }}>Link do wydarzenia lub miejsca <span style={{ color: "#a1a1aa", fontSize: 13, fontWeight: 400 }}>(opcjonalnie)</span>
            <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." type="url" style={{ width: "100%", boxSizing: "border-box", padding: "14px 15px", borderRadius: 12, border: "1px solid #3f3f46", background: "#18181b", color: "#f4f4f5", font: "inherit", outline: "none" }} />
          </label>
        </div>
        <button type="submit" disabled={isLoading || !details.trim()} style={{ marginTop: 14, border: 0, borderRadius: 10, padding: "12px 18px", background: isLoading || !details.trim() ? "#3f3f46" : "#fb7185", color: "#450a0a", fontWeight: 800, cursor: isLoading || !details.trim() ? "default" : "pointer" }}>{isLoading ? "⏳ Piszę posty..." : "🎺 Wygeneruj posty"}</button>
      </form>

      <section style={{ marginTop: 18 }} aria-label="Przykłady postów">
        <p style={{ color: "#a1a1aa", margin: "0 0 10px", fontSize: 14 }}>Szybki start</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{EXAMPLES.map((example) => <button key={example.details} type="button" onClick={() => applyExample(example)} style={{ border: "1px solid #3f3f46", borderRadius: 9, padding: "9px 12px", background: "#18181b", color: "#d4d4d8", cursor: "pointer" }}>{example.type}</button>)}</div>
      </section>

      {result && <section aria-live="polite" style={{ marginTop: 36 }}>
        <h2 style={{ fontSize: 23, margin: "0 0 16px" }}>Gotowe posty</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>{channels.map((channel) => { const post = extractChannel(channel); return <article key={channel} style={{ padding: 20, border: "1px solid #3f3f46", borderRadius: 14, background: "#111827", minWidth: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}><h3 style={{ margin: 0, flex: 1 }}>{channel}</h3><button type="button" onClick={() => void copyPost(channel)} style={{ border: "1px solid #52525b", borderRadius: 8, padding: "7px 10px", background: "transparent", color: "#e4e4e7", cursor: "pointer" }}>{copied === channel ? "✅" : "📋 Kopiuj"}</button></div><div className="report-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{post || "Agent przygotowuje wersję..."}</ReactMarkdown></div></article>; })}</div>
      </section>}
      {notice && <p role="status" style={{ marginTop: 16, color: "#fda4af" }}>{notice}</p>}
    </main>
  );
}