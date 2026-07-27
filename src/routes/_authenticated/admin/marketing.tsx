import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus,
  Copy,
  BarChart3,
  Play,
  Pause,
  CopyPlus,
  Trash2,
  Pencil,
  Square,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { StudioText } from "@/components/studio-text";
import { useAdminT } from "@/lib/admin-i18n";
import { useAdminStudio } from "@/lib/admin-studio-context";
import {
  listCampaigns,
  setCampaignStatus,
  duplicateCampaign,
  deleteCampaign,
} from "@/lib/marketing.functions";
import { CampaignFormDialog, type CampaignRow, type TreatmentLite } from "@/components/admin/campaign-form";
import { CampaignDetail } from "@/components/admin/campaign-detail";
import { AdCreativeDialog } from "@/components/admin/ad-creative-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/marketing")({
  component: MarketingPage,
});

type CampaignWithStats = CampaignRow & {
  created_at: string;
  stats: { redemptions: number; revenue: number; discountCost: number; lastRedemptionDay: string | null };
};

const statusStyle: Record<string, string> = {
  entwurf: "border-border/60 bg-stone-100 text-charcoal-soft",
  aktiv: "border-gold/60 bg-gold-soft/70 text-gold-deep",
  pausiert: "border-border/60 bg-ivory-deep/60 text-charcoal-soft",
  beendet: "border-border/60 bg-stone-200/70 text-charcoal",
};

function swiss(day: string) {
  const [y, m, d] = day.split("-");
  return `${d}.${m}.${y}`;
}

function daysSince(day: string): number {
  const then = new Date(`${day}T00:00:00Z`).getTime();
  return Math.floor((Date.now() - then) / 86400000);
}

function MarketingPage() {
  const t = useAdminT();
  const qc = useQueryClient();
  const { studioId, studio } = useAdminStudio();
  const listFn = useServerFn(listCampaigns);
  const statusFn = useServerFn(setCampaignStatus);
  const dupFn = useServerFn(duplicateCampaign);
  const delFn = useServerFn(deleteCampaign);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignRow | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [creativeOpen, setCreativeOpen] = useState(false);
  const [creativeCampaign, setCreativeCampaign] = useState<CampaignRow | null>(null);

  const query = useQuery({
    queryKey: ["admin", "campaigns", studioId],
    queryFn: () => listFn({ data: { studioId } }),
  });

  const campaigns = (query.data?.campaigns ?? []) as unknown as CampaignWithStats[];
  const treatments = (query.data?.treatments ?? []) as TreatmentLite[];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "campaigns"] });

  const statusMutation = useMutation({
    mutationFn: (v: { id: string; status: "entwurf" | "aktiv" | "pausiert" | "beendet" }) =>
      statusFn({ data: { id: v.id, status: v.status, studioId } }),
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t.common.error),
  });

  const dupMutation = useMutation({
    mutationFn: (id: string) => dupFn({ data: { id, studioId } }),
    onSuccess: async () => {
      toast.success(t.marketing.duplicated);
      await invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t.common.error),
  });

  const delMutation = useMutation({
    mutationFn: (id: string) => delFn({ data: { id, studioId } }),
    onSuccess: async () => {
      toast.success(t.marketing.deleted);
      await invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t.common.error),
  });

  function bookingLink(code: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/${studio.slug}?code=${encodeURIComponent(code)}`;
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t.marketing.links.copied);
    } catch {
      toast.error(t.common.error);
    }
  }

  function hintFor(c: CampaignWithStats): string | null {
    const used = Number(c.redemptions_used);
    const max = c.max_redemptions;
    if (max != null && used >= max) return t.marketing.hints.soldOut;
    if (max != null && max > 0 && used / max >= 0.8) {
      return t.marketing.hints.almostFull(max - used, max);
    }
    if (c.status === "aktiv") {
      const ref = c.stats.lastRedemptionDay ?? c.valid_from;
      const days = daysSince(ref);
      if (days >= 3 && c.stats.redemptions === 0) return t.marketing.hints.stale(days);
      if (days >= 3 && c.stats.lastRedemptionDay) return t.marketing.hints.stale(days);
    }
    return null;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.3em] text-gold-deep">
            {t.marketing.subtitle}
          </p>
          <h1 className="font-serif text-2xl text-charcoal">{t.marketing.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setCreativeCampaign(null);
              setCreativeOpen(true);
            }}
            className="rounded-sm px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.22em]"
          >
            <ImageIcon className="mr-1 h-4 w-4" /> {t.marketing.adCreative.open}
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="btn-gold rounded-sm px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.22em]"
          >
            <Plus className="mr-1 h-4 w-4" /> {t.marketing.newCampaign}
          </Button>
        </div>
      </div>

      <div className="rounded-sm border border-border/60 bg-card overflow-x-auto">
        <table className="w-full min-w-[1000px] table-auto text-sm">
          <thead className="bg-ivory-deep/40 text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
            <tr>
              <th className="px-5 py-3 text-left">{t.marketing.colTitle}</th>
              <th className="px-5 py-3 text-left">{t.marketing.colCode}</th>
              <th className="px-5 py-3 text-left">{t.marketing.colStatus}</th>
              <th className="px-5 py-3 text-left">{t.marketing.colPeriod}</th>
              <th className="px-5 py-3 text-left">{t.marketing.colRedemptions}</th>
              <th className="px-5 py-3 text-left">{t.marketing.colRevenue}</th>
              <th className="px-5 py-3 text-right">{t.marketing.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const hint = hintFor(c);
              return (
                <tr key={c.id} className="border-t border-border/50 align-top">
                  <td className="px-5 py-4">
                    <StudioText className="font-medium text-charcoal">{c.title}</StudioText>
                    {hint && <p className="mt-1 text-xs text-charcoal-soft">{hint}</p>}
                    {c.status === "aktiv" && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => copy(bookingLink(c.code))}
                          className="inline-flex items-center gap-1 rounded-sm border border-border/60 px-2 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-charcoal-soft hover:bg-gold-soft/30"
                        >
                          <Copy className="h-3 w-3" /> {t.marketing.links.bookingLink}
                        </button>
                        <button
                          type="button"
                          onClick={() => copy(c.code)}
                          className="inline-flex items-center gap-1 rounded-sm border border-border/60 px-2 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-charcoal-soft hover:bg-gold-soft/30"
                        >
                          <Copy className="h-3 w-3" /> {t.marketing.links.codeOnly}
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-charcoal">{c.code}</td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "inline-block rounded-sm border px-2 py-1 text-[0.6rem] uppercase tracking-[0.18em]",
                        statusStyle[c.status] ?? statusStyle.entwurf,
                      )}
                    >
                      {t.marketing.status[c.status as keyof typeof t.marketing.status] ?? c.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-charcoal-soft">
                    {swiss(c.valid_from)} – {swiss(c.valid_to)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-charcoal-soft">
                    {c.redemptions_used} / {c.max_redemptions ?? t.marketing.unlimited}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-charcoal-soft">
                    CHF {c.stats.revenue.toFixed(2)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <IconAction label={t.marketing.openDetail} onClick={() => setDetailId(c.id)}>
                        <BarChart3 className="h-4 w-4" />
                      </IconAction>
                      <IconAction
                        label={t.common.edit}
                        onClick={() => {
                          setEditing(c);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </IconAction>
                      <IconAction
                        label={t.marketing.adCreative.open}
                        onClick={() => {
                          setCreativeCampaign(c);
                          setCreativeOpen(true);
                        }}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </IconAction>
                      {c.status !== "aktiv" && c.status !== "beendet" && (
                        <IconAction
                          label={t.marketing.activate}
                          onClick={() => statusMutation.mutate({ id: c.id, status: "aktiv" })}
                        >
                          <Play className="h-4 w-4" />
                        </IconAction>
                      )}
                      {c.status === "aktiv" && (
                        <IconAction
                          label={t.marketing.pause}
                          onClick={() => statusMutation.mutate({ id: c.id, status: "pausiert" })}
                        >
                          <Pause className="h-4 w-4" />
                        </IconAction>
                      )}
                      <IconAction label={t.marketing.duplicate} onClick={() => dupMutation.mutate(c.id)}>
                        <CopyPlus className="h-4 w-4" />
                      </IconAction>
                      {Number(c.redemptions_used) === 0 ? (
                        <IconAction
                          label={t.common.delete}
                          onClick={() => {
                            if (window.confirm(t.marketing.confirmDelete)) delMutation.mutate(c.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconAction>
                      ) : (
                        c.status !== "beendet" && (
                          <IconAction
                            label={t.marketing.finish}
                            onClick={() => statusMutation.mutate({ id: c.id, status: "beendet" })}
                          >
                            <Square className="h-4 w-4" />
                          </IconAction>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {query.isSuccess && campaigns.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-charcoal-soft">
                  {t.marketing.empty}
                </td>
              </tr>
            )}
            {query.isLoading && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-charcoal-soft">
                  {t.common.loading}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <CampaignFormDialog
          key={editing?.id ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          campaign={editing}
          treatments={treatments}
        />
      )}

      <Sheet open={Boolean(detailId)} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent side="right" className="!w-[95vw] !max-w-none overflow-y-auto sm:!w-[860px]">
          {detailId && <CampaignDetail campaignId={detailId} />}
        </SheetContent>
      </Sheet>

      {creativeOpen && (
        <AdCreativeDialog
          key={creativeCampaign?.id ?? "standalone"}
          open={creativeOpen}
          onOpenChange={setCreativeOpen}
          campaign={creativeCampaign}
          treatments={treatments}
        />
      )}
    </div>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-charcoal-soft transition-colors hover:bg-gold-soft/40 hover:text-gold-deep"
    >
      {children}
    </button>
  );
}
