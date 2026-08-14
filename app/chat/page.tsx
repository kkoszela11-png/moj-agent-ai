"use client";

import ChatUI from "@/app/components/ChatUI";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

type UIMessage = any;

type ConversationSummary = {
  id: string;
  title: string;
};

export default function ChatPage() {
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversationTitle, setConversationTitle] = useState<string>("Nowa rozmowa");

  useEffect(() => {
    async function loadConversation() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const userId = encodeURIComponent(user.id);
        const lastRes = await fetch(`/api/supabase/conversations?last=true&user_id=${userId}`);
        const lastData = await lastRes.json();
        if (lastData.conversations?.length > 0) {
          const conversation = lastData.conversations[0];
          setConversationId(conversation.id);
          setConversationTitle(conversation.title || "Nowa rozmowa");

          const messagesRes = await fetch(`/api/supabase/conversations/${conversation.id}?user_id=${userId}`);
          const messagesData = await messagesRes.json();
          if (!messagesData.error) {
            const loadedMessages = messagesData.messages.map((message: any) => ({
              id: message.id,
              role: message.role,
              parts: [{ type: "text", text: message.content }],
            }));
            setInitialMessages(loadedMessages);
          }
        }
      } catch (error) {
        console.error("Nie udało się załadować ostatniej rozmowy:", error);
      } finally {
        setLoading(false);
      }
    }

    loadConversation();
  }, []);

  return (
    <div style={{ minHeight: "100dvh" }}>
      <ChatUI
        api="/api/chat"
        title="💬 Chat AI"
        subtitle={conversationId ? `Rozmowa: ${conversationTitle}` : "Rozmowa z modelem Gemini — szybki tryb czatu"}
        placeholder="Zadaj pytanie…"
        images
        suggestions={[]}
        conversationId={conversationId}
        initialMessages={initialMessages}
      />
      {loading && (
        <div style={{ position: "fixed", left: 16, bottom: 16, color: "#cbd5e1" }}>
          Ładuję historię rozmów...
        </div>
      )}
    </div>
  );
}
