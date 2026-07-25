import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, Volume2, VolumeX } from "lucide-react";
import { listBookingsInRange, deleteBooking, getGoogleCalendarStatus, debugGoogleCalendar, listGoogleBusyInRange } from "@/lib/admin.functions";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatSwissDate, formatDuration, priceForTreatment } from "@/lib/pricing";
import { useT } from "@/lib/i18n";

type BookingRow = {
  id: string;
  day: string;
  time: string;
  treatment: string;
  duration_minutes: number | null;
  silent: boolean | null;
  source: string | null;
  notes: string | null;
  client_id: string | null;
  clients?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email?: string | null;
    street?: string | null;
    zip?: string | null;
    city?: string | null;
  } | null;
};

export const Route = createFileRoute("/_authenticated/admin/calendar")({
  component: CalendarPage,
});

const OPEN_MIN = 9 * 60;
const CLOSE_MIN = 20 * 60;
const ROW_MIN = 30;
const ROWS = (CLOSE_MIN - OPEN_MIN) / ROW_MIN;
const ROW_PX = 44;

function fmtTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(d: Date) {
  const c = new Date(d);
  const dow = (c.getDay() + 6) % 7; // Mon = 0
  c.setDate(c.getDate() - dow);
  c.setHours(0, 0, 0, 0);
  return c;
}

function CalendarPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<"day" | "week">("week");
  const [anchor, setAnchor] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [debugDay, setDebugDay] = useState(() => ymd(new Date()));
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugJson, setDebugJson] = useState<string | null>(null);
  const [debugError, setDebugError] = useState<string | null>(null);

  const days = useMemo(() => {
    if (view === "day") return [anchor];
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [anchor, view]);

  const from = ymd(days[0]);
  const to = ymd(days[days.length - 1]);

  const listFn = useServerFn(listBookingsInRange);
  const statusFn = useServerFn(getGoogleCalendarStatus);
  const debugFn = useServerFn(debugGoogleCalendar);
  const gBusyFn = useServerFn(listGoogleBusyInRange);
  const gStatus = useQuery({
    queryKey: ["google-calendar-status"],
    queryFn: () => statusFn(),
    staleTime: 5 * 60 * 1000,
  });
  const bookings = useQuery({
    queryKey: ["admin", "bookings", from, to],
    queryFn: () => listFn({ data: { from, to } }),
  });
  const gBusy = useQuery({
    queryKey: ["admin", "google-busy", from, to],
    queryFn: async () => {
      try {
        return await gBusyFn({ data: { from, to } });
      } catch (err) {
        console.error("[calendar] google busy fetch failed", err);
        return [];
      }
    },
    enabled: gStatus.data?.configured === true,
    throwOnError: false,
    retry: false,
  });

  const del = useServerFn(deleteBooking);
  async function handleDelete(id: string) {
    if (!confirm("Termin wirklich löschen?")) return;
    try {
      await del({ data: { id } });
      toast.success("Gelöscht");
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    }
  }

  async function handleDebug() {
    setDebugOpen(true);
    setDebugLoading(true);
    setDebugError(null);
    try {
      const res = await debugFn({ data: { day: debugDay } });
      setDebugJson(JSON.stringify(res, null, 2));
    } catch (err) {
      setDebugJson(null);
      setDebugError(err instanceof Error ? err.message : "Google-Diagnose fehlgeschlagen");
    } finally {
      setDebugLoading(false);
    }
  }

  function step(days: number) {
    const d = new Date(anchor);
    d.setDate(d.getDate() + days);
    setAnchor(d);
  }

  const rows = Array.from({ length: ROWS }, (_, i) => OPEN_MIN + i * ROW_MIN);

  const rangeLabel =
    view === "day"
      ? anchor.toLocaleDateString("de-CH", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
      : `${days[0].toLocaleDateString("de-CH", { day: "2-digit", month: "short" })} – ${days[6].toLocaleDateString(
          "de-CH",
          { day: "2-digit", month: "short", year: "numeric" }
        )}`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => step(view === "day" ? -1 : -7)}
            aria-label="Zurück"
            className="flex h-9 w-9 items-center justify-center rounded-sm border border-border/60 text-charcoal-soft hover:bg-gold-soft/30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAnchor(new Date(new Date().setHours(0, 0, 0, 0)))}
            className="rounded-sm border border-border/60 px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.22em] text-charcoal-soft hover:text-charcoal"
          >
            Heute
          </button>
          <button
            onClick={() => step(view === "day" ? 1 : 7)}
            aria-label="Weiter"
            className="flex h-9 w-9 items-center justify-center rounded-sm border border-border/60 text-charcoal-soft hover:bg-gold-soft/30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <h1 className="ml-2 font-serif text-2xl text-charcoal capitalize">{rangeLabel}</h1>
          <span
            className={cn(
              "ml-2 rounded-sm border px-2 py-1 text-[0.65rem] uppercase tracking-[0.2em]",
              gStatus.data?.configured
                ? "border-gold/60 text-gold"
                : "border-border/60 text-charcoal-soft"
            )}
          >
            {gStatus.data?.configured
              ? "Google Calendar verbunden"
              : "Google Calendar nicht konfiguriert"}
          </span>
        </div>
        <div className="inline-flex rounded-sm border border-border/60 bg-card p-1">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-4 py-1.5 text-[0.7rem] uppercase tracking-[0.22em] rounded-sm transition",
                view === v ? "bg-gold text-primary-foreground" : "text-charcoal-soft hover:text-charcoal"
              )}
            >
              {v === "day" ? "Tag" : "Woche"}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 rounded-sm border border-border/60 bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1">
            <span className="text-[0.65rem] uppercase tracking-[0.22em] text-charcoal-soft">
              Diagnose-Datum
            </span>
            <Input
              type="date"
              value={debugDay}
              onChange={(e) => setDebugDay(e.target.value)}
              className="h-9 w-44 rounded-sm border-border/60 bg-ivory text-sm text-charcoal"
            />
          </label>
          <Button
            onClick={handleDebug}
            disabled={debugLoading || !debugDay}
            className="btn-gold h-9 rounded-sm px-4 text-[0.7rem] uppercase tracking-[0.22em]"
          >
            {debugLoading ? "Prüfe…" : "Google-Diagnose"}
          </Button>
          {debugJson && (
            <button
              onClick={() => setDebugOpen((v) => !v)}
              className="h-9 rounded-sm border border-border/60 px-3 text-[0.68rem] uppercase tracking-[0.2em] text-charcoal-soft hover:text-charcoal"
            >
              {debugOpen ? "JSON ausblenden" : "JSON anzeigen"}
            </button>
          )}
        </div>
        {debugError && <p className="mt-3 text-sm text-destructive">{debugError}</p>}
        {debugOpen && debugJson && (
          <pre className="mt-4 max-h-96 overflow-auto rounded-sm border border-border/60 bg-ivory p-4 text-xs leading-relaxed text-charcoal-soft">
            {debugJson}
          </pre>
        )}
      </div>

      <div className="overflow-x-auto rounded-sm border border-border/60 bg-card">
        <div
          className="grid min-w-[720px]"
          style={{ gridTemplateColumns: `70px repeat(${days.length}, minmax(0, 1fr))` }}
        >
          {/* Header row */}
          <div className="border-b border-border/60" />
          {days.map((d) => {
            const isToday = ymd(d) === ymd(new Date());
            return (
              <div
                key={ymd(d)}
                className={cn(
                  "border-b border-l border-border/60 px-3 py-3 text-center",
                  isToday && "bg-gold-soft/30"
                )}
              >
                <div className="text-[0.6rem] uppercase tracking-[0.25em] text-charcoal-soft">
                  {d.toLocaleDateString("de-CH", { weekday: "short" })}
                </div>
                <div className="mt-1 font-serif text-lg text-charcoal">{d.getDate()}</div>
              </div>
            );
          })}

          {/* Time column */}
          <div>
            {rows.map((m) => (
              <div
                key={m}
                style={{ height: ROW_PX }}
                className="border-b border-border/40 text-right pr-2 pt-1 text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft/60"
              >
                {m % 60 === 0 ? fmtTime(m) : ""}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => {
            const dayKey = ymd(d);
            const dayBookings = (bookings.data ?? []).filter((b) => b.day === dayKey);
            return (
              <div key={dayKey} className="relative border-l border-border/60">
                {rows.map((m) => (
                  <div
                    key={m}
                    style={{ height: ROW_PX }}
                    className="border-b border-border/30"
                  />
                ))}
                {dayBookings.map((b) => {
                  const [hh, mm] = (b.time as string).split(":").map(Number);
                  const start = hh * 60 + mm;
                  const top = ((start - OPEN_MIN) / ROW_MIN) * ROW_PX;
                  const dur = (b as { duration_minutes?: number | null }).duration_minutes ?? 60;
                  const height = (dur / ROW_MIN) * ROW_PX - 4;
                  const isBlock = b.source === "block";
                  const client = (b as unknown as { clients?: { id: string; first_name: string; last_name: string; phone: string } }).clients;
                  return (
                    <div
                      key={b.id}
                      style={{ top: top + 2, height, left: 4, right: 4 }}
                      className={cn(
                        "absolute rounded-sm border p-2 shadow-[var(--shadow-soft)] text-[0.72rem] leading-tight overflow-hidden",
                        isBlock
                          ? "border-charcoal/40 bg-charcoal/10 text-charcoal"
                          : "border-gold bg-gold-soft/70 text-charcoal"
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-medium">{b.time}</span>
                        <div className="flex items-center gap-1">
                          {!isBlock && (b.silent ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3 opacity-40" />)}
                          <button
                            onClick={() => handleDelete(b.id)}
                            className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      {isBlock ? (
                        <div className="mt-0.5 uppercase text-[0.6rem] tracking-widest">Blockiert</div>
                      ) : client ? (
                        <Link
                          to="/admin/clients/$id"
                          params={{ id: client.id }}
                          className="mt-0.5 block font-medium hover:underline truncate"
                        >
                          {`${client.first_name} ${client.last_name}`.trim()}
                        </Link>
                      ) : (
                        <div className="mt-0.5 truncate">—</div>
                      )}
                      <div className="text-charcoal-soft truncate">{b.treatment}</div>
                      {client && <div className="text-charcoal-soft truncate">{client.phone}</div>}
                    </div>
                  );
                })}
                {(gBusy.data ?? [])
                  .filter((g) => g.day === dayKey)
                  .filter(
                    (g) => !dayBookings.some((b) => (b.time as string) === g.time),
                  )
                  .map((g, idx) => {
                    const [hh, mm] = g.time.split(":").map(Number);
                    const start = hh * 60 + mm;
                    const top = ((start - OPEN_MIN) / ROW_MIN) * ROW_PX;
                    const height = (g.duration / ROW_MIN) * ROW_PX - 4;
                    return (
                      <div
                        key={`gbusy-${dayKey}-${idx}`}
                        style={{ top: top + 2, height, left: 4, right: 4 }}
                        className="absolute rounded-sm border border-charcoal/30 bg-charcoal/5 p-2 text-[0.72rem] leading-tight text-charcoal-soft overflow-hidden"
                      >
                        <div className="font-medium">{g.time}</div>
                        <div className="mt-0.5 uppercase text-[0.6rem] tracking-widest">
                          Privat – belegt
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[0.65rem] uppercase tracking-[0.22em] text-charcoal-soft">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm border border-gold bg-gold-soft/70" />
          Buchung
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm border border-charcoal/30 bg-charcoal/5" />
          Privater Google-Termin
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm border border-charcoal/40 bg-charcoal/10" />
          Manuell blockiert
        </span>
      </div>

      {bookings.isError && (
        <p className="mt-4 text-sm text-destructive">
          {bookings.error instanceof Error ? bookings.error.message : "Fehler beim Laden"}
        </p>
      )}
    </div>
  );
}