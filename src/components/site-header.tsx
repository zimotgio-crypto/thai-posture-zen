import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useBooking } from "./booking-provider";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

export function SiteHeader() {
  const { open } = useBooking();
  const { lang, setLang, t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);

  const links = [
    { to: "/", label: t.nav.home, exact: true },
    { to: "/home-office", label: t.nav.treatments, exact: false },
    { to: "/kontakt", label: t.nav.contact, exact: false },
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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Link to="/" className="group flex items-baseline gap-2">
          <span className="font-serif text-xl tracking-tight text-charcoal">Thai Posture Lab</span>
          <span className="hidden text-[0.62rem] uppercase tracking-[0.35em] text-gold-deep sm:inline">
            Zuzwil
          </span>
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.exact }}
              activeProps={{ className: "text-charcoal after:w-full" }}
              inactiveProps={{ className: "text-charcoal-soft/80 hover:text-charcoal" }}
              className="relative text-[0.78rem] uppercase tracking-[0.22em] transition after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-gold after:transition-all hover:after:w-full"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <LangToggle />
          <button
            onClick={() => open()}
            className="btn-gold hidden whitespace-nowrap rounded-sm px-5 py-2.5 text-[0.72rem] uppercase tracking-[0.22em] md:inline-flex"
          >
            {t.nav.book}
          </button>
          <button
            className="md:hidden text-charcoal"
            onClick={() => setMobile((v) => !v)}
            aria-label={t.nav.menu}
          >
            {mobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobile && (
        <div className="border-t border-border/60 bg-ivory md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-4">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
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
