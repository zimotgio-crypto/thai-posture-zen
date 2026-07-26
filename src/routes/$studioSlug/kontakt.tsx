import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Clock, Wallet, ShieldCheck, ClipboardList } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import towelsImg from "@/assets/therapist-portrait.jpg";
import { Eyebrow, Section } from "@/components/section";
import { useBooking } from "@/components/booking-provider";
import { useT } from "@/lib/i18n";
import { studioPublicQuery } from "@/lib/studio-context";

const SITE_URL = "https://thai-posture-zen.lovable.app";

export const Route = createFileRoute("/$studioSlug/kontakt")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(studioPublicQuery(params.studioSlug)),
  head: ({ params, loaderData }) => {
    const name = loaderData?.name ?? "Thai Massage Studio";
    const city = loaderData?.city ?? "";
    const title = `Kontakt & Info — ${name}${city ? ` ${city}` : ""}`;
    const description = `Öffnungszeiten, Adresse und FAQ von ${name}${city ? ` in ${city}` : ""}. TWINT, Karte oder Bar.`;
    const url = `${SITE_URL}/${params.studioSlug}/kontakt`;
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
  component: Kontakt,
});

function Kontakt() {
  const { open } = useBooking();
  const t = useT();
  return (
    <>
      <Section className="pt-14 lg:pt-20">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Eyebrow>{t.contact.eyebrow}</Eyebrow>
            <h1 className="mt-6 text-5xl leading-[1.05] text-charcoal lg:text-6xl">{t.contact.h1}</h1>
            <p className="mt-6 max-w-lg text-lg text-charcoal-soft">{t.contact.intro}</p>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <InfoCard icon={MapPin} title={t.contact.address}>
                {t.contact.addressLines.map((line, i) => (
                  <span key={i}>{line}{i < t.contact.addressLines.length - 1 && <br />}</span>
                ))}
              </InfoCard>
              <InfoCard icon={Clock} title={t.contact.hoursTitle}>
                {t.contact.hours.map((h) => (
                  <div key={h.d} className="flex justify-between gap-4 py-0.5">
                    <span>{h.d}</span>
                    <span className="text-charcoal">{h.h}</span>
                  </div>
                ))}
              </InfoCard>
              <InfoCard icon={Wallet} title={t.contact.payment}>{t.contact.paymentDesc}</InfoCard>
              <InfoCard icon={ShieldCheck} title={t.contact.hygiene}>{t.contact.hygieneDesc}</InfoCard>
              <InfoCard icon={ClipboardList} title={t.contact.diary} className="sm:col-span-2">
                {t.contact.diaryDesc}
              </InfoCard>
            </div>

            <div className="mt-10">
              <button onClick={() => open()} className="btn-gold rounded-sm px-7 py-4 text-[0.78rem] uppercase tracking-[0.24em]">
                {t.contact.book}
              </button>
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 -z-10 wood-panel opacity-70" />
              <img
                src={towelsImg}
                alt={t.contact.towelsAlt}
                width={1200}
                height={1500}
                loading="lazy"
                className="h-[520px] w-full rounded-sm object-cover shadow-[var(--shadow-soft)]"
              />
            </div>
            <div className="mt-8 rounded-sm border border-border/60 bg-card p-6">
              <div className="text-[0.7rem] uppercase tracking-[0.25em] text-gold-deep">{t.contact.promise}</div>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-soft">{t.contact.promiseDesc}</p>
            </div>
          </aside>
        </div>
      </Section>

      <section className="bg-ivory-deep/60">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>{t.contact.mapEyebrow}</Eyebrow>
              <h2 className="mt-4 text-4xl leading-tight text-charcoal">{t.contact.mapH}</h2>
            </div>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Eschenstrasse+24+9524+Zuzwil"
              target="_blank"
              rel="noreferrer"
              className="text-sm uppercase tracking-[0.22em] text-charcoal-soft hover:text-charcoal"
            >
              {t.contact.openMaps}
            </a>
          </div>
          <div className="overflow-hidden rounded-sm border border-border/60 shadow-[var(--shadow-soft)]">
            <iframe
              title={t.contact.mapTitle}
              src="https://www.google.com/maps?q=Eschenstrasse%2024%209524%20Zuzwil&output=embed"
              className="h-[440px] w-full grayscale-[35%]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Eyebrow>{t.contact.faqEyebrow}</Eyebrow>
            <h2 className="mt-5 text-4xl leading-tight text-charcoal">{t.contact.faqH}</h2>
            <p className="mt-4 text-charcoal-soft">{t.contact.faqP}</p>
          </div>
          <div className="lg:col-span-8">
            <Accordion type="single" collapsible className="w-full">
              {t.contact.faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-border/70">
                  <AccordionTrigger className="text-left font-serif text-lg text-charcoal hover:text-gold-deep">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-charcoal-soft">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </Section>
    </>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-sm border border-border/60 bg-card p-6 ${className ?? ""}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-gold-soft/40 text-gold-deep">
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-[0.7rem] uppercase tracking-[0.25em] text-charcoal-soft">{title}</div>
      </div>
      <div className="mt-4 text-sm leading-relaxed text-charcoal-soft">{children}</div>
    </div>
  );
}
