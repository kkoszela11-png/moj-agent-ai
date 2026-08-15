"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase, getAuthHeaders } from "@/app/lib/supabase";

type ConversationSummary = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message: string;
};

export default function HistoryPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConversations() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("Brak zalogowanego użytkownika.");
        }

        const res = await fetch(
          `/api/supabase/conversations?summary=true&user_id=${encodeURIComponent(user.id)}`,
          { headers: await getAuthHeaders() }
        );
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setConversations(data.conversations ?? []);
      } catch (err: any) {
        setError(err.message ?? "Nie udało się pobrać historii.");
      } finally {
        setLoading(false);
      }
    }

    void loadConversations();
  }, []);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h1>📜 Historia rozmów</h1>
      <p style={{ color: "#94a3b8" }}>Wszystkie Twoje rozmowy z agentem.</p>

      {loading && <p>Ładuję historię...</p>}
      {error && <p style={{ color: "#f87171" }}>{error}</p>}

      {!loading && conversations.length === 0 && (
        <div style={{ marginTop: 24, padding: 24, background: "#111827", borderRadius: 16 }}>
          <p>Nie masz jeszcze żadnych rozmów. Zacznij nową!</p>
          <Link href="/chat" style={{ color: "#7dd3fc" }}>
            Przejdź do czatu
          </Link>
        </div>
      )}

      <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            style={{
              padding: 18,
              borderRadius: 18,
              background: "#0f172a",
              border: "1px solid #334155",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div>
                <Link href={`/history/${conversation.id}`} style={{ color: "#fff", fontSize: 18, fontWeight: 600, textDecoration: "none" }}>
                  {conversation.title || "Bez tytułu"}
                </Link>
                <p style={{ color: "#94a3b8", margin: "6px 0 0" }}>
                  Ostatnia aktywność: {new Date(conversation.updated_at).toLocaleString("pl-PL")}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: "#cbd5e1", margin: 0 }}>
                  Wiadomości: {conversation.message_count}
                </p>
              </div>
            </div>
            <p style={{ marginTop: 12, color: "#cbd5e1" }}>{conversation.last_message || "Brak podglądu."}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
