import { QueryClient, dehydrate, hydrate, type DehydratedState } from "@tanstack/react-query";
import { createRouter, type SerializableExtensions } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// React Query's DehydratedState is plain JSON data at runtime, but its TS
// shape (`data: unknown`) fails the router's strict Serializable check.
// Brand it with the router's own "trust me" marker type instead.
type BrandedQueryState = SerializableExtensions["TsrSerializable"];

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Transfer the React Query cache filled by server-side loaders (e.g.
    // studioPublicQuery via ensureQueryData) to the client. Without this the
    // client hydrates with an empty cache, StudioShell renders its loading
    // shell and React reports a hydration mismatch on every public page.
    dehydrate: () => ({
      queryClientState: dehydrate(queryClient) as unknown as BrandedQueryState,
    }),
    hydrate: (dehydrated) => {
      hydrate(queryClient, dehydrated.queryClientState as unknown as DehydratedState);
    },
  });

  return router;
};
