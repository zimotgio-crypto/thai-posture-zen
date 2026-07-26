import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAdminT, useAdminLanguage } from "@/lib/admin-i18n";
import { updateOpeningHours } from "@/lib/studio-settings.functions";
import { invalidateStudioPublic } from "@/lib/studio-context";
import { minutesToTime, timeToMinutes } from "@/lib/studio-display";
import { SectionCard, Field } from "./field";

type Win = { open: number; close: number } | null;
type Hours = {
  openingHours: Record<string, Win>;
  bufferMinutes: number;
  slotStepMinutes: number;
};

const ORDER = ["1", "2", "3", "4", "5", "6", "0"];

export function HoursTab({
  studioId,
  hours,
  onSaved,
}: {
  studioId: string;
  hours: Hours;
  onSaved: () => void;
}) {
  const t = useAdminT();
  const { lang } = useAdminLanguage();
  const qc = useQueryClient();
  const save = useServerFn(updateOpeningHours);
  const [form, setForm] = useState(hours);
  const [busy, setBusy] = useState(false);

  useEffect(() => setForm(hours), [hours]);

  const dayName = (wd: string) =>
    new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "de-CH", { weekday: "long" }).format(
      // 2024-01-07 is a Sunday, so adding the weekday index lands on the right day.
      new Date(Date.UTC(2024, 0, 7 + Number(wd))),
    );

  function setDay(wd: string, win: Win) {
    setForm((f) => ({ ...f, openingHours: { ...f.openingHours, [wd]: win } }));
  }

  async function submit() {
    for (const wd of ORDER) {
      const w = form.openingHours[wd];
      if (w && w.close <= w.open) {
        toast.error(`${dayName(wd)}: ${t.settings.to} > ${t.settings.from}`);
        return;
      }
    }
    setBusy(true);
    try {
      const res = await save({
        data: {
          studioId,
          openingHours: form.openingHours,
          bufferMinutes: form.bufferMinutes,
          slotStepMinutes: form.slotStepMinutes === 30 ? 30 : 15,
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
      <div className="space-y-3">
        {ORDER.map((wd) => {
          const win = form.openingHours[wd] ?? null;
          return (
            <div
              key={wd}
              className="grid grid-cols-1 items-center gap-3 border-b border-border/40 pb-3 sm:grid-cols-[10rem_auto_1fr]"
            >
              <span className="text-sm text-charcoal">{dayName(wd)}</span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={Boolean(win)}
                  onCheckedChange={(on) => setDay(wd, on ? { open: 540, close: 1200 } : null)}
                  aria-label={dayName(wd)}
                />
                <span className="text-xs text-charcoal-soft">
                  {win ? "" : t.settings.closed}
                </span>
              </div>
              {win && (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    step={900}
                    value={minutesToTime(win.open)}
                    onChange={(e) => setDay(wd, { ...win, open: timeToMinutes(e.target.value) })}
                    className="w-32 rounded-sm"
                    aria-label={`${dayName(wd)} ${t.settings.from}`}
                  />
                  <span className="text-charcoal-soft">–</span>
                  <Input
                    type="time"
                    step={900}
                    value={minutesToTime(win.close)}
                    onChange={(e) => setDay(wd, { ...win, close: timeToMinutes(e.target.value) })}
                    className="w-32 rounded-sm"
                    aria-label={`${dayName(wd)} ${t.settings.to}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t.settings.buffer}>
          <Input
            type="number"
            min={0}
            max={120}
            step={5}
            value={form.bufferMinutes}
            onChange={(e) =>
              setForm((f) => ({ ...f, bufferMinutes: Number(e.target.value) || 0 }))
            }
            className="rounded-sm"
          />
        </Field>
        <Field label={t.settings.slotStep}>
          <select
            value={form.slotStepMinutes}
            onChange={(e) => setForm((f) => ({ ...f, slotStepMinutes: Number(e.target.value) }))}
            className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm"
          >
            <option value={15}>15</option>
            <option value={30}>30</option>
          </select>
        </Field>
      </div>

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
