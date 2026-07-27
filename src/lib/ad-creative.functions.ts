import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const saveSchema = z.object({
  studioId: z.string().uuid().optional(),
  campaignId: z.string().uuid().nullable().optional(),
  images: z
    .array(
      z.object({
        format: z.enum(["feed", "portrait", "story"]),
        dataBase64: z.string().min(1),
      }),
    )
    .min(1)
    .max(3),
});

// Speichert erzeugte Werbebilder als PNG unter <studio_id>/campaigns/<campaign_id>/
// und hinterlegt die Pfade bei der Aktion.
export const saveAdCreatives = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { resolveStudioContext, STUDIO_MEDIA_BUCKET, studioMediaUrl } = await import(
      "@/lib/studio.server"
    );
    const { supabaseAdmin, studioId } = await resolveStudioContext(
      context.userId,
      data.studioId ?? null,
    );

    let campaignId: string | null = data.campaignId ?? null;
    if (campaignId) {
      const { data: campaign, error } = await supabaseAdmin
        .from("campaigns")
        .select("id, studio_id, image_paths")
        .eq("id", campaignId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!campaign || campaign.studio_id !== studioId) throw new Error("Forbidden");
    }

    const folder = `${studioId}/campaigns/${campaignId ?? "allgemein"}`;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const paths: string[] = [];

    for (const image of data.images) {
      const binary = Uint8Array.from(atob(image.dataBase64), (c) => c.charCodeAt(0));
      if (binary.byteLength > 8 * 1024 * 1024) throw new Error("Bild zu gross (max. 8 MB).");
      const path = `${folder}/${stamp}-${image.format}.png`;
      const { error } = await supabaseAdmin.storage
        .from(STUDIO_MEDIA_BUCKET)
        .upload(path, binary, { contentType: "image/png", upsert: true });
      if (error) throw new Error(error.message);
      paths.push(path);
    }

    if (campaignId) {
      const { data: current } = await supabaseAdmin
        .from("campaigns")
        .select("image_paths")
        .eq("id", campaignId)
        .maybeSingle();
      const existing = ((current?.image_paths as string[] | null) ?? []).filter(
        (p) => !paths.includes(p),
      );
      const { error } = await supabaseAdmin
        .from("campaigns")
        .update({ image_paths: [...existing, ...paths] } as never)
        .eq("id", campaignId)
        .eq("studio_id", studioId);
      if (error) throw new Error(error.message);
    }

    const urls = await Promise.all(paths.map((p) => studioMediaUrl(p)));
    return { ok: true as const, paths, urls };
  });

// Listet die bereits gespeicherten Werbebilder einer Aktion.
export const listCampaignCreatives = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ studioId: z.string().uuid().optional(), campaignId: z.string().uuid() })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { resolveStudioContext, studioMediaUrl } = await import("@/lib/studio.server");
    const { supabaseAdmin, studioId } = await resolveStudioContext(
      context.userId,
      data.studioId ?? null,
    );
    const { data: campaign, error } = await supabaseAdmin
      .from("campaigns")
      .select("id, studio_id, image_paths")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!campaign || campaign.studio_id !== studioId) throw new Error("Forbidden");

    const paths = ((campaign.image_paths as string[] | null) ?? []).slice(-12);
    const images = await Promise.all(
      paths.map(async (path) => ({ path, url: await studioMediaUrl(path) })),
    );
    return { images };
  });