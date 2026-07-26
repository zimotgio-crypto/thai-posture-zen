// WhatsApp Cloud API webhook receiver.
// GET  -> Meta verification handshake.
// POST -> incoming messages/status updates. Always responds 200 to Meta.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const provided = header.slice("sha256=".length).trim();
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
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

        const appSecret = process.env.WHATSAPP_APP_SECRET;
        if (!appSecret) {
          console.error("[whatsapp webhook] WHATSAPP_APP_SECRET not set — rejecting");
          return new Response("Forbidden", { status: 403 });
        }
        const signature = request.headers.get("x-hub-signature-256");
        if (!verifySignature(rawBody, signature, appSecret)) {
          console.error("[whatsapp webhook] invalid signature");
          return new Response("Forbidden", { status: 403 });
        }

        try {
          const body = JSON.parse(rawBody) as {
            entry?: Array<{
              changes?: Array<{
                value?: { messages?: Array<Record<string, unknown>> };
              }>;
            }>;
          };
          const messages: Record<string, unknown>[] = [];
          for (const entry of body.entry ?? []) {
            for (const change of entry.changes ?? []) {
              for (const m of change.value?.messages ?? []) messages.push(m);
            }
          }
          if (messages.length > 0) {
            const { handleIncomingMessage } = await import("@/lib/whatsapp-dialog.server");
            for (const m of messages) {
              try {
                await handleIncomingMessage(m);
              } catch (err) {
                console.error("[whatsapp webhook] handler error", err);
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
