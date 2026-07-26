import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { studioPublicQuery } from "@/lib/studio-context";

export const Route = createFileRoute("/$studioSlug")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(studioPublicQuery(params.studioSlug)),
  component: StudioLayout,
  notFoundComponent: StudioNotFound,
  errorComponent: StudioError,
});

function StudioLayout() {
  return <Outlet />;
}

function StudioError() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-4xl text-charcoal">Kurzer Moment</h1>
      <p className="mt-4 text-sm text-charcoal-soft">
        Die Studiodaten konnten gerade nicht geladen werden. Bitte lade die Seite neu.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="btn-gold mt-8 rounded-sm px-6 py-3 text-[0.72rem] uppercase tracking-[0.22em]"
      >
        Neu laden
      </button>
    </div>
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