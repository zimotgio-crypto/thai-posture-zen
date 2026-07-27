import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, ImageIcon, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Field } from "@/components/admin/settings/field";
import { MediaPickerDialog } from "@/components/admin/media-library";
import { StudioText } from "@/components/studio-text";
import { useAdminT } from "@/lib/admin-i18n";
import { useAdminStudio } from "@/lib/admin-studio-context";
import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/lib/media.functions";
import type { CampaignRow, TreatmentLite } from "@/components/admin/campaign-form";
import { saveAdCreatives, listCampaignCreatives } from "@/lib/ad-creative.functions";
import {
  AD_FORMATS,
  AD_TEMPLATES,
  canvasToBase64,
  defaultPositionFor,
  downloadCanvas,
  renderAdCreative,
  type AdFormatKey,
  type AdTemplateKey,
  type AdTextPosition,
} from "@/lib/ad-creative";

function roundChf(v: number) {
  return Math.round(v * 20) / 20;
}

function chf(v: number) {
  return `CHF ${v.toFixed(2).replace(/\.00$/, ".–")}`;
}

export function AdCreativeDialog({
  open,
  onOpenChange,
  campaign,
  treatments,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campaign?: CampaignRow | null;
  treatments: TreatmentLite[];
}) {
  const t = useAdminT();
  const ta = t.marketing.adCreative;
  const { studioId, studio, treatments: studioTreatments } = useAdminStudio();
  const saveFn = useServerFn(saveAdCreatives);
  const listFn = useServerFn(listCampaignCreatives);

  const prefill = useMemo(() => {
    const treatment = campaign?.treatment_id
      ? treatments.find((x) => x.id === campaign.treatment_id)
      : undefined;
    const options = treatment
      ? (studioTreatments.find((x) => x.key === treatment.key)?.options ?? [])
      : [];
    const option =
      options.find((o) => o.minutes === campaign?.duration_minutes) ?? options[0] ?? null;
    const base = option?.price ?? null;
    let discounted: number | null = null;
    if (campaign && base != null) {
      discounted =
        campaign.discount_type === "prozent"
          ? roundChf(base * (1 - Number(campaign.discount_value) / 100))
          : roundChf(Math.max(0, base - Number(campaign.discount_value)));
    }
    const parts: string[] = [];
    if (option) parts.push(`${option.minutes} Minuten`);
    if (base != null && discounted != null && discounted < base) {
      parts.push(`statt ${chf(base)} nur ${chf(discounted)}`);
    } else if (base != null) {
      parts.push(chf(base));
    }
    return {
      headline: treatment?.label ?? studio.name,
      subline: parts.join(" · "),
      code: campaign?.code ?? "",
    };
  }, [campaign, treatments, studioTreatments, studio.name]);

  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [headline, setHeadline] = useState(prefill.headline);
  const [subline, setSubline] = useState(prefill.subline);
  const [code, setCode] = useState(prefill.code);
  const [cta, setCta] = useState("Jetzt online buchen");
  const [template, setTemplate] = useState<AdTemplateKey>(campaign ? "angebot" : "ruhig");
  const [position, setPosition] = useState<AdTextPosition>(
    defaultPositionFor(campaign ? "angebot" : "ruhig"),
  );
  const [overlay, setOverlay] = useState(0.6);
  const [busy, setBusy] = useState(false);
  const [rendering, setRendering] = useState(true);

  const refs = useRef<Record<AdFormatKey, HTMLCanvasElement | null>>({
    feed: null,
    portrait: null,
    story: null,
  });

  const savedQuery = useQuery({
    queryKey: ["admin", "campaign-creatives", campaign?.id],
    queryFn: () => listFn({ data: { studioId, campaignId: campaign!.id } }),
    enabled: Boolean(open && campaign?.id),
  });

  const input = useMemo(
    () => ({
      imageUrl: asset?.url ?? null,
      headline,
      subline,
      code,
      cta,
      position,
      overlay,
      template,
      studioName: studio.name,
      studioCity: studio.city ?? "",
    }),
    [asset, headline, subline, code, cta, position, overlay, template, studio.name, studio.city],
  );

  const register = useCallback((key: AdFormatKey, canvas: HTMLCanvasElement | null) => {
    refs.current[key] = canvas;
  }, []);

  function fileName(format: AdFormatKey) {
    const slug = (code || headline || "werbebild")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    const f = AD_FORMATS.find((x) => x.key === format)!;
    return `${slug || "werbebild"}-${f.width}x${f.height}.png`;
  }

  function download(format: AdFormatKey) {
    const canvas = refs.current[format];
    if (!canvas) return;
    downloadCanvas(canvas, fileName(format));
  }

  async function saveAll() {
    if (!asset) return toast.error(ta.noMotif);
    setBusy(true);
    try {
      const images = [] as { format: AdFormatKey; dataBase64: string }[];
      for (const format of AD_FORMATS) {
        const canvas = refs.current[format.key];
        if (!canvas) continue;
        images.push({ format: format.key, dataBase64: await canvasToBase64(canvas) });
      }
      await saveFn({ data: { studioId, campaignId: campaign?.id ?? null, images } });
      toast.success(ta.saved);
      if (campaign?.id) await savedQuery.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] w-[95vw] max-w-5xl overflow-y-auto rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-charcoal">{ta.title}</DialogTitle>
            <p className="text-[0.66rem] uppercase tracking-[0.22em] text-charcoal-soft">
              {ta.subtitle}
            </p>
          </DialogHeader>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <div className="space-y-5">
              <Field label={ta.motif}>
                <div className="space-y-2">
                  <div className="aspect-[4/3] overflow-hidden rounded-sm border border-border/60 bg-ivory-deep/40">
                    {asset?.url ? (
                      <img src={asset.url} alt={asset.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-charcoal-soft">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPickerOpen(true)}
                    className="w-full rounded-sm text-[0.66rem] uppercase tracking-[0.2em]"
                  >
                    {asset ? ta.changeMotif : ta.chooseMotif}
                  </Button>
                  {asset && (
                    <StudioText className="block text-xs text-charcoal-soft">
                      {asset.title}
                    </StudioText>
                  )}
                </div>
              </Field>

              <Field label={ta.template}>
                <div className="grid gap-2">
                  {AD_TEMPLATES.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setTemplate(key);
                        setPosition(defaultPositionFor(key));
                      }}
                      className={cn(
                        "rounded-sm border px-3 py-2 text-left transition",
                        template === key
                          ? "border-gold-deep bg-gold-soft/40"
                          : "border-border/60 hover:bg-gold-soft/20",
                      )}
                    >
                      <span className="block text-[0.7rem] uppercase tracking-[0.2em] text-charcoal">
                        {ta.templates[key]}
                      </span>
                      <span className="block text-xs text-charcoal-soft">
                        {ta.templateHints[key]}
                      </span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label={ta.headline}>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="rounded-sm"
                />
              </Field>
              <Field label={ta.subline}>
                <Input
                  value={subline}
                  onChange={(e) => setSubline(e.target.value)}
                  className="rounded-sm"
                />
              </Field>
              <Field label={ta.code}>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="rounded-sm font-mono"
                />
              </Field>
              <Field label={ta.cta}>
                <Input value={cta} onChange={(e) => setCta(e.target.value)} className="rounded-sm" />
              </Field>

              <Field label={ta.position}>
                <div className="flex gap-2">
                  {(["oben", "mittig", "unten"] as AdTextPosition[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPosition(p)}
                      className={cn(
                        "flex-1 rounded-sm border px-2 py-2 text-[0.62rem] uppercase tracking-[0.18em] transition",
                        position === p
                          ? "border-gold-deep bg-gold-soft/40 text-gold-deep"
                          : "border-border/60 text-charcoal-soft hover:bg-gold-soft/20",
                      )}
                    >
                      {ta.positions[p]}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label={`${ta.overlay} · ${Math.round(overlay * 100)}%`}>
                <Slider
                  value={[Math.round(overlay * 100)]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={(v) => setOverlay((v[0] ?? 60) / 100)}
                />
              </Field>
            </div>

            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => AD_FORMATS.forEach((f) => download(f.key))}
                  className="btn-gold rounded-sm px-4 py-2.5 text-[0.66rem] uppercase tracking-[0.2em]"
                >
                  <Download className="mr-1 h-4 w-4" /> {ta.downloadAll}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={saveAll}
                  className="rounded-sm px-4 py-2.5 text-[0.66rem] uppercase tracking-[0.2em]"
                >
                  <Save className="mr-1 h-4 w-4" /> {busy ? ta.saving : ta.save}
                </Button>
                {rendering && <span className="text-xs text-charcoal-soft">{ta.rendering}</span>}
              </div>
              <p className="text-xs text-charcoal-soft">{ta.saveHint}</p>

              <div className="grid gap-5 sm:grid-cols-3">
                {AD_FORMATS.map((format) => (
                  <div key={format.key} className="space-y-2">
                    <div className="text-[0.6rem] uppercase tracking-[0.2em] text-charcoal-soft">
                      {format.label} · {ta.formats[format.key]}
                    </div>
                    <AdCanvasPreview
                      format={format}
                      input={input}
                      register={register}
                      onRenderState={setRendering}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => download(format.key)}
                      className="w-full rounded-sm text-[0.62rem] uppercase tracking-[0.18em]"
                    >
                      <Download className="mr-1 h-3.5 w-3.5" /> {ta.download}
                    </Button>
                  </div>
                ))}
              </div>

              {campaign?.id && (savedQuery.data?.images.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <div className="text-[0.6rem] uppercase tracking-[0.2em] text-charcoal-soft">
                    {ta.savedImages}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {savedQuery.data!.images.map((img) =>
                      img.url ? (
                        <a key={img.path} href={img.url} target="_blank" rel="noreferrer">
                          <img
                            src={img.url}
                            alt={ta.savedImages}
                            className="h-24 w-full rounded-sm border border-border/60 object-cover"
                          />
                        </a>
                      ) : null,
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(picked) => {
          setAsset(picked);
          setPickerOpen(false);
        }}
      />
    </>
  );
}

/** Eine Vorschau je Format. Zeichnet bei jeder Änderung neu. */
function AdCanvasPreview({
  format,
  input,
  register,
  onRenderState,
}: {
  format: (typeof AD_FORMATS)[number];
  input: AdCreativeInput;
  register: (key: AdFormatKey, canvas: HTMLCanvasElement | null) => void;
  onRenderState: (busy: boolean) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    register(format.key, canvas);
    let cancelled = false;
    onRenderState(true);
    void renderAdCreative(canvas, format, input).finally(() => {
      if (!cancelled) onRenderState(false);
    });
    return () => {
      cancelled = true;
    };
  }, [format, input, register, onRenderState]);

  return (
    <canvas
      ref={ref}
      className="w-full rounded-sm border border-border/60 bg-charcoal"
      style={{ aspectRatio: `${format.width} / ${format.height}` }}
    />
  );
}