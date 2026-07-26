import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { StudioProvider, studioPublicQuery } from "@/lib/studio-context";

export const Route = createFileRoute("/$studioSlug")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(studioPublicQuery(params.studioSlug)),
  component: StudioLayout,
  notFoundComponent: StudioNotFound,
  errorComponent: StudioNotFound,
});

function StudioLayout() {
  const { studioSlug } = Route.useParams();
  const { data: studio } = useSuspenseQuery(studioPublicQuery(studioSlug));
  return (
    <StudioProvider studio={studio}>
      <Outlet />
    </StudioProvider>
  );
}

function StudioNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-4xl text-charcoal">Studio nicht gefunden</h1>
      <p className="mt-4 text-sm text-charcoal-soft">
        Diese Studio-Adresse existiert nicht oder ist derzeit nicht aktiv.
      </p>
      <Link
        to="/"
        className="btn-gold mt-8 rounded-sm px-6 py-3 text-[0.72rem] uppercase tracking-[0.22em]"
      >
        Zur Startseite
      </Link>
    </div>
  );
}