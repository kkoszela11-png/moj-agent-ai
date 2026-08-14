import { supabase } from "@/app/lib/supabase";

const MAX_STEPS = 3;

function serializeConversationRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const last = url.searchParams.get("last") === "true";
  const summary = url.searchParams.get("summary") === "true";

  const query = supabase
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false });

  const { data, error } = last
    ? await query.limit(1)
    : await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!summary) {
    return new Response(JSON.stringify({ conversations: data ?? [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const conversationIds = (data ?? []).map((conversation) => conversation.id);
  if (conversationIds.length === 0) {
    return new Response(JSON.stringify({ conversations: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("conversation_id, content")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  if (messagesError) {
    return new Response(JSON.stringify({ error: messagesError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const grouped = (messages ?? []).reduce((acc: Record<string, { message_count: number; last_message: string }>, message) => {
    const group = acc[message.conversation_id] || { message_count: 0, last_message: "" };
    group.message_count += 1;
    if (!group.last_message) {
      group.last_message = message.content;
    }
    acc[message.conversation_id] = group;
    return acc;
  }, {});

  const conversations = (data ?? []).map((conversation) => ({
    ...serializeConversationRow(conversation),
    message_count: grouped[conversation.id]?.message_count ?? 0,
    last_message: grouped[conversation.id]?.last_message ?? "",
  }));

  return new Response(JSON.stringify({ conversations }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const title = (body.title as string | undefined) ?? "Nowa rozmowa";

  const { data, error } = await supabase
    .from("conversations")
    .insert({ title })
    .select("id, title, created_at, updated_at")
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
