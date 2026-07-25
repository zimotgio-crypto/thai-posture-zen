import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getOrCreateClient } from "@/lib/client-records";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
  return supabaseAdmin;
}

// Returns { isAdmin, canClaim } for the current signed-in user.
export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: mine }, { count }] = await Promise.all([
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
    ]);
    return {
      isAdmin: Boolean(mine),
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
    return { ok: true as const };
  });

const rangeInput = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const listBookingsInRange = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => rangeInput.parse(data))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context.userId);
    const { data: rows, error } = await admin
      .from("bookings")
      .select("id, day, time, treatment, duration_minutes, silent, source, notes, client_id, clients:client_id (id, first_name, last_name, phone, email, street, zip, city)")
      .gte("day", data.from)
      .lte("day", data.to)
      .order("day", { ascending: true })
      .order("time", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const addBookingInput = z.object({
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
    const admin = await assertAdmin(context.userId);
    let clientId: string | null = data.clientId ?? null;
    if (data.block) {
      clientId = null;
    } else if (!clientId) {
      if (!data.email || !data.firstName || !data.lastName || !data.phone || !data.street || !data.zip || !data.city) {
        throw new Error("Missing client details");
      }
      const client = await getOrCreateClient(admin, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        street: data.street,
        zip: data.zip,
        city: data.city,
      });
      clientId = client.id;
    }
    const insert = await admin.from("bookings").insert({
      client_id: clientId,
      treatment: data.block ? "Blockiert" : data.treatment,
      day: data.day,
      time: data.time,
      duration_minutes: data.durationMinutes,
      silent: data.silent,
      source: data.block ? "block" : "manual",
    });
    if (insert.error) throw new Error(insert.error.message);
    return { ok: true as const };
  });

const deleteBookingInput = z.object({ id: z.string().uuid() });
export const deleteBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteBookingInput.parse(data))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context.userId);
    const { error } = await admin.from("bookings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const listClientsInput = z.object({ q: z.string().trim().max(120).optional() });
export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => listClientsInput.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context.userId);
    let query = admin
      .from("clients")
      .select("id, first_name, last_name, email, phone, street, zip, city, created_at")
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

const clientIdInput = z.object({ id: z.string().uuid() });

const addClientInput = z.object({
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
    const admin = await assertAdmin(context.userId);
    const client = await getOrCreateClient(admin, data);
    return { ok: true as const, id: client.id, merged: !client.created };
  });

const updateClientInput = z.object({
  id: z.string().uuid(),
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
    const admin = await assertAdmin(context.userId);
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
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const, id: data.id };
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => clientIdInput.parse(data))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context.userId);
    const { error } = await admin.from("clients").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => clientIdInput.parse(data))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context.userId);
    const [client, bookings, logs] = await Promise.all([
      admin.from("clients").select("*").eq("id", data.id).maybeSingle(),
      admin
        .from("bookings")
        .select("id, day, time, treatment, duration_minutes, silent, source")
        .eq("client_id", data.id)
        .order("day", { ascending: false })
        .order("time", { ascending: false }),
      admin
        .from("session_logs")
        .select("id, body_html, created_at, booking_id, treatment_date, treatment_name, duration_minutes, body_map, pain_level, mobility, tension, bookings:booking_id (day, treatment, duration_minutes)")
        .eq("client_id", data.id)
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
    const admin = await assertAdmin(context.userId);
    const tensionValues = Object.values(data.tensionZones ?? {});
    const maxTension = tensionValues.length > 0 ? Math.max(...tensionValues) : null;
    const { error } = await admin.from("session_logs").insert({
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