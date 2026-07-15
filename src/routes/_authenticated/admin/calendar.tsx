import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, Volume2, VolumeX } from "lucide-react";
import { listBookingsInRange, deleteBooking } from "@/lib/admin.functions";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const bookings = useQuery({
    queryKey: ["admin", "bookings", from, to],
    queryFn: () => listFn({ data: { from, to } }),
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
                  const height = (90 / ROW_MIN) * ROW_PX - 4;
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
              </div>
            );
          })}
        </div>
      </div>

      {bookings.isError && (
        <p className="mt-4 text-sm text-destructive">
          {bookings.error instanceof Error ? bookings.error.message : "Fehler beim Laden"}
        </p>
      )}
    </div>
  );
}