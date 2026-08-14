import { GoogleGenAI, Modality } from "@google/genai";

/**
 * Kandydaci na model obrazowy. Instrukcja podaje "gemini-3.1-flash-lite-image"
 * (Nano Banana 2 Lite), ale nazwa może się różnić — próbujemy po kolei i bierzemy
 * pierwszy, który zwróci obraz. Do weryfikacji na żywo (limit darmowego planu).
 */
export const IMAGE_MODELS = [
  "gemini-3.1-flash-lite-image", // z instrukcji warsztatu (Nano Banana 2 Lite)
];

export type ImageResult = { image: string; text: string; model: string };

/**
 * Darmowy fallback — Pollinations.ai (bez klucza, bez karty).
 * Zwraca gotowy obraz jako data URL. Losowy seed = inny wynik przy "Ponownie".
 */
async function generateWithPollinations(prompt: string): Promise<ImageResult> {
  const seed = Math.floor(Math.random() * 1_000_000);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=768&height=768&nologo=true&seed=${seed}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(45_000) });
  if (!res.ok) {
    throw new Error(`Pollinations HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") || "image/jpeg";
  return {
    image: `data:${mime};base64,${buf.toString("base64")}`,
    text: "Wygenerowano darmowym providerem (Pollinations.ai).",
    model: "pollinations.ai",
  };
}

/**
 * Generuje obraz z opisu. Najpierw próbuje modeli Google (działają przy włączonym
 * billingu), a jeśli się nie uda — używa darmowego providera Pollinations.ai.
 * Zwraca data URL (base64) lub rzuca błędem.
 */
export async function generateImageData(prompt: string): Promise<ImageResult> {
  const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  for (const model of IMAGE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
      });

      let image: string | null = null;
      let text = "";
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        const inlineData = part.inlineData as
          | { data?: string; mimeType?: string }
          | undefined;
        if (inlineData?.data) {
          image = `data:${inlineData.mimeType || "image/png"};base64,${inlineData.data}`;
        } else if (typeof part.text === "string") {
          text += part.text;
        }
      }

      if (image) return { image, text, model };
    } catch {
      // model Google niedostępny (np. limit 0 / billing) — próbujemy dalej
    }
  }

  // Żaden model Google nie zadziałał → darmowy fallback
  return generateWithPollinations(prompt);
}
