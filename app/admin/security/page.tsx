import { createSupabaseServerClient } from "@/app/lib/supabaseServer";

type SecurityEvent = {
  id: string;
  created_at: string;
  user_id: string | null;
  attack_type: string;
  blocked: boolean;
  detail: string | null;
};

async function loadSecurityEvents(): Promise<{ events: SecurityEvent[]; error: string | null }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("security_events")
      .select("id, created_at, user_id, attack_type, blocked, detail")
      .order("created_at", { ascending: false });

    if (error) {
      return { events: [], error: error.message };
    }

    return { events: (data as SecurityEvent[]) ?? [], error: null };
  } catch (e) {
    return { events: [], error: (e as Error).message };
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });
}

export default async function SecurityAdminPage() {
  const { events, error } = await loadSecurityEvents();
  const blockedCount = events.filter((event) => event.blocked).length;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1>🛡️ Panel bezpieczeństwa</h1>
      <p style={{ color: "#94a3b8" }}>Rejestr zdarzeń bezpieczeństwa agenta (security_events).</p>

      <div
        style={{
          marginTop: 16,
          marginBottom: 24,
          padding: 20,
          background: "#111827",
          borderRadius: 16,
          display: "inline-block",
        }}
      >
        <div style={{ color: "#94a3b8", fontSize: 14 }}>Zablokowanych ataków łącznie</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#f87171" }}>{blockedCount}</div>
      </div>

      {error && <p style={{ color: "#f87171" }}>Błąd pobierania danych: {error}</p>}

      {!error && events.length === 0 && (
        <div style={{ padding: 24, background: "#111827", borderRadius: 16 }}>
          <p>Brak zarejestrowanych zdarzeń bezpieczeństwa.</p>
        </div>
      )}

      {!error && events.length > 0 && (
        <div style={{ overflowX: "auto", background: "#111827", borderRadius: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #1f2937" }}>
                <th style={{ padding: 12, color: "#94a3b8" }}>Data</th>
                <th style={{ padding: 12, color: "#94a3b8" }}>User ID</th>
                <th style={{ padding: 12, color: "#94a3b8" }}>Typ ataku</th>
                <th style={{ padding: 12, color: "#94a3b8" }}>Zablokowany</th>
                <th style={{ padding: 12, color: "#94a3b8" }}>Szczegóły</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} style={{ borderBottom: "1px solid #1f2937" }}>
                  <td style={{ padding: 12, whiteSpace: "nowrap" }}>{formatDate(event.created_at)}</td>
                  <td style={{ padding: 12, fontFamily: "monospace" }}>{event.user_id ?? "anonymous"}</td>
                  <td style={{ padding: 12 }}>{event.attack_type}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{ color: event.blocked ? "#f87171" : "#4ade80" }}>
                      {event.blocked ? "✅ tak" : "❌ nie"}
                    </span>
                  </td>
                  <td style={{ padding: 12, color: "#94a3b8" }}>{event.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
