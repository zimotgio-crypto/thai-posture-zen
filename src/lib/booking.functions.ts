import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const submitInput = z.object({
  treatment: z.string().min(1).max(100),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  silent: z.boolean(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(3).max(60),
  street: z.string().trim().min(1).max(200),
  zip: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(120),
});

export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submitInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Reject overlap: any existing booking at the same day whose window
    // [start, start+90) collides with the requested [t, t+90) window.
    const dayRows = await supabaseAdmin
      .from("bookings")
      .select("time")
      .eq("day", data.day);
    if (dayRows.error) throw new Error(dayRows.error.message);
    const requested = toMinutes(data.time);
    const conflict = (dayRows.data ?? []).some((r) => {
      const s = toMinutes(r.time as string);
      return requested < s + 90 && requested + 90 > s;
    });
    if (conflict) {
      return { ok: false as const, reason: "conflict" as const };
    }

    // Upsert client by email; keep contact/address fresh with the latest form input.
    const clientUpsert = await supabaseAdmin
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
    if (clientUpsert.error) throw new Error(clientUpsert.error.message);

    const insert = await supabaseAdmin.from("bookings").insert({
      client_id: clientUpsert.data.id,
      treatment: data.treatment,
      day: data.day,
      time: data.time,
      silent: data.silent,
      source: "online",
    });
    if (insert.error) throw new Error(insert.error.message);

    return { ok: true as const };
  });

const listInput = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Public availability: returns only start times booked for the given day.
// Used by the public modal to grey out slots. No PII returned.
export const listBookedTimes = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => listInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("bookings")
      .select("time")
      .eq("day", data.day);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => r.time as string);
  });

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}