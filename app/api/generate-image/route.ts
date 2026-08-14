import { generateImageData } from "@/app/lib/imageGen";
import { friendlyError } from "@/app/lib/createChatRoute";

const MAX_STEPS = 3;

export const maxDuration = 60;

export async function POST(req: Request) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return Response.json({ error: "Podaj opis obrazu." }, { status: 400 });
  }

  try {
    const { image, text, model } = await generateImageData(prompt);
    return Response.json({ image, text, model });
  } catch (e) {
    return Response.json({ error: friendlyError(e) }, { status: 500 });
  }
}
