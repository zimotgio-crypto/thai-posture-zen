import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAdminT } from "@/lib/admin-i18n";
import { updateStudioLinks } from "@/lib/studio-settings.functions";
import { SectionCard, TextField } from "./field";

export function LinksTab({
  studioId,
  links,
  serviceAccountEmail,
  isPlatformAdmin,
  onSaved,
}: {
  studioId: string;
  links: { googleCalendarId: string | null; whatsappPhoneNumberId: string | null };
  serviceAccountEmail: string;
  isPlatformAdmin: boolean;
  onSaved: () => void;
}) {
  const t = useAdminT();
  const save = useServerFn(updateStudioLinks);
  const [form, setForm] = useState(links);
  const [busy, setBusy] = useState(false);

  useEffect(() => setForm(links), [links]);

  async function submit() {
    setBusy(true);
    try {
      await save({
        data: {
          studioId,
          googleCalendarId: form.googleCalendarId,
          whatsappPhoneNumberId: form.whatsappPhoneNumberId,
        },
      });
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
      <div className="rounded-sm border border-border/60 bg-ivory p-4">
        <div className="text-[0.66rem] uppercase tracking-[0.22em] text-charcoal-soft">
          {t.settings.serviceAccount}
        </div>
        <p className="mt-1 break-all font-mono text-sm text-charcoal">
          {serviceAccountEmail || "—"}
        </p>
        <p className="mt-2 text-xs text-charcoal-soft">{t.settings.googleHint}</p>
      </div>

      {isPlatformAdmin ? (
        <>
          <TextField
            label={t.settings.googleCalendarId}
            value={form.googleCalendarId ?? ""}
            onChange={(v) => setForm({ ...form, googleCalendarId: v })}
          />
          <TextField
            label={t.settings.whatsappId}
            value={form.whatsappPhoneNumberId ?? ""}
            onChange={(v) => setForm({ ...form, whatsappPhoneNumberId: v })}
          />
          <p className="text-xs text-charcoal-soft">{t.settings.noSecrets}</p>
          <Button
            onClick={submit}
            disabled={busy}
            className="btn-gold rounded-sm px-6 py-4 text-xs uppercase tracking-[0.22em]"
          >
            {t.common.save}
          </Button>
        </>
      ) : (
        <div className="space-y-2 text-sm text-charcoal-soft">
          <p>{t.settings.readOnlyHint}</p>
          <p>
            {t.settings.googleCalendarId}:{" "}
            <span className="font-mono text-charcoal">{links.googleCalendarId ?? "—"}</span>
          </p>
          <p>
            {t.settings.whatsappId}:{" "}
            <span className="font-mono text-charcoal">
              {links.whatsappPhoneNumberId ? "••••••" : "—"}
            </span>
          </p>
        </div>
      )}
    </SectionCard>
  );
}
