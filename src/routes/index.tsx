import { createFileRoute, redirect } from "@tanstack/react-router";
import { DEFAULT_STUDIO_SLUG } from "@/lib/studio";

// Legacy root: permanently forwards to the pilot studio.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({
      to: "/$studioSlug",
      params: { studioSlug: DEFAULT_STUDIO_SLUG },
      replace: true,
    });
  },
});
