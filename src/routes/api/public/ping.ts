// Minimal server-route smoke test: GET -> "pong" (text/plain, 200).
// Same shape and file placement as src/routes/sitemap[.]xml.ts.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ping")({
  server: {
    handlers: {
      GET: async () =>
        new Response("pong", {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
    },
  },
});