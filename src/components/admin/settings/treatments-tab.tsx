import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ChevronUp, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { useAdminT } from "@/lib/admin-i18n";
import {
  deleteTreatment,
  reorderTreatments,
  saveTreatment,
} from "@/lib/studio-settings.functions";
import { invalidateStudioPublic } from "@/lib/studio-context";
import { SectionCard, TextField, AreaField, Field } from "./field";
import { StudioText } from "@/components/studio-text";

export type SettingsTreatment = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  active: boolean;
  sortOrder: number;
  options: { minutes: number; price: number }[];
  inUse: boolean;
};

type Draft = Omit<SettingsTreatment, "id" | "inUse"> & { id?: string };

const emptyDraft = (sortOrder: number): Draft => ({
  key: "",
  label: "",
  description: "",
  active: true,
  sortOrder,
  options: [{ minutes: 60, price: 100 }],
});

export function TreatmentsTab({
  studioId,
  slug,
  treatments,
  onSaved,
}: {
  studioId: string;
  slug: string;
  treatments: SettingsTreatment[];
  onSaved: () => void;
}) {
  const t = useAdminT();
  const qc = useQueryClient();
  const save = useServerFn(saveTreatment);
  const remove = useServerFn(deleteTreatment);
  const reorder = useServerFn(reorderTreatments);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  function refresh() {
    invalidateStudioPublic(qc, slug);
    onSaved();
  }

  async function submit() {
    if (!draft) return;
    if (!draft.key.trim() || !draft.label.trim() || draft.options.length === 0) {
      toast.error(t.common.error);
      return;
    }
    setBusy(true);
    try {
      await save({
        data: {
          studioId,
          id: draft.id,
          key: draft.key.trim(),
          label: draft.label.trim(),
          description: draft.description?.trim() ? draft.description.trim() : null,
          active: draft.active,
          sortOrder: draft.sortOrder,
          options: draft.options.map((o) => ({
            minutes: Number(o.minutes),
            price: Number(o.price),
          })),
        },
      });
      setDraft(null);
      refresh();
      toast.success(t.settings.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...treatments];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await reorder({ data: { studioId, ids: next.map((x) => x.id) } });
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    }
  }

  async function drop(item: SettingsTreatment) {
    try {
      const res = await remove({ data: { studioId, id: item.id } });
      if (!res.ok) {
        toast.error(t.settings.inUse);
        return;
      }
      refresh();
      toast.success(t.settings.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    }
  }

  return (
    <div className="space-y-5">
      {treatments.map((item, i) => (
        <SectionCard key={item.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <StudioText as="div" className="font-serif text-xl text-charcoal">
                {item.label}
              </StudioText>
              <StudioText
                as="div"
                className="mt-1 text-[0.66rem] uppercase tracking-[0.22em] text-charcoal-soft"
              >
                {item.key}
              </StudioText>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.options.map((o) => (
                  <span
                    key={o.minutes}
                    className="rounded-sm border border-border/60 px-2.5 py-1 text-xs text-charcoal"
                  >
                    {o.minutes} min · CHF {o.price}.–
                  </span>
                ))}
              </div>
              {!item.active && (
                <p className="mt-2 text-xs text-charcoal-soft">{t.settings.inactiveHint}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                aria-label={t.settings.moveUp}
                onClick={() => move(i, -1)}
                className="rounded-sm p-2 text-charcoal-soft hover:bg-gold-soft/30"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                aria-label={t.settings.moveDown}
                onClick={() => move(i, 1)}
                className="rounded-sm p-2 text-charcoal-soft hover:bg-gold-soft/30"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <Button
                variant="outline"
                className="rounded-sm"
                onClick={() =>
                  setDraft({
                    id: item.id,
                    key: item.key,
                    label: item.label,
                    description: item.description ?? "",
                    active: item.active,
                    sortOrder: item.sortOrder,
                    options: item.options,
                  })
                }
              >
                {t.common.edit}
              </Button>
              {!item.inUse && (
                <button
                  aria-label={t.common.delete}
                  onClick={() => drop(item)}
                  className="rounded-sm p-2 text-charcoal-soft hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </SectionCard>
      ))}

      {draft ? (
        <SectionCard>
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label={t.settings.label}
              value={draft.label}
              onChange={(v) => setDraft({ ...draft, label: v })}
            />
            <TextField
              label={t.settings.key}
              value={draft.key}
              onChange={(v) => setDraft({ ...draft, key: v })}
              hint="a-z, 0-9, -"
            />
          </div>
          <AreaField
            label={t.settings.description}
            value={draft.description ?? ""}
            onChange={(v) => setDraft({ ...draft, description: v })}
          />
          <Field label={t.settings.variants}>
            <div className="space-y-2">
              {draft.options.map((o, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={15}
                    step={15}
                    value={o.minutes}
                    aria-label={t.settings.minutes}
                    onChange={(e) => {
                      const options = [...draft.options];
                      options[idx] = { ...o, minutes: Number(e.target.value) || 0 };
                      setDraft({ ...draft, options });
                    }}
                    className="w-28 rounded-sm"
                  />
                  <span className="text-xs text-charcoal-soft">{t.settings.minutes}</span>
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    value={o.price}
                    aria-label={t.settings.price}
                    onChange={(e) => {
                      const options = [...draft.options];
                      options[idx] = { ...o, price: Number(e.target.value) || 0 };
                      setDraft({ ...draft, options });
                    }}
                    className="w-32 rounded-sm"
                  />
                  <span className="text-xs text-charcoal-soft">CHF</span>
                  {draft.options.length > 1 && (
                    <button
                      aria-label={t.common.delete}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          options: draft.options.filter((_, x) => x !== idx),
                        })
                      }
                      className="rounded-sm p-2 text-charcoal-soft hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="rounded-sm"
                onClick={() =>
                  setDraft({
                    ...draft,
                    options: [...draft.options, { minutes: 90, price: 150 }].slice(0, 8),
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" /> {t.settings.addVariant}
              </Button>
            </div>
          </Field>
          <label className="flex items-center gap-3 text-sm text-charcoal">
            <Switch
              checked={draft.active}
              onCheckedChange={(v) => setDraft({ ...draft, active: v })}
            />
            {t.settings.activeLabel}
          </label>
          <div className="flex gap-3">
            <Button
              onClick={submit}
              disabled={busy}
              className="btn-gold rounded-sm px-6 py-4 text-xs uppercase tracking-[0.22em]"
            >
              {t.common.save}
            </Button>
            <Button variant="ghost" className="rounded-sm" onClick={() => setDraft(null)}>
              {t.common.cancel}
            </Button>
          </div>
        </SectionCard>
      ) : (
        <Button
          variant="outline"
          className="rounded-sm"
          onClick={() => setDraft(emptyDraft(treatments.length))}
        >
          <Plus className="mr-1 h-4 w-4" /> {t.settings.addTreatment}
        </Button>
      )}
    </div>
  );
}
