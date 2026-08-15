"use client";

import Link from "next/link";

const FEATURES = [
  {
    icon: "🧠",
    title: "Pamięta Twoje rozmowy",
    description: "Kontynuuje wątki tam, gdzie skończyliście — bez powtarzania kontekstu.",
  },
  {
    icon: "📚",
    title: "Zna dokumenty Twojej firmy",
    description: "Szuka odpowiedzi w Twojej bazie wiedzy i cytuje źródła.",
  },
  {
    icon: "🔐",
    title: "Prywatne dane per user",
    description: "Każde konto ma własną, odizolowaną przestrzeń danych.",
  },
  {
    icon: "⚡",
    title: "Pracuje 24/7",
    description: "Odpowiada natychmiast, o każdej porze, bez przerw.",
  },
];

function gradientTextStyle(): React.CSSProperties {
  return {
    background: "linear-gradient(135deg, #60a5fa, #c084fc, #f472b6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  };
}

function card(): React.CSSProperties {
  return {
    borderRadius: 20,
    border: "1px solid #334155",
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(16px)",
    padding: 24,
  };
}

export default function LandingPage() {
  return (
    <main style={{ minHeight: "100dvh", color: "#e2e8f0", overflowX: "hidden" }}>
      {/* Hero */}
      <section
        className="landing-hero-bg"
        style={{
          padding: "96px 24px 88px",
          textAlign: "center",
          borderBottom: "1px solid #1e293b",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h1
            className="landing-fade-in"
            style={{
              fontSize: "clamp(48px, 9vw, 88px)",
              fontWeight: 800,
              letterSpacing: -2,
              margin: 0,
              ...gradientTextStyle(),
            }}
          >
            Aster
          </h1>
          <p
            className="landing-fade-in"
            style={{
              fontSize: "clamp(18px, 3vw, 24px)",
              color: "#cbd5e1",
              marginTop: 20,
              lineHeight: 1.5,
              animationDelay: "0.15s",
            }}
          >
            Twój osobisty asystent AI z bazą wiedzy Twojej firmy
          </p>
          <div style={{ marginTop: 40 }}>
            <Link
              href="/login"
              className="landing-cta-button landing-fade-in"
              style={{
                display: "inline-block",
                padding: "16px 32px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 18,
                textDecoration: "none",
                animationDelay: "0.3s",
              }}
            >
              🚀 Zacznij za darmo
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "80px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gap: 20,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className="landing-feature-card landing-fade-in"
              style={{ ...card(), animationDelay: `${0.1 * index}s` }}
            >
              <div style={{ fontSize: 36 }}>{feature.icon}</div>
              <h3 style={{ margin: "14px 0 8px", fontSize: 18 }}>{feature.title}</h3>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: 14, lineHeight: 1.5 }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Demo */}
      <section style={{ padding: "40px 24px 96px", maxWidth: 900, margin: "0 auto" }}>
        <div
          className="landing-fade-in"
          style={{
            ...card(),
            padding: 0,
            overflow: "hidden",
            border: "1px solid #334155",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "14px 18px",
              borderBottom: "1px solid #334155",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#f87171" }} />
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#fbbf24" }} />
            <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#34d399" }} />
          </div>

          <div style={{ padding: 24, display: "grid", gap: 14 }}>
            <div
              style={{
                alignSelf: "flex-end",
                maxWidth: "70%",
                marginLeft: "auto",
                background: "#2563eb",
                color: "#fff",
                borderRadius: "16px 16px 4px 16px",
                padding: "10px 16px",
              }}
            >
              Jaki jest cennik usługi premium?
            </div>
            <div
              style={{
                maxWidth: "75%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid #334155",
                borderRadius: "16px 16px 16px 4px",
                padding: "10px 16px",
              }}
            >
              Plan Premium kosztuje 199 zł/mies. i zawiera nielimitowaną liczbę zapytań
              oraz priorytetowe wsparcie. 📄 Źródło: cennik_2026.pdf
            </div>
          </div>
        </div>
        <p
          className="landing-fade-in"
          style={{
            textAlign: "center",
            color: "#94a3b8",
            marginTop: 20,
            fontSize: 15,
          }}
        >
          Zapytaj o cennik → agent odpowiada z Twoich dokumentów
        </p>
      </section>

      {/* Footer CTA */}
      <section
        style={{
          padding: "80px 24px 100px",
          textAlign: "center",
          background: "linear-gradient(180deg, transparent, rgba(79,70,229,0.12))",
          borderTop: "1px solid #1e293b",
        }}
      >
        <h2 className="landing-fade-in" style={{ fontSize: 32, margin: 0 }}>
          Gotowy? Zacznij w 30 sekund.
        </h2>
        <div style={{ marginTop: 28 }}>
          <Link
            href="/login"
            className="landing-cta-button landing-fade-in"
            style={{
              display: "inline-block",
              padding: "16px 36px",
              borderRadius: 999,
              background: "linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
              textDecoration: "none",
              animationDelay: "0.1s",
            }}
          >
            Stwórz konto
          </Link>
        </div>
      </section>
    </main>
  );
}
