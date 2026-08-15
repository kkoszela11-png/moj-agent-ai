import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { createSupabaseServerClient } from "@/app/lib/supabaseServer";

const MAX_MESSAGE_LENGTH = 2000;

const BLOCKED_PHRASES = [
  "ignore previous",
  "system prompt",
  "ignore instructions",
  "reveal",
  "show me your",
  "translate your prompt",
];

const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/g;
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF]/g;

export const BLOCKED_MESSAGE = "Ta wiadomość została zablokowana z powodów bezpieczeństwa.";

/** Usuwa znaki kontrolne i zero-width spaces, których można użyć do ukrycia instrukcji. */
export function sanitizeText(text: string): string {
  return text.replace(CONTROL_CHARS_REGEX, "").replace(ZERO_WIDTH_REGEX, "");
}

export type ValidationResult =
  | { blocked: false; sanitized: string }
  | { blocked: true; reason: string };

export function validateChatInput(rawText: string): ValidationResult {
  const sanitized = sanitizeText(rawText);

  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    return { blocked: true, reason: `too long: ${sanitized.length} chars` };
  }

  const lower = sanitized.toLowerCase();
  const matchedPhrase = BLOCKED_PHRASES.find((phrase) => lower.includes(phrase));
  if (matchedPhrase) {
    return { blocked: true, reason: `blacklist: ${matchedPhrase}` };
  }

  return { blocked: false, sanitized };
}

/** Zapisuje próbę ataku/blokady do Supabase; błąd zapisu nie przerywa odpowiedzi dla usera. */
export async function logSecurityEvent(params: {
  userId: string | null;
  attackType: string;
  blocked: boolean;
  detail: string;
}) {
  try {
    const supabase = createSupabaseServerClient();
    await supabase.from("security_events").insert({
      user_id: params.userId ?? "anonymous",
      attack_type: params.attackType,
      blocked: params.blocked,
      detail: params.detail,
    });
  } catch (e) {
    console.error("Nie udało się zapisać security_events:", e);
  }
}

/** Buduje odpowiedź w formacie UI Message Stream, żeby komunikat blokady wyświetlił się jak zwykła odpowiedź asystenta. */
export function createBlockedResponse(message: string = BLOCKED_MESSAGE): Response {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const id = crypto.randomUUID();
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: message });
      writer.write({ type: "text-end", id });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
