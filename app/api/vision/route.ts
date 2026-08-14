import { createChatRoute } from "@/app/lib/createChatRoute";

const MAX_STEPS = 3;

export const maxDuration = 30;

// Model (flash-lite) obsługuje obrazy natywnie — convertToModelMessages
// zamienia załączone obrazy (file parts) na multimodalną wiadomość.
export const POST = createChatRoute(`Jesteś asystentem analizującym obrazy i screenshoty.
- Dokładnie opisuj, co widzisz na obrazie.
- Gdy użytkownik prosi o tekst — wyciągnij CAŁY tekst z obrazu (OCR).
- Gdy prosi o kolory — podaj kody HEX dominujących kolorów.
- Gdy to screenshot błędu/kodu — wyjaśnij problem i zaproponuj rozwiązanie.
- Odpowiadaj po polsku, konkretnie. Jeśli nie ma obrazu, poproś o załączenie.`);
