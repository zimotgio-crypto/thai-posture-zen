import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getOrCreateClient } from "@/lib/client-records";

const submitInput = z.object({
  studioSlug: z.string().trim().min(1).max(80),
  treatment: z.string().min(1).max(100),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().int().min(15).max(240),
  silent: z.boolean(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
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
    const { getGoogleBusyIntervals, createGoogleEvent } = await import(
      "@/lib/google-calendar.server"
    );
    const { requireStudioBySlug, listTreatments, treatmentOptions, openingWindowFor } =
      await import("@/lib/studio.server");

    const studio = await requireStudioBySlug(data.studioSlug);
    const BUFFER = studio.buffer_minutes;

    // Treatment + duration must exist for this studio. Prices come from the
    // treatments table only, never from the client.
    const treatments = await listTreatments(studio.id);
    const treatment =
      treatments.find((t) => t.key === data.treatment) ??
      treatments.find((t) => t.label === data.treatment);
    if (!treatment) {
      return { ok: false as const, reason: "unknown_treatment" as const };
    }
    const option = treatmentOptions(treatment).find((o) => o.minutes === data.durationMinutes);
    if (!option) {
      return { ok: false as const, reason: "unknown_duration" as const };
    }
    const price = option.price;

    // Opening hours and slot grid of this studio.
    const weekday = new Date(`${data.day}T12:00:00Z`).getUTCDay();
    const win = openingWindowFor(studio, weekday);
    const requestedStart = toMinutes(data.time);
    if (
      !win ||
      requestedStart < win.open ||
      requestedStart + data.durationMinutes > win.close ||
      (requestedStart - win.open) % studio.slot_step_minutes !== 0
    ) {
      return { ok: false as const, reason: "closed" as const };
    }

    // Reject overlap using each booking's own duration (+30 min buffer).
    const dayRows = await supabaseAdmin
      .from("bookings")
      .select("time, duration_minutes")
      .eq("studio_id", studio.id)
      .eq("day", data.day);
    if (dayRows.error) throw new Error(dayRows.error.message);
    const requested = requestedStart;
    const newBlock = data.durationMinutes + BUFFER;
    const conflict = (dayRows.data ?? []).some((r) => {
      const s = toMinutes(r.time as string);
      const block = ((r as { duration_minutes?: number | null }).duration_minutes ?? 60) + BUFFER;
      return requested < s + block && requested + newBlock > s;
    });
    if (conflict) {
      return { ok: false as const, reason: "conflict" as const };
    }

    // Also block against private Google Calendar events.
    // The DB conflict check above always runs; a Google failure must never be
    // silent, but it also must not block the booking.
    let gBusy: { time: string; duration: number }[] = [];
    try {
      gBusy = await getGoogleBusyIntervals(data.day, studio.google_calendar_id);
    } catch (err) {
      console.error("[submitBooking] google availability check failed", err);
    }
    const gConflict = gBusy.some((b) => {
      const s = toMinutes(b.time);
      const block = b.duration + BUFFER;
      return requested < s + block && requested + newBlock > s;
    });
    if (gConflict) {
      return { ok: false as const, reason: "conflict" as const };
    }

    const client = await getOrCreateClient(supabaseAdmin, data, studio.id);

    const insert = await supabaseAdmin
      .from("bookings")
      .insert({
        studio_id: studio.id,
        client_id: client.id,
        treatment: treatment.label,
        day: data.day,
        time: data.time,
        duration_minutes: data.durationMinutes,
        silent: data.silent,
        source: "online",
        price_chf: price,
      })
      .select("id")
      .single();
    if (insert.error) throw new Error(insert.error.message);

    // Best-effort: mirror into Google Calendar. Never fail the booking.
    try {
      const eventId = await createGoogleEvent({
        day: data.day,
        time: data.time,
        durationMinutes: data.durationMinutes,
        treatment: treatment.label,
        clientName: `${data.firstName} ${data.lastName}`.trim(),
        clientPhone: data.phone,
        source: "online",
        calendarId: studio.google_calendar_id,
        studioName: studio.name,
      });
      if (eventId && insert.data?.id) {
        await supabaseAdmin
          .from("bookings")
          .update({ google_event_id: eventId })
          .eq("id", insert.data.id);
      }
    } catch (err) {
      console.error("[submitBooking] google mirror failed", err);
    }

    return { ok: true as const, price };
  });

const listInput = z.object({
  studioSlug: z.string().trim().min(1).max(80),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Public availability: returns booked start times + durations for the day.
// Used by the modal to grey out slots. No PII returned.
export const listBookedTimes = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => listInput.parse(data))
  .handler(async ({ data }) => {
    const { listBookedTimesForDay } = await import("@/lib/booking-availability.server");
    const { requireStudioBySlug } = await import("@/lib/studio.server");
    const studio = await requireStudioBySlug(data.studioSlug);
    return listBookedTimesForDay(studio.id, data.day, studio.google_calendar_id);
  });

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}