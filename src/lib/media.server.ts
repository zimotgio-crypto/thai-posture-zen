// Media library helpers. Server-only.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { studioMediaUrl } from "@/lib/studio.server";
import type { MediaAsset, MediaKind } from "@/lib/media.functions";

export type MediaRow = Database["public"]["Tables"]["media_assets"]["Row"];
type Db = SupabaseClient<Database>;

export async function mapRow(row: MediaRow): Promise<MediaAsset> {
  return {
    id: row.id,
    studioId: row.studio_id,
    kind: row.kind as MediaKind,
    title: row.title,
    tags: row.tags ?? [],
    storagePath: row.storage_path,
    width: row.width,
    height: row.height,
    source: row.source,
    licenseNote: row.license_note,
    consentOk: row.consent_ok,
    createdAt: row.created_at,
    url: await studioMediaUrl(row.storage_path),
  };
}

export async function mapRows(rows: MediaRow[]): Promise<MediaAsset[]> {
  return Promise.all(rows.map(mapRow));
}

// Loads a media row the caller may modify: own studio rows, or platform
// library rows (studio_id IS NULL) for platform admins only.
export async function loadOwned(
  supabaseAdmin: Db,
  id: string,
  studioId: string,
  isPlatformAdmin: boolean,
): Promise<MediaRow> {
  const { data, error } = await supabaseAdmin
    .from("media_assets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Not found");
  const row = data as MediaRow;
  if (row.studio_id === null) {
    if (!isPlatformAdmin) throw new Error("Forbidden");
  } else if (row.studio_id !== studioId) {
    throw new Error("Forbidden");
  }
  return row;
}