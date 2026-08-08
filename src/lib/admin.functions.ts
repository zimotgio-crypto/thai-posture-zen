import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getOrCreateClient } from "@/lib/client-records";

// Resolves the studio the caller may act in. Never trusts a client-sent id.
async function studioContext(userId: string, studioId?: string | null) {
  const { resolveStudioContext } = await import("@/lib/studio.server");
  return resolveStudioContext(userId, studioId ?? null);
}

// PostgREST parses commas and parentheses inside .or() as filter syntax.
// Double-quoting the pattern keeps a search term from injecting conditions.
function postgrestLikePattern(term: string): string {
  return `"%${term.replace(/[\\"]/g, (c) => `\\${c}`)}%"`;
}

async function studioCalendar(studioId: string): Promise<string | null> {
  const { getStudioById } = await import("@/lib/studio.server");
  const studio = await getStudioById(studioId);
  return studio?.google_calendar_id ?? null;
}

// Master data, opening hours and treatments of the caller's studio.
export const getCurrentStudio = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => studioScopeInput.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { studioId } = await studioContext(context.userId, data.studioId);
    const { getStudioById, listTreatments, treatmentOptions } = await import("@/lib/studio.server");
    const studio = await getStudioById(studioId);
    if (!studio) throw new Error("Studio not found");
    const treatments = await listTreatments(studioId);
    return {
      studio: {
        id: studio.id,
        slug: studio.slug,
        name: studio.name,
        street: studio.street,
        zip: studio.zip,
        city: studio.city,
        country: studio.country,
        phone: studio.phone,
        email: studio.email,
        timezone: studio.timezone,
        bufferMinutes: studio.buffer_minutes,
        slotStepMinutes: studio.slot_step_minutes,
        openingHours: studio.opening_hours,
        googleCalendarConfigured: Boolean(studio.google_calendar_id),
      },
      treatments: treatments.map((t) => ({
        id: t.id,
        key: t.key,
        label: t.label,
        description: t.description,
        sortOrder: t.sort_order,
        options: treatmentOptions(t),
      })),
    };
  });

const studioScopeInput = z.object({ studioId: z.string().uuid().optional() });

// Studios the caller may work in. Platform admins see every active studio.
export const listMyStudios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { listActiveStudios } = await import("@/lib/studio.server");
    const [{ data: platform }, { data: memberships }] = await Promise.all([
      supabaseAdmin
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", context.userId)
        .maybeSingle(),
      supabaseAdmin
        .from("studio_members")
        .select("studio_id, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: true }),
    ]);
    const isPlatformAdmin = Boolean(platform);
    const active = await listActiveStudios();
    const memberIds = new Set((memberships ?? []).map((m) => m.studio_id as string));
    const visible = isPlatformAdmin ? active : active.filter((s) => memberIds.has(s.id));
    return {
      isPlatformAdmin,
      studios: visible.map((s) => ({ id: s.id, name: s.name, city: s.city, slug: s.slug })),
    };
  });

const rangeInput = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  studioId: z.string().uuid().optional(),
});

export const listBookingsInRange = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => rangeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin, studioId } = await studioContext(context.userId, data.studioId);
    const { data: rows, error } = await admin
      .from("bookings")
      .select(
        "id, day, time, treatment, duration_minutes, silent, source, notes, client_id, price_chf, clients:client_id (id, first_name, last_name, phone, email, street, zip, city)",
      )
      .eq("studio_id", studioId)
      .gte("day", data.from)
      .lte("day", data.to)
      .order("day", { ascending: true })
      .order("time", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const addBookingInput = z.object({
  studioId: z.string().uuid().optional(),
  treatment: z.string().min(1).max(100),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().int().min(15).max(240).default(60),
  silent: z.boolean().default(false),
  block: z.boolean().default(false),
  clientId: z.string().uuid().nullish(),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(60).optional(),
  email: z.string().trim().email().max(200).optional(),
  street: z.string().trim().max(200).optional(),
  zip: z.string().trim().max(20).optional(),
  city: z.string().trim().max(120).optional(),
});

export const addBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => addBookingInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin, studioId } = await studioContext(context.userId, data.studioId);
    const { getStudioById, assertStudioOwned } = await import("@/lib/studio.server");
    const studio = await getStudioById(studioId);
    const { createGoogleEvent } = await import("@/lib/google-calendar.server");
    let clientId: string | null = data.clientId ?? null;
    let clientName = "";
    let clientPhone: string | null = null;
    if (data.block) {
      clientId = null;
    } else if (clientId) {
      await assertStudioOwned(admin, "clients", clientId, studioId);
    } else {
      if (
        !data.email ||
        !data.firstName ||
        !data.lastName ||
        !data.phone ||
        !data.street ||
        !data.zip ||
        !data.city
      ) {
        throw new Error("Missing client details");
      }
      const client = await getOrCreateClient(
        admin,
        {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          street: data.street,
          zip: data.zip,
          city: data.city,
        },
        studioId,
      );
      clientId = client.id;
      clientName = `${data.firstName} ${data.lastName}`.trim();
      clientPhone = data.phone;
    }
    if (clientId && !clientName) {
      const { data: c } = await admin
        .from("clients")
        .select("first_name, last_name, phone")
        .eq("id", clientId)
        .eq("studio_id", studioId)
        .maybeSingle();
      if (c) {
        clientName = `${c.first_name} ${c.last_name}`.trim();
        clientPhone = c.phone;
      }
    }
    const source = data.block ? ("block" as const) : ("manual" as const);
    // Preis zum Buchungszeitpunkt aus den Behandlungen dieses Studios festhalten.
    let priceChf: number | null = null;
    if (!data.block) {
      const { listTreatments, treatmentOptions } = await import("@/lib/studio.server");
      const treatments = await listTreatments(studioId);
      const match =
        treatments.find((t) => t.key === data.treatment) ??
        treatments.find((t) => t.label === data.treatment);
      priceChf =
        (match && treatmentOptions(match).find((o) => o.minutes === data.durationMinutes)?.price) ??
        null;
    }
    const insert = await admin
      .from("bookings")
      .insert({
        studio_id: studioId,
        client_id: clientId,
        treatment: data.block ? "Blockiert" : data.treatment,
        day: data.day,
        time: data.time,
        duration_minutes: data.durationMinutes,
        silent: data.silent,
        source,
        price_chf: priceChf,
      })
      .select("id")
      .single();
    if (insert.error) throw new Error(insert.error.message);
    try {
      const eventId = await createGoogleEvent({
        day: data.day,
        time: data.time,
        durationMinutes: data.durationMinutes,
        treatment: data.block ? "Blockiert" : data.treatment,
        clientName,
        clientPhone,
        source,
        calendarId: studio?.google_calendar_id ?? null,
        studioName: studio?.name ?? null,
      });
      if (eventId && insert.data?.id) {
        await admin.from("bookings").update({ google_event_id: eventId }).eq("id", insert.data.id);
      }
    } catch (err) {
      console.error("[addBooking] google mirror failed", err);
    }
    return { ok: true as const };
  });

const deleteBookingInput = z.object({
  id: z.string().uuid(),
  studioId: z.string().uuid().optional(),
});
export const deleteBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteBookingInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin, studioId } = await studioContext(context.userId, data.studioId);
    const { deleteGoogleEvent } = await import("@/lib/google-calendar.server");
    const { data: row } = await admin
      .from("bookings")
      .select("google_event_id, campaign_id")
      .eq("id", data.id)
      .eq("studio_id", studioId)
      .maybeSingle();
    if (row?.google_event_id) {
      try {
        await deleteGoogleEvent(row.google_event_id, await studioCalendar(studioId));
      } catch (err) {
        console.error("[deleteBooking] google delete failed", err);
      }
    }
    const { error } = await admin
      .from("bookings")
      .delete()
      .eq("id", data.id)
      .eq("studio_id", studioId);
    if (error) throw new Error(error.message);

    // Storno gibt den Kampagnenplatz wieder frei.
    if (row?.campaign_id) {
      try {
        const { releaseCampaign } = await import("@/lib/campaign.server");
        const used = await releaseCampaign(admin, row.campaign_id);
        const { data: campaign } = await admin
          .from("campaigns")
          .select("status, max_redemptions")
          .eq("id", row.campaign_id)
          .maybeSingle();
        if (
          campaign?.status === "beendet" &&
          (campaign.max_redemptions === null || (used ?? 0) < campaign.max_redemptions)
        ) {
          await admin.from("campaigns").update({ status: "aktiv" }).eq("id", row.campaign_id);
        }
      } catch (err) {
        console.error("[deleteBooking] campaign release failed", err);
      }
    }
    return { ok: true as const };
  });

export const getGoogleCalendarStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => studioScopeInput.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { studioId } = await studioContext(context.userId, data.studioId);
    const { isGoogleConfigured } = await import("@/lib/google-calendar.server");
    return { configured: isGoogleConfigured(await studioCalendar(studioId)) };
  });

export const listGoogleBusyInRange = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => rangeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { studioId } = await studioContext(context.userId, data.studioId);
    try {
      const { getGoogleBusyIntervalsInRange } = await import("@/lib/google-calendar.server");
      return await getGoogleBusyIntervalsInRange(
        data.from,
        data.to,
        await studioCalendar(studioId),
      );
    } catch (err) {
      console.error("[listGoogleBusyInRange] failed", err);
      return [];
    }
  });

const listClientsInput = z.object({
  q: z.string().trim().max(120).optional(),
  studioId: z.string().uuid().optional(),
});
export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => listClientsInput.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin, studioId } = await studioContext(context.userId, data.studioId);
    let query = admin
      .from("clients")
      .select("id, first_name, last_name, email, phone, street, zip, city, created_at")
      .eq("studio_id", studioId)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });
    if (data.q) {
      const like = postgrestLikePattern(data.q);
      query = query.or(
        `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like},street.ilike.${like},zip.ilike.${like},city.ilike.${like}`,
      );
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const clientIdInput = z.object({ id: z.string().uuid(), studioId: z.string().uuid().optional() });

const addClientInput = z.object({
  studioId: z.string().uuid().optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(1).max(60),
  street: z.string().trim().min(1).max(200),
  zip: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(120),
});
export const addClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => addClientInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin, studioId } = await studioContext(context.userId, data.studioId);
    const client = await getOrCreateClient(admin, data, studioId);
    return { ok: true as const, id: client.id, merged: !client.created };
  });

const updateClientInput = z.object({
  id: z.string().uuid(),
  studioId: z.string().uuid().optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(1).max(60),
  street: z.string().trim().min(1).max(200),
  zip: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(120),
});
export const updateClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateClientInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin, studioId } = await studioContext(context.userId, data.studioId);
    const { error } = await admin
      .from("clients")
      .update({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        street: data.street,
        zip: data.zip,
        city: data.city,
      })
      .eq("id", data.id)
      .eq("studio_id", studioId);
    if (error) throw new Error(error.message);
    return { ok: true as const, id: data.id };
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => clientIdInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin, studioId } = await studioContext(context.userId, data.studioId);
    const { error } = await admin
      .from("clients")
      .delete()
      .eq("id", data.id)
      .eq("studio_id", studioId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => clientIdInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin, studioId } = await studioContext(context.userId, data.studioId);
    const [client, bookings, logs] = await Promise.all([
      admin.from("clients").select("*").eq("id", data.id).eq("studio_id", studioId).maybeSingle(),
      admin
        .from("bookings")
        .select("id, day, time, treatment, duration_minutes, silent, source")
        .eq("client_id", data.id)
        .eq("studio_id", studioId)
        .order("day", { ascending: false })
        .order("time", { ascending: false }),
      admin
        .from("session_logs")
        .select(
          "id, body_html, created_at, booking_id, treatment_date, treatment_name, duration_minutes, body_map, pain_level, mobility, tension, bookings:booking_id (day, treatment, duration_minutes)",
        )
        .eq("client_id", data.id)
        .eq("studio_id", studioId)
        .order("created_at", { ascending: false }),
    ]);
    if (client.error) throw new Error(client.error.message);
    if (!client.data) throw new Error("Client not found");
    if (bookings.error) throw new Error(bookings.error.message);
    if (logs.error) throw new Error(logs.error.message);
    return { client: client.data, bookings: bookings.data ?? [], logs: logs.data ?? [] };
  });

const bodyPoint = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});
const bodyMapSchema = z.object({
  front: z.array(bodyPoint).max(200),
  back: z.array(bodyPoint).max(200),
});

const addNoteInput = z.object({
  studioId: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  bookingId: z.string().uuid().nullish(),
  bodyHtml: z.string().trim().min(1).max(20000),
  treatmentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  treatmentName: z.string().trim().max(100).nullish(),
  durationMinutes: z.number().int().min(15).max(240).nullish(),
  bodyMap: bodyMapSchema.optional(),
  tensionZones: z.record(z.string().max(60), z.number().int().min(1).max(10)).optional(),
  mobilityZones: z.record(z.string().max(60), z.number().int().min(1).max(10)).optional(),
});
export const addSessionLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => addNoteInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin, studioId } = await studioContext(context.userId, data.studioId);
    const { assertStudioOwned } = await import("@/lib/studio.server");
    await assertStudioOwned(admin, "clients", data.clientId, studioId);
    if (data.bookingId) {
      await assertStudioOwned(admin, "bookings", data.bookingId, studioId, {
        column: "client_id",
        value: data.clientId,
      });
    }
    const tensionValues = Object.values(data.tensionZones ?? {});
    const maxTension = tensionValues.length > 0 ? Math.max(...tensionValues) : null;
    const { error } = await admin.from("session_logs").insert({
      studio_id: studioId,
      client_id: data.clientId,
      booking_id: data.bookingId ?? null,
      author_id: context.userId,
      body_html: data.bodyHtml,
      treatment_date: data.bookingId ? null : (data.treatmentDate ?? null),
      treatment_name: data.bookingId ? null : (data.treatmentName ?? null),
      duration_minutes: data.bookingId ? null : (data.durationMinutes ?? null),
      body_map: data.bodyMap ?? { front: [], back: [] },
      pain_level: maxTension,
      mobility: data.mobilityZones ?? {},
      tension: data.tensionZones ?? {},
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
