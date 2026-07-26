import { Link, useParams } from "@tanstack/react-router";
import { useT } from "@/lib/i18n";
import { useStudioOptional } from "@/lib/studio-context";
import { DEFAULT_STUDIO_SLUG } from "@/lib/studio";

export function SiteFooter() {
  const t = useT();
  const studio = useStudioOptional();
  const params = useParams({ strict: false }) as { studioSlug?: string };
  const studioSlug = params.studioSlug ?? studio?.slug ?? DEFAULT_STUDIO_SLUG;
  return (
    <footer className="mt-24 border-t border-border/60 bg-ivory-deep/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-4 lg:px-10">
        <div className="lg:col-span-2 space-y-3">
          <div className="font-serif text-2xl text-charcoal">{studio?.name ?? "Thai Posture Lab"}</div>
          <p className="max-w-sm text-sm leading-relaxed text-charcoal-soft">
            {studio?.tagline ?? t.footer.tagline}
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <div className="text-[0.7rem] uppercase tracking-[0.25em] text-gold-deep">{t.footer.studio}</div>
          <p className="text-charcoal-soft">{studio?.street ?? "Eschenstrasse 24"}</p>
          <p className="text-charcoal-soft">
            {studio ? `${studio.zip ?? ""} ${studio.city ?? ""}`.trim() : "9524 Zuzwil SG"}
          </p>
          <p className="text-charcoal-soft">{studio?.phone ?? t.contact.addressLines[2]}</p>
        </div>
        <div className="space-y-2 text-sm">
          <div className="text-[0.7rem] uppercase tracking-[0.25em] text-gold-deep">{t.footer.navigation}</div>
          <div className="flex flex-col gap-1">
            <Link to="/$studioSlug" params={{ studioSlug }} className="text-charcoal-soft hover:text-charcoal">{t.footer.home}</Link>
            <Link to="/$studioSlug/home-office" params={{ studioSlug }} className="text-charcoal-soft hover:text-charcoal">{t.footer.treatments}</Link>
            <Link to="/$studioSlug/kontakt" params={{ studioSlug }} className="text-charcoal-soft hover:text-charcoal">{t.footer.contact}</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-6 py-5 text-xs text-charcoal-soft sm:flex-row sm:items-center lg:px-10">
          <span className="flex flex-wrap items-center gap-3">
            <span>© {new Date().getFullYear()} {t.footer.copyright}</span>
            <Link to="/datenschutz" className="text-charcoal-soft/80 hover:text-charcoal">
              Datenschutz
            </Link>
          </span>
          <span className="tracking-widest uppercase">
            {studio && studio.paymentMethods.length > 0
              ? studio.paymentMethods.join(" · ")
              : t.footer.payments}
          </span>
        </div>
      </div>
    </footer>
  );
}
