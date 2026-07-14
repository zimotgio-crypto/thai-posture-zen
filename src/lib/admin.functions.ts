import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

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
      .select("id, day, time, treatment, silent, source, notes, client_id, clients:client_id (id, name, phone, email, street, zip, city)")
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
  silent: z.boolean().default(false),
  block: z.boolean().default(false),
  clientId: z.string().uuid().nullish(),
  name: z.string().trim().max(120).optional(),
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
      if (!data.email || !data.name || !data.phone || !data.street || !data.zip || !data.city) {
        throw new Error("Missing client details");
      }
      const up = await admin
        .from("clients")
        .upsert(
          {
            name: data.name,
            email: data.email.toLowerCase(),
            phone: data.phone,
            street: data.street,
            zip: data.zip,
            city: data.city,
          },
          { onConflict: "email" }
        )
        .select("id")
        .single();
      if (up.error) throw new Error(up.error.message);
      clientId = up.data.id;
    }
    const insert = await admin.from("bookings").insert({
      client_id: clientId,
      treatment: data.block ? "Blockiert" : data.treatment,
      day: data.day,
      time: data.time,
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
      .select("id, name, email, phone, city, created_at")
      .order("name", { ascending: true });
    if (data.q) {
      const like = `%${data.q}%`;
      query = query.or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like},city.ilike.${like}`);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const clientIdInput = z.object({ id: z.string().uuid() });
export const getClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => clientIdInput.parse(data))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context.userId);
    const [client, bookings, logs] = await Promise.all([
      admin.from("clients").select("*").eq("id", data.id).maybeSingle(),
      admin
        .from("bookings")
        .select("id, day, time, treatment, silent, source")
        .eq("client_id", data.id)
        .order("day", { ascending: false })
        .order("time", { ascending: false }),
      admin
        .from("session_logs")
        .select("id, body_html, created_at, booking_id")
        .eq("client_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    if (client.error) throw new Error(client.error.message);
    if (!client.data) throw new Error("Client not found");
    if (bookings.error) throw new Error(bookings.error.message);
    if (logs.error) throw new Error(logs.error.message);
    return { client: client.data, bookings: bookings.data ?? [], logs: logs.data ?? [] };
  });

const addNoteInput = z.object({
  clientId: z.string().uuid(),
  bookingId: z.string().uuid().nullish(),
  bodyHtml: z.string().trim().min(1).max(20000),
});
export const addSessionLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => addNoteInput.parse(data))
  .handler(async ({ data, context }) => {
    const admin = await assertAdmin(context.userId);
    const { error } = await admin.from("session_logs").insert({
      client_id: data.clientId,
      booking_id: data.bookingId ?? null,
      author_id: context.userId,
      body_html: data.bodyHtml,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });