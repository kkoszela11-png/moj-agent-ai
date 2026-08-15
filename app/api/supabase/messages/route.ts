import { createSupabaseServerClient } from "@/app/lib/supabaseServer";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/app/lib/authServer";

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return unauthorizedResponse();
  }

  const body = await req.json();
  const conversationId = body.conversation_id as string | undefined;
  const messageId = body.id as string | undefined;
  const role = body.role as string | undefined;
  const content = body.content as string | undefined;

  if (!conversationId || !role || content === undefined) {
    return new Response(
      JSON.stringify({ error: "Missing conversation_id, role, or content in request body." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const { data: existingConversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (conversationError) {
    return new Response(JSON.stringify({ error: conversationError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!existingConversation) {
    return new Response(JSON.stringify({ error: "Conversation not found for this user." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const id = messageId && isUuid(messageId) ? messageId : crypto.randomUUID();
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const maxAttempts = 3;
  let attempt = 0;
  try {
    for (attempt = 1; attempt <= maxAttempts; attempt++) {
      const { error: insertError } = await supabase
        .from("messages")
        .upsert(
          {
            id,
            conversation_id: conversationId,
            role,
            content,
          },
          { onConflict: "id" }
        );

      if (!insertError) {
        if (attempt > 1) console.log(`Supabase upsert succeeded on attempt ${attempt}`);
        break;
      }

      // Log and decide whether to retry
      console.warn(`Supabase insert error (attempt ${attempt}):`, insertError);

      if (attempt < maxAttempts) {
        const backoff = 200 * Math.pow(2, attempt - 1); // 200ms, 400ms, ...
        await sleep(backoff);
        continue;
      }

      // All attempts failed
      console.error("Supabase insert error after retries:", insertError);
      return new Response(JSON.stringify({ error: insertError.message, details: insertError }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error('Exception during supabase upsert:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("user_id", userId);

  return new Response(JSON.stringify({ id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
