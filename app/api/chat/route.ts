import { createChatRoute } from "@/app/lib/createChatRoute";

const MAX_STEPS = 3;

export const maxDuration = 30;

export const POST = createChatRoute(
  "Jesteś pomocnym asystentem AI. Odpowiadaj po polsku, zwięźle i konkretnie."
);
