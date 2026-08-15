"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

const LINKS = [
  { href: "/", label: "🏠 Dashboard" },
  { href: "/chat", label: "💬 Chat" },
  { href: "/history", label: "📜 Historia" },
  { href: "/briefings", label: "📰 Briefingi" },
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
  { href: "/email-triage", label: "📧 E-mail Triage" },
  { href: "/report", label: "📊 Raporty" },
  { href: "/competitor", label: "🏢 Konkurencja" },
  { href: "/meeting-summary", label: "📋 Spotkania" },
  { href: "/posty", label: "🎺 Posty" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [authState, setAuthState] = useState<"checking" | "authed" | "guest">("checking");
  const [newBriefingsCount, setNewBriefingsCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
      setAuthState(data.user ? "authed" : "guest");
    }

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setAuthState(session?.user ? "authed" : "guest");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function loadNewBriefingsCount() {
      try {
        const res = await fetch("/api/briefings");
        const data = await res.json();
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Warsaw" });
        const count = (data.briefings ?? []).filter((b: { date: string }) => b.date === today).length;
        setNewBriefingsCount(count);
      } catch {
        setNewBriefingsCount(0);
      }
    }

    void loadNewBriefingsCount();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Trwa sprawdzanie sesji - nic nie renderujemy, żeby uniknąć mignięcia złego stanu.
  if (authState === "checking") {
    return null;
  }

  if (authState === "guest") {
    return (
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700 }}>Mój Agent AI</span>
        <Link
          href="/login"
          style={{
            borderRadius: 12,
            border: "1px solid #334155",
            background: "#0f172a",
            color: "#e2e8f0",
            padding: "10px 14px",
            textDecoration: "none",
          }}
        >
          Zaloguj się
        </Link>
      </div>
    );
  }

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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          {email && <span style={{ color: "#94a3b8", fontSize: 12 }}>{email}</span>}
          <button
            type="button"
            onClick={handleSignOut}
            style={{
              borderRadius: 12,
              border: "1px solid #7f1d1d",
              background: "#3f1212",
              color: "#fecaca",
              padding: "10px 14px",
              cursor: "pointer",
            }}
          >
            Wyloguj
          </button>
        </div>
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
              {link.href === "/briefings" && newBriefingsCount > 0 && (
                <span
                  style={{
                    marginLeft: 6,
                    padding: "1px 7px",
                    borderRadius: 999,
                    background: "#dc2626",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {newBriefingsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
