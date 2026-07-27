import { createFileRoute, redirect } from "@tanstack/react-router";
import { studioPublicQuery } from "@/lib/studio-context";

// Bestandslink: leitet dauerhaft auf die eigene Seite der Behandlung weiter,
// damit alte Links und Werbeanzeigen weiter funktionieren.
export const Route = createFileRoute("/$studioSlug/home-office")({
  loader: async ({ params, context, location }) => {
    const studio = await context.queryClient.ensureQueryData(
      studioPublicQuery(params.studioSlug),
    );
    const match =
      studio.treatments.find((t) => t.key.includes("home-office")) ??
      studio.treatments.find((t) => t.key.includes("deep-release")) ??
      studio.treatments[0];
    if (!match) throw redirect({ to: "/$studioSlug", params, replace: true });
    throw redirect({
      to: "/$studioSlug/behandlung/$treatmentKey",
      params: { studioSlug: params.studioSlug, treatmentKey: match.key },
      search: location.search as Record<string, unknown>,
      replace: true,
    });
  },
});
