import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAdminT } from "@/lib/admin-i18n";
import { useAdminStudio } from "@/lib/admin-studio-context";
import { saveCampaign } from "@/lib/marketing.functions";
import { StudioText } from "@/components/studio-text";
import { cn } from "@/lib/utils";

export type CampaignRow = {
  id: string;
  title: string;
  goal: string;
  treatment_id: string | null;
  duration_minutes: number | null;
  discount_type: string;
  discount_value: number;
  max_redemptions: number | null;
  redemptions_used: number;
  valid_from: string;
  valid_to: string;
  applies_to: string;
  channels: string[];
  radius_km: number | null;
  age_min: number | null;
  age_max: number | null;
  budget_chf: number | null;
  code: string;
  status: string;
};

export type TreatmentLite = { id: string; key: string; label: string };

const GOALS = ["neukunden", "auslastung", "wiederkehr", "bekanntheit"] as const;
const CHANNELS = ["instagram", "facebook", "google", "flyer", "whatsapp", "newsletter"] as const;
const STATUSES = ["entwurf", "aktiv", "pausiert", "beendet"] as const;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function plusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function roundChf(v: number) {
  return Math.round(v * 20) / 20;
}

/** Vorschlag aus Behandlung + Monat, z.B. DEEPRELEASE08. */
export function suggestCode(label: string | undefined, from: string): string {
  const base = (label ?? "AKTION")
    .toUpperCase()
    .replace(/Ä/g, "AE")
    .replace(/Ö/g, "OE")
    .replace(/Ü/g, "UE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16);
  const month = from.slice(5, 7) || String(new Date().getMonth() + 1).padStart(2, "0");
  return `${base || "AKTION"}${month}`;
}

const selectClass =
  "w-full rounded-sm border border-border/60 bg-card px-3 py-2 text-sm text-charcoal";

export function CampaignFormDialog({
  open,
  onOpenChange,
  campaign,
  treatments,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campaign: CampaignRow | null;
  treatments: TreatmentLite[];
}) {
  const t = useAdminT();
  const qc = useQueryClient();
  const { studioId, treatments: ctxTreatments } = useAdminStudio();
  const saveFn = useServerFn(saveCampaign);
  const locked = Boolean(campaign && campaign.redemptions_used > 0);

  const [title, setTitle] = useState(campaign?.title ?? "");
  const [goal, setGoal] = useState(campaign?.goal ?? "neukunden");
  const [treatmentId, setTreatmentId] = useState(campaign?.treatment_id ?? "");
  const [duration, setDuration] = useState(
    campaign?.duration_minutes ? String(campaign.duration_minutes) : "",
  );
  const [discountType, setDiscountType] = useState(campaign?.discount_type ?? "prozent");
  const [discountValue, setDiscountValue] = useState(
    campaign ? String(campaign.discount_value) : "20",
  );
  const [seats, setSeats] = useState(
    campaign?.max_redemptions != null ? String(campaign.max_redemptions) : "",
  );
  const [validFrom, setValidFrom] = useState(campaign?.valid_from ?? today());
  const [validTo, setValidTo] = useState(campaign?.valid_to ?? plusDays(30));
  const [appliesTo, setAppliesTo] = useState(campaign?.applies_to ?? "alle");
  const [channels, setChannels] = useState<string[]>(campaign?.channels ?? []);
  const [radius, setRadius] = useState(campaign?.radius_km != null ? String(campaign.radius_km) : "");
  const [ageMin, setAgeMin] = useState(campaign?.age_min != null ? String(campaign.age_min) : "");
  const [ageMax, setAgeMax] = useState(campaign?.age_max != null ? String(campaign.age_max) : "");
  const [budget, setBudget] = useState(campaign?.budget_chf != null ? String(campaign.budget_chf) : "");
  const [status, setStatus] = useState(campaign?.status ?? "entwurf");
  const [code, setCode] = useState(campaign?.code ?? "");

  const selected = treatments.find((tr) => tr.id === treatmentId) ?? null;
  const options = useMemo(() => {
    if (!selected) return [];
    return ctxTreatments.find((tr) => tr.key === selected.key)?.options ?? [];
  }, [selected, ctxTreatments]);

  const basePrice = useMemo(() => {
    if (!options.length) return null;
    const minutes = Number(duration);
    const hit = options.find((o) => o.minutes === minutes) ?? null;
    return hit?.price ?? null;
  }, [options, duration]);

  const finalPrice = useMemo(() => {
    if (basePrice == null) return null;
    const value = Number(discountValue) || 0;
    const raw = discountType === "betrag" ? value : (basePrice * value) / 100;
    return roundChf(Math.max(0, basePrice - Math.min(basePrice, raw)));
  }, [basePrice, discountType, discountValue]);

  const mutation = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id: campaign?.id,
          studioId,
          title: title.trim(),
          goal,
          treatmentId: treatmentId || null,
          durationMinutes: duration ? Number(duration) : null,
          discountType: discountType as "prozent" | "betrag",
          discountValue: Number(discountValue) || 0,
          maxRedemptions: seats ? Number(seats) : null,
          validFrom,
          validTo,
          appliesTo: appliesTo as "alle" | "neukunden",
          channels,
          radiusKm: radius ? Number(radius) : null,
          ageMin: ageMin ? Number(ageMin) : null,
          ageMax: ageMax ? Number(ageMax) : null,
          budgetChf: budget ? Number(budget) : null,
          code: code.trim().toUpperCase(),
          status: status as "entwurf" | "aktiv" | "pausiert" | "beendet",
        },
      }),
    onSuccess: async () => {
      toast.success(t.marketing.saved);
      await qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });
      onOpenChange(false);
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : t.common.error),
  });

  function toggleChannel(c: string) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-charcoal">
            {campaign ? t.marketing.form.editTitle : t.marketing.form.createTitle}
          </DialogTitle>
        </DialogHeader>

        {locked && (
          <p className="rounded-sm border border-gold/40 bg-gold-soft/30 px-4 py-3 text-xs text-charcoal-soft">
            {t.marketing.form.lockedHint}
          </p>
        )}

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return toast.error(t.marketing.form.titleLabel);
            if (!/^[A-Z0-9]{3,30}$/.test(code.trim().toUpperCase()))
              return toast.error(t.marketing.form.codeHint);
            mutation.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.marketing.form.titleLabel}
              </Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.marketing.form.goal}
              </Label>
              <select className={selectClass} value={goal} onChange={(e) => setGoal(e.target.value)}>
                {GOALS.map((g) => (
                  <option key={g} value={g}>
                    {t.marketing.goals[g]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.marketing.form.treatment}
              </Label>
              <select
                className={cn(selectClass, locked && "opacity-60")}
                value={treatmentId}
                disabled={locked}
                onChange={(e) => {
                  setTreatmentId(e.target.value);
                  setDuration("");
                }}
              >
                <option value="">{t.marketing.form.allTreatments}</option>
                {treatments.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.marketing.form.variant}
              </Label>
              <select
                className={cn(selectClass, locked && "opacity-60")}
                value={duration}
                disabled={locked || !options.length}
                onChange={(e) => setDuration(e.target.value)}
              >
                <option value="">{t.marketing.form.allVariants}</option>
                {options.map((o) => (
                  <option key={o.minutes} value={o.minutes}>
                    {o.minutes} Min. — CHF {o.price}.–
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.marketing.form.discountType}
              </Label>
              <select
                className={cn(selectClass, locked && "opacity-60")}
                value={discountType}
                disabled={locked}
                onChange={(e) => setDiscountType(e.target.value)}
              >
                <option value="prozent">{t.marketing.form.percent}</option>
                <option value="betrag">{t.marketing.form.amount}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.marketing.form.discountValue}
              </Label>
              <Input
                type="number"
                min={0}
                step="0.05"
                value={discountValue}
                disabled={locked}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
              {basePrice != null && finalPrice != null && (
                <p className="text-xs text-charcoal-soft">
                  {t.marketing.form.resultPrice}:{" "}
                  <span className="line-through opacity-60">CHF {basePrice}.–</span>{" "}
                  <span className="font-serif text-base text-gold-deep">CHF {finalPrice}.–</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.marketing.form.seats}
              </Label>
              <Input
                type="number"
                min={1}
                value={seats}
                placeholder={t.marketing.form.seatsHint}
                onChange={(e) => setSeats(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.marketing.form.appliesTo}
              </Label>
              <select
                className={selectClass}
                value={appliesTo}
                onChange={(e) => setAppliesTo(e.target.value)}
              >
                <option value="alle">{t.marketing.form.appliesAll}</option>
                <option value="neukunden">{t.marketing.form.appliesNew}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.marketing.form.validFrom}
              </Label>
              <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.marketing.form.validTo}
              </Label>
              <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
              {t.marketing.form.channelsLabel}
            </Label>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleChannel(c)}
                  aria-pressed={channels.includes(c)}
                  className={cn(
                    "rounded-sm border px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.18em] transition",
                    channels.includes(c)
                      ? "border-gold/60 bg-gold-soft/60 text-gold-deep"
                      : "border-border/60 text-charcoal-soft hover:bg-gold-soft/20",
                  )}
                >
                  {t.marketing.channels[c]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.marketing.form.radius}
              </Label>
              <Input type="number" min={0} value={radius} onChange={(e) => setRadius(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.marketing.form.ageMin}
              </Label>
              <Input type="number" min={0} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.marketing.form.ageMax}
              </Label>
              <Input type="number" min={0} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.marketing.form.budget}
              </Label>
              <Input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-charcoal-soft">{t.marketing.form.infoOnly}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.marketing.form.code}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={code}
                  disabled={locked}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                />
                {!locked && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-sm whitespace-nowrap text-[0.65rem] uppercase tracking-[0.18em]"
                    onClick={() => setCode(suggestCode(selected?.label, validFrom))}
                  >
                    {t.marketing.form.suggest}
                  </Button>
                )}
              </div>
              <p className="text-xs text-charcoal-soft">{t.marketing.form.codeHint}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
                {t.marketing.form.statusLabel}
              </Label>
              <select
                className={selectClass}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t.marketing.status[s]}
                  </option>
                ))}
              </select>
              {selected && (
                <p className="text-xs text-charcoal-soft">
                  <StudioText>{selected.label}</StudioText>
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-sm text-[0.7rem] uppercase tracking-[0.2em]"
              onClick={() => onOpenChange(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="btn-gold rounded-sm px-6 py-2.5 text-[0.7rem] uppercase tracking-[0.22em]"
            >
              {t.common.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
