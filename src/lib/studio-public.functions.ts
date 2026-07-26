import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PublicTreatment = {
  key: string;
  label: string;
  description: string | null;
  options: { minutes: number; price: number }[];
};

export type PublicStudio = {
  slug: string;
  name: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  bufferMinutes: number;
  slotStepMinutes: number;
  openingHours: Record<string, { open: number; close: number }>;
  treatments: PublicTreatment[];
};

const slugInput = z.object({ slug: z.string().trim().min(1).max(80) });

// Public studio master data. Never returns internal ids, google_calendar_id
// or whatsapp_phone_number_id.
export const getStudioPublic = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => slugInput.parse(data))
  .handler(async ({ data }): Promise<PublicStudio | null> => {
    const { getStudioBySlug, listTreatments, treatmentOptions, openingWindowFor } = await import(
      "@/lib/studio.server"
    );
    const studio = await getStudioBySlug(data.slug);
    if (!studio) return null;
    const treatments = await listTreatments(studio.id);
    const openingHours: Record<string, { open: number; close: number }> = {};
    for (let weekday = 0; weekday < 7; weekday++) {
      const win = openingWindowFor(studio, weekday);
      if (win) openingHours[String(weekday)] = win;
    }
    return {
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
      openingHours,
      treatments: treatments.map((t) => ({
        key: t.key,
        label: t.label,
        description: t.description,
        options: treatmentOptions(t),
      })),
    };
  });

// Slugs + names of all active studios (used by the sitemap and future directory).
export const listPublicStudios = createServerFn({ method: "GET" }).handler(async () => {
  const { listActiveStudios } = await import("@/lib/studio.server");
  const studios = await listActiveStudios();
  return studios.map((s) => ({ slug: s.slug, name: s.name, city: s.city }));
});