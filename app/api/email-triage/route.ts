import { google } from "@ai-sdk/google";
import { streamText } from "ai";

export const maxDuration = 60;

const EMAIL_TRIAGE_SYSTEM_PROMPT = `Jesteś profesjonalnym asystentem do zarządzania pocztą.

Dla KAŻDEGO maila wykonaj:
1. 📧 KATEGORYZACJA: określ typ (zapytanie ofertowe / reklamacja / spam / informacja / prośba o spotkanie)
2. 🔴🟡🟢 PRIORYTET: Wysoki (wymaga odpowiedzi dziś) / Średni (w ciągu 3 dni) / Niski (może poczekać)
3. ✍️ DRAFT: Napisz krótki, profesjonalny szkic odpowiedzi (3-5 zdań)

FORMAT ODPOWIEDZI:
Dla każdego maila:

### Mail [numer]: [krótki temat]
| Kategoria | [typ] |
| Priorytet | [🔴 Wysoki / 🟡 Średni / 🟢 Niski] |
| Uzasadnienie | [dlaczego ten priorytet] |

**Proponowana odpowiedź:**
> [draft odpowiedzi]

---

Na końcu: PODSUMOWANIE
- 🔴 Pilne: [ile] maili
- 🟡 Średnie: [ile] maili
- 🟢 Niskie: [ile] maili
- ✅ Rekomendacja: [który mail obsłużyć najpierw]`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const emails = body?.emails;

    if (
      !Array.isArray(emails) ||
      emails.length === 0 ||
      emails.some((email: unknown) => typeof email !== "string" || !email.trim())
    ) {
      return Response.json(
        { error: "Pole emails musi być niepustą tablicą tekstów maili." },
        { status: 400 }
      );
    }

    const emailContext = emails
      .map((email: string, index: number) => `Mail ${index + 1}:
${email.trim()}`)
      .join("\n\n");

    const result = streamText({
      model: google("gemini-3.1-flash-lite"),
      system: EMAIL_TRIAGE_SYSTEM_PROMPT,
      prompt: emailContext,
    });

    return result.toTextStreamResponse();
  } catch {
    return Response.json({ error: "Nieprawidłowe dane JSON." }, { status: 400 });
  }
}