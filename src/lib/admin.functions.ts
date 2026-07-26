import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getOrCreateClient } from "@/lib/client-records";

// Resolves the studio the caller may act in. Never trusts a client-sent id.
async function studioContext(userId: string, studioId?: string | null) {
  const { resolveStudioContext } = await import("@/lib/studio.server");
  return resolveStudioContext(userId, studioId ?? null);
}

async function studioCalendar(studioId: string): Promise<string | null> {
  const { getStudioById } = await import("@/lib/studio.server");
  const studio = await getStudioById(studioId);
  return studio?.google_calendar_id ?? null;
}

// Returns { isAdmin, canClaim } for the current signed-in user.
export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: mine }, { count }, { data: membership }] = await Promise.all([
      supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .eq("role", "admin")
        .maybeSingle(),
      supabaseAdmin
        .from("user_roles")
        .select("role", { count: "exact", head: true })
        .eq("role", "admin"),
      supabaseAdmin
        .from("studio_members")
        .select("studio_id")
        .eq("user_id", context.userId)
        .limit(1)
        .maybeSingle(),
    ]);
    return {
      isAdmin: Boolean(mine) || Boolean(membership),
      canClaim: (count ?? 0) === 0,
    };
  });

// One-time bootstrap: first signed-in user becomes admin.
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("role", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) return { ok: false as const, reason: "admin_exists" as const };
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    // Bootstrap tenant access: owner of the first active studio + platform admin.
    const { data: studio } = await supabaseAdmin
      .from("studios")
      .select("id")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (studio) {
      await supabaseAdmin
        .from("studio_members")
        .insert({ studio_id: studio.id, user_id: context.userId, role: "owner" });
    }
    await supabaseAdmin.from("platform_admins").insert({ user_id: context.userId });
    return { ok: true as const };
  });

// Master data, opening hours and treatments of the caller's studio.
export const getCurrentStudio = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => studioScopeInput.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { studioId } = await studioContext(context.userId, data.studioId);
    const { getStudioById, listTreatments, treatmentOptions } = await import(
      "@/lib/studio.server"
    );
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
      .select("id, day, time, treatment, duration_minutes, silent, source, notes, client_id, clients:client_id (id, first_name, last_name, phone, email, street, zip, city)")
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
    const { getStudioById } = await import("@/lib/studio.server");
    const studio = await getStudioById(studioId);
    const { createGoogleEvent } = await import("@/lib/google-calendar.server");
    let clientId: string | null = data.clientId ?? null;
    let clientName = "";
    let clientPhone: string | null = null;
    if (data.block) {
      clientId = null;
    } else if (!clientId) {
      if (!data.email || !data.firstName || !data.lastName || !data.phone || !data.street || !data.zip || !data.city) {
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
        await admin
          .from("bookings")
          .update({ google_event_id: eventId })
          .eq("id", insert.data.id);
      }
    } catch (err) {
      console.error("[addBooking] google mirror failed", err);
    }
    return { ok: true as const };
  });

const deleteBookingInput = z.object({ id: z.string().uuid(), studioId: z.string().uuid().optional() });
export const deleteBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteBookingInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: admin, studioId } = await studioContext(context.userId, data.studioId);
    const { deleteGoogleEvent } = await import("@/lib/google-calendar.server");
    const { data: row } = await admin
      .from("bookings")
      .select("google_event_id")
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
      const { getGoogleBusyIntervalsInRange } = await import(
        "@/lib/google-calendar.server"
      );
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

const debugGoogleInput = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  studioId: z.string().uuid().optional(),
});

export const debugGoogleCalendar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => debugGoogleInput.parse(data))
  .handler(async ({ data, context }) => {
    const { studioId } = await studioContext(context.userId, data.studioId);
    const calendarId = await studioCalendar(studioId);
    const [{ debugGoogleCalendarDay }, { listBookedTimesForDay }] = await Promise.all([
      import("@/lib/google-calendar.server"),
      import("@/lib/booking-availability.server"),
    ]);
    const google = await debugGoogleCalendarDay(data.day, calendarId);
    const exceptions = [...google.exceptions];
    let listBookedTimesResult: { time: string; duration: number }[] | null = null;
    try {
      listBookedTimesResult = await listBookedTimesForDay(studioId, data.day, calendarId);
    } catch (err) {
      const normalized =
        err instanceof Error
          ? { message: err.message, stack: err.stack ?? null }
          : { message: String(err), stack: null };
      exceptions.push(normalized);
      console.error("[debugGoogleCalendar] listBookedTimes failed", normalized);
    }
    return {
      day: data.day,
      configured: google.configured,
      accessTokenOk: google.accessTokenOk,
      freeBusyRaw: google.freeBusyRaw,
      derivedIntervals: google.derivedIntervals,
      listBookedTimes: listBookedTimesResult,
      exceptions,
    };
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
      const like = `%${data.q}%`;
      query = query.or(
        `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like},street.ilike.${like},zip.ilike.${like},city.ilike.${like}`
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
        .select("id, body_html, created_at, booking_id, treatment_date, treatment_name, duration_minutes, body_map, pain_level, mobility, tension, bookings:booking_id (day, treatment, duration_minutes)")
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
  treatmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
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
    const owner = await admin
      .from("clients")
      .select("id")
      .eq("id", data.clientId)
      .eq("studio_id", studioId)
      .maybeSingle();
    if (!owner.data) throw new Error("Client not found");
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