import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitBooking, listBookedTimes, validateCampaignCode } from "@/lib/booking.functions";
import type { CampaignCheckResult } from "@/lib/booking.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Check, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { formatDuration } from "@/lib/pricing";
import { useStudio } from "@/lib/studio-context";
import { StudioText } from "@/components/studio-text";

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

type Window = { open: number; close: number } | null;

function generateStartTimes(
  dateKey: string,
  booked: BookedSlot[],
  nowMinutes: number | null,
  treatmentMin: number,
  hours: Window,
  slotStep: number,
  bufferMin: number
) {
  if (!hours) return [];
  const bookedRanges = booked.map((b) => {
    const start = parseTime(b.time);
    return [start, start + b.duration + bufferMin] as const;
  });
  const newBlock = treatmentMin + bufferMin;
  const out: { time: string; disabled: boolean; reason?: "booked" | "past" }[] = [];
  for (let t = hours.open; t + treatmentMin <= hours.close; t += slotStep) {
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
  const studio = useStudio();
  const treatments = studio.treatments;
  const optionsFor = (key: string) => treatments.find((tr) => tr.key === key)?.options ?? [];
  const resolveInitial = (id: string | undefined) => {
    if (id && treatments.some((tr) => tr.key === id)) return id;
    // Legacy id fallback (e.g. removed "Ohne Öl" variant) → closest match.
    const stem = id?.split("-").slice(0, 2).join("-");
    const near = stem ? treatments.find((tr) => tr.key.startsWith(stem)) : undefined;
    return near?.key ?? treatments[0]?.key ?? "";
  };
  const [treatment, setTreatment] = useState(() => resolveInitial(initialTreatment));
  const durationOptions = useMemo(
    () => treatments.find((tr) => tr.key === treatment)?.options ?? [],
    [treatments, treatment]
  );
  const [durationMin, setDurationMin] = useState<number>(() => {
    const opts = optionsFor(resolveInitial(initialTreatment));
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
  const [availabilityError, setAvailabilityError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const listBooked = useServerFn(listBookedTimes);
  const submitBookingFn = useServerFn(submitBooking);
  const checkCode = useServerFn(validateCampaignCode);
  const [code, setCode] = useState("");
  const [codeState, setCodeState] = useState<CampaignCheckResult | null>(null);
  const [codeChecking, setCodeChecking] = useState(false);

  const codeMessages: Record<string, string> = {
    unbekannt: "Code unbekannt",
    abgelaufen: "Aktion abgelaufen",
    ausgebucht: "Aktion ausgebucht",
    andere_behandlung: "Code gilt für eine andere Behandlung",
    nur_neukunden: "Code gilt nur für Erstbuchungen",
  };

  // Ein über die Adresse übergebener Code (?code=…) wird beim Öffnen des
  // Modals automatisch übernommen.
  useEffect(() => {
    if (!open) return;
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("code");
      if (fromUrl) {
        const clean = fromUrl.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (clean) setCode((prev) => prev || clean);
      }
    } catch {
      /* ignore */
    }
  }, [open]);

  const unusedCodeMessages: Record<string, string> = {
    unbekannt: "Code unbekannt",
    abgelaufen: "Aktion abgelaufen",
    ausgebucht: "Aktion ausgebucht",
    andere_behandlung: "Code gilt für eine andere Behandlung",
    nur_neukunden: "Code gilt nur für Erstbuchungen",
  };

  // Fetch existing bookings for the selected day so we can hide occupied slots.
  useEffect(() => {
    if (!open || !day) {
      setBookedTimes([]);
      setAvailabilityError(false);
      return;
    }
    let cancelled = false;
    listBooked({ data: { day, studioSlug: studio.slug } })
      .then((rows) => {
        if (cancelled) return;
        setBookedTimes(rows);
        setAvailabilityError(false);
      })
      .catch((err) => {
        console.error("[booking-modal] availability fetch failed", err);
        if (cancelled) return;
        // Fail closed: with unknown availability we offer no slots at all.
        setBookedTimes([]);
        setAvailabilityError(true);
        setTime(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, day, listBooked, studio.slug]);

  // Code verzögert prüfen; Behandlung und Dauer fliessen mit ein, weil sich
  // Preis und Gültigkeit dadurch ändern.
  useEffect(() => {
    const trimmed = code.trim();
    if (!open || !trimmed || !treatment) {
      setCodeState(null);
      setCodeChecking(false);
      return;
    }
    setCodeChecking(true);
    let cancelled = false;
    const handle = setTimeout(() => {
      checkCode({
        data: {
          studioSlug: studio.slug,
          code: trimmed,
          treatmentKey: treatment,
          durationMinutes: durationMin,
        },
      })
        .then((res) => {
          if (!cancelled) setCodeState(res);
        })
        .catch(() => {
          if (!cancelled) setCodeState({ valid: false, reason: "unbekannt" });
        })
        .finally(() => {
          if (!cancelled) setCodeChecking(false);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(handle);
      setCodeChecking(false);
    };
  }, [open, code, treatment, durationMin, checkCode, studio.slug]);

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
  const current = treatments.find((x) => x.key === treatment) ?? treatments[0];

  const now = useMemo(() => new Date(), [day, open]);
  const nowMinutesToday = useMemo(() => {
    if (!day) return null;
    if (day !== ymd(startOfDay(now))) return null;
    return now.getHours() * 60 + now.getMinutes();
  }, [day, now]);
  const dayHours = useMemo(() => {
    if (!day) return null;
    const [y, mo, d] = day.split("-").map(Number);
    const dow = new Date(y, mo - 1, d).getDay();
    return studio.openingHours[String(dow)] ?? null;
  }, [day, studio.openingHours]);
  const slots = useMemo(() => {
    if (!day) return [];
    if (availabilityError) return [];
    return generateStartTimes(
      day,
      bookedTimes,
      nowMinutesToday,
      durationMin,
      dayHours,
      studio.slotStepMinutes,
      studio.bufferMinutes
    );
  }, [
    day,
    bookedTimes,
    nowMinutesToday,
    durationMin,
    availabilityError,
    dayHours,
    studio.slotStepMinutes,
    studio.bufferMinutes,
  ]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (availabilityError) {
      toast.error(
        "Verfügbarkeiten konnten nicht geladen werden. Bitte lade die Seite neu oder kontaktiere uns telefonisch.",
      );
      return;
    }
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
          studioSlug: studio.slug,
          treatment: current.key,
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
          code: code.trim() || undefined,
        },
      });
      if (!res.ok) {
        const reason = (res as { reason?: string }).reason ?? "";
        if (reason.startsWith("code_")) {
          const key = reason.slice(5);
          if (key === "ausgebucht") {
            toast.error("Die Aktion ist inzwischen ausgebucht. Bitte ohne Code buchen.");
          } else {
            toast.error(codeMessages[key] ?? "Der Gutscheincode ist ungültig.");
          }
          setCode("");
          setCodeState(null);
          return;
        }
        toast.error(t.booking.noSlots);
        // Refresh availability so the disabled state shows up immediately.
        listBooked({ data: { day, studioSlug: studio.slug } })
          .then(setBookedTimes)
          .catch(() => {});
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
      setCode("");
      setCodeState(null);
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
                  key={tr.key}
                  onClick={() => setTreatment(tr.key)}
                  className={cn(
                    "flex items-center rounded-sm border px-4 py-3 text-left transition",
                    treatment === tr.key ? "border-gold bg-gold-soft/30" : "border-border hover:border-gold/60"
                  )}
                >
                  <StudioText className="font-medium text-charcoal">{tr.label}</StudioText>
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
                        opt.minutes,
                        dayHours,
                        studio.slotStepMinutes,
                        studio.bufferMinutes
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
                      {formatDuration(opt.minutes)}
                    </span>
                    <span className="mt-1 font-serif text-lg text-charcoal">
                      CHF {opt.price}.–
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
            ) : availabilityError ? (
              <p
                role="alert"
                className="rounded-sm border border-destructive/60 bg-destructive/5 px-4 py-4 text-sm text-charcoal"
              >
                Verfügbarkeiten konnten nicht geladen werden. Bitte lade die Seite neu oder
                kontaktiere uns telefonisch.
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

          <section className="space-y-3">
            <Label htmlFor="campaign-code" className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">
              Gutscheincode (optional)
            </Label>
            <Input
              id="campaign-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="z. B. HERBST25"
              autoComplete="off"
              className="uppercase"
            />
            {code.trim() && codeChecking && (
              <p className="text-sm text-charcoal-soft">Code wird geprüft …</p>
            )}
            {code.trim() && !codeChecking && codeState?.valid && (
              <div className="rounded-sm border border-gold/40 bg-gold-soft/20 px-4 py-3 text-sm text-charcoal">
                <StudioText className="font-medium">{codeState.title}</StudioText>
                <p className="mt-1">
                  <span className="line-through text-charcoal-soft">
                    CHF {codeState.originalPrice}.–
                  </span>{" "}
                  <span className="font-serif text-lg">CHF {codeState.finalPrice}.–</span>
                </p>
                {typeof codeState.remaining === "number" && codeState.maxRedemptions != null && (
                  <p className="mt-1 text-xs text-charcoal-soft">
                    Noch {codeState.remaining} von {codeState.maxRedemptions} Plätzen
                  </p>
                )}
              </div>
            )}
            {code.trim() && !codeChecking && codeState && !codeState.valid && (
              <p role="alert" className="text-sm text-destructive">
                {codeMessages[codeState.reason ?? "unbekannt"]}
              </p>
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
