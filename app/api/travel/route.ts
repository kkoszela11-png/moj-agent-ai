import { google } from "@ai-sdk/google";
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { friendlyError } from "@/app/lib/createChatRoute";
import { agentTools, TRAVEL_SYSTEM_PROMPT } from "@/app/lib/agentTools";

const TRAVEL_MODEL = "gemini-3.1-flash-lite";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google(TRAVEL_MODEL),
    system: TRAVEL_SYSTEM_PROMPT,
    tools: agentTools,
    stopWhen: stepCountIs(10),
    maxSteps: 3,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    onError: friendlyError,
  });
}
