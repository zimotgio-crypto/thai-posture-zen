import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { addBooking } from "@/lib/admin.functions";
import { toast } from "sonner";
import { optionsForTreatment, priceForTreatment } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useAdminT } from "@/lib/admin-i18n";

const TREATMENTS: { id: string; label: string }[] = [
  { id: "deep-release", label: "Home-Office Deep Release" },
  { id: "thai-stretch-oil", label: "Traditional Thai Stretch · Mit Öl" },
  { id: "zuzwiler", label: "Sport Massage" },
];

export function AddBookingDialog({
  open,
  onOpenChange,
  defaultDay,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDay?: string;
}) {
  const qc = useQueryClient();
  const t = useAdminT();
  const addBookingFn = useServerFn(addBooking);
  const [busy, setBusy] = useState(false);
  const [block, setBlock] = useState(false);
  const [treatmentId, setTreatmentId] = useState(TREATMENTS[0].id);
  const [durationMin, setDurationMin] = useState<number>(60);
  const durationOptions = optionsForTreatment(treatmentId);
  useEffect(() => {
    const opts = optionsForTreatment(treatmentId);
    if (!opts.find((o) => o.minutes === durationMin)) {
      const fallback = opts.find((o) => o.minutes === 60) ?? opts[0];
      if (fallback) setDurationMin(fallback.minutes);
    }
  }, [treatmentId, durationMin]);
  const [day, setDay] = useState(defaultDay ?? new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [silent, setSilent] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const treatmentLabel =
        TREATMENTS.find((t) => t.id === treatmentId)?.label ?? TREATMENTS[0].label;
      await addBookingFn({
        data: {
          treatment: treatmentLabel,
          day,
          time,
          durationMinutes: durationMin,
          silent,
          block,
          firstName: block ? undefined : firstName,
          lastName: block ? undefined : lastName,
          phone: block ? undefined : phone,
          email: block ? undefined : email.toLowerCase(),
          street: block ? undefined : street,
          zip: block ? undefined : zip,
          city: block ? undefined : city,
        },
      });
      toast.success(block ? t.addBooking.blockSaved : t.addBooking.bookingSaved);
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
      qc.invalidateQueries({ queryKey: ["admin", "clients"] });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-ivory">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal text-charcoal">
            {t.addBooking.title}
          </DialogTitle>
          <DialogDescription>
            {t.addBooking.description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          <label className="flex items-center gap-3 rounded-sm border border-gold/40 bg-gold-soft/20 p-3">
            <Switch checked={block} onCheckedChange={setBlock} />
            <span className="text-sm text-charcoal">{t.addBooking.block}</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t.addBooking.date}</Label>
              <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t.addBooking.time}</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>
          {!block && (
            <div className="space-y-2">
              <Label>{t.addBooking.durationPrice}</Label>
              <div className={cn("grid gap-2", durationOptions.length >= 4 ? "grid-cols-4" : "grid-cols-3")}>
                {durationOptions.map((opt) => {
                  const selected = durationMin === opt.minutes;
                  return (
                    <button
                      type="button"
                      key={opt.minutes}
                      onClick={() => setDurationMin(opt.minutes)}
                      className={cn(
                        "flex flex-col items-start rounded-sm border px-3 py-2 text-left transition",
                        selected ? "border-gold bg-gold-soft/40" : "border-border hover:border-gold/60"
                      )}
                    >
                      <span className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                        {opt.label}
                      </span>
                      <span className="mt-1 font-serif text-base text-charcoal">
                        CHF {priceForTreatment(treatmentId, opt.minutes)}.–
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {!block && (
            <>
              <div className="space-y-2">
                <Label>{t.addBooking.treatment}</Label>
                <select
                  value={treatmentId}
                  onChange={(e) => setTreatmentId(e.target.value)}
                  className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                >
                  {TREATMENTS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t.addBooking.firstName}</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Max"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.addBooking.lastName}</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Muster"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t.addBooking.email}</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dein@mail.ch"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.addBooking.phone}</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+41 79 000 00 00"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.addBooking.street}</Label>
                <Input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Musterstrasse 12"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t.addBooking.zip}</Label>
                  <Input
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="9524"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.addBooking.city}</Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Zuzwil"
                    required
                  />
                </div>
              </div>
              <label className="flex items-center gap-3">
                <Switch checked={silent} onCheckedChange={setSilent} />
                <span className="text-sm text-charcoal">{t.addBooking.silent}</span>
              </label>
            </>
          )}
          <div className="flex justify-end gap-3 border-t border-border/60 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="btn-gold rounded-sm px-6 py-5 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
            >
              {t.common.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}