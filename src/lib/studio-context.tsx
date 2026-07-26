import { createContext, useContext, type ReactNode } from "react";
import { queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { getStudioPublic, type PublicStudio } from "@/lib/studio-public.functions";

export const studioPublicQuery = (slug: string) =>
  queryOptions({
    queryKey: ["studio-public", slug] as const,
    queryFn: async () => {
      const studio = await getStudioPublic({ data: { slug } });
      if (!studio) throw notFound();
      return studio;
    },
    staleTime: 5 * 60 * 1000,
  });

const StudioCtx = createContext<PublicStudio | null>(null);

export function StudioProvider({
  studio,
  children,
}: {
  studio: PublicStudio;
  children: ReactNode;
}) {
  return <StudioCtx.Provider value={studio}>{children}</StudioCtx.Provider>;
}

// Inside a /$studioSlug route this is always populated.
export function useStudio(): PublicStudio {
  const studio = useContext(StudioCtx);
  if (!studio) throw new Error("useStudio must be used within a studio route");
  return studio;
}

// For chrome rendered outside the studio subtree (e.g. /datenschutz).
export function useStudioOptional(): PublicStudio | null {
  return useContext(StudioCtx);
}