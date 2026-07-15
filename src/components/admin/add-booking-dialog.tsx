import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { addBooking } from "@/lib/admin.functions";
import { toast } from "sonner";

const TREATMENTS = [
  "Home-Office Deep Release",
  "Traditional Thai Stretch · Mit Öl",
  "Traditional Thai Stretch · Ohne Öl",
  "Sport Massage",
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
  const addBookingFn = useServerFn(addBooking);
  const [busy, setBusy] = useState(false);
  const [block, setBlock] = useState(false);
  const [treatment, setTreatment] = useState(TREATMENTS[0]);
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
      await addBookingFn({
        data: {
          treatment,
          day,
          time,
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
      toast.success(block ? "Zeit blockiert" : "Termin gespeichert");
      qc.invalidateQueries({ queryKey: ["admin", "bookings"] });
      qc.invalidateQueries({ queryKey: ["admin", "clients"] });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-ivory">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal text-charcoal">
            Termin hinzufügen
          </DialogTitle>
          <DialogDescription>
            Manuell erfassen (Telefon oder Walk-in) oder eine Zeit blockieren.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          <label className="flex items-center gap-3 rounded-sm border border-gold/40 bg-gold-soft/20 p-3">
            <Switch checked={block} onCheckedChange={setBlock} />
            <span className="text-sm text-charcoal">Zeit blockieren (kein Kunde)</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Datum</Label>
              <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Uhrzeit</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>
          {!block && (
            <>
              <div className="space-y-2">
                <Label>Behandlung</Label>
                <select
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                  className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                >
                  {TREATMENTS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Vorname *</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Max"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nachname *</Label>
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
                  <Label>E-Mail *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dein@mail.ch"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefon *</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+41 79 000 00 00"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Strasse / Nr. *</Label>
                <Input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Musterstrasse 12"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>PLZ *</Label>
                  <Input
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="9524"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ort *</Label>
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
                <span className="text-sm text-charcoal">Silent Treatment</span>
              </label>
            </>
          )}
          <div className="flex justify-end gap-3 border-t border-border/60 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="btn-gold rounded-sm px-6 py-5 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
            >
              Speichern
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}