import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_STUDIO_SLUG } from "@/lib/studio";

// Legacy link target → pilot studio contact page.
export const Route = createFileRoute("/kontakt")({
  beforeLoad: () => {
    throw redirect({
      to: "/$studioSlug/kontakt",
      params: { studioSlug: DEFAULT_STUDIO_SLUG },
      replace: true,
    });
  },
});