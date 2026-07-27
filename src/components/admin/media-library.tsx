import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Upload, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, SectionCard } from "@/components/admin/settings/field";
import { useAdminT } from "@/lib/admin-i18n";
import { useAdminStudio } from "@/lib/admin-studio-context";
import { cn } from "@/lib/utils";
import {
  deleteMediaAsset,
  listMediaAssets,
  updateMediaAsset,
  uploadMediaAsset,
  MEDIA_KINDS,
  MEDIA_MAX_BYTES,
  MEDIA_MIME,
  type MediaAsset,
  type MediaKind,
} from "@/lib/media.functions";

async function fileToBase64(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buffer.length; i += 0x8000) {
    binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function useMediaAssets(studioId: string | null) {
  const list = useServerFn(listMediaAssets);
  return useQuery({
    queryKey: ["admin", "media", studioId],
    queryFn: () => list({ data: studioId ? { studioId } : {} }),
    enabled: Boolean(studioId),
  });
}

/** Grid of media cards. Titles are studio content and never translated. */
export function MediaGrid({
  assets,
  empty,
  onSelect,
  selectLabel,
  editable,
  onChanged,
  studioId,
}: {
  assets: MediaAsset[];
  empty: string;
  onSelect?: (asset: MediaAsset) => void;
  selectLabel?: string;
  editable?: boolean;
  onChanged?: () => void;
  studioId?: string | null;
}) {
  const t = useAdminT();
  const update = useServerFn(updateMediaAsset);
  const remove = useServerFn(deleteMediaAsset);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", tags: "" });
  const [busy, setBusy] = useState(false);

  if (assets.length === 0) {
    return <p className="text-sm text-charcoal-soft">{empty}</p>;
  }

  async function save(asset: MediaAsset) {
    setBusy(true);
    try {
      await update({
        data: {
          ...(studioId ? { studioId } : {}),
          id: asset.id,
          title: draft.title.trim() || asset.title,
          tags: parseTags(draft.tags),
        },
      });
      setEditing(null);
      onChanged?.();
      toast.success(t.media.updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function del(asset: MediaAsset) {
    if (!window.confirm(t.media.confirmDelete)) return;
    setBusy(true);
    try {
      await remove({ data: { ...(studioId ? { studioId } : {}), id: asset.id } });
      onChanged?.();
      toast.success(t.media.deleted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {assets.map((asset) => (
        <figure
          key={asset.id}
          className="overflow-hidden rounded-sm border border-border/60 bg-card"
        >
          <div className="aspect-[4/3] bg-gold-soft/20">
            {asset.url && (
              <img
                src={asset.url}
                alt={asset.title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <figcaption className="space-y-2 p-3">
            {editing === asset.id ? (
              <div className="space-y-2">
                <Input
                  value={draft.title}
                  aria-label={t.media.fieldTitle}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="rounded-sm"
                />
                <Input
                  value={draft.tags}
                  aria-label={t.media.fieldTags}
                  placeholder={t.media.tagsHint}
                  onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                  className="rounded-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => save(asset)}
                    className="btn-gold rounded-sm text-[0.66rem] uppercase tracking-[0.2em]"
                  >
                    <Check className="mr-1 h-3.5 w-3.5" /> {t.common.save}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-sm text-[0.66rem] uppercase tracking-[0.2em]"
                    onClick={() => setEditing(null)}
                  >
                    {t.common.cancel}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div translate="no" className="font-serif text-base text-charcoal">
                  {asset.title}
                </div>
                <div className="text-[0.62rem] uppercase tracking-[0.2em] text-charcoal-soft">
                  {t.media.kinds[asset.kind] ?? asset.kind}
                  {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
                </div>
                {asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1" translate="no">
                    {asset.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-sm bg-gold-soft/40 px-2 py-0.5 text-[0.62rem] text-gold-deep"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {onSelect && (
                    <Button
                      size="sm"
                      className="btn-gold rounded-sm text-[0.66rem] uppercase tracking-[0.2em]"
                      onClick={() => onSelect(asset)}
                    >
                      {selectLabel ?? t.media.use}
                    </Button>
                  )}
                  {editable && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-sm text-[0.66rem] uppercase tracking-[0.2em]"
                        onClick={() => {
                          setEditing(asset.id);
                          setDraft({ title: asset.title, tags: asset.tags.join(", ") });
                        }}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" /> {t.common.edit}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        className="rounded-sm text-[0.66rem] uppercase tracking-[0.2em]"
                        onClick={() => del(asset)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> {t.common.delete}
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/** Upload form for own studio media or the platform library. */
export function MediaUploadForm({
  scope = "studio",
  studioId,
  onUploaded,
}: {
  scope?: "studio" | "platform";
  studioId?: string | null;
  onUploaded?: () => void;
}) {
  const t = useAdminT();
  const upload = useServerFn(uploadMediaAsset);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [kind, setKind] = useState<MediaKind>("foto");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file) return toast.error(t.media.fileRequired);
    if (!title.trim()) return toast.error(t.media.titleRequired);
    if (!consent) return toast.error(t.media.consentRequired);
    if (file.size > MEDIA_MAX_BYTES) return toast.error(t.media.tooLarge);
    if (!(MEDIA_MIME as readonly string[]).includes(file.type))
      return toast.error(t.media.wrongType);

    setBusy(true);
    try {
      await upload({
        data: {
          ...(studioId ? { studioId } : {}),
          scope,
          kind,
          title: title.trim(),
          tags: parseTags(tags),
          filename: file.name,
          contentType: file.type as (typeof MEDIA_MIME)[number],
          source: "upload",
          consentOk: consent,
          dataBase64: await fileToBase64(file),
        },
      });
      setFile(null);
      setTitle("");
      setTags("");
      setConsent(false);
      if (fileRef.current) fileRef.current.value = "";
      onUploaded?.();
      toast.success(t.media.uploaded);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t.media.fieldFile} hint={t.media.fileHint}>
          <Input
            ref={fileRef}
            type="file"
            accept={MEDIA_MIME.join(",")}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-sm"
          />
        </Field>
        <Field label={t.media.fieldTitle}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-sm"
          />
        </Field>
        <Field label={t.media.fieldTags} hint={t.media.tagsHint}>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} className="rounded-sm" />
        </Field>
        <Field label={t.media.fieldKind}>
          <select
            value={kind}
            aria-label={t.media.fieldKind}
            onChange={(e) => setKind(e.target.value as MediaKind)}
            className="w-full rounded-sm border border-border/60 bg-card px-3 py-2 text-sm text-charcoal"
          >
            {MEDIA_KINDS.map((k) => (
              <option key={k} value={k}>
                {t.media.kinds[k]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="flex items-start gap-3 text-sm text-charcoal-soft">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[var(--gold-deep,#a98b52)]"
        />
        <span>{t.media.consent}</span>
      </label>
      <Button
        onClick={submit}
        disabled={busy}
        className="btn-gold rounded-sm px-6 py-4 text-xs uppercase tracking-[0.22em]"
      >
        <Upload className="mr-2 h-4 w-4" />
        {busy ? t.media.uploading : t.media.upload}
      </Button>
    </SectionCard>
  );
}

export function MediaTabs({
  value,
  onChange,
  labels,
}: {
  value: string;
  onChange: (v: string) => void;
  labels: { value: string; label: string }[];
}) {
  return (
    <div className="flex gap-1 border-b border-border/60">
      {labels.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "px-4 py-2 text-[0.7rem] uppercase tracking-[0.22em] transition",
            value === tab.value
              ? "border-b-2 border-gold-deep text-gold-deep"
              : "text-charcoal-soft hover:text-charcoal",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/** Reusable picker: own images + platform library, searchable and filterable. */
export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (asset: MediaAsset) => void;
}) {
  const t = useAdminT();
  const { studioId } = useAdminStudio();
  const query = useMediaAssets(open ? studioId : null);
  const [tab, setTab] = useState("mine");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"" | MediaKind>("");

  const source = tab === "mine" ? (query.data?.mine ?? []) : (query.data?.library ?? []);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return source.filter((a) => {
      if (kind && a.kind !== kind) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) || a.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [source, search, kind]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-sm border-border/60">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-charcoal">
            {t.media.pickerTitle}
          </DialogTitle>
        </DialogHeader>
        <MediaTabs
          value={tab}
          onChange={setTab}
          labels={[
            { value: "mine", label: t.media.tabMine },
            { value: "library", label: t.media.tabLibrary },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={search}
            placeholder={t.media.search}
            aria-label={t.media.search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-sm sm:max-w-xs"
          />
          <select
            value={kind}
            aria-label={t.media.fieldKind}
            onChange={(e) => setKind(e.target.value as "" | MediaKind)}
            className="rounded-sm border border-border/60 bg-card px-3 py-2 text-sm text-charcoal"
          >
            <option value="">{t.media.allKinds}</option>
            {MEDIA_KINDS.map((k) => (
              <option key={k} value={k}>
                {t.media.kinds[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="max-h-[55vh] overflow-y-auto pr-1">
          {query.isLoading ? (
            <p className="text-sm text-charcoal-soft">{t.common.loading}</p>
          ) : (
            <MediaGrid
              assets={filtered}
              empty={tab === "mine" ? t.media.emptyMine : t.media.emptyLibrary}
              selectLabel={t.media.choose}
              onSelect={(asset) => {
                onSelect(asset);
                onOpenChange(false);
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}