"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DashboardData = {
  updatedAt: string;
  datetime: {
    iso: string;
    formatted: string;
    dayOfWeek: string;
    date: string;
  };
  weather: {
    city?: string;
    temperature?: number;
    windSpeed?: number;
    description?: string;
    error?: string;
  };
  currencies: {
    EUR: { currency?: string; rate?: number; date?: string; error?: string };
    USD: { currency?: string; rate?: number; date?: string; error?: string };
  };
  upcomingHolidays: Array<{ date?: string; localName?: string; name?: string }>;
};

function formatDateTime(datetime: DashboardData["datetime"]) {
  return `${datetime.dayOfWeek}, ${datetime.date}`;
}

function badge(value: string) {
  return {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    color: "#eef",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.3,
  } as const;
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard");
      if (!response.ok) {
        throw new Error(`Błąd serwera ${response.status}`);
      }
      const json = (await response.json()) as DashboardData;
      setData(json);
      setLastSync(new Date().toLocaleTimeString("pl-PL"));
    } catch (err) {
      setError(`Nie udało się załadować danych: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const weatherCard = useMemo(() => {
    if (!data) return null;
    return data.weather.error ? (
      <div style={{ color: "#f9a8d4" }}>{data.weather.error}</div>
    ) : (
      <>
        <div style={{ fontSize: 14, color: "#cbd5e1" }}>{data.weather.city || "Warszawa"}</div>
        <div style={{ fontSize: 42, fontWeight: 700, marginTop: 10 }}>
          {data.weather.temperature?.toFixed(0)}°C
        </div>
        <div style={{ marginTop: 10, color: "#e2e8f0" }}>{data.weather.description}</div>
        <div style={{ marginTop: 14, fontSize: 13, color: "#cbd5e1" }}>
          Wiatr: {data.weather.windSpeed?.toFixed(0)} km/h
        </div>
      </>
    );
  }, [data]);

  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "24px",
        maxWidth: 1200,
        margin: "0 auto",
        color: "#eef",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 36 }}>🏠 Dashboard</h1>
          <p style={{ margin: "10px 0 0", color: "#a1a1aa", maxWidth: 700 }}>
            Centrum dowodzenia twojego agenta AI. Dane pogodowe, kursy walut i święta
            są pobierane z prawdziwych API.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={loadData}
            style={{
              borderRadius: 14,
              border: "1px solid #334155",
              background: "#0f172a",
              color: "#f8fafc",
              padding: "12px 18px",
              cursor: "pointer",
            }}
          >
            🔄 Odśwież
          </button>
          <span style={badge(`Ostatnia: ${lastSync || "---"}`)} />
        </div>
      </div>

      <div style={{ marginTop: 24, display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <section
          style={{
            padding: 20,
            borderRadius: 24,
            background: "linear-gradient(135deg, rgba(59,130,246,0.16), rgba(14,165,233,0.1))",
            backdropFilter: "blur(20px)",
            minHeight: 220,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "#bfdbfe" }}>
                🌤️ Pogoda
              </div>
              <h2 style={{ margin: "10px 0 0", fontSize: 20 }}>Warszawa</h2>
            </div>
            <div style={badge("Live")}>Live</div>
          </div>

          <div style={{ marginTop: 18, minHeight: 120 }}>
            {loading ? (
              <div style={{ color: "#94a3b8" }}>Ładuję pogodę...</div>
            ) : (
              weatherCard
            )}
          </div>
        </section>

        <section
          style={{
            padding: 20,
            borderRadius: 24,
            background: "linear-gradient(135deg, rgba(16,185,129,0.16), rgba(5,150,105,0.1))",
            backdropFilter: "blur(20px)",
            minHeight: 220,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "#bef264" }}>
                💶 Kursy walut
              </div>
              <h2 style={{ margin: "10px 0 0", fontSize: 20 }}>NBP</h2>
            </div>
            <div style={badge("Aktualne")}>Aktualne</div>
          </div>

          <div style={{ marginTop: 18 }}>
            {loading ? (
              <div style={{ color: "#94a3b8" }}>Ładuję kursy...</div>
            ) : data ? (
              <div style={{ display: "grid", gap: 12 }}>
                {(["EUR", "USD"] as const).map((code) => {
                  const currency = data.currencies[code];
                  return (
                    <div key={code} style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ color: "#e2e8f0", fontWeight: 600 }}>{code}</div>
                        <div style={{ color: "#cbd5e1", fontSize: 12 }}>
                          {currency.date || "brak daty"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>
                          {currency.rate?.toFixed(4) ?? "—"}
                        </div>
                        <div style={{ color: "#cbd5e1", fontSize: 12 }}>PLN</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: "#fda4af" }}>{error || "Brak danych."}</div>
            )}
          </div>
        </section>

        <section
          style={{
            padding: 20,
            borderRadius: 24,
            background: "linear-gradient(135deg, rgba(251,191,36,0.16), rgba(245,158,11,0.1))",
            backdropFilter: "blur(20px)",
            minHeight: 220,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: "#fcd34d" }}>
                📅 Nadchodzące święta
              </div>
              <h2 style={{ margin: "10px 0 0", fontSize: 20 }}>Polska</h2>
            </div>
            <div style={badge("2026")}>2026</div>
          </div>

          <div style={{ marginTop: 18, minHeight: 120 }}>
            {loading ? (
              <div style={{ color: "#94a3b8" }}>Ładuję święta...</div>
            ) : data ? (
              <ul style={{ paddingLeft: 18, margin: 0, color: "#f8fafc" }}>
                {data.upcomingHolidays.length > 0 ? (
                  data.upcomingHolidays.map((holiday) => (
                    <li key={holiday.date} style={{ marginBottom: 8 }}>
                      <strong>{holiday.date}</strong> — {holiday.localName || holiday.name}
                    </li>
                  ))
                ) : (
                  <li>Brak danych.</li>
                )}
              </ul>
            ) : (
              <div style={{ color: "#fda4af" }}>{error || "Brak danych."}</div>
            )}
          </div>
        </section>
      </div>

      <section
        style={{
          marginTop: 24,
          padding: 22,
          borderRadius: 24,
          background: "linear-gradient(135deg, rgba(139,92,246,0.14), rgba(236,72,153,0.1))",
          backdropFilter: "blur(20px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>🤖 Szybkie akcje</h2>
            <p style={{ margin: "8px 0 0", color: "#cbd5e1" }}>
              Przejdź do najważniejszych widoków twojego agenta.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 18 }}>
          {[
            { href: "/travel", label: "🌍 Zaplanuj podróż" },
            { href: "/react", label: "🔄 Agent ReAct" },
            { href: "/chat", label: "💬 Chat z agentem" },
            { href: "/think", label: "🧠 Tryb myślenia" },
            { href: "/generate", label: "🎨 Generator grafik" },
            { href: "/fewshot", label: "📚 Słownik AI" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "block",
                padding: "16px",
                borderRadius: 18,
                textDecoration: "none",
                color: "#fff",
                background: "rgba(15,23,42,0.8)",
                border: "1px solid rgba(148,163,184,0.15)",
                transition: "transform 120ms ease",
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {error && <div style={{ marginTop: 20, color: "#fca5a5" }}>{error}</div>}
    </main>
  );
}
