// Kampagnen-/Gutschein-Logik. Server-only.
import type { DbAdmin, TreatmentRecord } from "@/lib/studio.server";
import { treatmentOptions } from "@/lib/studio.server";

export type CampaignRow = {
  id: string;
  studio_id: string;
  title: string;
  treatment_id: string | null;
  duration_minutes: number | null;
  code: string;
  discount_type: string;
  discount_value: number;
  max_redemptions: number | null;
  redemptions_used: number;
  valid_from: string;
  valid_to: string;
  applies_to: string;
  status: string;
};

export type CampaignReason =
  | "unbekannt"
  | "abgelaufen"
  | "ausgebucht"
  | "andere_behandlung"
  | "nur_neukunden";

export type CampaignEvaluation =
  | { valid: false; reason: CampaignReason }
  | {
      valid: true;
      campaign: CampaignRow;
      originalPrice: number;
      finalPrice: number;
      discount: number;
      remaining: number | null;
    };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function roundChf(value: number): number {
  return Math.round(value * 20) / 20; // auf 5 Rappen
}

export function computeDiscount(
  originalPrice: number,
  discountType: string,
  discountValue: number,
): { discount: number; finalPrice: number } {
  const raw =
    discountType === "betrag" ? Number(discountValue) : (originalPrice * Number(discountValue)) / 100;
  const discount = roundChf(Math.max(0, Math.min(originalPrice, raw)));
  return { discount, finalPrice: roundChf(Math.max(0, originalPrice - discount)) };
}

export async function findCampaignByCode(
  admin: DbAdmin,
  studioId: string,
  code: string,
): Promise<CampaignRow | null> {
  const { data, error } = await admin
    .from("campaigns")
    .select(
      "id, studio_id, title, treatment_id, duration_minutes, code, discount_type, discount_value, max_redemptions, redemptions_used, valid_from, valid_to, applies_to, status",
    )
    .eq("studio_id", studioId)
    .ilike("code", code.trim())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as CampaignRow | null) ?? null;
}

// Prüft Gültigkeit + passende Behandlung und berechnet den Preis serverseitig.
export function evaluateCampaign(
  campaign: CampaignRow | null,
  treatment: TreatmentRecord | null,
  durationMinutes: number,
): CampaignEvaluation {
  if (!campaign) return { valid: false, reason: "unbekannt" };
  if (campaign.status !== "aktiv") {
    return { valid: false, reason: campaign.status === "beendet" ? "ausgebucht" : "unbekannt" };
  }
  const today = todayIso();
  if (today < campaign.valid_from || today > campaign.valid_to) {
    return { valid: false, reason: "abgelaufen" };
  }
  if (
    campaign.max_redemptions !== null &&
    campaign.redemptions_used >= campaign.max_redemptions
  ) {
    return { valid: false, reason: "ausgebucht" };
  }
  if (!treatment) return { valid: false, reason: "andere_behandlung" };
  if (campaign.treatment_id && campaign.treatment_id !== treatment.id) {
    return { valid: false, reason: "andere_behandlung" };
  }
  if (campaign.duration_minutes && campaign.duration_minutes !== durationMinutes) {
    return { valid: false, reason: "andere_behandlung" };
  }
  const option = treatmentOptions(treatment).find((o) => o.minutes === durationMinutes);
  if (!option) return { valid: false, reason: "andere_behandlung" };

  const { discount, finalPrice } = computeDiscount(
    option.price,
    campaign.discount_type,
    Number(campaign.discount_value),
  );
  const remaining =
    campaign.max_redemptions === null
      ? null
      : Math.max(0, campaign.max_redemptions - campaign.redemptions_used);
  return { valid: true, campaign, originalPrice: option.price, finalPrice, discount, remaining };
}

// Bereits Kundin in diesem Studio? (für applies_to = 'neukunden')
export async function hasExistingBooking(
  admin: DbAdmin,
  studioId: string,
  phone: string,
  email: string,
): Promise<boolean> {
  // Zwei getrennte Abfragen statt .or(), damit Eingaben nicht in die
  // Filtersyntax hineinwirken können.
  const [byPhone, byEmail] = await Promise.all([
    admin.from("clients").select("id").eq("studio_id", studioId).eq("phone", phone),
    admin.from("clients").select("id").eq("studio_id", studioId).eq("email", email),
  ]);
  if (byPhone.error) throw new Error(byPhone.error.message);
  if (byEmail.error) throw new Error(byEmail.error.message);
  const ids = Array.from(
    new Set([...(byPhone.data ?? []), ...(byEmail.data ?? [])].map((c) => c.id as string)),
  );
  if (ids.length === 0) return false;
  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("studio_id", studioId)
    .in("client_id", ids);
  return (count ?? 0) > 0;
}

// Atomar einen Platz belegen. null = kein Platz mehr frei.
export async function redeemCampaign(admin: DbAdmin, campaignId: string): Promise<number | null> {
  const { data, error } = await admin.rpc("redeem_campaign", { _campaign_id: campaignId });
  if (error) throw new Error(error.message);
  return (data as number | null) ?? null;
}

export async function releaseCampaign(admin: DbAdmin, campaignId: string): Promise<number | null> {
  const { data, error } = await admin.rpc("release_campaign", { _campaign_id: campaignId });
  if (error) throw new Error(error.message);
  return (data as number | null) ?? null;
}