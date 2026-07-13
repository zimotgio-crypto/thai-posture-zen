import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Wallet, Receipt, VolumeX, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero-shoulder-stretch.jpg";
import studioImg from "@/assets/studio-room.jpg";
import { Eyebrow, Section } from "@/components/section";
import { useBooking } from "@/components/booking-provider";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { open } = useBooking();
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-ivory-deep/70 to-transparent" />
        <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-10 lg:grid-cols-12 lg:gap-10 lg:px-10 lg:pb-32 lg:pt-16">
          <div className="relative z-10 flex flex-col justify-center lg:col-span-6">
            <Eyebrow>Zuzwil · Eschenstrasse 24</Eyebrow>
            <h1 className="mt-6 text-[2.6rem] leading-[1.05] text-charcoal sm:text-6xl lg:text-[4.2rem]">
              Die Symbiose aus <em className="not-italic text-gold-deep">traditioneller Thai-Heilkunst</em> & modernem Haltungs-Reset.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-charcoal-soft">
              Willkommen im Thai Posture Lab an der Eschenstrasse 24 in Zuzwil.
              Gezielte Tiefenentspannung für Vielsitzer, Sportler und Genießer.
              Parkplätze direkt vor der Tür.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button onClick={() => open()} className="btn-gold inline-flex items-center gap-2 rounded-sm px-7 py-4 text-[0.78rem] uppercase tracking-[0.24em]">
                Jetzt online buchen <ArrowRight className="h-4 w-4" />
              </button>
              <Link to="/home-office" className="text-sm uppercase tracking-[0.22em] text-charcoal-soft hover:text-charcoal">
                TREATMENTS →
              </Link>
            </div>
            <div className="mt-14 flex items-center gap-6 text-xs uppercase tracking-[0.24em] text-charcoal-soft">
              <span>Boutique Studio</span>
              <span className="h-px w-8 bg-border" />
              <span>Seit 2024</span>
            </div>
          </div>

          <div className="relative lg:col-span-6">
            <div className="absolute -inset-6 -z-10 rounded-sm wood-panel opacity-70" />
            <div className="overflow-hidden rounded-sm shadow-[var(--shadow-soft)]">
              <img
                src={heroImg}
                alt="Thai-Therapeutin führt eine achtsame Schulterdehnung an einer Klientin auf einer hölzernen Massageliege durch"
                width={1600}
                height={1200}
                className="h-[520px] w-full object-cover lg:h-[640px]"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden max-w-[240px] rounded-sm bg-ivory p-5 shadow-[var(--shadow-soft)] sm:block">
              <div className="text-[0.65rem] uppercase tracking-[0.28em] text-gold-deep">Signature</div>
              <div className="mt-2 font-serif text-lg text-charcoal">Posture Reset · 60 Min</div>
              <div className="mt-1 text-sm text-charcoal-soft">Präzise Arbeit an Kopf, Nacken & Schultern.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Overview / Track */}
      <Section>
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Eyebrow>Philosophie</Eyebrow>
            <h2 className="mt-5 text-4xl leading-tight text-charcoal">
              Der Körper vergisst nichts. Wir helfen ihm zu erinnern, wie Leichtigkeit sich anfühlt.
            </h2>
          </div>
          <div className="grid gap-6 lg:col-span-8 sm:grid-cols-3">
            {[
              { t: "Haltungs-Korrektur", d: "Präzise Techniken gegen Tech-Neck, Rundrücken und einseitige Belastung." },
              { t: "Muscle Release", d: "Tiefe Triggerpunkt-Arbeit kombiniert mit klassischen Thai-Dehnungen." },
              { t: "Screen Fatigue", d: "Reset für Augen, Kiefer und Nacken — spürbar nach der ersten Sitzung." },
            ].map((it) => (
              <article key={it.t} className="group flex h-full flex-col rounded-sm border border-border/60 bg-card p-7 transition hover:border-gold/60 hover:shadow-[var(--shadow-soft)]">
                <div className="gold-rule mb-6 w-10" />
                <h3 className="font-serif text-2xl text-charcoal">{it.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-charcoal-soft">{it.d}</p>
              </article>
            ))}
          </div>
        </div>
      </Section>

      {/* Trust / Studio */}
      <section className="bg-ivory-deep/60">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2 lg:gap-20 lg:px-10 lg:py-28">
          <div className="relative">
            <img
              src={studioImg}
              loading="lazy"
              width={1600}
              height={1000}
              alt="Minimalistischer Behandlungsraum mit vertikalen Holzpaneelen und indirektem Licht"
              className="h-[420px] w-full rounded-sm object-cover shadow-[var(--shadow-soft)] lg:h-[520px]"
            />
          </div>
          <div>
            <Eyebrow>Modernes Studio</Eyebrow>
            <h2 className="mt-5 text-4xl leading-tight text-charcoal">
              Digital reibungslos. Analog spürbar.
            </h2>
            <p className="mt-5 max-w-lg text-charcoal-soft">
              Wir haben das Studio so konzipiert, wie wir selbst behandelt werden möchten:
              still, warm, uneitel. Kein Papierkram, keine unnötigen Gespräche —
              nur du, dein Körper und präzise Hände.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { i: VolumeX, t: "Silent Treatment", d: "Optional stille Behandlung." },
                { i: Receipt, t: "Digitale Quittung", d: "Direkt per Mail nach Termin." },
                { i: Wallet, t: "TWINT & Karte & Bar", d: "Kontaktlos zahlen, ohne Wartezeit, aber auch Bar möglich" },
                { i: MapPin, t: "Parkplätze vor Ort", d: "Kostenlos an der Eschenstrasse." },
              ].map(({ i: Icon, t, d }) => (
                <li key={t} className="flex items-start gap-3 rounded-sm border border-border/60 bg-card p-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-gold-soft/40 text-gold-deep">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-charcoal">{t}</div>
                    <div className="text-sm text-charcoal-soft">{d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Bridge to landing page */}
      <Section className="py-24">
        <div className="relative overflow-hidden rounded-sm border border-border/60 bg-card px-8 py-14 text-center lg:px-16 lg:py-20">
          <div className="pointer-events-none absolute inset-0 wood-panel opacity-40" />
          <div className="relative">
            <Sparkles className="mx-auto h-5 w-5 text-gold-deep" />
            <h2 className="mt-4 text-3xl leading-tight text-charcoal sm:text-4xl">
              Rückenschmerzen vom Bürostuhl? <br className="hidden sm:block" />
              <span className="text-gold-deep">Schalte den Kopf aus.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-charcoal-soft">
              Unser „Home-Office Deep Release" — 60 Minuten präzise Tiefenentspannung
              für Nacken, Schultern & Geist.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button onClick={() => open("deep-release")} className="btn-gold rounded-sm px-7 py-4 text-[0.78rem] uppercase tracking-[0.24em]">
                Termin buchen · CHF 100.–
              </button>
              <Link to="/home-office" className="text-sm uppercase tracking-[0.22em] text-charcoal-soft hover:text-charcoal">
                Mehr erfahren →
              </Link>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
