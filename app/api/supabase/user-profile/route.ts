import { createSupabaseServerClient } from "@/app/lib/supabaseServer";
import { getAuthenticatedUserId, unauthorizedResponse } from "@/app/lib/authServer";

const MAX_STEPS = 3;

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  const userId = await getAuthenticatedUserId(req);

  if (!userId) {
    return unauthorizedResponse();
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, display_name, preferences")
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
    .insert({ id: userId, display_name: null, preferences: {} })
    .select("id, display_name, preferences")
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
  const supabase = createSupabaseServerClient();
  const userId = await getAuthenticatedUserId(req);

  if (!userId) {
    return unauthorizedResponse();
  }

  const body = await req.json();
  const displayName = body.display_name as string | null | undefined;
  const legacyName = body.name as string | undefined;
  const preferences = body.preferences as Record<string, string> | undefined;

  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id, display_name, preferences")
    .eq("id", userId)
    .maybeSingle();

  const mergedPreferences = existing?.preferences && preferences
    ? { ...existing.preferences, ...preferences }
    : preferences ?? existing?.preferences ?? {};

  const payload: Record<string, unknown> = {
    id: userId,
    preferences: mergedPreferences,
  };

  if (displayName !== undefined) {
    payload.display_name = displayName;
  } else if (legacyName) {
    payload.display_name = legacyName;
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id, display_name, preferences")
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
