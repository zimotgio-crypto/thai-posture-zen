import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, MapPin, Phone, Mail, Sparkles, Target } from "lucide-react";
import { getClient, addSessionLog } from "@/lib/admin.functions";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import {
  BodyMapEditor,
  BodyMapThumbnail,
  EMPTY_BODY_MAP,
  parseBodyMap,
  type BodyMapState,
} from "@/components/admin/body-map";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDuration, formatSwissDate } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/admin/clients/$id")({
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getClientFn = useServerFn(getClient);
  const addLog = useServerFn(addSessionLog);

  const [bodyHtml, setBodyHtml] = useState("");
  const [linkBookingId, setLinkBookingId] = useState<string>("");
  const [treatmentDate, setTreatmentDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );
  const [bodyMap, setBodyMap] = useState<BodyMapState>(EMPTY_BODY_MAP);
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "client", id],
    queryFn: () => getClientFn({ data: { id } }),
  });

  const bookings = q.data?.bookings ?? [];
  const logs = q.data?.logs ?? [];
  const client = q.data?.client;

  const pastBookings = useMemo(
    () => bookings.filter((b) => new Date(`${b.day}T${b.time}`) < new Date()),
    [bookings]
  );

  async function saveNote() {
    const text = bodyHtml.replace(/<[^>]+>/g, "").trim();
    if (!text) {
      toast.error("Notiz darf nicht leer sein.");
      return;
    }
    setBusy(true);
    try {
      await addLog({
        data: {
          clientId: id,
          bookingId: linkBookingId || null,
          bodyHtml,
          treatmentDate: linkBookingId ? null : treatmentDate,
          treatmentName: null,
          durationMinutes: null,
          bodyMap,
        },
      });
      toast.success("Notiz gespeichert");
      setBodyHtml("");
      setLinkBookingId("");
      setTreatmentDate(new Date().toISOString().slice(0, 10));
      setBodyMap(EMPTY_BODY_MAP);
      qc.invalidateQueries({ queryKey: ["admin", "client", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  if (q.isLoading) return <p className="text-sm text-charcoal-soft">Lade…</p>;
  if (q.isError || !client) return <p className="text-sm text-destructive">Kunde nicht gefunden.</p>;

  return (
    <div className="space-y-8">
      <Link
        to="/admin/clients"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-charcoal-soft hover:text-charcoal"
      >
        <ArrowLeft className="h-3 w-3" /> Alle Kunden
      </Link>

      <header className="rounded-sm border border-border/60 bg-card p-8">
        <h1 className="font-serif text-3xl text-charcoal">{`${client.first_name} ${client.last_name}`.trim()}</h1>
        <div className="mt-4 grid gap-3 text-sm text-charcoal-soft sm:grid-cols-3">
          <span className="inline-flex items-center gap-2">
            <Phone className="h-4 w-4 text-gold-deep" /> {client.phone}
          </span>
          <span className="inline-flex items-center gap-2 truncate">
            <Mail className="h-4 w-4 text-gold-deep" /> {client.email}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gold-deep" />
            {client.street}, {client.zip} {client.city}
          </span>
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-serif text-xl text-charcoal">Termine</h2>
          <div className="rounded-sm border border-border/60 bg-card divide-y divide-border/50">
            {bookings.length === 0 && (
              <p className="p-5 text-sm text-charcoal-soft">Noch keine Termine.</p>
            )}
            {bookings.map((b) => (
              <div key={b.id} className="p-4">
                <div className="text-[0.65rem] uppercase tracking-[0.22em] text-charcoal-soft">
                  {b.day} · {b.time}
                </div>
                <div className="mt-1 text-sm text-charcoal">{b.treatment}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.3em] text-gold-deep">
              <Sparkles className="h-3.5 w-3.5" /> Massagetagebuch
            </div>
            <h2 className="mt-2 font-serif text-2xl text-charcoal">Neuer Eintrag</h2>
            {pastBookings.length > 0 && (
              <div className="mt-4">
                <label className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">
                  Termin verknüpfen (optional)
                </label>
                <select
                  value={linkBookingId}
                  onChange={(e) => setLinkBookingId(e.target.value)}
                  className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— keiner —</option>
                  {pastBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.day} · {b.time} · {b.treatment}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {!linkBookingId && (
              <div className="mt-4">
                <label className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">
                  Behandlungsdatum
                </label>
                <input
                  type="date"
                  value={treatmentDate}
                  onChange={(e) => setTreatmentDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm sm:w-64"
                />
              </div>
            )}
            <div className="mt-4">
              <TiptapEditor
                value={bodyHtml}
                onChange={setBodyHtml}
                placeholder="z.B. Verhärtung im oberen Trapezmuskel gelöst, Haltung leicht verbessert…"
              />
            </div>
            <div className="mt-6 rounded-sm border border-border/60 bg-card p-5">
              <div className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.3em] text-gold-deep">
                <Target className="h-3.5 w-3.5" /> Körperkartierung
              </div>
              <p className="mt-2 text-sm text-charcoal-soft">
                Klicken Sie auf die Körperumrisse, um Schmerz- oder Problemstellen zu markieren.
              </p>
              <div className="mt-4">
                <BodyMapEditor value={bodyMap} onChange={setBodyMap} />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={saveNote}
                disabled={busy}
                className="btn-gold rounded-sm px-6 py-4 text-[0.72rem] uppercase tracking-[0.22em] disabled:opacity-50"
              >
                Notiz speichern
              </Button>
            </div>
          </div>

          <div>
            <h2 className="font-serif text-xl text-charcoal">Verlauf</h2>
            <div className="mt-4 space-y-4">
              {logs.length === 0 && (
                <p className="rounded-sm border border-dashed border-border/70 px-4 py-8 text-center text-sm text-charcoal-soft">
                  Noch keine Einträge im Massagetagebuch.
                </p>
              )}
              {logs.map((l) => {
                const linked = (l as {
                  bookings?: { day: string; treatment: string; duration_minutes?: number | null } | null;
                }).bookings ?? null;
                const tDate = (l as { treatment_date?: string | null }).treatment_date ?? null;
                const tName = (l as { treatment_name?: string | null }).treatment_name ?? null;
                const tDur = (l as { duration_minutes?: number | null }).duration_minutes ?? null;
                const headerDate = linked?.day ?? tDate ?? l.created_at.slice(0, 10);
                const label = linked
                  ? `${linked.treatment}${linked.duration_minutes ? ` (${formatDuration(linked.duration_minutes)})` : ""}`
                  : tName
                    ? `${tName}${tDur ? ` (${formatDuration(tDur)})` : ""}`
                    : "Manuelle Notiz";
                return (
                  <article key={l.id} className="rounded-sm border border-border/60 bg-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="text-[0.7rem] uppercase tracking-[0.22em] text-charcoal-soft">
                        <span>{formatSwissDate(headerDate)}</span>
                        <span className="mx-2 text-gold-deep">·</span>
                        <span className="font-semibold tracking-[0.18em] text-gold-deep">{label}</span>
                      </div>
                      <BodyMapThumbnail
                        value={parseBodyMap((l as { body_map?: unknown }).body_map)}
                      />
                    </div>
                    <div
                      className="prose prose-sm mt-3 max-w-none text-charcoal"
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: rich-text notes authored by admin
                      dangerouslySetInnerHTML={{ __html: l.body_html }}
                    />
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}