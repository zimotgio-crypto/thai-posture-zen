// WhatsApp Cloud API webhook receiver.
// GET  -> Meta verification handshake.
// POST -> incoming messages/status updates. Always responds 200 to Meta.
import { createFileRoute } from "@tanstack/react-router";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(
  rawBody: string,
  header: string | null,
  appSecret: string,
): Promise<{ ok: boolean; providedPrefix: string; expectedPrefix: string }> {
  const provided = (header ?? "").startsWith("sha256=")
    ? header!.slice("sha256=".length).trim().toLowerCase()
    : "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = toHex(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)),
  );
  return {
    ok: timingSafeEqualHex(provided, expected),
    providedPrefix: provided.slice(0, 10),
    expectedPrefix: expected.slice(0, 10),
  };
}

export const Route = createFileRoute("/api/public/whatsapp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const expected = process.env.WHATSAPP_VERIFY_TOKEN;
        if (mode === "subscribe" && token && expected && token === expected) {
          return new Response(challenge ?? "", { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        const rawBody = await request.text();
        console.log(
          `[whatsapp webhook] POST received at ${new Date().toISOString()} rawBodyLength=${rawBody.length} hasSignature=${Boolean(
            request.headers.get("x-hub-signature-256"),
          )}`,
        );

        const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
        if (!appSecret) {
          console.error("[whatsapp webhook] WHATSAPP_APP_SECRET not set — rejecting");
          return new Response("Forbidden", { status: 403 });
        }
        const signature = request.headers.get("x-hub-signature-256");
        const check = await verifySignature(rawBody, signature, appSecret);
        if (!check.ok) {
          console.error(
            `[whatsapp webhook] invalid signature secretLength=${appSecret.length} providedPrefix=${check.providedPrefix} expectedPrefix=${check.expectedPrefix}`,
          );
          return new Response("Forbidden", { status: 403 });
        }

        try {
          const body = JSON.parse(rawBody) as {
            entry?: Array<{
              changes?: Array<{
                value?: {
                  metadata?: { phone_number_id?: string };
                  messages?: Array<Record<string, unknown>>;
                };
              }>;
            }>;
          };
          // Each change carries the receiving number id -> resolves the studio.
          const batches: { phoneNumberId: string; messages: Record<string, unknown>[] }[] = [];
          for (const entry of body.entry ?? []) {
            for (const change of entry.changes ?? []) {
              const messages = change.value?.messages ?? [];
              if (messages.length === 0) continue;
              batches.push({
                phoneNumberId: change.value?.metadata?.phone_number_id ?? "",
                messages,
              });
            }
          }
          if (batches.length > 0) {
            const [{ handleIncomingMessage }, { getStudioByWhatsappPhoneNumberId }] =
              await Promise.all([
                import("@/lib/whatsapp-dialog.server"),
                import("@/lib/studio.server"),
              ]);
            for (const batch of batches) {
              const studio = batch.phoneNumberId
                ? await getStudioByWhatsappPhoneNumberId(batch.phoneNumberId)
                : null;
              if (!studio) {
                console.error(
                  `[whatsapp webhook] no studio for phone_number_id=${batch.phoneNumberId || "(missing)"} — ignoring ${batch.messages.length} message(s)`,
                );
                continue;
              }
              for (const m of batch.messages) {
                try {
                  await handleIncomingMessage(m, studio);
                } catch (err) {
                  console.error("[whatsapp webhook] handler error", err);
                }
              }
            }
          }
        } catch (err) {
          console.error("[whatsapp webhook] parse error", err);
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
