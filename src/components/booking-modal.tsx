import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Check, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

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

const times = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00", "19:30"];

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
  const [treatment, setTreatment] = useState(initialTreatment ?? treatments[0].id);
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [cursor, setCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [silent, setSilent] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});

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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, boolean> = {
      name: !name.trim(),
      email: !email.trim(),
      phone: !phone.trim(),
      street: !street.trim(),
      zip: !zip.trim(),
      city: !city.trim(),
    };
    setErrors(nextErrors);
    if (!day || !time || Object.values(nextErrors).some(Boolean)) {
      toast.error(t.booking.errAll);
      return;
    }
    toast.success(t.booking.success, {
      description: `${current.label} · ${day} · ${time}${silent ? " · " + t.booking.silent : ""}`,
    });
    onOpenChange(false);
    setDay(null);
    setTime(null);
    setName("");
    setEmail("");
    setPhone("");
    setStreet("");
    setZip("");
    setCity("");
    setErrors({});
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
                    "flex items-center justify-between rounded-sm border px-4 py-3 text-left transition",
                    treatment === tr.id ? "border-gold bg-gold-soft/30" : "border-border hover:border-gold/60"
                  )}
                >
                  <span className="font-medium text-charcoal">{tr.label}</span>
                  <span className="text-sm text-charcoal-soft">{tr.meta}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <Label className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">
              {t.booking.date}
            </Label>
            <div className="rounded-sm border border-border/60 bg-card p-4 sm:p-5">
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

          <section className="space-y-3">
            <Label className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">
              {t.booking.time}
            </Label>
            {day ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {times.map((tm) => (
                  <button
                    type="button"
                    key={tm}
                    onClick={() => setTime(tm)}
                    className={cn(
                      "rounded-sm border px-3 py-2.5 text-sm transition",
                      time === tm
                        ? "border-gold bg-gold text-primary-foreground"
                        : "border-border hover:border-gold/60"
                    )}
                  >
                    {tm}
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-sm border border-dashed border-border/70 px-4 py-6 text-center text-sm text-charcoal-soft">
                {t.booking.pickDay}
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
              <Label htmlFor="name">{t.booking.name} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.booking.namePh}
                aria-invalid={errors.name || undefined}
                className={cn(errors.name && "border-destructive focus-visible:ring-destructive")}
              />
              {errors.name && <p className="text-xs text-destructive">{t.booking.required}</p>}
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
            <div className="space-y-2 sm:col-span-2">
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
            <Button type="submit" className="btn-gold rounded-sm px-6 py-6 text-sm uppercase tracking-[0.2em]">
              {t.booking.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
