import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-ivory-deep/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-4 lg:px-10">
        <div className="lg:col-span-2 space-y-3">
          <div className="font-serif text-2xl text-charcoal">Thai Posture Lab</div>
          <p className="max-w-sm text-sm leading-relaxed text-charcoal-soft">
            Boutique Thai-Massage-Studio in Zuzwil. Präzise Tiefenentspannung
            für den modernen Körper.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <div className="text-[0.7rem] uppercase tracking-[0.25em] text-gold-deep">Studio</div>
          <p className="text-charcoal-soft">Eschenstrasse 24</p>
          <p className="text-charcoal-soft">9524 Zuzwil SG</p>
          <p className="text-charcoal-soft">Schweiz</p>
        </div>
        <div className="space-y-2 text-sm">
          <div className="text-[0.7rem] uppercase tracking-[0.25em] text-gold-deep">Navigation</div>
          <div className="flex flex-col gap-1">
            <Link to="/" className="text-charcoal-soft hover:text-charcoal">Home</Link>
            <Link to="/home-office" className="text-charcoal-soft hover:text-charcoal">Home-Office Special</Link>
            <Link to="/kontakt" className="text-charcoal-soft hover:text-charcoal">Kontakt & Info</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-6 py-5 text-xs text-charcoal-soft sm:flex-row sm:items-center lg:px-10">
          <span>© {new Date().getFullYear()} Thai Posture Lab · Zuzwil SG</span>
          <span className="tracking-widest uppercase">TWINT · Karte · Bar</span>
        </div>
      </div>
    </footer>
  );
}