import { Phone, Mail, MapPin } from "lucide-react";
import { BodyMapView, parseBodyMap } from "@/components/admin/body-map";
import {
  ZoneScoreBadgeGrid,
  parseZoneScores,
  TENSION_ZONES,
  MOBILITY_ZONES,
} from "@/components/admin/assessment";
import { formatDuration, formatSwissDate } from "@/lib/pricing";
import { useAdminStudioOptional } from "@/lib/admin-studio-context";

export type SessionLog = {
  id: string;
  body_html: string;
  created_at: string;
  booking_id: string | null;
  treatment_date: string | null;
  treatment_name: string | null;
  duration_minutes: number | null;
  body_map: unknown;
  pain_level: number | null;
  mobility: unknown;
  tension: unknown;
  bookings?: { day: string; treatment: string; duration_minutes?: number | null } | null;
};

export type ClientLike = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
};

function fullName(c: Pick<ClientLike, "first_name" | "last_name">) {
  return `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
}

export function BehandlungsprotokollContent({
  log,
  client,
}: {
  log: SessionLog;
  client: ClientLike;
}) {
  const admin = useAdminStudioOptional();
  const studio = admin?.studio;
  const linked = log.bookings ?? null;
  const headerDate = linked?.day ?? log.treatment_date ?? log.created_at.slice(0, 10);
  const label = linked?.treatment ?? log.treatment_name ?? "Manuelle Notiz";
  const dur = linked?.duration_minutes ?? log.duration_minutes ?? null;
  const mob = parseZoneScores(log.mobility);
  const ten = parseZoneScores(log.tension);
  const map = parseBodyMap(log.body_map);

  return (
    <>
      <header className="text-center">
        <div className="font-serif text-xl text-charcoal">{studio?.name ?? "Thai Posture Lab"}</div>
        <div className="mt-1 text-[0.62rem] uppercase tracking-[0.32em] text-gold-deep">
          {[studio?.street, [studio?.zip, studio?.city].filter(Boolean).join(" ")]
            .filter(Boolean)
            .join(" · ") || "Zuzwil"}
        </div>
        <div className="gold-rule mt-4" />
      </header>

      <section className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-[0.65rem] uppercase tracking-[0.28em] text-gold-deep">
            Behandlungsprotokoll
          </div>
          <h2 className="mt-1 font-serif text-2xl text-charcoal">
            {label}
            {dur && <span className="text-charcoal-soft"> · {formatDuration(dur)}</span>}
          </h2>
        </div>
        <div className="text-sm text-charcoal-soft">{formatSwissDate(headerDate)}</div>
      </section>

      <section className="mt-6 rounded-sm border border-border/60 bg-card/60 p-4">
        <div className="text-[0.62rem] uppercase tracking-[0.28em] text-charcoal-soft">Kundin / Kunde</div>
        <div className="mt-2 font-serif text-lg text-charcoal">{fullName(client)}</div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-charcoal-soft">
          {client.phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-gold-deep" /> {client.phone}
            </span>
          )}
          {client.email && (
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-gold-deep" /> {client.email}
            </span>
          )}
          {(client.street || client.zip || client.city) && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-gold-deep" />
              {[client.street, [client.zip, client.city].filter(Boolean).join(" ")]
                .filter(Boolean)
                .join(", ")}
            </span>
          )}
        </div>
      </section>

      <section className="mt-6">
        <div className="text-[0.62rem] uppercase tracking-[0.28em] text-gold-deep">Behandelte Zonen</div>
        <div className="mt-3">
          <BodyMapView value={map} />
        </div>
      </section>

      <section className="mt-6">
        <div className="text-[0.62rem] uppercase tracking-[0.28em] text-gold-deep">Notizen</div>
        <div
          className="prose prose-sm mt-2 max-w-none text-charcoal"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: rich-text notes authored by admin
          dangerouslySetInnerHTML={{ __html: log.body_html }}
        />
      </section>

      {Object.keys(ten).length > 0 && (
        <section className="mt-6">
          <div className="text-[0.62rem] uppercase tracking-[0.28em] text-gold-deep">Spannung & Schmerz</div>
          <div className="mt-3">
            <ZoneScoreBadgeGrid labels={TENSION_ZONES as unknown as Record<string, string>} data={ten} />
          </div>
        </section>
      )}
      {Object.keys(mob).length > 0 && (
        <section className="mt-6">
          <div className="text-[0.62rem] uppercase tracking-[0.28em] text-gold-deep">Beweglichkeit & Gelenke</div>
          <div className="mt-3">
            <ZoneScoreBadgeGrid labels={MOBILITY_ZONES as unknown as Record<string, string>} data={mob} />
          </div>
        </section>
      )}

      <footer className="mt-10 flex items-end justify-between gap-6 border-t border-border/60 pt-6 text-xs text-charcoal-soft">
        <div>
          <div className="text-[0.62rem] uppercase tracking-[0.28em] text-gold-deep">Status</div>
          <div className="mt-1 text-sm text-charcoal">Abgeschlossen</div>
        </div>
        <div className="text-right">
          <div className="mb-1 h-8 w-56 border-b border-charcoal/40" />
          <div className="text-[0.62rem] uppercase tracking-[0.28em] text-charcoal-soft">
            Therapeut / Therapeutin
          </div>
        </div>
      </footer>
    </>
  );
}

export function BehandlungsprotokollPrintLayout({
  log,
  client,
}: {
  log: SessionLog | null;
  client: ClientLike | null;
}) {
  if (!log || !client) return null;
  return (
    <div id="print-root" className="hidden print:block">
      <div className="w-[210mm] bg-ivory p-[16mm] text-charcoal">
        <BehandlungsprotokollContent log={log} client={client} />
      </div>
    </div>
  );
}