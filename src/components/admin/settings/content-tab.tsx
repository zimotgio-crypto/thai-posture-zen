import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { useAdminT } from "@/lib/admin-i18n";
import {
  getStudioContent,
  removeStudioMedia,
  updateStudioContent,
  uploadStudioMedia,
  STUDIO_MEDIA_MAX_BYTES,
  STUDIO_MEDIA_MIME,
} from "@/lib/studio-content.functions";
import { invalidateStudioPublic } from "@/lib/studio-context";
import { SectionCard, TextField, AreaField, Field } from "./field";
import heroDefault from "@/assets/hero-shoulder-stretch.jpg";
import roomDefault from "@/assets/studio-room.jpg";
import portraitDefault from "@/assets/therapist-portrait.jpg";

type Slot = "logo" | "hero" | "room" | "portrait";

const DEFAULTS: Record<Slot, string | null> = {
  logo: null,
  hero: heroDefault,
  room: roomDefault,
  portrait: portraitDefault,
};

async function fileToBase64(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buffer.length; i += 0x8000) {
    binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export function ContentTab({ studioId }: { studioId: string }) {
  const t = useAdminT();
  const qc = useQueryClient();
  const load = useServerFn(getStudioContent);
  const save = useServerFn(updateStudioContent);
  const upload = useServerFn(uploadStudioMedia);
  const clear = useServerFn(removeStudioMedia);

  const content = useQuery({
    queryKey: ["admin", "studio-content", studioId],
    queryFn: () => load({ data: { studioId } }),
  });

  const [form, setForm] = useState({
    heroHeading: "",
    heroText: "",
    aboutHeading: "",
    aboutText: "",
    features: [] as { title: string; text: string }[],
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = content.data;
    if (!d) return;
    setForm({
      heroHeading: d.heroHeading ?? "",
      heroText: d.heroText ?? "",
      aboutHeading: d.aboutHeading ?? "",
      aboutText: d.aboutText ?? "",
      features: d.features ?? [],
    });
  }, [content.data]);

  async function submit() {
    setBusy(true);
    try {
      const res = await save({
        data: {
          studioId,
          heroHeading: form.heroHeading,
          heroText: form.heroText,
          aboutHeading: form.aboutHeading,
          aboutText: form.aboutText,
          features: form.features.filter((f) => f.title.trim() || f.text.trim()),
        },
      });
      if (res.slug) invalidateStudioPublic(qc, res.slug);
      await content.refetch();
      toast.success(t.settings.saved);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function pick(slot: Slot, file: File) {
    if (file.size > STUDIO_MEDIA_MAX_BYTES) {
      toast.error("Max. 5 MB");
      return;
    }
    if (!(STUDIO_MEDIA_MIME as readonly string[]).includes(file.type)) {
      toast.error(t.common.error);
      return;
    }
    setBusy(true);
    try {
      const res = await upload({
        data: {
          studioId,
          slot,
          filename: file.name,
          contentType: file.type as (typeof STUDIO_MEDIA_MIME)[number],
          dataBase64: await fileToBase64(file),
        },
      });
      if (res.ok) {
        if (content.data?.slug) invalidateStudioPublic(qc, content.data.slug);
        await content.refetch();
        toast.success(t.settings.saved);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function reset(slot: Slot) {
    setBusy(true);
    try {
      await clear({ data: { studioId, slot } });
      if (content.data?.slug) invalidateStudioPublic(qc, content.data.slug);
      await content.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  if (content.isLoading || !content.data) {
    return <p className="text-sm text-charcoal-soft">{t.common.loading}</p>;
  }

  const slots: { slot: Slot; label: string }[] = [
    { slot: "logo", label: t.settings.logo },
    { slot: "hero", label: t.settings.heroImage },
    { slot: "room", label: t.settings.roomImage },
    { slot: "portrait", label: t.settings.portraitImage },
  ];

  return (
    <div className="space-y-5">
      <SectionCard>
        <TextField
          label={t.settings.heroHeading}
          value={form.heroHeading}
          onChange={(v) => setForm({ ...form, heroHeading: v })}
        />
        <AreaField
          label={t.settings.heroText}
          value={form.heroText}
          onChange={(v) => setForm({ ...form, heroText: v })}
        />
        <TextField
          label={t.settings.aboutHeading}
          value={form.aboutHeading}
          onChange={(v) => setForm({ ...form, aboutHeading: v })}
        />
        <AreaField
          label={t.settings.aboutText}
          rows={6}
          value={form.aboutText}
          onChange={(v) => setForm({ ...form, aboutText: v })}
        />

        <Field label={t.settings.features}>
          <div className="space-y-3">
            {form.features.map((f, i) => (
              <div key={i} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={f.title}
                  aria-label={t.settings.featureTitle}
                  placeholder={t.settings.featureTitle}
                  onChange={(e) => {
                    const features = [...form.features];
                    features[i] = { ...f, title: e.target.value };
                    setForm({ ...form, features });
                  }}
                  className="rounded-sm sm:w-64"
                />
                <Input
                  value={f.text}
                  aria-label={t.settings.featureText}
                  placeholder={t.settings.featureText}
                  onChange={(e) => {
                    const features = [...form.features];
                    features[i] = { ...f, text: e.target.value };
                    setForm({ ...form, features });
                  }}
                  className="rounded-sm flex-1"
                />
                <button
                  aria-label={t.common.delete}
                  onClick={() =>
                    setForm({ ...form, features: form.features.filter((_, x) => x !== i) })
                  }
                  className="rounded-sm p-2 text-charcoal-soft hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="rounded-sm"
              onClick={() =>
                setForm({
                  ...form,
                  features: [...form.features, { title: "", text: "" }].slice(0, 12),
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" /> {t.settings.addFeature}
            </Button>
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

      <SectionCard>
        <h3 className="text-[0.66rem] uppercase tracking-[0.22em] text-charcoal-soft">
          {t.settings.images}
        </h3>
        <div className="grid gap-6 sm:grid-cols-2">
          {slots.map(({ slot, label }) => (
            <MediaSlot
              key={slot}
              label={label}
              url={content.data.media[slot].url ?? DEFAULTS[slot]}
              isDefault={!content.data.media[slot].path}
              busy={busy}
              onPick={(file) => pick(slot, file)}
              onReset={() => reset(slot)}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function MediaSlot({
  label,
  url,
  isDefault,
  busy,
  onPick,
  onReset,
}: {
  label: string;
  url: string | null;
  isDefault: boolean;
  busy: boolean;
  onPick: (file: File) => void;
  onReset: () => void;
}) {
  const t = useAdminT();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <div className="text-[0.66rem] uppercase tracking-[0.22em] text-charcoal-soft">{label}</div>
      <div className="aspect-[4/3] overflow-hidden rounded-sm border border-border/60 bg-ivory">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-charcoal-soft">—</div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="rounded-sm"
          disabled={busy}
          onClick={() => ref.current?.click()}
        >
          {t.settings.upload}
        </Button>
        {!isDefault && (
          <Button type="button" variant="ghost" className="rounded-sm" onClick={onReset}>
            {t.settings.reset}
          </Button>
        )}
        {isDefault && <span className="text-xs text-charcoal-soft">{t.settings.defaultImage}</span>}
      </div>
    </div>
  );
}
