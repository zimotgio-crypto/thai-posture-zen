import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useBooking } from "./booking-provider";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useStudioOptional } from "@/lib/studio-context";
import { DEFAULT_STUDIO_SLUG } from "@/lib/studio";

export function SiteHeader() {
  const { open } = useBooking();
  const { lang, setLang, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);
  const studio = useStudioOptional();
  const params = useParams({ strict: false }) as { studioSlug?: string };
  const studioSlug = params.studioSlug ?? studio?.slug ?? DEFAULT_STUDIO_SLUG;

  const links = [
    { to: "/$studioSlug", label: t.nav.home, exact: true },
    { to: "/$studioSlug/home-office", label: t.nav.treatments, exact: false },
    { to: "/$studioSlug/kontakt", label: t.nav.contact, exact: false },
  ] as const;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const LangToggle = ({ className }: { className?: string }) => (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "inline-flex items-center gap-1 text-[0.68rem] uppercase tracking-[0.22em] text-charcoal-soft",
        className
      )}
    >
      <button
        onClick={() => setLang("de")}
        aria-pressed={lang === "de"}
        className={cn(
          "px-1 transition hover:text-charcoal",
          lang === "de" ? "text-gold-deep" : ""
        )}
      >
        DE
      </button>
      <span aria-hidden className="text-border">|</span>
      <button
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={cn(
          "px-1 transition hover:text-charcoal",
          lang === "en" ? "text-gold-deep" : ""
        )}
      >
        EN
      </button>
    </div>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled ? "border-b border-border/60 bg-ivory/85 backdrop-blur" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <Link
          to="/$studioSlug"
          params={{ studioSlug }}
          className="group flex flex-col leading-none lg:flex-row lg:items-baseline lg:gap-2"
        >
          <span className="font-serif text-xl tracking-tight text-charcoal">
            {studio?.name ?? ""}
          </span>
          <span className="mt-1 text-[0.6rem] uppercase tracking-[0.32em] text-gold-deep lg:mt-0 lg:text-[0.62rem] lg:tracking-[0.35em]">
            {studio?.city ?? ""}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex xl:gap-10">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              params={{ studioSlug }}
              activeOptions={{ exact: l.exact }}
              activeProps={{ className: "text-charcoal after:w-full" }}
              inactiveProps={{ className: "text-charcoal-soft/80 hover:text-charcoal" }}
              className="relative text-[0.78rem] uppercase tracking-[0.22em] transition after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-gold after:transition-all hover:after:w-full"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 lg:pl-2">
          <LangToggle className="hidden sm:inline-flex" />
          <button
            onClick={() => open()}
            className="btn-gold whitespace-nowrap rounded-sm px-4 py-2 text-[0.7rem] uppercase tracking-[0.2em] sm:text-[0.72rem] lg:px-5 lg:py-2.5 lg:tracking-[0.22em]"
          >
            {t.nav.book}
          </button>
          <button
            className="lg:hidden text-charcoal"
            onClick={() => setMobile((v) => !v)}
            aria-label={t.nav.menu}
          >
            {mobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobile && (
        <div className="border-t border-border/60 bg-ivory lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
            <div className="flex justify-end pb-2 sm:hidden">
              <LangToggle />
            </div>
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                params={{ studioSlug }}
                onClick={() => setMobile(false)}
                className="py-3 text-sm uppercase tracking-[0.2em] text-charcoal-soft"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-end">
              <button
                onClick={() => {
                  setMobile(false);
                  open();
                }}
                className="btn-gold rounded-sm px-5 py-3 text-[0.72rem] uppercase tracking-[0.22em]"
              >
                {t.nav.book}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
