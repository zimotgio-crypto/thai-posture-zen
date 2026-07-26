// WhatsApp Cloud API helpers.
// Server-only: filename suffix `.server.ts` keeps this out of client bundles.

const GRAPH_VERSION = "v20.0";

function apiBase(): string {
  const id = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return `https://graph.facebook.com/${GRAPH_VERSION}/${id}`;
}

function accessToken(): string {
  return process.env.WHATSAPP_ACCESS_TOKEN ?? "";
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

async function post(payload: Record<string, unknown>): Promise<void> {
  if (!isWhatsAppConfigured()) {
    console.error("[whatsapp] not configured, cannot send message");
    return;
  }
  try {
    const res = await fetch(`${apiBase()}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[whatsapp] send failed ${res.status}: ${text}`);
    }
  } catch (err) {
    console.error("[whatsapp] send exception", err);
  }
}

export async function sendText(to: string, body: string): Promise<void> {
  await post({
    to,
    type: "text",
    text: { preview_url: true, body: body.slice(0, 4096) },
  });
}

export type ReplyButton = { id: string; title: string };

// WhatsApp allows a maximum of 3 quick-reply buttons.
export async function sendButtons(to: string, body: string, buttons: ReplyButton[]): Promise<void> {
  await post({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body.slice(0, 1024) },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

export type ListRow = { id: string; title: string; description?: string };

// Interactive list; single section is enough for our flows.
export async function sendList(
  to: string,
  body: string,
  buttonLabel: string,
  rows: ListRow[],
  sectionTitle = "Auswahl",
): Promise<void> {
  await post({
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body.slice(0, 1024) },
      action: {
        button: buttonLabel.slice(0, 20),
        sections: [
          {
            title: sectionTitle.slice(0, 24),
            rows: rows.slice(0, 10).map((r) => ({
              id: r.id.slice(0, 200),
              title: r.title.slice(0, 24),
              description: r.description?.slice(0, 72),
            })),
          },
        ],
      },
    },
  });
}

// ============ Incoming payload types ============

export type IncomingText = { kind: "text"; text: string };
export type IncomingButton = { kind: "button"; id: string; title: string };
export type IncomingList = { kind: "list"; id: string; title: string };
export type IncomingIgnored = { kind: "ignored" };
export type Incoming = IncomingText | IncomingButton | IncomingList | IncomingIgnored;

export function extractIncoming(msg: Record<string, unknown>): Incoming {
  const type = msg.type as string | undefined;
  if (type === "text") {
    const t = (msg.text as { body?: string } | undefined)?.body ?? "";
    return { kind: "text", text: t };
  }
  if (type === "interactive") {
    const inter = msg.interactive as
      | { type?: string; button_reply?: { id: string; title: string }; list_reply?: { id: string; title: string } }
      | undefined;
    if (inter?.type === "button_reply" && inter.button_reply) {
      return { kind: "button", id: inter.button_reply.id, title: inter.button_reply.title };
    }
    if (inter?.type === "list_reply" && inter.list_reply) {
      return { kind: "list", id: inter.list_reply.id, title: inter.list_reply.title };
    }
  }
  return { kind: "ignored" };
}

// ============ Session store ============

export type SessionState =
  | "idle"
  | "menu"
  | "choose_treatment"
  | "choose_duration"
  | "choose_date"
  | "choose_time"
  | "confirm";

export type SessionDraft = {
  clientId?: string;
  clientFirstName?: string;
  treatmentId?: string;
  durationMinutes?: number;
  day?: string;
  time?: string;
  // paging for time selection
  timePage?: number;
};

export type Session = {
  studioId: string;
  phone: string;
  state: SessionState;
  draft: SessionDraft;
  updatedAt: string;
};

const SESSION_TTL_MIN = 30;

export async function loadSession(studioId: string, phone: string): Promise<Session> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("whatsapp_sessions")
    .select("phone, state, draft, updated_at")
    .eq("studio_id", studioId)
    .eq("phone", phone)
    .maybeSingle();
  if (!data) {
    return { studioId, phone, state: "idle", draft: {}, updatedAt: new Date().toISOString() };
  }
  const updated = new Date(data.updated_at as string).getTime();
  const expired = Date.now() - updated > SESSION_TTL_MIN * 60 * 1000;
  if (expired) {
    return { studioId, phone, state: "idle", draft: {}, updatedAt: new Date().toISOString() };
  }
  return {
    studioId,
    phone,
    state: (data.state as SessionState) ?? "idle",
    draft: (data.draft as SessionDraft) ?? {},
    updatedAt: data.updated_at as string,
  };
}

export async function saveSession(
  studioId: string,
  phone: string,
  state: SessionState,
  draft: SessionDraft,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("whatsapp_sessions").upsert(
    { studio_id: studioId, phone, state, draft, updated_at: new Date().toISOString() },
    { onConflict: "studio_id,phone" },
  );
  if (error) console.error("[whatsapp] saveSession error", error.message);
}

export async function resetSession(studioId: string, phone: string): Promise<void> {
  await saveSession(studioId, phone, "idle", {});
}