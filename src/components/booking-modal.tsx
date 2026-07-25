import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitBooking, listBookedTimes } from "@/lib/booking.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Check, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { optionsForTreatment, priceForTreatment, BUFFER_MIN, formatDuration } from "@/lib/pricing";

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function buildMonthGrid(cursor: Date) {
  // Monday-first grid: 6 weeks x 7 days = 42 cells.
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  // getDay: 0=Sun..6=Sat -> convert to Mon-first offset (0..6)
  const offset = (first.getDay() + 6) % 7;
  const cells: { date: Date; inMonth: boolean }[] = [];
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: d, inMonth: d.getMonth() === cursor.getMonth() });
  }
  return cells;
}

// Studio opening hours (24h). null = closed.
// Index 0 = Sunday ... 6 = Saturday to match JS Date.getDay().
const HOURS: ({ open: number; close: number } | null)[] = [
  null,                       // Sun — closed
  { open: 9 * 60, close: 20 * 60 },  // Mon
  { open: 9 * 60, close: 20 * 60 },  // Tue
  { open: 9 * 60, close: 20 * 60 },  // Wed
  { open: 9 * 60, close: 20 * 60 },  // Thu
  { open: 9 * 60, close: 20 * 60 },  // Fri
  { open: 10 * 60, close: 18 * 60 }, // Sat
];

const SLOT_STEP = 15;          // minutes between start times

function fmt(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseTime(s: string) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

type BookedSlot = { time: string; duration: number };

function generateStartTimes(
  dateKey: string,
  booked: BookedSlot[],
  nowMinutes: number | null,
  treatmentMin: number
) {
  const [y, mo, d] = dateKey.split("-").map(Number);
  const dow = new Date(y, mo - 1, d).getDay();
  const hours = HOURS[dow];
  if (!hours) return [];
  const bookedRanges = booked.map((b) => {
    const start = parseTime(b.time);
    return [start, start + b.duration + BUFFER_MIN] as const;
  });
  const newBlock = treatmentMin + BUFFER_MIN;
  const out: { time: string; disabled: boolean; reason?: "booked" | "past" }[] = [];
  for (let t = hours.open; t + treatmentMin <= hours.close; t += SLOT_STEP) {
    // A new slot occupies [t, t + newBlock). Reject overlap with any booking.
    const overlaps = bookedRanges.some(([bs, be]) => t < be && t + newBlock > bs);
    const isPast = nowMinutes !== null && t <= nowMinutes;
    if (overlaps) out.push({ time: fmt(t), disabled: true, reason: "booked" });
    else if (isPast) out.push({ time: fmt(t), disabled: true, reason: "past" });
    else out.push({ time: fmt(t), disabled: false });
  }
  return out;
}

// (Bookings live server-side in Lovable Cloud; no localStorage cache.)

export function BookingModal({
  open,
  onOpenChange,
  initialTreatment,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialTreatment?: string;
}) {
  const t = useT();
  const treatments = t.booking.treatments;
  const resolveInitial = (id: string | undefined) => {
    // Legacy id fallback (Ohne Öl was removed) → route to the standard variant.
    if (id === "thai-stretch-nooil") return "thai-stretch-oil";
    if (id && treatments.some((tr) => tr.id === id)) return id;
    return treatments[0].id;
  };
  const [treatment, setTreatment] = useState(() => resolveInitial(initialTreatment));
  const durationOptions = useMemo(() => optionsForTreatment(treatment), [treatment]);
  const [durationMin, setDurationMin] = useState<number>(() => {
    const opts = optionsForTreatment(resolveInitial(initialTreatment));
    return (opts.find((o) => o.minutes === 60) ?? opts[0])?.minutes ?? 60;
  });

  // When treatment changes, snap duration to a valid option (prefer 60 Min., else first).
  useEffect(() => {
    if (!durationOptions.some((o) => o.minutes === durationMin)) {
      const preferred = durationOptions.find((o) => o.minutes === 60) ?? durationOptions[0];
      if (preferred) setDurationMin(preferred.minutes);
      setTime(null);
    }
  }, [durationOptions, durationMin]);
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [cursor, setCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [silent, setSilent] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [dateError, setDateError] = useState(false);
  const [timeError, setTimeError] = useState(false);
  const dateSectionRef = useRef<HTMLElement | null>(null);
  const timeSectionRef = useRef<HTMLElement | null>(null);
  const [bookedTimes, setBookedTimes] = useState<BookedSlot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const listBooked = useServerFn(listBookedTimes);
  const submitBookingFn = useServerFn(submitBooking);

  // Fetch existing bookings for the selected day so we can hide occupied slots.
  useEffect(() => {
    if (!open || !day) {
      setBookedTimes([]);
      return;
    }
    let cancelled = false;
    listBooked({ data: { day } })
      .then((rows) => {
        if (!cancelled) setBookedTimes(rows);
      })
      .catch(() => {
        if (!cancelled) setBookedTimes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, day, listBooked]);

  const today = useMemo(() => startOfDay(new Date()), []);
  const cells = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const monthLabel = useMemo(
    () =>
      cursor.toLocaleDateString(t.booking.locale, {
        month: "long",
        year: "numeric",
      }),
    [cursor, t.booking.locale]
  );
  const canGoPrev = useMemo(() => {
    const prev = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    const endOfPrev = new Date(cursor.getFullYear(), cursor.getMonth(), 0);
    return endOfPrev >= today;
    void prev;
  }, [cursor, today]);
  const current = treatments.find((x) => x.id === treatment) ?? treatments[0];

  const now = useMemo(() => new Date(), [day, open]);
  const nowMinutesToday = useMemo(() => {
    if (!day) return null;
    if (day !== ymd(startOfDay(now))) return null;
    return now.getHours() * 60 + now.getMinutes();
  }, [day, now]);
  const dayHours = useMemo(() => {
    if (!day) return null;
    const [y, mo, d] = day.split("-").map(Number);
    return HOURS[new Date(y, mo - 1, d).getDay()];
  }, [day]);
  const slots = useMemo(() => {
    if (!day) return [];
    return generateStartTimes(day, bookedTimes, nowMinutesToday, durationMin);
  }, [day, bookedTimes, nowMinutesToday, durationMin]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, boolean> = {
      firstName: !firstName.trim(),
      lastName: !lastName.trim(),
      email: !email.trim(),
      phone: !phone.trim(),
      street: !street.trim(),
      zip: !zip.trim(),
      city: !city.trim(),
    };
    setErrors(nextErrors);
    setDateError(!day);
    setTimeError(!time);
    if (Object.values(nextErrors).some(Boolean)) {
      toast.error(t.booking.errAll);
      return;
    }
    if (!day) {
      toast.error("Bitte wähle ein Datum.");
      dateSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!time) {
      toast.error("Bitte wähle eine Uhrzeit.");
      timeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitBookingFn({
        data: {
          treatment: current.label,
          day,
          time,
          durationMinutes: durationMin,
          silent,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          street: street.trim(),
          zip: zip.trim(),
          city: city.trim(),
        },
      });
      if (!res.ok) {
        toast.error(t.booking.noSlots);
        // Refresh availability so the disabled state shows up immediately.
        listBooked({ data: { day } }).then(setBookedTimes).catch(() => {});
        return;
      }
      toast.success(t.booking.success, {
        description: `${current.label} (${durationMin} Min.) · ${day} · ${time}${silent ? " · " + t.booking.silent : ""}`,
      });
      onOpenChange(false);
      setDay(null);
      setTime(null);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setStreet("");
      setZip("");
      setCity("");
      setErrors({});
      setDateError(false);
      setTimeError(false);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Buchung fehlgeschlagen. Bitte später erneut versuchen."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border/60 bg-ivory p-0 sm:rounded-sm">
        <div className="border-b border-border/60 px-8 py-6">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.3em] text-gold-deep">
              <Sparkles className="h-3.5 w-3.5" />
              {t.booking.eyebrow}
            </div>
            <DialogTitle className="font-serif text-2xl font-normal text-charcoal">
              {t.booking.title}
            </DialogTitle>
            <DialogDescription className="text-charcoal-soft/80">
              {t.booking.desc}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={submit} className="max-h-[70vh] overflow-y-auto px-8 py-6 space-y-6">
          <section className="space-y-3">
            <Label className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">{t.booking.treatment}</Label>
            <div className="grid gap-2">
              {treatments.map((tr) => (
                <button
                  type="button"
                  key={tr.id}
                  onClick={() => setTreatment(tr.id)}
                  className={cn(
                    "flex items-center rounded-sm border px-4 py-3 text-left transition",
                    treatment === tr.id ? "border-gold bg-gold-soft/30" : "border-border hover:border-gold/60"
                  )}
                >
                  <span className="font-medium text-charcoal">{tr.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <Label className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">
              Dauer · Preis
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {durationOptions.map((opt) => {
                const selected = durationMin === opt.minutes;
                return (
                  <button
                    type="button"
                    key={opt.minutes}
                    onClick={() => {
                      const prevDuration = durationMin;
                      setDurationMin(opt.minutes);
                      if (opt.minutes === prevDuration) return;
                      if (!time || !day) {
                        setTime(null);
                        return;
                      }
                      const nextSlots = generateStartTimes(
                        day,
                        bookedTimes,
                        nowMinutesToday,
                        opt.minutes
                      );
                      const stillAvailable = nextSlots.some(
                        (s) => s.time === time && !s.disabled
                      );
                      if (!stillAvailable) {
                        setTime(null);
                        toast.message(
                          "Bitte Uhrzeit erneut wählen – die verfügbaren Zeiten haben sich durch die neue Dauer geändert."
                        );
                      }
                    }}
                    aria-pressed={selected}
                    className={cn(
                      "flex flex-col items-start rounded-sm border px-3 py-3 text-left transition",
                      selected
                        ? "border-gold bg-gold-soft/40"
                        : "border-border hover:border-gold/60"
                    )}
                  >
                    <span className="text-[0.68rem] uppercase tracking-[0.22em] text-charcoal-soft">
                      {opt.label}
                    </span>
                    <span className="mt-1 font-serif text-lg text-charcoal">
                      CHF {priceForTreatment(treatment, opt.minutes)}.–
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section ref={dateSectionRef} className="space-y-3">
            <Label className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">
              {t.booking.date}
            </Label>
            <div
              className={cn(
                "rounded-sm border bg-card p-4 sm:p-5",
                dateError ? "border-destructive" : "border-border/60"
              )}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
                  }
                  disabled={!canGoPrev}
                  aria-label={t.booking.prevMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-sm text-charcoal-soft transition hover:bg-gold-soft/40 hover:text-gold-deep disabled:pointer-events-none disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="font-serif text-lg capitalize text-charcoal">
                  {monthLabel}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
                  }
                  aria-label={t.booking.nextMonth}
                  className="flex h-9 w-9 items-center justify-center rounded-sm text-charcoal-soft transition hover:bg-gold-soft/40 hover:text-gold-deep"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[0.6rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.booking.weekdaysShort.map((w) => (
                  <div key={w} className="py-1">
                    {w}
                  </div>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {cells.map(({ date, inMonth }) => {
                  const key = ymd(date);
                  const isPast = date < today;
                  const isDisabled = isPast;
                  const isSelected = day === key;
                  const isToday = key === ymd(today);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (isDisabled) return;
                        setDay(key);
                        setTime(null);
                        setDateError(false);
                        setTimeError(false);
                      }}
                      disabled={isDisabled}
                      aria-pressed={isSelected}
                      className={cn(
                        "relative aspect-square min-h-[40px] rounded-sm text-sm transition",
                        "flex items-center justify-center",
                        !inMonth && "opacity-30",
                        isDisabled && "cursor-not-allowed text-charcoal-soft/40",
                        !isDisabled && !isSelected &&
                          "text-charcoal hover:bg-gold-soft/40 hover:text-gold-deep",
                        isSelected && "bg-gold text-primary-foreground shadow-[var(--shadow-soft)]",
                        isToday && !isSelected && "ring-1 ring-gold/50"
                      )}
                    >
                      <span className="font-serif text-base">{date.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section ref={timeSectionRef} className="space-y-3">
            <Label className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">
              {t.booking.time}
            </Label>
            {!day ? (
              <p
                className={cn(
                  "rounded-sm border border-dashed px-4 py-6 text-center text-sm text-charcoal-soft",
                  timeError ? "border-destructive" : "border-border/70"
                )}
              >
                {t.booking.pickDay}
              </p>
            ) : !dayHours ? (
              <p className="rounded-sm border border-dashed border-border/70 px-4 py-6 text-center text-sm text-charcoal-soft">
                {t.booking.closed}
              </p>
            ) : slots.filter((s) => !s.disabled).length === 0 ? (
              <p className="rounded-sm border border-dashed border-border/70 px-4 py-6 text-center text-sm text-charcoal-soft">
                {t.booking.noSlots}
              </p>
            ) : (
              <>
                <div
                  className={cn(
                    "max-h-64 overflow-y-auto rounded-sm border p-2",
                    timeError ? "border-destructive" : "border-border/70"
                  )}
                >
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots
                      .filter((s) => !s.disabled)
                      .map((s) => {
                        const isSelected = time === s.time;
                        return (
                          <button
                            key={s.time}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => {
                              setTime(s.time);
                              setTimeError(false);
                            }}
                            className={cn(
                              "rounded-sm border px-2 py-2 text-sm transition-colors",
                              isSelected
                                ? "border-gold bg-gold text-primary-foreground"
                                : "border-border hover:border-gold/60"
                            )}
                          >
                            {s.time}
                          </button>
                        );
                      })}
                  </div>
                </div>
                {time && (() => {
                  const [hh, mm] = time.split(":").map(Number);
                  const end = fmt(hh * 60 + mm + durationMin);
                  const unit = t.booking.timeUnit ? ` ${t.booking.timeUnit}` : "";
                  return (
                    <p className="rounded-sm border border-gold/40 bg-gold-soft/20 px-4 py-2.5 text-sm text-charcoal">
                      {t.booking.selected}: {time} – {end}{unit} ({t.booking.durationLabel}: {formatDuration(durationMin)})
                    </p>
                  );
                })()}
              </>
            )}
          </section>

          <section className="flex items-start gap-4 rounded-sm border border-gold/40 bg-gold-soft/20 p-4">
            <Switch checked={silent} onCheckedChange={setSilent} id="silent" className="mt-1" />
            <div className="space-y-1">
              <Label htmlFor="silent" className="text-charcoal">{t.booking.silent}</Label>
              <p className="text-sm text-charcoal-soft">{t.booking.silentDesc}</p>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t.booking.firstName} *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t.booking.firstNamePh}
                aria-invalid={errors.firstName || undefined}
                className={cn(errors.firstName && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.firstName && <p className="text-xs text-destructive">{t.booking.required}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t.booking.lastName} *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t.booking.lastNamePh}
                aria-invalid={errors.lastName || undefined}
                className={cn(errors.lastName && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.lastName && <p className="text-xs text-destructive">{t.booking.required}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t.booking.email} *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.booking.emailPh}
                aria-invalid={errors.email || undefined}
                className={cn(errors.email && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.email && <p className="text-xs text-destructive">{t.booking.required}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t.booking.phone} *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.booking.phonePh}
                aria-invalid={errors.phone || undefined}
                className={cn(errors.phone && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.phone && <p className="text-xs text-destructive">{t.booking.required}</p>}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="street">{t.booking.street} *</Label>
              <Input
                id="street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder={t.booking.streetPh}
                aria-invalid={errors.street || undefined}
                className={cn(errors.street && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.street && <p className="text-xs text-destructive">{t.booking.required}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">{t.booking.zip} *</Label>
              <Input
                id="zip"
                inputMode="numeric"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder={t.booking.zipPh}
                aria-invalid={errors.zip || undefined}
                className={cn(errors.zip && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.zip && <p className="text-xs text-destructive">{t.booking.required}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">{t.booking.city} *</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t.booking.cityPh}
                aria-invalid={errors.city || undefined}
                className={cn(errors.city && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.city && <p className="text-xs text-destructive">{t.booking.required}</p>}
            </div>
          </section>

          <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs text-charcoal-soft">
              <Check className="h-3.5 w-3.5 text-gold-deep" />
              {t.booking.payHint}
            </p>
            <Button
              type="submit"
              disabled={submitting}
              className="btn-gold rounded-sm px-6 py-6 text-sm uppercase tracking-[0.2em] disabled:opacity-50"
            >
              {t.booking.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
