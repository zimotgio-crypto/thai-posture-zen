import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useBooking } from "./booking-provider";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Home" },
  { to: "/home-office", label: "TREATMENTS" },
  { to: "/kontakt", label: "Kontakt" },
] as const;

export function SiteHeader() {
  const { open } = useBooking();
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "text-charcoal after:w-full" }}
              inactiveProps={{ className: "text-charcoal-soft/80 hover:text-charcoal" }}
              className="relative text-[0.78rem] uppercase tracking-[0.22em] transition after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-gold after:transition-all hover:after:w-full"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => open()}
            className="btn-gold hidden rounded-sm px-5 py-2.5 text-[0.72rem] uppercase tracking-[0.22em] md:inline-flex"
          >
            Termin buchen
          </button>
          <button
            className="md:hidden text-charcoal"
            onClick={() => setMobile((v) => !v)}
            aria-label="Menü"
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
            <button
              onClick={() => {
                setMobile(false);
                open();
              }}
              className="btn-gold mt-3 rounded-sm px-5 py-3 text-[0.72rem] uppercase tracking-[0.22em]"
            >
              Termin buchen
            </button>
          </div>
        </div>
      )}
    </header>
  );
}