"use client";

import { useState } from "react";
import Nav from "../components/Nav";

const EXAMPLES = [
  "Minimalistyczne logo kawiarni w stylu japońskim",
  "Post na Instagram: kawa latte art, ciepłe światło, widok z góry",
  "Kreacja reklamowa: wyprzedaż letnia -50%, nowoczesny design",
  "Ikona aplikacji: robot AI, gradient fioletowo-niebieski, flat design",
  "Infografika: 5 kroków do produktywności, pastelowe kolory",
  "Zdjęcie produktowe: elegancki zegarek na ciemnym tle",
];

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  async function generate(p: string) {
    const text = p.trim();
    if (!text || loading) return;
    setLoading(true);
    setError("");
    setImage(null);
    setComment("");
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Nie udało się wygenerować obrazu.");
      } else {
        setImage(data.image);
        setComment(data.text || "");
      }
    } catch {
      setError("Błąd połączenia z serwerem.");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image;
    a.download = "ai-generated.png";
    a.click();
  }

  return (
    <main
      style={{
        maxWidth: 800,
        margin: "0 auto",
        minHeight: "100dvh",
        padding: "0 16px 40px",
      }}
    >
      <Nav />

      <header style={{ padding: "16px 0 8px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>🎨 Generator grafik AI</h1>
        <p style={{ color: "#888", fontSize: 14, marginTop: 4 }}>
          Opisz co chcesz — AI stworzy obraz w kilka sekund
        </p>
      </header>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Opisz obraz który chcesz wygenerować…"
        rows={3}
        style={{
          width: "100%",
          padding: "12px 14px",
          borderRadius: 10,
          border: "1px solid #333",
          background: "#151515",
          color: "#ededed",
          fontSize: 15,
          outline: "none",
          resize: "vertical",
          fontFamily: "inherit",
        }}
      />

      <button
        onClick={() => generate(prompt)}
        disabled={loading || !prompt.trim()}
        style={{
          marginTop: 10,
          padding: "12px 20px",
          borderRadius: 10,
          border: "none",
          background: loading || !prompt.trim() ? "#333" : "#4a4aff",
          color: "#fff",
          fontSize: 15,
          fontWeight: 600,
          cursor: loading || !prompt.trim() ? "default" : "pointer",
        }}
      >
        {loading ? "Generuję… (5–15 sekund)" : "🎨 Generuj"}
      </button>

      {/* Przykłady */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setPrompt(ex)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #333",
              background: "#151515",
              color: "#ccc",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Stan ładowania */}
      {loading && (
        <div
          style={{
            marginTop: 20,
            height: 320,
            borderRadius: 12,
            border: "1px solid #333",
            background: "#151515",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#888",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        >
          Generuję… (5–15 sekund)
        </div>
      )}

      {/* Błąd */}
      {error && (
        <div
          style={{
            marginTop: 20,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #5a2a2a",
            background: "#2a1515",
            color: "#ff9a9a",
          }}
        >
          {error}
        </div>
      )}

      {/* Wynik */}
      {image && !loading && (
        <div style={{ marginTop: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Wygenerowany obraz"
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid #333",
              display: "block",
            }}
          />
          {comment && (
            <p style={{ color: "#aaa", fontSize: 14, marginTop: 10 }}>{comment}</p>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={download}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid #333",
                background: "#1a1a2a",
                color: "#fff",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              💾 Pobierz
            </button>
            <button
              onClick={() => generate(prompt)}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid #333",
                background: "#1a1a2a",
                color: "#fff",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              🔄 Ponownie
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
    </main>
  );
}
