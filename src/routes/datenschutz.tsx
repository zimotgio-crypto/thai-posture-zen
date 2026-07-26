import { createFileRoute } from "@tanstack/react-router";
import { Eyebrow, Section } from "@/components/section";

export const Route = createFileRoute("/datenschutz")({
  head: () => ({
    meta: [
      { title: "Datenschutzerklärung — Thai Posture Lab Zuzwil" },
      {
        name: "description",
        content:
          "Datenschutzerklärung des Thai Posture Lab in Zuzwil SG: erhobene Daten, Zweck, Speicherdauer, Rechte und eingesetzte Dienste.",
      },
      { property: "og:title", content: "Datenschutzerklärung — Thai Posture Lab" },
      {
        property: "og:description",
        content: "Wie das Thai Posture Lab in Zuzwil SG mit persönlichen Daten umgeht.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Datenschutz,
});

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border/60 pt-8">
      <h2 className="font-serif text-2xl leading-snug text-charcoal">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-charcoal-soft">{children}</div>
    </div>
  );
}

function Datenschutz() {
  return (
    <Section className="pt-14 lg:pt-20">
      <div className="max-w-3xl">
        <Eyebrow>Rechtliches</Eyebrow>
        <h1 className="mt-6 text-5xl leading-[1.05] text-charcoal lg:text-6xl">Datenschutzerklärung</h1>
        <p className="mt-6 text-lg text-charcoal-soft">
          Der Schutz Ihrer persönlichen Daten ist uns wichtig. Nachfolgend erfahren Sie, welche Daten wir
          erheben, wofür wir sie verwenden und welche Rechte Ihnen zustehen.
        </p>

        <div className="mt-12 space-y-10">
          <Block title="Verantwortliche Stelle">
            <p>
              Thai Posture Lab
              <br />
              Eschenstrasse 24
              <br />
              9524 Zuzwil SG
              <br />
              Schweiz
            </p>
            <p>
              Kontakt:{" "}
              <a href="mailto:zimotgio@gmail.com" className="text-gold-deep hover:text-charcoal">
                zimotgio@gmail.com
              </a>
            </p>
          </Block>

          <Block title="Welche Daten erhoben werden">
            <p>
              Bei der Terminbuchung erheben wir Name, Adresse, E-Mail-Adresse und Telefonnummer. Diese Angaben
              benötigen wir, um Ihren Termin zu bestätigen und Sie bei Änderungen erreichen zu können.
            </p>
            <p>
              Im Rahmen der Behandlung dokumentieren wir zusätzlich Behandlungsnotizen sowie Angaben zu
              Beschwerden, Spannungszonen und Beweglichkeit. Diese Informationen dienen ausschliesslich der
              fachgerechten Fortführung Ihrer Behandlungen.
            </p>
          </Block>

          <Block title="Zweck der Verarbeitung">
            <p>
              Wir verarbeiten Ihre Daten zur Terminverwaltung, zur Behandlungsdokumentation und zur
              Kontaktaufnahme im Zusammenhang mit Ihren Terminen. Eine Weitergabe zu Werbezwecken oder ein
              Verkauf von Daten an Dritte findet nicht statt.
            </p>
          </Block>

          <Block title="Speicherdauer und Ihre Rechte">
            <p>
              Buchungs- und Behandlungsdaten werden nur so lange gespeichert, wie dies für die Betreuung und
              die gesetzlichen Aufbewahrungspflichten erforderlich ist. Danach werden sie gelöscht.
            </p>
            <p>
              Sie haben jederzeit das Recht auf Auskunft über die zu Ihrer Person gespeicherten Daten, auf
              Berichtigung unrichtiger Angaben sowie auf Löschung. Eine kurze Nachricht an{" "}
              <a href="mailto:zimotgio@gmail.com" className="text-gold-deep hover:text-charcoal">
                zimotgio@gmail.com
              </a>{" "}
              genügt.
            </p>
          </Block>

          <Block title="Eingesetzte Dienste">
            <p>
              <span className="text-charcoal">Supabase</span> — Speicherung der Buchungs- und
              Behandlungsdaten in einer zugriffsgeschützten Datenbank.
            </p>
            <p>
              <span className="text-charcoal">Google Calendar</span> — Synchronisation der Termine, damit
              Doppelbuchungen vermieden werden.
            </p>
            <p>
              <span className="text-charcoal">WhatsApp Business</span> — Terminbuchung und Terminauskunft per
              Nachricht, sofern Sie diesen Weg nutzen.
            </p>
          </Block>

          <Block title="Cookies">
            <p>
              Wir setzen keine Tracking- oder Werbe-Cookies ein und verwenden keine Analyse-Dienste zur
              Profilbildung. Technisch notwendige Speicherung im Browser erfolgt lediglich für Einstellungen
              wie die gewählte Sprache.
            </p>
          </Block>
        </div>
      </div>
    </Section>
  );
}