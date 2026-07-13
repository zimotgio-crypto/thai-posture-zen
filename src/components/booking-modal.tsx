import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const treatments = [
  { id: "deep-release", label: "Home-Office Deep Release", meta: "60 Min. · CHF 100.–" },
  { id: "thai-stretch", label: "Traditional Thai Stretch", meta: "75 Min. · CHF 120.–" },
  { id: "zuzwiler", label: "Zuzwiler Auszeit", meta: "90 Min. · CHF 140.–" },
];

function nextDays(n: number) {
  const out: { key: string; label: string; weekday: string; day: string }[] = [];
  const today = new Date();
  const wd = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("de-CH", { day: "2-digit", month: "short" }),
      weekday: wd[d.getDay()],
      day: String(d.getDate()),
    });
  }
  return out;
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
  const [treatment, setTreatment] = useState(initialTreatment ?? "deep-release");
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [silent, setSilent] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const days = useMemo(() => nextDays(10), []);
  const current = treatments.find((t) => t.id === treatment) ?? treatments[0];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!day || !time || !name || !email) {
      toast.error("Bitte alle Felder ausfüllen.");
      return;
    }
    toast.success("Termin-Anfrage gesendet", {
      description: `${current.label} · ${day} · ${time}${silent ? " · Silent Treatment" : ""}`,
    });
    onOpenChange(false);
    setDay(null);
    setTime(null);
    setName("");
    setEmail("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border/60 bg-ivory p-0 sm:rounded-sm">
        <div className="border-b border-border/60 px-8 py-6">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.3em] text-gold-deep">
              <Sparkles className="h-3.5 w-3.5" />
              Online-Buchung
            </div>
            <DialogTitle className="font-serif text-2xl font-normal text-charcoal">
              Termin reservieren
            </DialogTitle>
            <DialogDescription className="text-charcoal-soft/80">
              Wähle Behandlung, Datum und Uhrzeit. Wir bestätigen innerhalb von 2 Stunden.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={submit} className="max-h-[70vh] overflow-y-auto px-8 py-6 space-y-6">
          <section className="space-y-3">
            <Label className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">Behandlung</Label>
            <div className="grid gap-2">
              {treatments.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTreatment(t.id)}
                  className={cn(
                    "flex items-center justify-between rounded-sm border px-4 py-3 text-left transition",
                    treatment === t.id
                      ? "border-gold bg-gold-soft/30"
                      : "border-border hover:border-gold/60"
                  )}
                >
                  <span className="font-medium text-charcoal">{t.label}</span>
                  <span className="text-sm text-charcoal-soft">{t.meta}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <Label className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">Datum</Label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((d) => (
                <button
                  type="button"
                  key={d.key}
                  onClick={() => setDay(d.key)}
                  className={cn(
                    "flex min-w-[64px] flex-col items-center rounded-sm border px-3 py-2 transition",
                    day === d.key
                      ? "border-gold bg-gold text-primary-foreground"
                      : "border-border hover:border-gold/60"
                  )}
                >
                  <span className="text-[0.65rem] uppercase tracking-widest opacity-80">{d.weekday}</span>
                  <span className="text-lg font-serif">{d.day}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <Label className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">Uhrzeit</Label>
            <div className="grid grid-cols-4 gap-2">
              {times.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTime(t)}
                  className={cn(
                    "rounded-sm border px-3 py-2 text-sm transition",
                    time === t
                      ? "border-gold bg-gold text-primary-foreground"
                      : "border-border hover:border-gold/60"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>

          <section className="flex items-start gap-4 rounded-sm border border-gold/40 bg-gold-soft/20 p-4">
            <Switch checked={silent} onCheckedChange={setSilent} id="silent" className="mt-1" />
            <div className="space-y-1">
              <Label htmlFor="silent" className="text-charcoal">
                Silent Treatment
              </Label>
              <p className="text-sm text-charcoal-soft">
                Kein Smalltalk während der Behandlung — für maximale mentale Erholung.
              </p>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dein@mail.ch" />
            </div>
          </section>

          <div className="flex flex-col-reverse items-stretch gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs text-charcoal-soft">
              <Check className="h-3.5 w-3.5 text-gold-deep" />
              Bezahlung vor Ort: TWINT, Karte oder Bar
            </p>
            <Button type="submit" className="btn-gold rounded-sm px-6 py-6 text-sm uppercase tracking-[0.2em]">
              Termin anfragen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}