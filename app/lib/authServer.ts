import { createClient } from "@supabase/supabase-js";

/**
 * Verifies the Supabase access token from the "Authorization: Bearer <token>" header
 * against Supabase Auth and returns the authenticated user's id.
 * Never trust a client-supplied user_id from the request body/query string instead of this.
 */
export async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return null;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export function unauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: "Brak autoryzacji. Zaloguj się ponownie." }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
