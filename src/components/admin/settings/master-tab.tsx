import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import { useAdminT } from "@/lib/admin-i18n";
import { updateStudioMaster } from "@/lib/studio-settings.functions";
import { invalidateStudioPublic } from "@/lib/studio-context";
import { SectionCard, TextField, AreaField, Field } from "./field";

type Master = {
  slug: string;
  name: string;
  tagline: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  mapsUrl: string | null;
  parkingNote: string | null;
  paymentMethods: string[];
};

export function MasterTab({
  studioId,
  master,
  onSaved,
}: {
  studioId: string;
  master: Master;
  onSaved: () => void;
}) {
  const t = useAdminT();
  const qc = useQueryClient();
  const save = useServerFn(updateStudioMaster);
  const [form, setForm] = useState(master);
  const [busy, setBusy] = useState(false);
  const [newPayment, setNewPayment] = useState("");

  useEffect(() => setForm(master), [master]);

  function set<K extends keyof Master>(key: K, value: Master[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.name.trim()) {
      toast.error(t.common.error);
      return;
    }
    setBusy(true);
    try {
      const res = await save({
        data: {
          studioId,
          name: form.name.trim(),
          tagline: form.tagline,
          street: form.street,
          zip: form.zip,
          city: form.city,
          phone: form.phone,
          email: form.email,
          mapsUrl: form.mapsUrl,
          parkingNote: form.parkingNote,
          paymentMethods: form.paymentMethods,
        },
      });
      if (res.slug) invalidateStudioPublic(qc, res.slug);
      onSaved();
      toast.success(t.settings.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard>
      <div className="grid gap-5 md:grid-cols-2">
        <TextField label={t.settings.name} value={form.name} onChange={(v) => set("name", v)} />
        <TextField
          label={t.settings.tagline}
          value={form.tagline ?? ""}
          onChange={(v) => set("tagline", v)}
        />
        <TextField
          label={t.settings.street}
          value={form.street ?? ""}
          onChange={(v) => set("street", v)}
        />
        <div className="grid grid-cols-[8rem_1fr] gap-3">
          <TextField label={t.settings.zip} value={form.zip ?? ""} onChange={(v) => set("zip", v)} />
          <TextField
            label={t.settings.city}
            value={form.city ?? ""}
            onChange={(v) => set("city", v)}
          />
        </div>
        <TextField
          label={t.settings.phone}
          value={form.phone ?? ""}
          onChange={(v) => set("phone", v)}
        />
        <TextField
          label={t.settings.email}
          type="email"
          value={form.email ?? ""}
          onChange={(v) => set("email", v)}
        />
        <TextField
          label={t.settings.mapsUrl}
          value={form.mapsUrl ?? ""}
          onChange={(v) => set("mapsUrl", v)}
        />
      </div>

      <AreaField
        label={t.settings.parkingNote}
        rows={3}
        value={form.parkingNote ?? ""}
        onChange={(v) => set("parkingNote", v)}
      />

      <Field label={t.settings.payments}>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {form.paymentMethods.map((p, i) => (
              <span
                key={`${p}-${i}`}
                className="inline-flex items-center gap-2 rounded-sm border border-border/60 bg-ivory px-3 py-1.5 text-xs text-charcoal"
              >
                {p}
                <button
                  type="button"
                  aria-label={`${p} entfernen`}
                  onClick={() =>
                    set(
                      "paymentMethods",
                      form.paymentMethods.filter((_, idx) => idx !== i),
                    )
                  }
                  className="text-charcoal-soft hover:text-charcoal"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newPayment}
              onChange={(e) => setNewPayment(e.target.value)}
              className="rounded-sm"
              placeholder="TWINT"
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-sm"
              onClick={() => {
                const v = newPayment.trim();
                if (!v) return;
                set("paymentMethods", [...form.paymentMethods, v].slice(0, 12));
                setNewPayment("");
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Field>

      <Button
        onClick={submit}
        disabled={busy}
        className="btn-gold rounded-sm px-6 py-4 text-xs uppercase tracking-[0.22em]"
      >
        {t.common.save}
      </Button>
    </SectionCard>
  );
}
