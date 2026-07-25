// WhatsApp Cloud API webhook receiver.
// GET  -> Meta verification handshake.
// POST -> incoming messages/status updates. Always responds 200 to Meta.
import { createFileRoute } from "@tanstack/react-router";

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
        try {
          const body = (await request.json()) as {
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
