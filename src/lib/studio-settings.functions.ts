import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const scope = z.object({ studioId: z.string().uuid().optional() });

const masterSchema = scope.extend({
  name: z.string().trim().min(1).max(120),
  tagline: z.string().trim().max(200).nullable(),
  street: z.string().trim().max(160).nullable(),
  zip: z.string().trim().max(20).nullable(),
  city: z.string().trim().max(120).nullable(),
  phone: z.string().trim().max(60).nullable(),
  email: z.string().trim().max(160).nullable(),
  mapsUrl: z.string().trim().max(500).nullable(),
  parkingNote: z.string().trim().max(1000).nullable(),
  paymentMethods: z.array(z.string().trim().min(1).max(40)).max(12),
});

const windowSchema = z
  .object({ open: z.number().int().min(0).max(1440), close: z.number().int().min(0).max(1440) })
  .nullable();

const hoursSchema = scope.extend({
  openingHours: z.record(z.string().regex(/^[0-6]$/), windowSchema),
  bufferMinutes: z.number().int().min(0).max(120),
  slotStepMinutes: z.union([z.literal(15), z.literal(30)]),
});

const treatmentSchema = scope.extend({
  id: z.string().uuid().optional(),
  key: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Nur Kleinbuchstaben, Zahlen und Bindestriche."),
  label: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable(),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
  options: z
    .array(
      z.object({
        minutes: z.number().int().min(15).max(300),
        price: z.number().min(0).max(10000),
      }),
    )
    .min(1)
    .max(8),
});

const linksSchema = scope.extend({
  googleCalendarId: z.string().trim().max(200).nullable(),
  whatsappPhoneNumberId: z.string().trim().max(60).nullable(),
});

function clean<T extends string | null>(value: T): T | null {
  if (value === null) return null;
  return (value.trim() === "" ? null : value) as T;
}

// Everything the settings page needs, including inactive treatments.
export const getStudioSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => scope.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { resolveStudioContext, getStudioById, treatmentOptions, studioFeatures, studioPaymentMethods } =
      await import("@/lib/studio.server");
    const { serviceAccountEmail } = await import("@/lib/google-calendar.server");
    const { supabaseAdmin, studioId, isPlatformAdmin } = await resolveStudioContext(
      context.userId,
      data.studioId ?? null,
    );
    const studio = await getStudioById(studioId);
    if (!studio) throw new Error("Studio not found");

    const { data: rows, error } = await supabaseAdmin
      .from("treatments")
      .select("*")
      .eq("studio_id", studioId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: bookings } = await supabaseAdmin
      .from("bookings")
      .select("treatment")
      .eq("studio_id", studioId);
    const usedKeys = Array.from(new Set((bookings ?? []).map((b) => b.treatment as string)));

    const openingHours: Record<string, { open: number; close: number } | null> = {};
    const raw = (studio.opening_hours ?? {}) as Record<string, unknown>;
    for (let wd = 0; wd < 7; wd++) {
      const entry = raw[String(wd)] as { open?: number; close?: number } | null | undefined;
      openingHours[String(wd)] =
        entry && Number.isFinite(Number(entry.open)) && Number.isFinite(Number(entry.close))
          ? { open: Number(entry.open), close: Number(entry.close) }
          : null;
    }

    return {
      studioId,
      isPlatformAdmin,
      serviceAccountEmail: serviceAccountEmail(),
      master: {
        slug: studio.slug,
        name: studio.name,
        tagline: studio.tagline,
        street: studio.street,
        zip: studio.zip,
        city: studio.city,
        phone: studio.phone,
        email: studio.email,
        mapsUrl: studio.maps_url,
        parkingNote: studio.parking_note,
        paymentMethods: studioPaymentMethods(studio),
        features: studioFeatures(studio),
        timezone: studio.timezone,
      },
      hours: {
        openingHours,
        bufferMinutes: studio.buffer_minutes,
        slotStepMinutes: studio.slot_step_minutes,
      },
      links: {
        googleCalendarId: studio.google_calendar_id,
        whatsappPhoneNumberId: studio.whatsapp_phone_number_id,
      },
      treatments: (rows ?? []).map((t) => ({
        id: t.id as string,
        key: t.key as string,
        label: t.label as string,
        description: (t.description as string | null) ?? null,
        active: Boolean(t.active),
        sortOrder: Number(t.sort_order),
        options: treatmentOptions(t as never),
        inUse: usedKeys.includes(t.key as string),
      })),
    };
  });

export const updateStudioMaster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => masterSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { resolveStudioContext } = await import("@/lib/studio.server");
    const { supabaseAdmin, studioId } = await resolveStudioContext(
      context.userId,
      data.studioId ?? null,
    );
    const { data: row, error } = await supabaseAdmin
      .from("studios")
      .update({
        name: data.name,
        tagline: clean(data.tagline),
        street: clean(data.street),
        zip: clean(data.zip),
        city: clean(data.city),
        phone: clean(data.phone),
        email: clean(data.email),
        maps_url: clean(data.mapsUrl),
        parking_note: clean(data.parkingNote),
        payment_methods: data.paymentMethods,
      } as never)
      .eq("id", studioId)
      .select("slug")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, slug: (row as { slug: string } | null)?.slug ?? null };
  });

export const updateOpeningHours = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => hoursSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { resolveStudioContext } = await import("@/lib/studio.server");
    const { supabaseAdmin, studioId } = await resolveStudioContext(
      context.userId,
      data.studioId ?? null,
    );
    const hours: Record<string, { open: number; close: number } | null> = {};
    for (let wd = 0; wd < 7; wd++) {
      const win = data.openingHours[String(wd)] ?? null;
      if (win && win.close <= win.open) {
        throw new Error("Die Bis-Zeit muss nach der Von-Zeit liegen.");
      }
      hours[String(wd)] = win;
    }
    const { data: row, error } = await supabaseAdmin
      .from("studios")
      .update({
        opening_hours: hours,
        buffer_minutes: data.bufferMinutes,
        slot_step_minutes: data.slotStepMinutes,
      } as never)
      .eq("id", studioId)
      .select("slug")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, slug: (row as { slug: string } | null)?.slug ?? null };
  });

export const saveTreatment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => treatmentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { resolveStudioContext } = await import("@/lib/studio.server");
    const { supabaseAdmin, studioId } = await resolveStudioContext(
      context.userId,
      data.studioId ?? null,
    );
    // Kennung normalisieren und Kollisionen im Studio auflösen.
    const { slugify, uniqueSlug } = await import("@/lib/slugify");
    const { data: existingKeys } = await supabaseAdmin
      .from("treatments")
      .select("id, key")
      .eq("studio_id", studioId);
    const taken = ((existingKeys ?? []) as { id: string; key: string }[])
      .filter((r) => r.id !== data.id)
      .map((r) => r.key);
    let resolvedKey = uniqueSlug(slugify(data.key) || slugify(data.label), taken);
    if (data.id) {
      const current = ((existingKeys ?? []) as { id: string; key: string }[]).find(
        (r) => r.id === data.id,
      );
      if (current && current.key !== resolvedKey) {
        // Kennung sperren, sobald Termine damit gebucht wurden.
        const { count } = await supabaseAdmin
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("studio_id", studioId)
          .eq("treatment", current.key);
        if ((count ?? 0) > 0) resolvedKey = current.key;
      }
    }
    const payload = {
      studio_id: studioId,
      key: resolvedKey,
      label: data.label,
      description: clean(data.description),
      active: data.active,
      sort_order: data.sortOrder,
      options: data.options,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("treatments")
        .update(payload as never)
        .eq("id", data.id)
        .eq("studio_id", studioId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("treatments").insert(payload as never);
      if (error) throw new Error(error.message);
    }
    const { data: studio } = await supabaseAdmin
      .from("studios")
      .select("slug")
      .eq("id", studioId)
      .maybeSingle();
    return { ok: true as const, slug: (studio as { slug: string } | null)?.slug ?? null };
  });

export const reorderTreatments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    scope.extend({ ids: z.array(z.string().uuid()).max(50) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { resolveStudioContext } = await import("@/lib/studio.server");
    const { supabaseAdmin, studioId } = await resolveStudioContext(
      context.userId,
      data.studioId ?? null,
    );
    for (let i = 0; i < data.ids.length; i++) {
      const { error } = await supabaseAdmin
        .from("treatments")
        .update({ sort_order: i } as never)
        .eq("id", data.ids[i])
        .eq("studio_id", studioId);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

// Deleting is only allowed while no booking references the treatment key.
export const deleteTreatment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => scope.extend({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { resolveStudioContext } = await import("@/lib/studio.server");
    const { supabaseAdmin, studioId } = await resolveStudioContext(
      context.userId,
      data.studioId ?? null,
    );
    const { data: row } = await supabaseAdmin
      .from("treatments")
      .select("key")
      .eq("id", data.id)
      .eq("studio_id", studioId)
      .maybeSingle();
    if (!row) throw new Error("Behandlung nicht gefunden.");
    const { count } = await supabaseAdmin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("studio_id", studioId)
      .eq("treatment", (row as { key: string }).key);
    if ((count ?? 0) > 0) {
      return { ok: false as const, reason: "in_use" as const, bookings: count ?? 0 };
    }
    const { error } = await supabaseAdmin
      .from("treatments")
      .delete()
      .eq("id", data.id)
      .eq("studio_id", studioId);
    if (error) throw new Error(error.message);
    return { ok: true as const, reason: null, bookings: 0 };
  });

// Platform admins only: calendar + WhatsApp wiring.
export const updateStudioLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => linksSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { resolveStudioContext } = await import("@/lib/studio.server");
    const { supabaseAdmin, studioId, isPlatformAdmin } = await resolveStudioContext(
      context.userId,
      data.studioId ?? null,
    );
    if (!isPlatformAdmin) throw new Error("Forbidden");
    const { error } = await supabaseAdmin
      .from("studios")
      .update({
        google_calendar_id: clean(data.googleCalendarId),
        whatsapp_phone_number_id: clean(data.whatsappPhoneNumberId),
      } as never)
      .eq("id", studioId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
