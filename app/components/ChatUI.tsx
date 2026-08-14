"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Nav from "./Nav";

type AttachedImage = { url: string; mediaType: string; filename?: string };

type Props = {
  api: string;
  title: string;
  subtitle?: string;
  placeholder?: string;
  /** Podpowiedzi — klik wpisuje tekst do pola input */
  suggestions?: string[];
  /** Czy renderować odpowiedzi asystenta jako markdown (tabele, listy) */
  markdown?: boolean;
  /** Czy pozwolić na załączanie obrazów (Ctrl+V, upload, drag&drop) */
  images?: boolean;
  /** Czy pokazywać oś czasu użytych narzędzi (dla trybu agenta) */
  showTools?: boolean;
  /** Czy pokazywać panel diagnostyczny */
  showDiagnostics?: boolean;
  /** Własny tekst pustego stanu */
  emptyHint?: string;
  /** Panel dostępnych narzędzi (etykiety), pokazywany pod nagłówkiem */
  toolsPanel?: string[];
  /** Bieżący identyfikator rozmowy */
  conversationId?: string;
  /** Wstępna historia wiadomości */
  initialMessages?: any[];
  /** Callback wywoływany przy każdej aktualizacji wiadomości */
  onMessagesUpdated?: (messages: any[]) => void;
  /** Callback przy wybraniu lub utworzeniu rozmowy */
  onConversationId?: (conversationId: string) => void;
};

const TOOL_EMOJI: Record<string, string> = {
  calculator: "🧮",
  currentDateTime: "🕐",
  generateImage: "🎨",
  getWeather: "☀️",
  getExchangeRate: "💱",
  getHolidays: "🎉",
  searchWikipedia: "📚",
  saveNote: "📝",
  getNotes: "📓",
  readWebPage: "📄",
  google_search: "🌐",
  url_context: "📄",
};

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB

export default function ChatUI({
  api,
  title,
  subtitle,
  placeholder = "Zadaj pytanie…",
  suggestions,
  markdown = false,
  images = false,
  showTools = false,
  showDiagnostics = false,
  emptyHint,
  toolsPanel,
  conversationId: conversationIdProp,
  initialMessages = [],
  onMessagesUpdated,
  onConversationId,
}: Props) {
  const transport = useMemo(() => new DefaultChatTransport({ api }), [api]);
  const { messages, sendMessage, status, setMessages } = useChat({ transport });
  const [input, setInput] = useState("");
  const [attached, setAttached] = useState<AttachedImage | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [imgError, setImgError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(conversationIdProp ?? null);
  const [userProfile, setUserProfile] = useState<{
    id: string;
    name: string | null;
    preferences: Record<string, string>;
  } | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [systemInstructions, setSystemInstructions] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedMessageIdsRef = useRef<Set<string>>(new Set());
  const initializedMessagesRef = useRef(false);

  const isLoading = status === "submitted" || status === "streaming";

  function getMessageText(message: any) {
    return (message.parts ?? [])
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join(" ")
      .trim();
  }

  function buildProfileInstructions(profile: {
    id: string;
    name: string | null;
    preferences: Record<string, string>;
  }) {
    if (!profile.name) {
      return "To nowy użytkownik. Przywitaj się po polsku i zapytaj, jak ma na imię.";
    }

    const prefs = profile.preferences || {};
    const city = prefs.miasto ? `Mieszka w ${prefs.miasto}.` : "";
    const food = prefs.ulubione_jedzenie ? `Lubi ${prefs.ulubione_jedzenie}.` : "";

    return `Użytkownik ma na imię ${profile.name}. ${city} ${food} Pamiętaj tę informację i w kolejnych odpowiedziach zwracaj się do niego po imieniu.`;
  }

  async function loadProfile(id: string) {
    const res = await fetch(`/api/supabase/user-profile?user_id=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!data.error) {
      setUserProfile(data);
      setSystemInstructions(buildProfileInstructions(data));
    }
    setProfileLoaded(true);
  }

  async function updateProfile(update: { name?: string; preferences?: Record<string, string> }) {
    if (!userId) return;
    const res = await fetch("/api/supabase/user-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, ...update }),
    });
    const data = await res.json();
    if (!data.error) {
      setUserProfile(data);
      setSystemInstructions(buildProfileInstructions(data));
    }
  }

  async function saveMessageToSupabase(message: any) {
    if (!conversationId) return;
    const content = getMessageText(message);
    if (!content) return;

    await fetch("/api/supabase/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: conversationId,
        role: message.role,
        content,
        id: message.id,
      }),
    });
  }

  function parseProfileUpdate(text: string) {
    const normalized = text.toLowerCase();
    const update: { name?: string; preferences?: Record<string, string> } = {};

    const nameMatch = text.match(/(?:mam na imię|nazywam się)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/i);
    if (nameMatch) {
      update.name = nameMatch[1];
    }

    const cityMatch = text.match(/(?:mieszkam w|jestem z)\s+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s-]+)/i);
    if (cityMatch) {
      update.preferences = {
        ...(update.preferences ?? {}),
        miasto: cityMatch[1].trim(),
      };
    }

    const foodMatch = text.match(/(?:lubię|uwielbiam|kocham)\s+([a-ząćęłńóśźż\s]+)/i);
    if (foodMatch) {
      update.preferences = {
        ...(update.preferences ?? {}),
        ulubione_jedzenie: foodMatch[1].trim(),
      };
    }

    return update;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    let storedUserId = window.localStorage.getItem("user_id");
    if (!storedUserId) {
      storedUserId = crypto.randomUUID();
      window.localStorage.setItem("user_id", storedUserId);
    }
    setUserId(storedUserId);
    loadProfile(storedUserId);

    const storedConversationId = window.localStorage.getItem("conversation_id");
    if (storedConversationId) {
      setConversationId(storedConversationId);
      if (onConversationId) {
        onConversationId(storedConversationId);
      }
    }
  }, [onConversationId]);

  useEffect(() => {
    if (!profileLoaded || initializedMessagesRef.current) return;
    const systemMessage = systemInstructions
      ? [
          {
            id: "system-profile",
            role: "system",
            parts: [{ type: "text", text: systemInstructions }],
          },
        ]
      : [];
    const mergedMessages = [...systemMessage, ...initialMessages];
    setMessages(mergedMessages);
    mergedMessages.forEach((message) => {
      if (message.id) {
        savedMessageIdsRef.current.add(message.id);
      }
    });
    initializedMessagesRef.current = true;
  }, [profileLoaded, systemInstructions, initialMessages, setMessages]);

  useEffect(() => {
    if (onMessagesUpdated) {
      onMessagesUpdated(messages);
    }
  }, [messages, onMessagesUpdated]);

  useEffect(() => {
    if (!conversationId || !profileLoaded || !initializedMessagesRef.current) return;
    const newMessages = messages.filter(
      (message) =>
        message.id &&
        !savedMessageIdsRef.current.has(message.id) &&
        (message.role === "user" || message.role === "assistant")
    );
    if (newMessages.length === 0) return;

    newMessages.forEach((message) => {
      const text = getMessageText(message);
      if (!text) {
        if (message.id) savedMessageIdsRef.current.add(message.id);
        return;
      }

      saveMessageToSupabase(message).catch((error) => {
        console.error("Błąd zapisu wiadomości do Supabase:", error);
      });

      if (message.role === "user") {
        const update = parseProfileUpdate(text);
        if (update.name || update.preferences) {
          updateProfile(update).catch((error) => {
            console.error("Błąd aktualizacji profilu użytkownika:", error);
          });
        }
      }

      if (message.id) {
        savedMessageIdsRef.current.add(message.id);
      }
    });
  }, [messages, conversationId, profileLoaded]);

  const diagnostics = useMemo(() => {
    const toolCounts: Record<string, number> = {};
    let errors = 0;
    let toolCalls = 0;

    messages.forEach((message) => {
      const toolParts = message.parts.filter(
        (p) =>
          typeof p.type === "string" &&
          ((p.type as string).startsWith("tool-") || p.type === "dynamic-tool")
      ) as Array<Record<string, unknown>>;

      toolParts.forEach((tp) => {
        const type = tp.type as string;
        const name =
          type === "dynamic-tool"
            ? (tp.toolName as string)
            : type.replace("tool-", "");
        toolCounts[name] = (toolCounts[name] ?? 0) + 1;
        toolCalls += 1;
        if (tp.state === "output-error") {
          errors += 1;
        }
      });
    });

    return { toolCounts, toolCalls, errors };
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  function readImageFile(file: File) {
    setImgError("");
    if (!file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setImgError("Max 4MB. Zrób screenshot fragmentu.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setAttached({
        url: reader.result as string,
        mediaType: file.type,
        filename: file.name,
      });
    reader.readAsDataURL(file);
  }

  function handlePaste(e: React.ClipboardEvent) {
    if (!images) return;
    const item = Array.from(e.clipboardData.items).find((i) =>
      i.type.startsWith("image/")
    );
    if (item) {
      const file = item.getAsFile();
      if (file) readImageFile(file);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!images) return;
    const file = e.dataTransfer.files?.[0];
    if (file) readImageFile(file);
  }

  async function ensureConversation() {
    if (conversationId) return conversationId;

    const title = input.trim().slice(0, 50) || "Nowa rozmowa";
    const response = await fetch("/api/supabase/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = await response.json();
    if (!data.error && data.id) {
      window.localStorage.setItem("conversation_id", data.id);
      setConversationId(data.id);
      if (onConversationId) {
        onConversationId(data.id);
      }
      return data.id;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if ((!text && !attached) || isLoading) return;

    const files = attached
      ? [
          {
            type: "file",
            mediaType: attached.mediaType,
            url: attached.url,
            filename: attached.filename,
          } as FileUIPart,
        ]
      : undefined;

    const ensuredId = await ensureConversation();
    if (!ensuredId) {
      return;
    }

    if (attached) {
      sendMessage({ text: text || "Opisz ten obraz.", files });
    } else {
      sendMessage({ text });
    }

    setInput("");
    setAttached(null);
  }

  return (
    <main
      onDragOver={
        images
          ? (e) => {
              e.preventDefault();
              setDragOver(true);
            }
          : undefined
      }
      onDragLeave={images ? () => setDragOver(false) : undefined}
      onDrop={images ? handleDrop : undefined}
      style={{
        maxWidth: 800,
        margin: "0 auto",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        padding: "0 16px",
        position: "relative",
      }}
    >
      {dragOver && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            background: "rgba(74,74,255,0.15)",
            border: "2px dashed #4a4aff",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            color: "#fff",
            pointerEvents: "none",
          }}
        >
          🖱️ Upuść obraz
        </div>
      )}

      <Nav />

      <header style={{ padding: "16px 0 8px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>{title}</h1>
        {subtitle && (
          <p style={{ color: "#888", fontSize: 14, marginTop: 4 }}>{subtitle}</p>
        )}
        {toolsPanel && toolsPanel.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {toolsPanel.map((t) => (
              <span
                key={t}
                style={{
                  padding: "4px 10px",
                  borderRadius: 20,
                  border: "1px solid #2a3a2a",
                  background: "#152015",
                  color: "#9ad19a",
                  fontSize: 12,
                }}
              >
                {t} ✅
              </span>
            ))}
          </div>
        )}
      </header>

      {showDiagnostics && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              padding: 14,
              borderRadius: 18,
              background: "#111622",
              border: "1px solid #283046",
            }}
          >
            <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 8 }}>🛠️ Kroki</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{diagnostics.toolCalls}</div>
            <div style={{ color: "#cbd5e1", marginTop: 4, fontSize: 13 }}>
              Narzędzia użyte: {Object.keys(diagnostics.toolCounts).length}
            </div>
            <div
              style={{
                marginTop: 12,
                height: 8,
                borderRadius: 999,
                background: "#1f2937",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, diagnostics.toolCalls * 10)}%`,
                  height: "100%",
                  background: diagnostics.toolCalls >= 7 ? "#f97316" : "#22c55e",
                  transition: "width 180ms ease",
                }}
              />
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 18,
              background: "#111622",
              border: "1px solid #283046",
            }}
          >
            <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 8 }}>📊 Narzędzia</div>
            {Object.entries(diagnostics.toolCounts).length > 0 ? (
              <div style={{ display: "grid", gap: 6 }}>
                {Object.entries(diagnostics.toolCounts).map(([name, count]) => (
                  <div key={name} style={{ display: "flex", justifyContent: "space-between", color: "#e2e8f0", fontSize: 13 }}>
                    <span>{TOOL_EMOJI[name] ?? "🔧"} {name}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "#6b7280", fontSize: 13 }}>Brak wywołań narzędzi.</div>
            )}
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 18,
              background: "#111622",
              border: "1px solid #283046",
            }}
          >
            <div style={{ color: "#9ca3af", fontSize: 12, marginBottom: 8 }}>🔔 Status</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: diagnostics.errors ? "#f87171" : "#34d399" }}>
              {isLoading ? "W trakcie…" : diagnostics.errors ? "⚠️ Błędy" : "✅ Ukończone"}
            </div>
            <div style={{ color: "#cbd5e1", marginTop: 4, fontSize: 13 }}>
              Błędy: {diagnostics.errors}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 0",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#888", textAlign: "center", marginTop: 24, whiteSpace: "pre-line" }}>
            {emptyHint || "Napisz coś, aby rozpocząć…"}
          </p>
        )}

        {messages.map((message) => {
          const isUser = message.role === "user";

          const text = message.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { text: string }).text)
            .join("");

          const imageParts = message.parts.filter(
            (p) =>
              p.type === "file" &&
              (p as FileUIPart).mediaType?.startsWith("image")
          ) as FileUIPart[];

          const sources = message.parts
            .filter((p) => p.type === "source-url")
            .map((p) => p as { url: string; title?: string });

          // Części narzędzi: "tool-<nazwa>" lub "dynamic-tool"
          const toolParts = message.parts.filter(
            (p) => p.type.startsWith("tool-") || p.type === "dynamic-tool"
          ) as Array<Record<string, unknown>>;

          return (
            <div
              key={message.id}
              className={markdown && !isUser ? "markdown" : undefined}
              style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "90%",
                padding: "10px 14px",
                borderRadius: 14,
                background: isUser ? "#2a2a3a" : "#1a1a2a",
                border: isUser ? "none" : "1px solid #333",
                whiteSpace: markdown && !isUser ? "normal" : "pre-wrap",
                lineHeight: 1.5,
                width: "fit-content",
              }}
            >
              {/* Oś czasu narzędzi */}
              {showTools &&
                toolParts.map((tp, i) => {
                  const type = tp.type as string;
                  const name =
                    type === "dynamic-tool"
                      ? (tp.toolName as string)
                      : type.replace("tool-", "");
                  const state = tp.state as string | undefined;
                  const done =
                    state === "output-available" || state === "output-error";
                  const output = tp.output as { image?: string } | undefined;
                  return (
                    <div
                      key={i}
                      style={{
                        margin: "4px 0",
                        padding: "6px 10px",
                        borderRadius: 8,
                        background: "#12121c",
                        border: "1px solid #2a2a3a",
                        fontSize: 13,
                        color: "#bbb",
                      }}
                    >
                      {done ? "✅" : "⏳"} {TOOL_EMOJI[name] || "🔧"} {name}
                      {output?.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={output.image}
                          alt="Wygenerowany obraz"
                          style={{
                            display: "block",
                            marginTop: 8,
                            maxWidth: 320,
                            width: "100%",
                            borderRadius: 8,
                          }}
                        />
                      )}
                    </div>
                  );
                })}

              {/* Załączone / wygenerowane obrazy */}
              {imageParts.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={img.url}
                  alt={img.filename || "obraz"}
                  style={{
                    display: "block",
                    maxWidth: 320,
                    width: "100%",
                    borderRadius: 8,
                    marginBottom: text ? 8 : 0,
                  }}
                />
              ))}

              {/* Tekst */}
              {markdown && !isUser ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
              ) : (
                text
              )}

              {/* Źródła */}
              {sources.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: "1px solid #333",
                    fontSize: 12,
                    color: "#888",
                  }}
                >
                  <div style={{ marginBottom: 4 }}>🔗 Źródła:</div>
                  <ol style={{ paddingLeft: 18, margin: 0 }}>
                    {sources.map((s, i) => (
                      <li key={i} style={{ margin: "2px 0" }}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#7aa2ff" }}
                        >
                          {s.title || s.url}
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          );
        })}

        {status === "submitted" && (
          <div
            style={{
              alignSelf: "flex-start",
              padding: "10px 14px",
              borderRadius: 14,
              background: "#1a1a2a",
              border: "1px solid #333",
              color: "#888",
            }}
          >
            Myślę…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {suggestions && suggestions.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingBottom: 8 }}>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInput(s)}
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
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Podgląd załączonego obrazu */}
      {attached && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingBottom: 8,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attached.url}
            alt="załącznik"
            style={{ maxHeight: 120, borderRadius: 8, border: "1px solid #333" }}
          />
          <span style={{ fontSize: 13, color: "#888" }}>
            📎 Załączono obraz — zadaj pytanie
          </span>
          <button
            type="button"
            onClick={() => setAttached(null)}
            style={{
              border: "none",
              background: "#333",
              color: "#fff",
              borderRadius: 6,
              width: 24,
              height: 24,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {imgError && (
        <p style={{ color: "#ff9a9a", fontSize: 13, paddingBottom: 6 }}>{imgError}</p>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: 8,
          padding: "0 0 20px",
          borderTop: "1px solid #333",
          paddingTop: 12,
        }}
      >
        {images && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readImageFile(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Załącz obraz"
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #333",
                background: "#151515",
                color: "#ccc",
                fontSize: 16,
                cursor: "pointer",
              }}
            >
              📎
            </button>
          </>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #333",
            background: "#151515",
            color: "#ededed",
            fontSize: 15,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={isLoading || (!input.trim() && !attached)}
          style={{
            padding: "12px 20px",
            borderRadius: 10,
            border: "none",
            background:
              isLoading || (!input.trim() && !attached) ? "#333" : "#4a4aff",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor:
              isLoading || (!input.trim() && !attached) ? "default" : "pointer",
          }}
        >
          {isLoading ? "…" : "Wyślij"}
        </button>
      </form>
    </main>
  );
}
