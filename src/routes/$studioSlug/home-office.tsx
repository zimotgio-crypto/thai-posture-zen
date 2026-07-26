import { createFileRoute } from "@tanstack/react-router";
import { Check, Monitor, Hand, Flame, ArrowRight } from "lucide-react";
import neckImg from "@/assets/home-office-neck.jpg";
import { Eyebrow, Section } from "@/components/section";
import { useBooking } from "@/components/booking-provider";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { studioPublicQuery, useStudio } from "@/lib/studio-context";
import { formatPrice } from "@/lib/studio-display";

const SITE_URL = "https://thai-posture-zen.lovable.app";

export const Route = createFileRoute("/$studioSlug/home-office")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(studioPublicQuery(params.studioSlug)),
  head: ({ params, loaderData }) => {
    const name = loaderData?.name ?? "Thai Massage Studio";
    const city = loaderData?.city ?? "";
    const title = `Treatments & Home-Office Deep Release — ${name}${city ? ` ${city}` : ""}`;
    const description = `Gezielte Tiefenentspannung für Nacken, Schultern und PC-Arme${city ? ` in ${city}` : ""} — in 2 Minuten online gebucht bei ${name}.`;
    const url = `${SITE_URL}/${params.studioSlug}/home-office`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: HomeOffice,
});

const ritualIcons = [Monitor, Hand, Flame] as const;

function HomeOffice() {
  const { open } = useBooking();
  const t = useT();
  const studio = useStudio();
  const menu = studio.treatments;
  const [activeTab, setActiveTab] = useState<string>("");
  const activeIdx = Math.max(
    0,
    menu.findIndex((m) => m.key === activeTab),
  );
  const active = menu[activeIdx];
  const activeCopy = t.treatments.menu[activeIdx] ?? t.treatments.menu[0];
  const [durationIdx, setDurationIdx] = useState(0);
  const options = active?.options ?? [];
  const selected = options[durationIdx] ?? options[0];
  const featured = activeIdx === 0;
  const displayPrice = selected ? formatPrice(selected.price) : "";
  const firstTreatmentKey = menu[0]?.key;

  if (!active) return null;

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-10 lg:grid-cols-12 lg:px-10 lg:pb-28 lg:pt-16">
          <div className="relative z-10 flex flex-col justify-center lg:col-span-7">
            <Eyebrow>{t.treatments.eyebrow}</Eyebrow>
            <h1 className="mt-6 text-[2.4rem] leading-[1.05] text-charcoal sm:text-6xl lg:text-[4rem]">
              {t.treatments.h1a}<span className="text-gold-deep">{t.treatments.h1b}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-charcoal-soft">
              {t.treatments.intro1}<strong className="font-medium text-charcoal">{t.treatments.introEm}</strong>{t.treatments.intro2}
            </p>

            <ul className="mt-8 space-y-3">
              {t.treatments.bullets.map((b) => (
                <li key={b} className="flex items-center gap-3 text-charcoal">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-soft/50 text-gold-deep">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <button onClick={() => open(firstTreatmentKey)} className="btn-gold inline-flex items-center gap-2 rounded-sm px-8 py-5 text-sm uppercase tracking-[0.24em]">
                {t.treatments.ctaMain} <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-3 text-xs uppercase tracking-[0.22em] text-charcoal-soft">{t.treatments.confirmation}</p>
            </div>
          </div>

          <div className="relative lg:col-span-5">
            <div className="absolute -inset-4 -z-10 wood-panel opacity-70" />
            <img
              src={neckImg}
              alt={t.treatments.heroAlt}
              width={1400}
              height={1400}
              className="h-[520px] w-full rounded-sm object-cover shadow-[var(--shadow-soft)] lg:h-[640px]"
            />
          </div>
        </div>
      </section>

      <section className="bg-ivory-deep/60">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center lg:py-28">
          <Eyebrow className="justify-center">{t.treatments.problemEyebrow}</Eyebrow>
          <h2 className="mt-6 text-4xl leading-tight text-charcoal sm:text-5xl">
            {t.treatments.problemH1}<em className="not-italic text-gold-deep">{t.treatments.problemHEm}</em>{t.treatments.problemH2}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-charcoal-soft">{t.treatments.problemP}</p>
        </div>
      </section>

      <Section>
        <div className="text-center">
          <Eyebrow className="justify-center">{t.treatments.includedEyebrow}</Eyebrow>
          <h2 className="mt-5 text-4xl leading-tight text-charcoal">{t.treatments.includedH}</h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {t.treatments.rituals.map((r, i) => {
            const Icon = ritualIcons[i];
            return (
              <div key={r.t} className="flex h-full flex-col rounded-sm border border-border/60 bg-card p-8 transition hover:border-gold/60 hover:shadow-[var(--shadow-soft)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-gold-soft/40 text-gold-deep">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 font-serif text-2xl text-charcoal">{r.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-charcoal-soft">{r.d}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <section className="bg-ivory-deep/60">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow className="justify-center">{t.treatments.menuEyebrow}</Eyebrow>
            <h2 className="mt-5 text-4xl leading-tight text-charcoal">{t.treatments.menuH}</h2>
          </div>
          <div role="tablist" aria-label={t.treatments.menuEyebrow} className="mx-auto mt-14 flex flex-wrap justify-center gap-2 border-b border-border/60">
            {menu.map((m, i) => {
              const isActive = i === activeIdx;
              return (
                <button
                  key={m.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(m.key);
                    setDurationIdx(0);
                  }}
                  className={cn(
                    "-mb-px border-b-2 px-5 py-4 text-[0.72rem] uppercase tracking-[0.24em] transition",
                    isActive ? "border-gold text-gold-deep" : "border-transparent text-charcoal-soft hover:text-charcoal"
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          <div className="mx-auto mt-10 max-w-xl">
            <div
              key={active.key}
              className={cn(
                "relative flex h-full flex-col rounded-sm border bg-card p-10 transition",
                featured ? "border-gold shadow-[var(--shadow-gold)]" : "border-border/60"
              )}
            >
              {featured && (
                <div className="absolute -top-3 left-8 rounded-sm bg-gold px-3 py-1 text-[0.62rem] uppercase tracking-[0.28em] text-primary-foreground">
                  {t.treatments.signature}
                </div>
              )}
              <div className="text-[0.7rem] uppercase tracking-[0.25em] text-charcoal-soft">
                {selected ? `${selected.minutes} Min.` : activeCopy.time}
              </div>
              <h3 className="mt-3 font-serif text-3xl leading-tight text-charcoal">{active.label}</h3>
              <div className="mt-2 font-serif text-4xl text-gold-deep">{displayPrice}</div>
              <p className="mt-5 flex-1 text-base leading-relaxed text-charcoal-soft">
                {active.description ?? activeCopy.desc}
              </p>
              {options.length > 1 && (
                <div role="radiogroup" aria-label={t.treatments.menuEyebrow} className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {options.map((opt, i) => {
                    const isSel = i === durationIdx;
                    return (
                      <button
                        key={opt.minutes}
                        type="button"
                        role="radio"
                        aria-checked={isSel}
                        onClick={() => setDurationIdx(i)}
                        className={cn(
                          "flex flex-col items-start rounded-sm border px-4 py-3 text-left transition",
                          isSel ? "border-gold bg-gold-soft/40" : "border-border/60 hover:border-gold/60"
                        )}
                      >
                        <span className="text-[0.68rem] uppercase tracking-[0.24em] text-charcoal-soft">
                          {opt.minutes} Min.
                        </span>
                        <span className="mt-1 font-serif text-lg text-charcoal">{formatPrice(opt.price)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <button
                onClick={() => open(active.key)}
                className={cn(
                  "mt-8 rounded-sm py-4 text-[0.72rem] uppercase tracking-[0.24em] transition",
                  featured ? "btn-gold" : "border border-charcoal/70 text-charcoal hover:bg-charcoal hover:text-ivory"
                )}
              >
                {t.treatments.book}
              </button>
            </div>
          </div>
        </div>
      </section>

      <Section className="py-20 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow className="justify-center">{t.testimonials.eyebrow}</Eyebrow>
          <h2 className="mt-5 text-4xl leading-tight text-charcoal">{t.testimonials.h}</h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {t.testimonials.items.map((it) => (
            <figure
              key={it.who + it.q}
              className="flex h-full flex-col rounded-sm border border-border/60 bg-card p-8 transition hover:border-gold/60 hover:shadow-[var(--shadow-soft)]"
            >
              <span aria-hidden className="font-serif text-4xl leading-none text-gold-deep">“</span>
              <blockquote className="mt-4 flex-1 text-base leading-relaxed text-charcoal-soft">
                {it.q}
              </blockquote>
              <div className="gold-rule mt-6 w-8" />
              <figcaption className="mt-4 text-[0.7rem] uppercase tracking-[0.25em] text-charcoal">
                {it.who} · <span className="text-charcoal-soft">{it.where}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section className="py-24">
        <div className="relative overflow-hidden rounded-sm bg-charcoal px-8 py-16 text-center lg:px-16 lg:py-24">
          <div className="pointer-events-none absolute inset-0 wood-panel opacity-20" />
          <div className="relative">
            <div className="text-[0.7rem] uppercase tracking-[0.32em] text-gold-soft">{t.treatments.ctaEyebrow}</div>
            <h2 className="mx-auto mt-4 max-w-2xl text-4xl leading-tight text-ivory sm:text-5xl">
              {t.treatments.ctaH1}<em className="not-italic text-gold-soft">{t.treatments.ctaHEm}</em>{t.treatments.ctaH2}
            </h2>
            <button onClick={() => open(firstTreatmentKey)} className="btn-gold mt-10 rounded-sm px-8 py-5 text-sm uppercase tracking-[0.24em]">
              {t.treatments.ctaBtn}
            </button>
          </div>
        </div>
      </Section>
    </>
  );
}
