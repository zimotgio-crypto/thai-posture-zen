import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Wallet, Receipt, VolumeX, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero-shoulder-stretch.jpg";
import studioImg from "@/assets/studio-room.jpg";
import { Eyebrow, Section } from "@/components/section";
import { useBooking } from "@/components/booking-provider";
import { useT } from "@/lib/i18n";
import { studioPublicQuery, useStudio } from "@/lib/studio-context";

const SITE_URL = "https://thai-posture-zen.lovable.app";

export const Route = createFileRoute("/$studioSlug/")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(studioPublicQuery(params.studioSlug)),
  head: ({ params, loaderData }) => {
    const name = loaderData?.name ?? "Thai Massage Studio";
    const city = loaderData?.city ?? "";
    const title = `${name} — Modernes Thai-Studio${city ? ` in ${city}` : ""}`;
    const description = `Boutique Thai-Massage${city ? ` in ${city}` : ""}: Tiefenentspannung, Haltungs-Reset und traditionelle Thai-Heilkunst bei ${name}.`;
    const url = `${SITE_URL}/${params.studioSlug}`;
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
  component: Index,
});

const featureIcons = [VolumeX, Receipt, Wallet, MapPin] as const;

function Index() {
  const { open } = useBooking();
  const t = useT();
  const studio = useStudio();
  const { studioSlug } = Route.useParams();
  const features =
    studio.features.length > 0
      ? studio.features.map((f) => ({ t: f.title, d: f.text }))
      : t.home.features;
  const firstTreatmentKey = studio.treatments[0]?.key;
  const lead = studio.treatments[0];
  const leadOption = lead?.options[0];
  const bridgeP = leadOption
    ? fill(t.home.bridgePTpl, { treatment: lead.label, minutes: String(leadOption.minutes) })
    : t.home.bridgeP;
  const bridgeCta = leadOption
    ? fill(t.home.bridgeCtaTpl, { price: String(leadOption.price) })
    : t.home.bridgeCta;
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[60%] bg-gradient-to-b from-ivory-deep/70 to-transparent" />
        <div className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 pt-6 lg:grid-cols-12 lg:gap-10 lg:px-10 lg:pb-32 lg:pt-16">
          <div className="relative z-10 order-1 flex flex-col justify-center lg:col-span-6">
            <Eyebrow>{studio.tagline ?? t.home.eyebrow}</Eyebrow>
            <h1 className="mt-4 text-[2rem] leading-[1.08] text-charcoal sm:text-6xl sm:mt-6 sm:leading-[1.05] lg:text-[4.2rem]">
              {studio.heroHeading ? (
                studio.heroHeading
              ) : (
                <>
                  {t.home.title1}
                  <em className="not-italic text-gold-deep">{t.home.titleEm}</em>
                  {t.home.title2}
                </>
              )}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-charcoal-soft sm:mt-6 sm:text-lg">
              {studio.heroText ?? t.home.intro}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4 sm:mt-10">
              <button onClick={() => open()} className="btn-gold inline-flex w-full items-center justify-center gap-2 rounded-sm px-7 py-4 text-[0.78rem] uppercase tracking-[0.24em] sm:w-auto">
                {t.home.cta} <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                to="/$studioSlug/home-office"
                params={{ studioSlug }}
                className="text-sm uppercase tracking-[0.22em] text-charcoal-soft hover:text-charcoal"
              >
                {t.home.treatmentsLink}
              </Link>
            </div>
            <div className="mt-8 hidden items-center gap-6 text-xs uppercase tracking-[0.24em] text-charcoal-soft sm:mt-14 sm:flex">
              <span>{t.home.boutique}</span>
              <span className="h-px w-8 bg-border" />
              <span>{t.home.since}</span>
            </div>
          </div>

          <div className="relative order-2 lg:col-span-6">
            <div className="absolute -inset-6 -z-10 rounded-sm wood-panel opacity-70" />
            <div className="overflow-hidden rounded-sm shadow-[var(--shadow-soft)]">
              <img
                src={studio.media.hero ?? heroImg}
                alt={t.home.heroAlt}
                width={1600}
                height={1200}
                className="h-[320px] w-full object-cover sm:h-[520px] lg:h-[640px]"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden max-w-[240px] rounded-sm bg-ivory p-5 shadow-[var(--shadow-soft)] sm:block">
              <div className="text-[0.65rem] uppercase tracking-[0.28em] text-gold-deep">{t.home.signature}</div>
              <div className="mt-2 font-serif text-lg text-charcoal">{t.home.postureReset}</div>
              <div className="mt-1 text-sm text-charcoal-soft">{t.home.postureResetDesc}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Overview / Track */}
      <Section>
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Eyebrow>{t.home.philosophy}</Eyebrow>
            <h2 className="mt-5 text-4xl leading-tight text-charcoal">{t.home.philosophyH}</h2>
          </div>
          <div className="grid gap-6 lg:col-span-8 sm:grid-cols-3">
            {t.home.pillars.map((it) => (
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
              src={studio.media.room ?? studioImg}
              loading="lazy"
              width={1600}
              height={1000}
              alt={t.home.studioAlt}
              className="h-[420px] w-full rounded-sm object-cover shadow-[var(--shadow-soft)] lg:h-[520px]"
            />
          </div>
          <div>
            <Eyebrow>{t.home.studioEyebrow}</Eyebrow>
            <h2 className="mt-5 text-4xl leading-tight text-charcoal">
              {studio.aboutHeading ?? t.home.studioH}
            </h2>
            <p className="mt-5 max-w-lg text-charcoal-soft">{studio.aboutText ?? t.home.studioP}</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {features.map((f, i) => {
                const Icon = featureIcons[i % featureIcons.length];
                return (
                  <li key={f.t} className="flex items-start gap-3 rounded-sm border border-border/60 bg-card p-4">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-gold-soft/40 text-gold-deep">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-charcoal">{f.t}</div>
                      <div className="text-sm text-charcoal-soft">{f.d}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* Bridge */}
      <Section className="py-24">
        <div className="relative overflow-hidden rounded-sm border border-border/60 bg-card px-8 py-14 text-center lg:px-16 lg:py-20">
          <div className="pointer-events-none absolute inset-0 wood-panel opacity-40" />
          <div className="relative">
            <Sparkles className="mx-auto h-5 w-5 text-gold-deep" />
            <h2 className="mt-4 text-3xl leading-tight text-charcoal sm:text-4xl">
              {t.home.bridgeH1} <br className="hidden sm:block" />
              <span className="text-gold-deep">{t.home.bridgeH2}</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-charcoal-soft">{bridgeP}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button onClick={() => open(firstTreatmentKey)} className="btn-gold rounded-sm px-7 py-4 text-[0.78rem] uppercase tracking-[0.24em]">
                {bridgeCta}
              </button>
              <Link
                to="/$studioSlug/home-office"
                params={{ studioSlug }}
                className="text-sm uppercase tracking-[0.22em] text-charcoal-soft hover:text-charcoal"
              >
                {t.home.more}
              </Link>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
