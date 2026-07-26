import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Slugs that would collide with existing top-level routes.
export const RESERVED_SLUGS = [
  "admin",
  "auth",
  "datenschutz",
  "sitemap",
  "sitemap.xml",
  "api",
  "home-office",
  "kontakt",
  "assets",
  "robots.txt",
];

const slugField = z
  .string()
  .trim()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9-]+$/, "Nur Kleinbuchstaben, Zahlen und Bindestriche.")
  .refine((s) => !RESERVED_SLUGS.includes(s), "Diese Adresse ist reserviert.");

const createSchema = z.object({
  slug: slugField,
  name: z.string().trim().min(1).max(120),
  street: z.string().trim().max(160).optional(),
  zip: z.string().trim().max(20).optional(),
  city: z.string().trim().max(120).optional(),
  timezone: z.string().trim().min(1).max(60).default("Europe/Zurich"),
  bufferMinutes: z.number().int().min(0).max(120).default(15),
  slotStepMinutes: z.union([z.literal(15), z.literal(30)]).default(15),
});

const DEFAULT_HOURS = {
  "0": null,
  "1": { open: 540, close: 1200 },
  "2": { open: 540, close: 1200 },
  "3": { open: 540, close: 1200 },
  "4": { open: 540, close: 1200 },
  "5": { open: 540, close: 1200 },
  "6": { open: 600, close: 1080 },
};

const DEFAULT_TREATMENTS = [
  {
    key: "deep-release",
    label: "Deep Release",
    description: null,
    sort_order: 0,
    options: [
      { minutes: 60, price: 100 },
      { minutes: 90, price: 150 },
    ],
  },
  {
    key: "thai-stretch",
    label: "Traditional Thai Stretch",
    description: null,
    sort_order: 1,
    options: [
      { minutes: 60, price: 110 },
      { minutes: 90, price: 160 },
    ],
  },
  {
    key: "sport",
    label: "Sport Massage",
    description: null,
    sort_order: 2,
    options: [
      { minutes: 60, price: 120 },
      { minutes: 90, price: 170 },
    ],
  },
];

async function requirePlatformAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
  return supabaseAdmin;
}

export const listAllStudios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await requirePlatformAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("studios")
      .select("id, slug, name, city, active, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const { data: members } = await supabaseAdmin
      .from("studio_members")
      .select("studio_id, user_id, role");
    return {
      studios: (data ?? []).map((s) => ({
        id: s.id as string,
        slug: s.slug as string,
        name: s.name as string,
        city: (s.city as string | null) ?? null,
        active: Boolean(s.active),
        members: (members ?? []).filter((m) => m.studio_id === s.id).length,
      })),
    };
  });

export const createStudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await requirePlatformAdmin(context.userId);
    const { data: existing } = await supabaseAdmin
      .from("studios")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (existing) throw new Error("Diese Studio-Adresse ist bereits vergeben.");

    const { data: studio, error } = await supabaseAdmin
      .from("studios")
      .insert({
        slug: data.slug,
        name: data.name,
        street: data.street || null,
        zip: data.zip || null,
        city: data.city || null,
        country: "CH",
        timezone: data.timezone,
        buffer_minutes: data.bufferMinutes,
        slot_step_minutes: data.slotStepMinutes,
        opening_hours: DEFAULT_HOURS,
        active: true,
      } as never)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    const studioId = (studio as { id: string } | null)?.id;
    if (!studioId) throw new Error("Studio konnte nicht angelegt werden.");

    const { error: trErr } = await supabaseAdmin
      .from("treatments")
      .insert(DEFAULT_TREATMENTS.map((t) => ({ ...t, studio_id: studioId })) as never);
    if (trErr) throw new Error(trErr.message);
    return { ok: true as const, studioId };
  });

export const setStudioActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ studioId: z.string().uuid(), active: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await requirePlatformAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("studios")
      .update({ active: data.active } as never)
      .eq("id", data.studioId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Adds an EXISTING user account (looked up by email) as a studio member.
export const addStudioMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        studioId: z.string().uuid(),
        email: z.string().trim().email().max(200),
        role: z.enum(["owner", "member"]).default("owner"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await requirePlatformAdmin(context.userId);
    const target = data.email.toLowerCase();
    let userId: string | null = null;
    for (let page = 1; page <= 10 && !userId; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw new Error(error.message);
      const found = list.users.find((u) => (u.email ?? "").toLowerCase() === target);
      if (found) userId = found.id;
      if (list.users.length < 200) break;
    }
    if (!userId) {
      return { ok: false as const, reason: "no_user" as const };
    }
    const { data: existing } = await supabaseAdmin
      .from("studio_members")
      .select("id")
      .eq("studio_id", data.studioId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return { ok: true as const, reason: null };
    const { error } = await supabaseAdmin
      .from("studio_members")
      .insert({ studio_id: data.studioId, user_id: userId, role: data.role } as never);
    if (error) throw new Error(error.message);
    return { ok: true as const, reason: null };
  });
