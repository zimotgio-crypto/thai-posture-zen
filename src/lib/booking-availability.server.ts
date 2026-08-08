import { getGoogleBusyIntervals } from "@/lib/google-calendar.server";

export type BookedTime = { time: string; duration: number };

// The bookings table carries an EXCLUDE constraint (bookings_no_overlap_excl) that
// rejects overlapping bookings per studio and day — the DB-level backstop for
// the race between availability check and insert. 23P01 = exclusion_violation,
// 23505 = unique_violation.
export function isBookingConflictError(
  error: { code?: string | null } | null | undefined,
): boolean {
  return error?.code === "23P01" || error?.code === "23505";
}

// Busy intervals for one studio on one day: DB bookings + that studio's Google calendar.
export async function listBookedTimesForDay(
  studioId: string,
  day: string,
  calendarId?: string | null,
  timezone?: string | null,
): Promise<BookedTime[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin
    .from("bookings")
    .select("time, duration_minutes")
    .eq("studio_id", studioId)
    .eq("day", day);
  if (error) throw new Error(error.message);

  const dbSlots = (rows ?? []).map((r) => ({
    time: r.time as string,
    duration: (r as { duration_minutes?: number | null }).duration_minutes ?? 60,
  }));
  const googleSlots = await getGoogleBusyIntervals(day, calendarId, timezone);

  const seen = new Set<string>();
  const out: BookedTime[] = [];
  for (const slot of [...dbSlots, ...googleSlots]) {
    const key = `${slot.time}|${slot.duration}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(slot);
  }
  return out;
}