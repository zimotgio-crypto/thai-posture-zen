import { createFileRoute } from "@tanstack/react-router";
import { Check, Monitor, Hand, Flame, ArrowRight } from "lucide-react";
import neckImg from "@/assets/home-office-neck.jpg";
import { Eyebrow, Section } from "@/components/section";
import { useBooking } from "@/components/booking-provider";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const Route = createFileRoute("/home-office")({
  head: () => ({
    meta: [
      { title: "Home-Office Deep Release — 60 Min. · CHF 100.– | Thai Posture Lab Zuzwil" },
      { name: "description", content: "Gezielte Tiefenentspannung für Nacken, Schultern und PC-Arme. Das Home-Office Deep Release Treatment in Zuzwil — in 2 Minuten online gebucht." },
      { property: "og:title", content: "Home-Office Deep Release — Thai Posture Lab Zuzwil" },
      { property: "og:description", content: "60 Min. präzise Tiefenentspannung gegen Nacken- und Schulterschmerzen vom Bürostuhl. CHF 100.–" },
    ],
  }),
  component: HomeOffice,
});

type Treatment = {
  id: string;
  name: string;
  time: string;
  price: string;
  desc: string;
  featured?: boolean;
};

const menu: Treatment[] = [
  {
    id: "deep-release",
    name: "Home-Office Deep Release",
    time: "60 Min.",
    price: "CHF 100.–",
    desc: "Fokus auf Nacken, Schultern und PC-Arme. Der schnelle Reset für den Vielsitzer.",
    featured: true,
  },
  {
    id: "thai-stretch",
    name: "Traditional Thai Stretch",
    time: "75 Min.",
    price: "CHF 120.–",
    desc: "Klassische, intensive Ganzkörper-Mobilisation und passive Dehnungen.",
  },
  {
    id: "zuzwiler",
    name: "Sport Massage",
    time: "90 Min.",
    price: "CHF 140.–",
    desc: "Deep tissue work and intensive mobilization specifically tailored for athletes, active recovery, and relieving deep muscular tension.",
  },
] as const;

function HomeOffice() {
  const { open } = useBooking();
  const [activeTab, setActiveTab] = useState<string>(menu[0].id);
  const [oilVariant, setOilVariant] = useState<"oil" | "nooil">("oil");
  const active = menu.find((m) => m.id === activeTab) ?? menu[0];
  const isStretch = active.id === "thai-stretch";
  const displayPrice = isStretch
    ? oilVariant === "oil"
      ? "CHF 120.–"
      : "CHF 100.–"
    : active.price;
  const bookingId = isStretch
    ? oilVariant === "oil"
      ? "thai-stretch-oil"
      : "thai-stretch-nooil"
    : active.id;
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-10 lg:grid-cols-12 lg:px-10 lg:pb-28 lg:pt-16">
          <div className="relative z-10 flex flex-col justify-center lg:col-span-7">
            <Eyebrow>Home-Office Special · Zuzwil</Eyebrow>
            <h1 className="mt-6 text-[2.4rem] leading-[1.05] text-charcoal sm:text-6xl lg:text-[4rem]">
              Rückenschmerzen vom Bürostuhl? <span className="text-gold-deep">Schalte den Kopf aus.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-charcoal-soft">
              Das <strong className="font-medium text-charcoal">„Home-Office Deep Release"</strong> Treatment —
              60 Min. / CHF 100.–. Gezielte Tiefenentspannung für Kopf, Nacken, Schultern, Rücken
              und Geist — direkt in Zuzwil.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                "Kostenlose Parkplätze vor der Tür",
                "Perfekt in der Mittagspause oder nach Feierabend",
                "In 2 Minuten online gebucht",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 text-charcoal">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-soft/50 text-gold-deep">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <button onClick={() => open("deep-release")} className="btn-gold inline-flex items-center gap-2 rounded-sm px-8 py-5 text-sm uppercase tracking-[0.24em]">
                Jetzt Termin online buchen <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-3 text-xs uppercase tracking-[0.22em] text-charcoal-soft">
                SOFORT-BESTÄTIGUNG PER SMS & E-MAIL
              </p>
            </div>
          </div>

          <div className="relative lg:col-span-5">
            <div className="absolute -inset-4 -z-10 wood-panel opacity-70" />
            <img
              src={neckImg}
              alt="Thai-Therapeutin arbeitet präzise am Nacken und oberen Rücken einer Klientin"
              width={1400}
              height={1400}
              className="h-[520px] w-full rounded-sm object-cover shadow-[var(--shadow-soft)] lg:h-[640px]"
            />
          </div>
        </div>
      </section>

      {/* Problem section */}
      <section className="bg-ivory-deep/60">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center lg:py-28">
          <Eyebrow className="justify-center">Viel Bildschirm. Wenig Bewegung.</Eyebrow>
          <h2 className="mt-6 text-4xl leading-tight text-charcoal sm:text-5xl">
            Dein Körper hält 8 Stunden am Tag <em className="not-italic text-gold-deep">still</em>. Er sollte es nicht müssen.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-charcoal-soft">
            Steifer Nacken beim Schulterblick. Ein Ziehen vom Handgelenk bis in den Ellenbogen.
            Kopfschmerzen ab Nachmittag. Das ist keine Empfindlichkeit — das ist Physik.
            Unser Deep Release löst genau die Ketten, die Maus, Tastatur und Bildschirm über
            Monate aufgebaut haben.
          </p>
        </div>
      </section>

      {/* What's included */}
      <Section>
        <div className="text-center">
          <Eyebrow className="justify-center">Was enthalten ist</Eyebrow>
          <h2 className="mt-5 text-4xl leading-tight text-charcoal">Drei präzise Rituale in 60 Minuten.</h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            { i: Monitor, t: "Tech-Neck Focus", d: "Lösen der tiefen Nackenmuskulatur, sanftes Traktions-Ritual und subokzipitale Freigabe." },
            { i: Hand, t: "PC-Arm Stretch", d: "Unterarme, Handgelenke und Ellenbogen — gezielte Dehnungen gegen Mausarm & Sehnen-Spannung." },
            { i: Flame, t: "Hot-Towel Finish", d: "Warmes Tuch mit Eukalyptus über Nacken und Augen — für einen klaren Kopf beim Aufstehen." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="flex h-full flex-col rounded-sm border border-border/60 bg-card p-8 transition hover:border-gold/60 hover:shadow-[var(--shadow-soft)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-gold-soft/40 text-gold-deep">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 font-serif text-2xl text-charcoal">{t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-soft">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Pricing */}
      <section className="bg-ivory-deep/60">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="justify-center">Treatment-Menü</Eyebrow>
            <h2 className="mt-5 text-4xl leading-tight text-charcoal">
              Klare Preise. Keine Überraschungen.
            </h2>
          </div>
          <div
            role="tablist"
            aria-label="Treatments"
            className="mx-auto mt-14 flex flex-wrap justify-center gap-2 border-b border-border/60"
          >
            {menu.map((m) => {
              const isActive = m.id === activeTab;
              return (
                <button
                  key={m.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(m.id)}
                  className={cn(
                    "-mb-px border-b-2 px-5 py-4 text-[0.72rem] uppercase tracking-[0.24em] transition",
                    isActive
                      ? "border-gold text-gold-deep"
                      : "border-transparent text-charcoal-soft hover:text-charcoal"
                  )}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
          <div className="mx-auto mt-10 max-w-xl">
            <div
              key={active.id}
              className={cn(
                "relative flex h-full flex-col rounded-sm border bg-card p-10 transition",
                active.featured
                  ? "border-gold shadow-[var(--shadow-gold)]"
                  : "border-border/60"
              )}
            >
              {active.featured && (
                <div className="absolute -top-3 left-8 rounded-sm bg-gold px-3 py-1 text-[0.62rem] uppercase tracking-[0.28em] text-primary-foreground">
                  Signature
                </div>
              )}
              <div className="text-[0.7rem] uppercase tracking-[0.25em] text-charcoal-soft">{active.time}</div>
              <h3 className="mt-3 font-serif text-3xl leading-tight text-charcoal">{active.name}</h3>
              <div className="mt-2 font-serif text-4xl text-gold-deep">{displayPrice}</div>
              <p className="mt-5 flex-1 text-base leading-relaxed text-charcoal-soft">{active.desc}</p>
              {isStretch && (
                <div
                  role="radiogroup"
                  aria-label="Öl-Option"
                  className="mt-6 grid grid-cols-2 gap-2"
                >
                  {[
                    { id: "oil" as const, label: "Mit Öl", price: "CHF 120.–" },
                    { id: "nooil" as const, label: "Ohne Öl", price: "CHF 100.–" },
                  ].map((opt) => {
                    const selected = oilVariant === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setOilVariant(opt.id)}
                        className={cn(
                          "flex flex-col items-start rounded-sm border px-4 py-3 text-left transition",
                          selected
                            ? "border-gold bg-gold-soft/40"
                            : "border-border/60 hover:border-gold/60"
                        )}
                      >
                        <span className="text-[0.68rem] uppercase tracking-[0.24em] text-charcoal-soft">
                          {opt.label}
                        </span>
                        <span className="mt-1 font-serif text-lg text-charcoal">
                          {opt.price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <button
                onClick={() => open(bookingId)}
                className={cn(
                  "mt-8 rounded-sm py-4 text-[0.72rem] uppercase tracking-[0.24em] transition",
                  active.featured
                    ? "btn-gold"
                    : "border border-charcoal/70 text-charcoal hover:bg-charcoal hover:text-ivory"
                )}
              >
                Buchen
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <Section className="py-24">
        <div className="relative overflow-hidden rounded-sm bg-charcoal px-8 py-16 text-center lg:px-16 lg:py-24">
          <div className="pointer-events-none absolute inset-0 wood-panel opacity-20" />
          <div className="relative">
            <div className="text-[0.7rem] uppercase tracking-[0.32em] text-gold-soft">Bereit für den Reset?</div>
            <h2 className="mx-auto mt-4 max-w-2xl text-4xl leading-tight text-ivory sm:text-5xl">
              60 Minuten, die deinen Nacken wieder <em className="not-italic text-gold-soft">leicht</em> machen.
            </h2>
            <button onClick={() => open("deep-release")} className="btn-gold mt-10 rounded-sm px-8 py-5 text-sm uppercase tracking-[0.24em]">
              Termin online buchen
            </button>
          </div>
        </div>
      </Section>
    </>
  );
}