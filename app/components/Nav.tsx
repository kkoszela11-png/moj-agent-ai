"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "🏠 Dashboard" },
  { href: "/chat", label: "💬 Chat" },
  { href: "/history", label: "📜 Historia" },
  { href: "/agent", label: "🤖 Agent" },
  { href: "/react", label: "🔄 ReAct" },
  { href: "/travel", label: "✈️ Podróże" },
  { href: "/think", label: "🧠 Myślenie" },
  { href: "/search", label: "🌐 Szukaj" },
  { href: "/generate", label: "🎨 Grafiki" },
  { href: "/vision", label: "👁️ Vision" },
  { href: "/fewshot", label: "📚 Słownik" },
  { href: "/upload", label: "📚 Baza wiedzy" },
  { href: "/format", label: "📐 Formater" },
  { href: "/oferta", label: "💼 Oferta" },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 700 }}>Mój Agent AI</span>
          <span style={{ color: "#94a3b8", fontSize: 13 }}>Nawigacja</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          style={{
            borderRadius: 12,
            border: "1px solid #334155",
            background: "#0f172a",
            color: "#e2e8f0",
            padding: "10px 14px",
            cursor: "pointer",
          }}
        >
          {open ? "Zamknij" : "Menu"}
        </button>
      </div>

      <nav
        style={{
          display: open ? "grid" : "flex",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 8,
          flexWrap: "wrap",
          padding: "12px 0",
          borderBottom: "1px solid #333",
        }}
      >
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                fontSize: 14,
                textDecoration: "none",
                color: active ? "#fff" : "#cbd5e1",
                background: active ? "#1f2937" : "#0f172a",
                border: active ? "1px solid #475569" : "1px solid transparent",
                minWidth: 0,
              }}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
