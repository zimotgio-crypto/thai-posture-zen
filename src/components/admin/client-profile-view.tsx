import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Phone, Mail, MapPin, Sparkles, Target, Trash2, Printer, X, TrendingUp } from "lucide-react";
import { addSessionLog, deleteClient, getClient, updateClient } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import {
  BodyMapEditor,
  BodyMapView,
  EMPTY_BODY_MAP,
  parseBodyMap,
  type BodyMapState,
} from "@/components/admin/body-map";
import {
  PainBadge,
  ZoneScaleGrid,
  ZoneScoreBadgeGrid,
  parseZoneScores,
  initialZoneScores,
  TENSION_ZONES,
  MOBILITY_ZONES,
  TENSION_ZONES_LIST,
  MOBILITY_ZONES_LIST,
} from "@/components/admin/assessment";
import {
  BehandlungsprotokollContent,
  BehandlungsprotokollPrintLayout,
} from "@/components/admin/behandlungsprotokoll-print-layout";
import { PainTrendDialog } from "@/components/admin/pain-trend-chart";
import { toast } from "sonner";
import { formatDuration, formatSwissDate } from "@/lib/pricing";

type ClientLike = {
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

function formatBookingOption(b: {
  day: string;
  time: string;
  treatment: string;
  duration_minutes?: number | null;
}) {
  const time = b.time.slice(0, 5);
  const dur = b.duration_minutes ? ` (${formatDuration(b.duration_minutes)})` : "";
  return `${formatSwissDate(b.day)}, ${time} — ${b.treatment}${dur}`;
}

function stripHtml(html: string) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 80 ? `${text.slice(0, 78)}…` : text;
}

export function ClientProfileView({
  clientId,
  fallback,
  onDeleted,
}: {
  clientId: string;
  fallback?: ClientLike;
  onDeleted?: () => void;
}) {
  const qc = useQueryClient();
  const getClientFn = useServerFn(getClient);
  const addLog = useServerFn(addSessionLog);
  const updateClientFn = useServerFn(updateClient);
  const deleteClientFn = useServerFn(deleteClient);

  const q = useQuery({
    queryKey: ["admin", "client", clientId],
    queryFn: () => getClientFn({ data: { id: clientId } }),
  });

  const client = (q.data?.client ?? fallback) as ClientLike | undefined;
  const bookings = q.data?.bookings ?? [];
  const logs = q.data?.logs ?? [];

  const [editingContact, setEditingContact] = useState(false);
  const [form, setForm] = useState({
    firstName: fallback?.first_name ?? "",
    lastName: fallback?.last_name ?? "",
    email: fallback?.email ?? "",
    phone: fallback?.phone ?? "",
    street: fallback?.street ?? "",
    zip: fallback?.zip ?? "",
    city: fallback?.city ?? "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (q.data?.client) {
      const c = q.data.client;
      setForm({
        firstName: c.first_name ?? "",
        lastName: c.last_name ?? "",
        email: c.email ?? "",
        phone: c.phone ?? "",
        street: c.street ?? "",
        zip: c.zip ?? "",
        city: c.city ?? "",
      });
    }
  }, [q.data?.client]);

  const [bodyHtml, setBodyHtml] = useState("");
  const [linkBookingId, setLinkBookingId] = useState("");
  const [bodyMap, setBodyMap] = useState<BodyMapState>(EMPTY_BODY_MAP);
  const [tensionZones, setTensionZones] = useState<Record<string, number>>(() =>
    initialZoneScores(TENSION_ZONES_LIST),
  );
  const [mobilityZones, setMobilityZones] = useState<Record<string, number>>(() =>
    initialZoneScores(MOBILITY_ZONES_LIST),
  );
  const [busy, setBusy] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openLogId, setOpenLogId] = useState<string | null>(null);

  const nextBooking = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const future = bookings
      .filter((b) => b.day >= today)
      .sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
    return future[0] ?? null;
  }, [bookings]);

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
          clientId,
          bookingId: linkBookingId || null,
          bodyHtml,
          treatmentDate: linkBookingId ? null : new Date().toISOString().slice(0, 10),
          treatmentName: null,
          durationMinutes: null,
          bodyMap,
          tensionZones,
          mobilityZones,
        },
      });
      toast.success("Notiz gespeichert");
      setBodyHtml("");
      setLinkBookingId("");
      setBodyMap(EMPTY_BODY_MAP);
      setTensionZones(initialZoneScores(TENSION_ZONES_LIST));
      setMobilityZones(initialZoneScores(MOBILITY_ZONES_LIST));
      qc.invalidateQueries({ queryKey: ["admin", "client", clientId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await updateClientFn({ data: { id: clientId, ...form } });
      toast.success("Kundendaten aktualisiert");
      qc.invalidateQueries({ queryKey: ["admin", "client", clientId] });
      qc.invalidateQueries({ queryKey: ["admin", "clients"] });
      setEditingContact(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSavingProfile(false);
    }
  }

  async function removeClient() {
    setDeleting(true);
    try {
      await deleteClientFn({ data: { id: clientId } });
      toast.success("Kunde gelöscht");
      qc.invalidateQueries({ queryKey: ["admin", "clients"] });
      setConfirmDelete(false);
      onDeleted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
      setDeleting(false);
    }
  }

  const openLog = logs.find((l) => l.id === openLogId) ?? null;

  if (!client) {
    return <p className="text-sm text-charcoal-soft">Lade…</p>;
  }

  return (
    <div className="space-y-7">
      <header className="space-y-4">
        <div className="text-[0.68rem] uppercase tracking-[0.28em] text-gold-deep">Kundenprofil</div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="font-serif text-3xl font-normal text-charcoal">{fullName(client)}</h1>
          <div className="flex items-center gap-2">
            {nextBooking && (
              <span className="inline-flex items-center gap-2 rounded-sm border border-gold/50 bg-gold-soft/30 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.2em] text-charcoal">
                Nächster Termin: {formatSwissDate(nextBooking.day)} · {nextBooking.time.slice(0, 5)}
              </span>
            )}
            <button
              type="button"
              onClick={() => setEditingContact((v) => !v)}
              aria-label="Stammdaten bearbeiten"
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border/60 text-charcoal-soft transition hover:border-gold-deep/60 hover:text-gold-deep"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!editingContact ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-charcoal-soft">
            {client.phone && (
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4 text-gold-deep" /> {client.phone}
              </span>
            )}
            {client.email && (
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4 text-gold-deep" /> {client.email}
              </span>
            )}
            {(client.street || client.zip || client.city) && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gold-deep" />
                {[client.street, [client.zip, client.city].filter(Boolean).join(" ")]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            )}
          </div>
        ) : (
          <section className="rounded-sm border border-border/60 bg-ivory-deep/20 p-5">
            <div className="mb-4 text-[0.65rem] uppercase tracking-[0.22em] text-charcoal-soft">
              Stammdaten bearbeiten
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-charcoal-soft">Vorname</Label>
                <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-charcoal-soft">Nachname</Label>
                <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-charcoal-soft">E-Mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-charcoal-soft">Telefon</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-charcoal-soft">Strasse / Nr.</Label>
                <Input value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-charcoal-soft">PLZ</Label>
                <Input value={form.zip} onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-charcoal-soft">Ort</Label>
                <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingContact(false)}
                disabled={savingProfile}
                className="rounded-sm px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.22em]"
              >
                Abbrechen
              </Button>
              <Button
                onClick={saveProfile}
                disabled={savingProfile}
                className="btn-gold rounded-sm px-5 py-2.5 text-[0.7rem] uppercase tracking-[0.22em] disabled:opacity-50"
              >
                Speichern
              </Button>
            </div>
          </section>
        )}
      </header>

      <Tabs defaultValue="history" className="space-y-6">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="history">Verlauf</TabsTrigger>
          <TabsTrigger value="new">Neuer Eintrag</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="space-y-3">
          {q.isLoading && (
            <p className="rounded-sm border border-dashed border-border/70 px-4 py-8 text-center text-sm text-charcoal-soft">
              Lade Verlauf…
            </p>
          )}
          {!q.isLoading && logs.length === 0 && (
            <p className="rounded-sm border border-dashed border-border/70 px-4 py-8 text-center text-sm text-charcoal-soft">
              Noch keine Einträge im Massagetagebuch.
            </p>
          )}
          <ul className="divide-y divide-border/50 rounded-sm border border-border/60 bg-card">
            {logs.map((l) => {
              const linked = (l as {
                bookings?: { day: string; treatment: string; duration_minutes?: number | null } | null;
              }).bookings ?? null;
              const tDate = (l as { treatment_date?: string | null }).treatment_date ?? null;
              const tName = (l as { treatment_name?: string | null }).treatment_name ?? null;
              const tDur = (l as { duration_minutes?: number | null }).duration_minutes ?? null;
              const tensionScores = parseZoneScores((l as { tension?: unknown }).tension);
              const tensionValues = Object.values(tensionScores);
              const maxTension = tensionValues.length > 0 ? Math.max(...tensionValues) : null;
              const headerDate = linked?.day ?? tDate ?? l.created_at.slice(0, 10);
              const label = linked
                ? linked.treatment
                : tName ?? "Manuelle Notiz";
              const dur = linked?.duration_minutes ?? tDur ?? null;
              const preview = stripHtml(l.body_html);
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => setOpenLogId(l.id)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none"
                  >
                    <div className="w-28 shrink-0 text-[0.68rem] uppercase tracking-[0.22em] text-charcoal-soft">
                      {formatSwissDate(headerDate)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-charcoal">
                        {label}
                        {dur && <span className="text-charcoal-soft"> · {formatDuration(dur)}</span>}
                      </div>
                      {preview && (
                        <div className="mt-0.5 truncate text-xs text-charcoal-soft">{preview}</div>
                      )}
                    </div>
                    {maxTension != null && <PainBadge value={maxTension} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </TabsContent>

        <TabsContent value="new" className="space-y-5">
          <div>
            <div className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.3em] text-gold-deep">
              <Sparkles className="h-3.5 w-3.5" /> Massagetagebuch
            </div>
            <h2 className="mt-2 font-serif text-2xl text-charcoal">Neuer Eintrag</h2>
          </div>
          {bookings.length > 0 && (
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">
                Termin verknüpfen (optional)
              </label>
              <select
                value={linkBookingId}
                onChange={(e) => setLinkBookingId(e.target.value)}
                className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— keiner —</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {formatBookingOption(b)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <TiptapEditor
            value={bodyHtml}
            onChange={setBodyHtml}
            placeholder="z.B. Verhärtung im oberen Trapezmuskel gelöst, Haltung leicht verbessert…"
          />
          <div className="rounded-sm border border-border/60 bg-card p-5">
            <div className="text-[0.7rem] uppercase tracking-[0.3em] text-gold-deep">Spannung & Schmerz</div>
            <p className="mt-1 text-xs text-charcoal-soft">Bewerte jede Zone von 1 (frei) bis 10 (schmerzhaft).</p>
            <div className="mt-4">
              <ZoneScaleGrid
                zones={TENSION_ZONES_LIST}
                value={tensionZones}
                onChange={setTensionZones}
                leftHint="1 (Frei / Unauffällig)"
                rightHint="10 (Schmerzhaft / Verspannt)"
              />
            </div>
          </div>
          <div className="rounded-sm border border-border/60 bg-card p-5">
            <div className="text-[0.7rem] uppercase tracking-[0.3em] text-gold-deep">Beweglichkeit & Gelenke</div>
            <p className="mt-1 text-xs text-charcoal-soft">Bewertung des Bewegungsausmasses pro Region.</p>
            <div className="mt-4">
              <ZoneScaleGrid
                zones={MOBILITY_ZONES_LIST}
                value={mobilityZones}
                onChange={setMobilityZones}
                leftHint="1 (Voll beweglich / Frei)"
                rightHint="10 (Stark eingeschränkt / Blockiert)"
              />
            </div>
          </div>
          <div className="rounded-sm border border-border/60 bg-card p-5">
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
          <div className="flex justify-end">
            <Button
              onClick={saveNote}
              disabled={busy || q.isLoading}
              className="btn-gold rounded-sm px-6 py-4 text-[0.72rem] uppercase tracking-[0.22em] disabled:opacity-50"
            >
              Notiz speichern
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <section className="rounded-sm border border-destructive/30 bg-destructive/5 p-5">
        <h3 className="font-serif text-lg text-charcoal">Kunde löschen</h3>
        <p className="mt-1 text-xs text-charcoal-soft">
          Entfernt diesen Kunden inklusive aller Termine und Massagetagebuch-Einträge unwiderruflich.
        </p>
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            className="rounded-sm border-destructive/50 px-5 py-2.5 text-[0.7rem] uppercase tracking-[0.22em] text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Kunde löschen
          </Button>
        </div>
      </section>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kunde wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du diesen Kunden wirklich unwiderruflich löschen? Alle zugehörigen Termine und
              Massagetagebuch-Einträge werden ebenfalls gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                removeClient();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={Boolean(openLog)} onOpenChange={(v) => !v && setOpenLogId(null)}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden p-0 bg-transparent border-0 shadow-none [&>button:last-child]:hidden">
          {openLog && (
            <SessionDocument
              log={openLog}
              client={client}
              onClose={() => setOpenLogId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      {typeof document !== "undefined" && openLog && client
        ? createPortal(
            <BehandlungsprotokollPrintLayout log={openLog} client={client} />,
            document.body,
          )
        : null}
    </div>
  );
}

function SessionDocument({
  log,
  client,
  onClose,
}: {
  log: {
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
  client: ClientLike;
  onClose: () => void;
}) {
  return (
    <div className="relative flex max-h-[90vh] flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/60 bg-ivory/95 px-4 py-2 backdrop-blur">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-sm border border-border/60 bg-card px-3 py-2 text-[0.65rem] uppercase tracking-[0.22em] text-charcoal-soft shadow-sm transition hover:border-gold-deep/60 hover:text-gold-deep"
        >
          <Printer className="h-3.5 w-3.5" /> Als PDF drucken
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Schliessen"
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border/60 bg-card text-charcoal-soft shadow-sm transition hover:text-charcoal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-y-auto max-h-[calc(90vh-3.5rem)]">
      <article
        className="bg-ivory p-8 sm:p-10 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.25)] border border-border/60"
      >
        <BehandlungsprotokollContent log={log} client={client} />
      </article>
      </div>
    </div>
  );
}