// Studio (tenant) resolution helpers. Server-only.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type StudioRecord = Database["public"]["Tables"]["studios"]["Row"];
export type TreatmentRecord = Database["public"]["Tables"]["treatments"]["Row"];
export type DbAdmin = SupabaseClient<Database>;

export type OpeningWindow = { open: number; close: number } | null;
export type TreatmentOption = { minutes: number; price: number };
export type StudioFeature = { title: string; text: string };

export const STUDIO_MEDIA_BUCKET = "studio-media";
export const STUDIO_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const STUDIO_MEDIA_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
] as const;

export const DEFAULT_STUDIO_SLUG = "tpl-zuzwil";

async function admin(): Promise<DbAdmin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as DbAdmin;
}

export type StudioContext = {
  supabaseAdmin: DbAdmin;
  studioId: string;
  isPlatformAdmin: boolean;
};

// Resolves the studio the signed-in user acts in. Never trusts a client-sent
// studioId without verifying membership (platform admins may pass any studio).
export async function resolveStudioContext(
  userId: string,
  requestedStudioId?: string | null,
): Promise<StudioContext> {
  const supabaseAdmin = await admin();

  const [{ data: platform }, { data: memberships, error }] = await Promise.all([
    supabaseAdmin.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle(),
    supabaseAdmin
      .from("studio_members")
      .select("studio_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);
  if (error) throw new Error(error.message);

  const isPlatformAdmin = Boolean(platform);
  const memberStudioIds = (memberships ?? []).map((m) => m.studio_id as string);

  if (requestedStudioId) {
    if (memberStudioIds.includes(requestedStudioId)) {
      return { supabaseAdmin, studioId: requestedStudioId, isPlatformAdmin };
    }
    if (isPlatformAdmin) {
      const { data: exists } = await supabaseAdmin
        .from("studios")
        .select("id")
        .eq("id", requestedStudioId)
        .maybeSingle();
      if (exists) {
        return { supabaseAdmin, studioId: requestedStudioId, isPlatformAdmin };
      }
    }
    throw new Error("Forbidden");
  }

  if (memberStudioIds.length > 0) {
    return { supabaseAdmin, studioId: memberStudioIds[0], isPlatformAdmin };
  }

  if (isPlatformAdmin) {
    const { data: first } = await supabaseAdmin
      .from("studios")
      .select("id")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (first) return { supabaseAdmin, studioId: first.id as string, isPlatformAdmin };
  }

  throw new Error("Forbidden");
}

export async function getStudioById(studioId: string): Promise<StudioRecord | null> {
  const supabaseAdmin = await admin();
  const { data, error } = await supabaseAdmin
    .from("studios")
    .select("*")
    .eq("id", studioId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StudioRecord | null) ?? null;
}

export async function getStudioBySlug(slug: string): Promise<StudioRecord | null> {
  const supabaseAdmin = await admin();
  const { data, error } = await supabaseAdmin
    .from("studios")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as StudioRecord | null) ?? null;
}

export async function listActiveStudios(): Promise<StudioRecord[]> {
  const supabaseAdmin = await admin();
  const { data, error } = await supabaseAdmin
    .from("studios")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as StudioRecord[];
}

export async function requireStudioBySlug(slug: string): Promise<StudioRecord> {
  const studio = await getStudioBySlug(slug);
  if (!studio) throw new Error("Unknown studio");
  return studio;
}

// WhatsApp: map the receiving phone number id to a studio. Falls back to the
// platform default studio while studios.whatsapp_phone_number_id is unset and
// the incoming id matches the platform-wide env configuration.
export async function getStudioByWhatsappPhoneNumberId(
  phoneNumberId: string,
): Promise<StudioRecord | null> {
  const supabaseAdmin = await admin();
  const { data, error } = await supabaseAdmin
    .from("studios")
    .select("*")
    .eq("whatsapp_phone_number_id", phoneNumberId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as StudioRecord;

  const envId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (envId && envId === phoneNumberId) {
    return getStudioBySlug(DEFAULT_STUDIO_SLUG);
  }
  return null;
}

export async function listTreatments(studioId: string): Promise<TreatmentRecord[]> {
  const supabaseAdmin = await admin();
  const { data, error } = await supabaseAdmin
    .from("treatments")
    .select("*")
    .eq("studio_id", studioId)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TreatmentRecord[];
}

export function treatmentOptions(row: TreatmentRecord): TreatmentOption[] {
  const raw = row.options;
  if (!Array.isArray(raw)) return [];
  const out: TreatmentOption[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    const minutes = Number(rec.minutes);
    const price = Number(rec.price);
    if (Number.isFinite(minutes) && Number.isFinite(price)) out.push({ minutes, price });
  }
  return out;
}

// opening_hours is keyed by weekday number as string, 0 = Sunday.
export function openingWindowFor(studio: StudioRecord, weekday: number): OpeningWindow {
  const hours = studio.opening_hours;
  if (!hours || typeof hours !== "object" || Array.isArray(hours)) return null;
  const entry = (hours as Record<string, unknown>)[String(weekday)];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const rec = entry as Record<string, unknown>;
  const open = Number(rec.open);
  const close = Number(rec.close);
  if (!Number.isFinite(open) || !Number.isFinite(close) || close <= open) return null;
  return { open, close };
}

export function studioCalendarId(studio: StudioRecord | null): string | undefined {
  return studio?.google_calendar_id ?? undefined;
}

// ---------- content helpers ----------

export function studioFeatures(studio: StudioRecord): StudioFeature[] {
  const raw = (studio as unknown as { features?: unknown }).features;
  if (!Array.isArray(raw)) return [];
  const out: StudioFeature[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    const title = typeof rec.title === "string" ? rec.title : "";
    const text = typeof rec.text === "string" ? rec.text : "";
    if (title) out.push({ title, text });
  }
  return out;
}

export function studioPaymentMethods(studio: StudioRecord): string[] {
  const raw = (studio as unknown as { payment_methods?: unknown }).payment_methods;
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

// studio-media is a private bucket; public pages get short-lived signed URLs.
export async function studioMediaUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const supabaseAdmin = await admin();
  const { data, error } = await supabaseAdmin.storage
    .from(STUDIO_MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}