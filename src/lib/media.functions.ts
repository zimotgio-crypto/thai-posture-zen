import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const MEDIA_MAX_BYTES = 8 * 1024 * 1024;
export const MEDIA_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const MEDIA_KINDS = ["foto", "hintergrund", "muster", "saison"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export type MediaAsset = {
  id: string;
  studioId: string | null;
  kind: MediaKind;
  title: string;
  tags: string[];
  storagePath: string;
  width: number | null;
  height: number | null;
  source: string;
  licenseNote: string | null;
  consentOk: boolean;
  createdAt: string;
  url: string | null;
};

const kindSchema = z.enum(MEDIA_KINDS);

const listSchema = z.object({
  studioId: z.string().uuid().optional(),
  kind: kindSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
});

const uploadSchema = z.object({
  studioId: z.string().uuid().optional(),
  scope: z.enum(["studio", "platform"]).default("studio"),
  kind: kindSchema.default("foto"),
  title: z.string().trim().min(1).max(160),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  filename: z.string().trim().min(1).max(160),
  contentType: z.enum(MEDIA_MIME),
  source: z.enum(["upload", "ki", "lizenz"]).default("upload"),
  licenseNote: z.string().trim().max(400).nullable().optional(),
  consentOk: z.boolean(),
  // base64 payload without the data-url prefix
  dataBase64: z.string().min(1),
});

const updateSchema = z.object({
  studioId: z.string().uuid().optional(),
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(160).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  kind: kindSchema.optional(),
  consentOk: z.boolean().optional(),
  licenseNote: z.string().trim().max(400).nullable().optional(),
});

// Lists the caller's own studio media and the shared platform library.
export const listMediaAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => listSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { resolveStudioContext } = await import("@/lib/studio.server");
    const { mapRows } = await import("@/lib/media.server");
    const { supabaseAdmin, studioId, isPlatformAdmin } = await resolveStudioContext(
      context.userId,
      data.studioId ?? null,
    );

    let query = supabaseAdmin
      .from("media_assets")
      .select("*")
      .or(`studio_id.eq.${studioId},studio_id.is.null`)
      .order("created_at", { ascending: false });
    if (data.kind) query = query.eq("kind", data.kind);
    if (data.tags && data.tags.length > 0) query = query.overlaps("tags", data.tags);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const all = await mapRows(rows ?? []);
    return {
      studioId,
      isPlatformAdmin,
      mine: all.filter((a) => a.studioId === studioId),
      library: all.filter((a) => a.studioId === null),
    };
  });

// Uploads an image (max 8 MB; JPEG/PNG/WebP) and registers it in the media library.
export const uploadMediaAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => uploadSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { resolveStudioContext, STUDIO_MEDIA_BUCKET, studioMediaUrl } = await import(
      "@/lib/studio.server"
    );
    const { readImageSize } = await import("@/lib/image-size.server");
    const { mapRow } = await import("@/lib/media.server");
    const { supabaseAdmin, studioId, isPlatformAdmin } = await resolveStudioContext(
      context.userId,
      data.studioId ?? null,
    );
    const isPlatform = data.scope === "platform";
    if (isPlatform && !isPlatformAdmin) throw new Error("Forbidden");

    const binary = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));
    if (binary.byteLength > MEDIA_MAX_BYTES) throw new Error("Datei zu gross (max. 8 MB).");

    const size = readImageSize(binary);
    const ext = (data.filename.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const folder = isPlatform ? "platform/media" : `${studioId}/media`;
    const path = `${folder}/${crypto.randomUUID()}.${ext || "jpg"}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STUDIO_MEDIA_BUCKET)
      .upload(path, binary, { contentType: data.contentType, upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { data: row, error } = await supabaseAdmin
      .from("media_assets")
      .insert({
        studio_id: isPlatform ? null : studioId,
        kind: data.kind,
        title: data.title,
        tags: data.tags,
        storage_path: path,
        width: size?.width ?? null,
        height: size?.height ?? null,
        source: data.source,
        license_note: data.licenseNote ?? null,
        consent_ok: data.consentOk,
      })
      .select("*")
      .single();
    if (error) {
      await supabaseAdmin.storage.from(STUDIO_MEDIA_BUCKET).remove([path]);
      throw new Error(error.message);
    }

    return { ok: true as const, asset: { ...(await mapRow(row)), url: await studioMediaUrl(path) } };
  });

// Updates title, tags, category or consent flag of a media entry.
export const updateMediaAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { resolveStudioContext } = await import("@/lib/studio.server");
    const { mapRow, loadOwned } = await import("@/lib/media.server");
    const { supabaseAdmin, studioId, isPlatformAdmin } = await resolveStudioContext(
      context.userId,
      data.studioId ?? null,
    );
    await loadOwned(supabaseAdmin, data.id, studioId, isPlatformAdmin);

    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.kind !== undefined) patch.kind = data.kind;
    if (data.consentOk !== undefined) patch.consent_ok = data.consentOk;
    if (data.licenseNote !== undefined) patch.license_note = data.licenseNote;

    const { data: row, error } = await supabaseAdmin
      .from("media_assets")
      .update(patch as never)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true as const, asset: await mapRow(row) };
  });

// Deletes a media entry together with its stored file.
export const deleteMediaAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ studioId: z.string().uuid().optional(), id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { resolveStudioContext, STUDIO_MEDIA_BUCKET } = await import("@/lib/studio.server");
    const { loadOwned } = await import("@/lib/media.server");
    const { supabaseAdmin, studioId, isPlatformAdmin } = await resolveStudioContext(
      context.userId,
      data.studioId ?? null,
    );
    const row = await loadOwned(supabaseAdmin, data.id, studioId, isPlatformAdmin);

    const { error } = await supabaseAdmin.from("media_assets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.storage.from(STUDIO_MEDIA_BUCKET).remove([row.storage_path as string]);
    return { ok: true as const };
  });