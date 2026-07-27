import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import heroImg from "@/assets/hero-shoulder-stretch.jpg";
import { Eyebrow, Section } from "@/components/section";
import { StudioText } from "@/components/studio-text";
import { useBooking } from "@/components/booking-provider";
import { useT } from "@/lib/i18n";
import { studioPublicQuery, useStudio } from "@/lib/studio-context";
import {
  addressLinesOf,
  formatOpeningHours,
  formatPrice,
  mapsQueryOf,
} from "@/lib/studio-display";

const SITE_URL = "https://thai-posture-zen.lovable.app";

export const Route = createFileRoute("/$studioSlug/behandlung/$treatmentKey")({
  loader: async ({ params, context }) => {
    const studio = await context.queryClient.ensureQueryData(
      studioPublicQuery(params.studioSlug),
    );
    const treatment = studio.treatments.find((t) => t.key === params.treatmentKey);
    if (!treatment) throw notFound();
    return { studioName: studio.name, city: studio.city, label: treatment.label };
  },
  head: ({ params, loaderData }) => {
    const url = `${SITE_URL}/${params.studioSlug}/behandlung/${params.treatmentKey}`;
    if (!loaderData) {
      return {
        meta: [{ title: "Behandlung nicht gefunden" }, { name: "robots", content: "noindex" }],
      };
    }
    const place = [loaderData.studioName, loaderData.city].filter(Boolean).join(" ");
    const title = `${loaderData.label} – ${place}`;
    const description = `${loaderData.label} bei ${loaderData.studioName}${
      loaderData.city ? ` in ${loaderData.city}` : ""
    } — online buchbar, mit Sofortbestätigung.`;
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
  component: TreatmentPage,
  notFoundComponent: TreatmentNotFound,
  errorComponent: TreatmentNotFound,
});

function TreatmentNotFound() {
  const { studioSlug } = Route.useParams();
  const t = useT();
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-4xl text-charcoal">{t.treatmentPage.notFoundH}</h1>
      <p className="mt-4 text-sm text-charcoal-soft">{t.treatmentPage.notFoundP}</p>
      <Link
        to="/$studioSlug"
        params={{ studioSlug }}
        className="btn-gold mt-8 rounded-sm px-6 py-3 text-[0.72rem] uppercase tracking-[0.22em]"
      >
        {t.treatmentPage.toStudio}
      </Link>
    </div>
  );
}

function TreatmentPage() {
  const t = useT();
  const studio = useStudio();
  const { treatmentKey } = Route.useParams();
  const { open } = useBooking();
  const treatment = studio.treatments.find((tr) => tr.key === treatmentKey);
  if (!treatment) return <TreatmentNotFound />;

  const addressLines = addressLinesOf(studio, t.contact.countries);
  const hours = formatOpeningHours(
    studio.openingHours,
    t.contact.weekdayNames,
    t.contact.closed,
  );
  const mapsHref =
    studio.mapsUrl ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQueryOf(studio))}`;

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-10 lg:grid-cols-12 lg:px-10 lg:pb-28 lg:pt-16">
          <div className="relative z-10 flex flex-col justify-center lg:col-span-7">
            <Eyebrow>
              {t.treatmentPage.eyebrow}
              {studio.city ? (
                <>
                  {" · "}
                  <StudioText>{studio.city}</StudioText>
                </>
              ) : null}
            </Eyebrow>
            <h1 className="mt-6 text-[2.4rem] leading-[1.05] text-charcoal sm:text-6xl lg:text-[3.6rem]">
              <StudioText>{treatment.label}</StudioText>
            </h1>
            <div className="mt-3 text-sm uppercase tracking-[0.22em] text-charcoal-soft">
              <StudioText>{studio.name}</StudioText>
            </div>
            {treatment.description && (
              <StudioText
                as="p"
                className="mt-6 max-w-xl text-lg leading-relaxed text-charcoal-soft"
              >
                {treatment.description}
              </StudioText>
            )}
            <div className="mt-10">
              <button
                onClick={() => open(treatment.key)}
                className="btn-gold inline-flex items-center gap-2 rounded-sm px-8 py-5 text-sm uppercase tracking-[0.24em]"
              >
                {t.treatmentPage.book} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative lg:col-span-5">
            <div className="absolute -inset-4 -z-10 wood-panel opacity-70" />
            <img
              src={studio.media.hero ?? heroImg}
              alt={treatment.label}
              width={1400}
              height={1400}
              className="h-[420px] w-full rounded-sm object-cover shadow-[var(--shadow-soft)] lg:h-[560px]"
            />
          </div>
        </div>
      </section>

      {treatment.options.length > 0 && (
        <section className="bg-ivory-deep/60">
          <div className="mx-auto max-w-5xl px-6 py-20 lg:py-28">
            <div className="text-center">
              <Eyebrow className="justify-center">{t.treatmentPage.durations}</Eyebrow>
              <p className="mt-4 text-sm text-charcoal-soft">{t.treatmentPage.durationsHint}</p>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {treatment.options.map((o) => (
                <button
                  key={`${o.minutes}-${o.price}`}
                  onClick={() => open(treatment.key)}
                  className="flex flex-col items-center rounded-sm border border-border/60 bg-card p-8 transition hover:border-gold/60 hover:shadow-[var(--shadow-soft)]"
                >
                  <div className="text-[0.7rem] uppercase tracking-[0.28em] text-gold-deep">
                    {o.minutes} {t.treatmentPage.minutes}
                  </div>
                  <div className="mt-3 font-serif text-3xl text-charcoal">
                    {formatPrice(o.price)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <Section>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-sm border border-border/60 bg-card p-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-gold-soft/40 text-gold-deep">
              <MapPin className="h-4 w-4" />
            </div>
            <h2 className="mt-5 font-serif text-2xl text-charcoal">{t.treatmentPage.address}</h2>
            <div className="mt-3 space-y-1 text-sm text-charcoal-soft">
              {addressLines.map((line) => (
                <StudioText as="div" key={line}>
                  {line}
                </StudioText>
              ))}
            </div>
            <a
              href={mapsHref}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-block text-sm uppercase tracking-[0.22em] text-gold-deep"
            >
              {t.treatmentPage.openMaps}
            </a>
          </div>
          <div className="rounded-sm border border-border/60 bg-card p-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-gold-soft/40 text-gold-deep">
              <Clock className="h-4 w-4" />
            </div>
            <h2 className="mt-5 font-serif text-2xl text-charcoal">{t.treatmentPage.hoursTitle}</h2>
            <dl className="mt-3 space-y-1 text-sm text-charcoal-soft">
              {hours.map((h) => (
                <div key={h.d} className="flex justify-between gap-6">
                  <dt>{h.d}</dt>
                  <dd>{h.h}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      {studio.testimonials.length > 0 && (
        <section className="bg-ivory-deep/60">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <Eyebrow className="justify-center">{t.treatmentPage.voices}</Eyebrow>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {studio.testimonials.map((it, i) => (
                <figure
                  key={`${it.author}-${i}`}
                  className="flex h-full flex-col rounded-sm border border-border/60 bg-card p-8"
                >
                  <span aria-hidden className="font-serif text-4xl leading-none text-gold-deep">
                    “
                  </span>
                  <StudioText
                    as="blockquote"
                    className="mt-4 flex-1 text-base leading-relaxed text-charcoal-soft"
                  >
                    {it.quote}
                  </StudioText>
                  <div className="gold-rule mt-6 w-8" />
                  {it.author && (
                    <StudioText
                      as="figcaption"
                      className="mt-4 text-[0.7rem] uppercase tracking-[0.25em] text-charcoal"
                    >
                      {it.author}
                    </StudioText>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
