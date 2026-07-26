import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const STUDIO_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const STUDIO_MEDIA_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
] as const;

const featureSchema = z.object({
  title: z.string().trim().max(120),
  text: z.string().trim().max(400),
});

const testimonialSchema = z.object({
  quote: z.string().trim().min(1).max(600),
  author: z.string().trim().max(80),
});

const faqSchema = z.object({
  question: z.string().trim().min(1).max(200),
  answer: z.string().trim().max(2000),
});

const contentSchema = z.object({
  studioId: z.string().uuid().optional(),
  tagline: z.string().trim().max(200).nullable().optional(),
  heroHeading: z.string().trim().max(300).nullable().optional(),
  heroText: z.string().trim().max(2000).nullable().optional(),
  aboutHeading: z.string().trim().max(300).nullable().optional(),
  aboutText: z.string().trim().max(4000).nullable().optional(),
  features: z.array(featureSchema).max(12).optional(),
  testimonials: z.array(testimonialSchema).max(20).optional(),
  faqs: z.array(faqSchema).max(20).optional(),
  paymentMethods: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  parkingNote: z.string().trim().max(1000).nullable().optional(),
  mapsUrl: z.string().trim().url().max(500).nullable().optional(),
});

// Reads the editable content of the studio the caller may act in.
export const getStudioContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ studioId: z.string().uuid().optional() }).parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const {
      resolveStudioContext,
      getStudioById,
      studioFeatures,
      studioPaymentMethods,
      studioTestimonials,
      studioFaqs,
      studioMediaUrl,
    } = await import("@/lib/studio.server");
    const { studioId } = await resolveStudioContext(context.userId, data.studioId ?? null);
    const studio = await getStudioById(studioId);
    if (!studio) throw new Error("Unknown studio");
    const [logo, hero, room, portrait] = await Promise.all([
      studioMediaUrl(studio.logo_path),
      studioMediaUrl(studio.hero_image_path),
      studioMediaUrl(studio.room_image_path),
      studioMediaUrl(studio.portrait_image_path),
    ]);
    return {
      studioId,
      slug: studio.slug,
      tagline: studio.tagline,
      heroHeading: studio.hero_heading,
      heroText: studio.hero_text,
      aboutHeading: studio.about_heading,
      aboutText: studio.about_text,
      features: studioFeatures(studio),
      testimonials: studioTestimonials(studio),
      faqs: studioFaqs(studio),
      paymentMethods: studioPaymentMethods(studio),
      parkingNote: studio.parking_note,
      mapsUrl: studio.maps_url,
      media: {
        logo: { path: studio.logo_path, url: logo },
        hero: { path: studio.hero_image_path, url: hero },
        room: { path: studio.room_image_path, url: room },
        portrait: { path: studio.portrait_image_path, url: portrait },
      },
    };
  });

// Updates the editable content of the caller's studio.
export const updateStudioContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => contentSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { resolveStudioContext } = await import("@/lib/studio.server");
    const { supabaseAdmin, studioId } = await resolveStudioContext(
      context.userId,
      data.studioId ?? null,
    );
    const patch: Record<string, unknown> = {};
    const map = {
      tagline: "tagline",
      heroHeading: "hero_heading",
      heroText: "hero_text",
      aboutHeading: "about_heading",
      aboutText: "about_text",
      features: "features",
      testimonials: "testimonials",
      faqs: "faqs",
      paymentMethods: "payment_methods",
      parkingNote: "parking_note",
      mapsUrl: "maps_url",
    } as const;
    for (const [key, column] of Object.entries(map)) {
      const value = (data as Record<string, unknown>)[key];
      if (value !== undefined) patch[column] = value === "" ? null : value;
    }
    if (Object.keys(patch).length === 0) return { ok: true as const, slug: null as string | null };
    const { data: row, error } = await supabaseAdmin.from("studios")
      .update(patch as never)
      .eq("id", studioId)
      .select("slug")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true as const, slug: (row as { slug: string } | null)?.slug ?? null };
  });

const slotSchema = z.enum(["logo", "hero", "room", "portrait"]);
const slotColumn = {
  logo: "logo_path",
  hero: "hero_image_path",
  room: "room_image_path",
  portrait: "portrait_image_path",
} as const;

const uploadSchema = z.object({
  studioId: z.string().uuid().optional(),
  slot: slotSchema,
  filename: z.string().trim().min(1).max(160),
  contentType: z.enum(STUDIO_MEDIA_MIME),
  // base64 payload without data-url prefix
  dataBase64: z.string().min(1),
});

// Uploads a studio image (max 5 MB, images only) into studio-media/<studio_id>/.
export const uploadStudioMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => uploadSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { resolveStudioContext, STUDIO_MEDIA_BUCKET, studioMediaUrl } = await import(
      "@/lib/studio.server"
    );
    const { supabaseAdmin, studioId } = await resolveStudioContext(
      context.userId,
      data.studioId ?? null,
    );

    const binary = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));
    if (binary.byteLength > STUDIO_MEDIA_MAX_BYTES) {
      throw new Error("Datei zu gross (max. 5 MB).");
    }

    const ext = (data.filename.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${studioId}/${data.slot}-${Date.now()}.${ext || "jpg"}`;
    const { error } = await supabaseAdmin.storage
      .from(STUDIO_MEDIA_BUCKET)
      .upload(path, binary, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);

    const column = slotColumn[data.slot];
    const { data: prev } = await supabaseAdmin
      .from("studios")
      .select(column)
      .eq("id", studioId)
      .maybeSingle();
    const previousPath = (prev as Record<string, string | null> | null)?.[column] ?? null;

    const { error: updateError } = await supabaseAdmin
      .from("studios")
      .update({ [column]: path } as never)
      .eq("id", studioId);
    if (updateError) throw new Error(updateError.message);

    if (previousPath && previousPath !== path) {
      await supabaseAdmin.storage.from(STUDIO_MEDIA_BUCKET).remove([previousPath]);
    }

    return { ok: true as const, path, url: await studioMediaUrl(path) };
  });

// Removes a studio image and falls back to the built-in default picture.
export const removeStudioMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ studioId: z.string().uuid().optional(), slot: slotSchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { resolveStudioContext, STUDIO_MEDIA_BUCKET } = await import("@/lib/studio.server");
    const { supabaseAdmin, studioId } = await resolveStudioContext(
      context.userId,
      data.studioId ?? null,
    );
    const column = slotColumn[data.slot];
    const { data: prev } = await supabaseAdmin
      .from("studios")
      .select(column)
      .eq("id", studioId)
      .maybeSingle();
    const previousPath = (prev as Record<string, string | null> | null)?.[column] ?? null;
    const { error } = await supabaseAdmin
      .from("studios")
      .update({ [column]: null } as never)
      .eq("id", studioId);
    if (error) throw new Error(error.message);
    if (previousPath) {
      await supabaseAdmin.storage.from(STUDIO_MEDIA_BUCKET).remove([previousPath]);
    }
    return { ok: true as const };
  });