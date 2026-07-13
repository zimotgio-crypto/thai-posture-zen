import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Clock, Wallet, ShieldCheck, ClipboardList } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import towelsImg from "@/assets/therapist-portrait.jpg";
import { Eyebrow, Section } from "@/components/section";
import { useBooking } from "@/components/booking-provider";

export const Route = createFileRoute("/kontakt")({
  head: () => ({
    meta: [
      { title: "Kontakt & Info — Thai Posture Lab Zuzwil" },
      { name: "description", content: "Öffnungszeiten, Adresse und FAQ des Thai Posture Lab an der Eschenstrasse 24, 9524 Zuzwil SG. TWINT, Karte oder Bar." },
      { property: "og:title", content: "Kontakt & Info — Thai Posture Lab Zuzwil" },
      { property: "og:description", content: "Eschenstrasse 24, 9524 Zuzwil SG. Öffnungszeiten, Hygiene-Standards und FAQ." },
    ],
  }),
  component: Kontakt,
});

const hours = [
  { d: "Montag – Freitag", h: "09:00 – 20:00" },
  { d: "Samstag", h: "10:00 – 18:00" },
  { d: "Sonntag", h: "Geschlossen" },
];

const faqs = [
  { q: "Muss ich mich vorbereiten?", a: "Nein. Komm bequem gekleidet — wir stellen alles Nötige zur Verfügung. Bitte 5 Minuten vor Termin da sein." },
  { q: "Was ist das Silent Treatment?", a: "Auf Wunsch verzichten wir vollständig auf Smalltalk. Ideal, wenn du wirklich abschalten willst — einfach beim Buchen aktivieren." },
  { q: "Wie kann ich bezahlen?", a: "Wir akzeptieren TWINT, alle gängigen Karten sowie Bargeld. Die Quittung erhältst du digital per Mail." },
  { q: "Kann ich kurzfristig absagen?", a: "Kostenlose Absagen sind bis zu 24 Stunden vor dem Termin möglich. Da wir ein kleines Studio sind und die Slots exklusiv für dich reservieren, behalten wir uns bei kurzfristigeren Absagen oder Nichterscheinen vor, eine Umtriebsentschädigung von 50% des Behandlungspreises per Post- oder Mail-Rechnung zu stellen. Vielen Dank für dein Verständnis und dein Fairplay!" },
  { q: "Gibt es Parkplätze?", a: "Ja, direkt vor dem Studio an der Eschenstrasse 24. Kostenlos für unsere Gäste." },
];

function Kontakt() {
  const { open } = useBooking();
  return (
    <>
      <Section className="pt-14 lg:pt-20">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Eyebrow>Kontakt & Info</Eyebrow>
            <h1 className="mt-6 text-5xl leading-[1.05] text-charcoal lg:text-6xl">
              An der Eschenstrasse 24. Mitten in Zuzwil.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-charcoal-soft">
              Ein ruhiger Ort — bewusst klein, bewusst persönlich. Termine
              ausschließlich nach Vereinbarung.
            </p>

            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              <InfoCard icon={MapPin} title="Adresse">
                Eschenstrasse 24<br />9524 Zuzwil SG<br />Schweiz
              </InfoCard>
              <InfoCard icon={Clock} title="Öffnungszeiten">
                {hours.map((h) => (
                  <div key={h.d} className="flex justify-between gap-4 py-0.5">
                    <span>{h.d}</span>
                    <span className="text-charcoal">{h.h}</span>
                  </div>
                ))}
              </InfoCard>
              <InfoCard icon={Wallet} title="Bezahlung">
                TWINT, Kredit- & Debitkarte, Bargeld. Digitale Quittung per Mail.
              </InfoCard>
              <InfoCard icon={ShieldCheck} title="Hygiene-Standard">
                Frische Textilien pro Termin. Desinfizierte Oberflächen. Bio-Öle in Single-Use-Portionen.
              </InfoCard>
              <InfoCard icon={ClipboardList} title="Massagetagebuch" className="sm:col-span-2">
                Wir dokumentieren deinen Behandlungs- und Haltungsverlauf nach jeder Sitzung präzise.
                So wissen wir bei deinem nächsten Besuch sofort, welche Muskelketten gezielte Zuwendung
                brauchen, tracken deine Fortschritte und passen jeden Griff perfekt an deinen Körper an
                – hocheffizient und ganz ohne erneutes Erklären.
              </InfoCard>
            </div>

            <div className="mt-10">
              <button onClick={() => open()} className="btn-gold rounded-sm px-7 py-4 text-[0.78rem] uppercase tracking-[0.24em]">
                Termin buchen
              </button>
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 -z-10 wood-panel opacity-70" />
              <img
                src={towelsImg}
                alt="Frisch gerollte, hochwertige weiße Baumwolltücher auf einer warmen, neutralen Oberfläche"
                width={1200}
                height={1500}
                loading="lazy"
                className="h-[520px] w-full rounded-sm object-cover shadow-[var(--shadow-soft)]"
              />
            </div>
            <div className="mt-8 rounded-sm border border-border/60 bg-card p-6">
              <div className="text-[0.7rem] uppercase tracking-[0.25em] text-gold-deep">Unser Versprechen</div>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-soft">
                Präzise Griffe, fundiertes Haltungswissen und absolute Diskretion.
                Jede Behandlung im Thai Posture Lab wird nach höchsten Schweizer
                Hygiene- und Qualitätsstandards durchgeführt. Deine Erholung steht
                bei uns im Mittelpunkt.
              </p>
            </div>
          </aside>
        </div>
      </Section>

      {/* Map */}
      <section className="bg-ivory-deep/60">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>So findest du uns</Eyebrow>
              <h2 className="mt-4 text-4xl leading-tight text-charcoal">Eschenstrasse 24, Zuzwil.</h2>
            </div>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Eschenstrasse+24+9524+Zuzwil"
              target="_blank"
              rel="noreferrer"
              className="text-sm uppercase tracking-[0.22em] text-charcoal-soft hover:text-charcoal"
            >
              In Google Maps öffnen →
            </a>
          </div>
          <div className="overflow-hidden rounded-sm border border-border/60 shadow-[var(--shadow-soft)]">
            <iframe
              title="Standort Thai Posture Lab"
              src="https://www.google.com/maps?q=Eschenstrasse%2024%209524%20Zuzwil&output=embed"
              className="h-[440px] w-full grayscale-[35%]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-5 text-4xl leading-tight text-charcoal">Häufige Fragen.</h2>
            <p className="mt-4 text-charcoal-soft">Weitere Fragen? Schreib uns beim Buchen einfach eine Notiz.</p>
          </div>
          <div className="lg:col-span-8">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={f.q} value={`item-${i}`} className="border-border/70">
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