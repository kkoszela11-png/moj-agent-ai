import { supabase } from "@/app/lib/supabase";

const MAX_STEPS = 3;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");

  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing user_id query parameter." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, name, preferences")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (data) {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: created, error: createError } = await supabase
    .from("user_profiles")
    .insert({ id: userId, preferences: {} })
    .select("id, name, preferences")
    .maybeSingle();

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(created), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const userId = body.user_id as string | undefined;
  const name = body.name as string | undefined;
  const preferences = body.preferences as Record<string, string> | undefined;

  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing user_id in request body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id, name, preferences")
    .eq("id", userId)
    .maybeSingle();

  const mergedPreferences = existing?.preferences && preferences
    ? { ...existing.preferences, ...preferences }
    : preferences ?? existing?.preferences ?? {};

  const payload: Record<string, unknown> = {
    id: userId,
    preferences: mergedPreferences,
  };

  if (name) {
    payload.name = name;
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id, name, preferences")
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
