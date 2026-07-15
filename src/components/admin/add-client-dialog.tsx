import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { addClient } from "@/lib/admin.functions";
import { toast } from "sonner";

export function AddClientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const addClientFn = useServerFn(addClient);
  const [busy, setBusy] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");

  function reset() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setStreet("");
    setZip("");
    setCity("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await addClientFn({
        data: { firstName, lastName, email: email.toLowerCase(), phone, street, zip, city },
      });
      toast.success("Kunde angelegt");
      qc.invalidateQueries({ queryKey: ["admin", "clients"] });
      reset();
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
            Neuen Kunden anlegen
          </DialogTitle>
          <DialogDescription>
            Erfasse einen neuen Kunden für die Kundendatenbank.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Vorname *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Max" required />
            </div>
            <div className="space-y-2">
              <Label>Nachname *</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Muster" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>E-Mail *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dein@mail.ch" required />
            </div>
            <div className="space-y-2">
              <Label>Telefon *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+41 79 000 00 00" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Strasse / Nr. *</Label>
            <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Musterstrasse 12" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>PLZ *</Label>
              <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="9524" required />
            </div>
            <div className="space-y-2">
              <Label>Ort *</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Zuzwil" required />
            </div>
          </div>
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