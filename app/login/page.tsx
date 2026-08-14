"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        router.replace("/");
      }
    }
    void checkSession();
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError("Podaj email i hasło.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          await fetch("/api/supabase/user-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: data.user.id, display_name: null }),
          });

          setMessage("Konto utworzone. Jeśli wymagane, potwierdź email i zaloguj się.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) throw signInError;

        router.replace("/");
        router.refresh();
      }
    } catch (e: any) {
      setError(e?.message ?? "Wystąpił błąd logowania.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 420,
          border: "1px solid #334155",
          borderRadius: 16,
          background: "#0f172a",
          padding: 20,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24 }}>🔐 Logowanie</h1>
        <p style={{ color: "#94a3b8", marginTop: 8 }}>
          Zaloguj się lub utwórz konto, aby korzystać z aplikacji.
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            type="button"
            onClick={() => setMode("signin")}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: mode === "signin" ? "1px solid #60a5fa" : "1px solid #334155",
              background: mode === "signin" ? "#1e3a8a" : "#111827",
              color: "#e2e8f0",
              cursor: "pointer",
            }}
          >
            Zaloguj się
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: mode === "signup" ? "1px solid #34d399" : "1px solid #334155",
              background: mode === "signup" ? "#065f46" : "#111827",
              color: "#e2e8f0",
              cursor: "pointer",
            }}
          >
            Zarejestruj się
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="twoj@email.com"
              autoComplete="email"
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #334155",
                background: "#020617",
                color: "#e2e8f0",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Hasło</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #334155",
                background: "#020617",
                color: "#e2e8f0",
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: "11px 12px",
              borderRadius: 10,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 600,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "Przetwarzam..."
              : mode === "signin"
                ? "Zaloguj się"
                : "Zarejestruj się"}
          </button>
        </form>

        {error && <p style={{ color: "#f87171", marginTop: 10 }}>{error}</p>}
        {message && <p style={{ color: "#4ade80", marginTop: 10 }}>{message}</p>}
      </section>
    </main>
  );
}
