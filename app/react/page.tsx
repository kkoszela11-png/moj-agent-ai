"use client";

import ChatUI from "@/app/components/ChatUI";

const SCENARIOS = [
  "Planuję weekend w Berlinie. Budżet: 2000 PLN.",
  "Lecę do Paryża na tydzień w sierpniu.",
  "Wycieczka do Pragi z rodziną na 3 dni.",
  "Podróż służbowa do Londynu w przyszłym tygodniu.",
  "Porównaj Barcelonę i Lizbonę na wakacje.",
];

export default function ReactPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 40px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        🔄 Agent ReAct — Autonomiczne rozumowanie
      </h1>
      <p style={{ color: "#9aa0a6", marginBottom: 16 }}>
        Opisz cel — agent sam planuje kolejne kroki i korzysta z narzędzi.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario}
            type="button"
            onClick={() => {
              const event = new CustomEvent("prefill-input", { detail: scenario });
              window.dispatchEvent(event);
            }}
            style={{
              border: "1px solid #2f3b4a",
              background: "#121826",
              color: "#d9e6ff",
              borderRadius: 999,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            {scenario}
          </button>
        ))}
      </div>

      <ChatUI
        api="/api/react"
        title="ReAct agent"
        subtitle="Twoje zadanie → samodzielne myślenie → działanie narzędziami"
        placeholder="Np. Planuję weekend w Berlinie..."
        markdown
        images
        showTools
        showDiagnostics
        toolsPanel={[
          "🧮 Kalkulator",
          "🕐 Data i czas",
          "☀️ Pogoda",
          "💱 Kursy",
          "🎉 Święta",
          "📚 Wikipedia",
          "📝 Notatki",
          "📄 Czytanie stron",
          "🎨 Grafiki",
        ]}
        suggestions={SCENARIOS}
        emptyHint={`Spróbuj:
• Planuję weekend w Berlinie.
• Porównaj Barcelonę i Lizbonę.
• Sprawdź pogodę i kursy dla Paryża.`}
      />
    </main>
  );
}
