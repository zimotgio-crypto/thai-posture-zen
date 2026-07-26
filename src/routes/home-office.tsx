import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_STUDIO_SLUG } from "@/lib/studio";

// Legacy link target (WhatsApp, printed material) → pilot studio page.
export const Route = createFileRoute("/home-office")({
  beforeLoad: () => {
    throw redirect({
      to: "/$studioSlug/home-office",
      params: { studioSlug: DEFAULT_STUDIO_SLUG },
      replace: true,
    });
  },
});