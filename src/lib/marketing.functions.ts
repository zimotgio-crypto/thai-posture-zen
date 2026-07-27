import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Studio-Zugehörigkeit immer serverseitig auflösen – nie der Client-ID trauen.
async function studioContext(userId: string, studioId?: string | null) {
  const { resolveStudioContext } = await import("@/lib/studio.server");
  return resolveStudioContext(userId, studioId ?? null);
}

const CAMPAIGN_COLUMNS =
  "id, studio_id, title, treatment_id, duration_minutes, goal, code, discount_type, discount_value, max_redemptions, redemptions_used, valid_from, valid_to, channels, radius_km, age_min, age_max, budget_chf, applies_to, status, created_at";

const scope = z.object({ studioId: z.string().uuid().optional() });

export type CampaignStats = {
  redemptions: number;
  revenue: number;
  discountCost: number;
  lastRedemptionDay: string | null;
};

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => scope.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin, studioId } = await studioContext(context.userId, data.studioId);
    const [{ data: rows, error }, bookings, treatments] = await Promise.all([
      admin
        .from("campaigns")
        .select(CAMPAIGN_COLUMNS)
        .eq("studio_id", studioId)
        .order("created_at", { ascending: false }),
      admin
        .from("bookings")
        .select("campaign_id, price_chf, discount_chf, day")
        .eq("studio_id", studioId)
        .not("campaign_id", "is", null),
      admin.from("treatments").select("id, key, label").eq("studio_id", studioId),
    ]);
    if (error) throw new Error(error.message);

    const stats = new Map<string, CampaignStats>();
    for (const b of bookings.data ?? []) {
      const id = b.campaign_id as string;
      const s =
        stats.get(id) ??
        ({ redemptions: 0, revenue: 0, discountCost: 0, lastRedemptionDay: null } as CampaignStats);
      s.redemptions += 1;
      s.revenue += Number(b.price_chf ?? 0);
      s.discountCost += Number(b.discount_chf ?? 0);
      const day = b.day as string;
      if (!s.lastRedemptionDay || day > s.lastRedemptionDay) s.lastRedemptionDay = day;
      stats.set(id, s);
    }

    return {
      studioId,
      treatments: (treatments.data ?? []).map((t) => ({
        id: t.id as string,
        key: t.key as string,
        label: t.label as string,
      })),
      campaigns: (rows ?? []).map((c) => ({
        ...c,
        stats:
          stats.get(c.id as string) ??
          ({ redemptions: 0, revenue: 0, discountCost: 0, lastRedemptionDay: null } as CampaignStats),
      })),
    };
  });

const idInput = z.object({ id: z.string().uuid(), studioId: z.string().uuid().optional() });

export const getCampaignDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin, studioId } = await studioContext(context.userId, data.studioId);
    const { data: campaign, error } = await admin
      .from("campaigns")
      .select(CAMPAIGN_COLUMNS)
      .eq("id", data.id)
      .eq("studio_id", studioId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!campaign) throw new Error("Kampagne nicht gefunden");

    const { data: rows, error: bErr } = await admin
      .from("bookings")
      .select(
        "id, day, time, treatment, price_chf, discount_chf, client_id, clients:client_id (id, first_name, last_name)",
      )
      .eq("studio_id", studioId)
      .eq("campaign_id", data.id)
      .order("day", { ascending: false });
    if (bErr) throw new Error(bErr.message);
    const campaignBookings = rows ?? [];

    // Neukundinnen + Wiederkehrquote: alle Buchungen der beteiligten Kundinnen.
    const clientIds = Array.from(
      new Set(campaignBookings.map((b) => b.client_id as string | null).filter(Boolean) as string[]),
    );
    let newClients = 0;
    let returned = 0;
    if (clientIds.length > 0) {
      const { data: all } = await admin
        .from("bookings")
        .select("client_id, day, campaign_id")
        .eq("studio_id", studioId)
        .in("client_id", clientIds)
        .order("day", { ascending: true });
      const byClient = new Map<string, { day: string; campaign_id: string | null }[]>();
      for (const b of all ?? []) {
        const cid = b.client_id as string;
        const list = byClient.get(cid) ?? [];
        list.push({ day: b.day as string, campaign_id: b.campaign_id as string | null });
        byClient.set(cid, list);
      }
      for (const cid of clientIds) {
        const list = byClient.get(cid) ?? [];
        const first = list[0];
        if (!first || first.campaign_id !== data.id) continue; // hatte vorher schon einen Termin
        newClients += 1;
        const firstDate = new Date(`${first.day}T00:00:00Z`).getTime();
        const within = list.slice(1).some((b) => {
          const d = new Date(`${b.day}T00:00:00Z`).getTime();
          return d > firstDate && d - firstDate <= 90 * 24 * 3600 * 1000;
        });
        if (within) returned += 1;
      }
    }

    const revenue = campaignBookings.reduce((s, b) => s + Number(b.price_chf ?? 0), 0);
    const discountCost = campaignBookings.reduce((s, b) => s + Number(b.discount_chf ?? 0), 0);
    const budget = campaign.budget_chf === null ? 0 : Number(campaign.budget_chf);

    return {
      campaign,
      bookings: campaignBookings,
      analytics: {
        redemptions: campaignBookings.length,
        remaining:
          campaign.max_redemptions === null
            ? null
            : Math.max(0, Number(campaign.max_redemptions) - Number(campaign.redemptions_used)),
        revenue,
        discountCost,
        contribution: revenue - discountCost - budget,
        newClients,
        returnRate: newClients === 0 ? null : returned / newClients,
      },
    };
  });

const saveInput = z.object({
  id: z.string().uuid().optional(),
  studioId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  goal: z.string().trim().min(1).max(40),
  treatmentId: z.string().uuid().nullish(),
  durationMinutes: z.number().int().min(15).max(300).nullish(),
  discountType: z.enum(["prozent", "betrag"]),
  discountValue: z.number().min(0).max(100000),
  maxRedemptions: z.number().int().min(1).max(100000).nullish(),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  appliesTo: z.enum(["alle", "neukunden"]),
  channels: z.array(z.string().trim().max(40)).max(20).default([]),
  radiusKm: z.number().int().min(0).max(500).nullish(),
  ageMin: z.number().int().min(0).max(120).nullish(),
  ageMax: z.number().int().min(0).max(120).nullish(),
  budgetChf: z.number().min(0).max(1000000).nullish(),
  code: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Z0-9]+$/, "Nur Grossbuchstaben und Ziffern"),
  status: z.enum(["entwurf", "aktiv", "pausiert", "beendet"]),
});

export const saveCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin, studioId } = await studioContext(context.userId, data.studioId);
    if (data.validTo < data.validFrom) throw new Error("Enddatum liegt vor dem Startdatum.");

    // Code je Studio eindeutig.
    const dupe = await admin
      .from("campaigns")
      .select("id")
      .eq("studio_id", studioId)
      .ilike("code", data.code)
      .maybeSingle();
    if (dupe.data && dupe.data.id !== data.id) {
      throw new Error("Dieser Gutscheincode wird bereits verwendet.");
    }

    if (data.treatmentId) {
      const tr = await admin
        .from("treatments")
        .select("id")
        .eq("id", data.treatmentId)
        .eq("studio_id", studioId)
        .maybeSingle();
      if (!tr.data) throw new Error("Unbekannte Behandlung.");
    }

    const payload = {
      studio_id: studioId,
      title: data.title,
      goal: data.goal,
      treatment_id: data.treatmentId ?? null,
      duration_minutes: data.durationMinutes ?? null,
      discount_type: data.discountType,
      discount_value: data.discountValue,
      max_redemptions: data.maxRedemptions ?? null,
      valid_from: data.validFrom,
      valid_to: data.validTo,
      applies_to: data.appliesTo,
      channels: data.channels,
      radius_km: data.radiusKm ?? null,
      age_min: data.ageMin ?? null,
      age_max: data.ageMax ?? null,
      budget_chf: data.budgetChf ?? null,
      code: data.code,
      status: data.status,
    };

    if (!data.id) {
      const { data: row, error } = await admin
        .from("campaigns")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true as const, id: row.id as string };
    }

    const existing = await admin
      .from("campaigns")
      .select("id, redemptions_used, discount_type, discount_value, treatment_id, duration_minutes, code")
      .eq("id", data.id)
      .eq("studio_id", studioId)
      .maybeSingle();
    if (!existing.data) throw new Error("Kampagne nicht gefunden");

    // Bereits eingelöst: Rabatt, Behandlung und Code sind eingefroren, damit
    // gespeicherte Buchungen weiterhin zur Kampagne passen.
    if (Number(existing.data.redemptions_used) > 0) {
      payload.discount_type = existing.data.discount_type as typeof payload.discount_type;
      payload.discount_value = Number(existing.data.discount_value);
      payload.treatment_id = existing.data.treatment_id as string | null;
      payload.duration_minutes = existing.data.duration_minutes as number | null;
      payload.code = existing.data.code as string;
    }

    const { error } = await admin
      .from("campaigns")
      .update(payload)
      .eq("id", data.id)
      .eq("studio_id", studioId);
    if (error) throw new Error(error.message);
    return { ok: true as const, id: data.id };
  });

const statusInput = z.object({
  id: z.string().uuid(),
  studioId: z.string().uuid().optional(),
  status: z.enum(["entwurf", "aktiv", "pausiert", "beendet"]),
});

export const setCampaignStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => statusInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin, studioId } = await studioContext(context.userId, data.studioId);
    const { error } = await admin
      .from("campaigns")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("studio_id", studioId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const duplicateCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin, studioId } = await studioContext(context.userId, data.studioId);
    const { data: src, error } = await admin
      .from("campaigns")
      .select(CAMPAIGN_COLUMNS)
      .eq("id", data.id)
      .eq("studio_id", studioId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!src) throw new Error("Kampagne nicht gefunden");

    const { data: taken } = await admin.from("campaigns").select("code").eq("studio_id", studioId);
    const used = new Set((taken ?? []).map((c) => String(c.code).toUpperCase()));
    const base = String(src.code).toUpperCase().slice(0, 26);
    let code = `${base}2`;
    let n = 2;
    while (used.has(code)) {
      n += 1;
      code = `${base}${n}`;
    }

    const { data: row, error: insErr } = await admin
      .from("campaigns")
      .insert({
        studio_id: studioId,
        title: `${src.title} (Kopie)`,
        goal: src.goal,
        treatment_id: src.treatment_id,
        duration_minutes: src.duration_minutes,
        discount_type: src.discount_type,
        discount_value: src.discount_value,
        max_redemptions: src.max_redemptions,
        valid_from: src.valid_from,
        valid_to: src.valid_to,
        applies_to: src.applies_to,
        channels: src.channels,
        radius_km: src.radius_km,
        age_min: src.age_min,
        age_max: src.age_max,
        budget_chf: src.budget_chf,
        code,
        status: "entwurf",
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    return { ok: true as const, id: row.id as string };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => idInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin, studioId } = await studioContext(context.userId, data.studioId);
    const { data: row } = await admin
      .from("campaigns")
      .select("redemptions_used")
      .eq("id", data.id)
      .eq("studio_id", studioId)
      .maybeSingle();
    if (!row) throw new Error("Kampagne nicht gefunden");
    if (Number(row.redemptions_used) > 0) {
      throw new Error("Kampagne mit Einlösungen kann nicht gelöscht werden.");
    }
    const { error } = await admin
      .from("campaigns")
      .delete()
      .eq("id", data.id)
      .eq("studio_id", studioId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
