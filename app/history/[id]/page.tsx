"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

type MessageItem = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

type ConversationDetails = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export default function HistoryDetailsPage() {
  const params = useParams();
  const conversationId = params?.id as string;
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!data.user) {
          throw new Error("Brak zalogowanego użytkownika.");
        }

        return fetch(
          `/api/supabase/conversations/${conversationId}?user_id=${encodeURIComponent(data.user.id)}`
        );
      })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error);
        }
        setConversation(data.conversation);
        setMessages(data.messages ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [conversationId]);

  if (!conversationId) {
    return <p>Brak identyfikatora rozmowy.</p>;
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <Link href="/history" style={{ color: "#7dd3fc" }}>
        ← Wróć do historii
      </Link>

      {loading && <p>Ładuję rozmowę...</p>}
      {error && <p style={{ color: "#f87171" }}>{error}</p>}

      {conversation && (
        <div style={{ marginTop: 16 }}>
          <h1>{conversation.title || "Bez tytułu"}</h1>
          <p style={{ color: "#94a3b8" }}>
            Rozpoczęto: {new Date(conversation.created_at).toLocaleString("pl-PL")}
          </p>

          <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  padding: 14,
                  borderRadius: 16,
                  background: message.role === "user" ? "#1f2937" : "#111827",
                  border: "1px solid #334155",
                  color: "#e2e8f0",
                }}
              >
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
                  {message.role} · {new Date(message.created_at).toLocaleTimeString("pl-PL")}
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
