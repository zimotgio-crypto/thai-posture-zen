import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { useAdminT } from "@/lib/admin-i18n";
import { useAdminStudio } from "@/lib/admin-studio-context";
import {
  MediaGrid,
  MediaTabs,
  MediaUploadForm,
  useMediaAssets,
} from "@/components/admin/media-library";
import { MEDIA_KINDS, type MediaKind } from "@/lib/media.functions";

export const Route = createFileRoute("/_authenticated/admin/mediathek")({
  head: () => ({
    meta: [{ title: "Mediathek" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: MediathekPage,
});

function MediathekPage() {
  const t = useAdminT();
  const { studioId } = useAdminStudio();
  const query = useMediaAssets(studioId);
  const [tab, setTab] = useState("mine");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"" | MediaKind>("");

  const source = tab === "mine" ? (query.data?.mine ?? []) : (query.data?.library ?? []);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return source.filter((a) => {
      if (kind && a.kind !== kind) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) || a.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [source, search, kind]);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-charcoal">{t.media.title}</h1>

      <MediaTabs
        value={tab}
        onChange={setTab}
        labels={[
          { value: "mine", label: t.media.tabMine },
          { value: "library", label: t.media.tabLibrary },
        ]}
      />

      {tab === "mine" && (
        <MediaUploadForm studioId={studioId} onUploaded={() => query.refetch()} />
      )}
      {tab === "library" && <p className="text-sm text-charcoal-soft">{t.media.platformHint}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={search}
          placeholder={t.media.search}
          aria-label={t.media.search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-sm sm:max-w-xs"
        />
        <select
          value={kind}
          aria-label={t.media.fieldKind}
          onChange={(e) => setKind(e.target.value as "" | MediaKind)}
          className="rounded-sm border border-border/60 bg-card px-3 py-2 text-sm text-charcoal"
        >
          <option value="">{t.media.allKinds}</option>
          {MEDIA_KINDS.map((k) => (
            <option key={k} value={k}>
              {t.media.kinds[k]}
            </option>
          ))}
        </select>
      </div>

      {query.isLoading ? (
        <p className="text-sm text-charcoal-soft">{t.common.loading}</p>
      ) : (
        <MediaGrid
          assets={filtered}
          studioId={studioId}
          editable={tab === "mine"}
          empty={tab === "mine" ? t.media.emptyMine : t.media.emptyLibrary}
          onChanged={() => query.refetch()}
        />
      )}
    </div>
  );
}