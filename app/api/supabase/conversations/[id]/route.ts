import { createSupabaseServerClient } from "@/app/lib/supabaseServer";

export async function GET(req: Request, context: any) {
  const supabase = createSupabaseServerClient();
  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");
  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing user_id query parameter." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const params = await context.params;
  const conversationId = params?.id as string;
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (conversationError) {
    return new Response(JSON.stringify({ error: conversationError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!conversation) {
    return new Response(JSON.stringify({ error: "Conversation not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return new Response(JSON.stringify({ error: messagesError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ conversation, messages: messages ?? [] }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export async function DELETE(req: Request, context: any) {
  const supabase = createSupabaseServerClient();
  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");
  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing user_id query parameter." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const params = await context.params;
  const conversationId = params?.id as string;

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
    return new Response(JSON.stringify({ error: "Conversation not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error: deleteMessagesError } = await supabase
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId);

  if (deleteMessagesError) {
    return new Response(JSON.stringify({ error: deleteMessagesError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error: deleteConversationError } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", userId);

  if (deleteConversationError) {
    return new Response(JSON.stringify({ error: deleteConversationError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
