import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminT } from "@/lib/admin-i18n";
import { useAdminStudio } from "@/lib/admin-studio-context";
import { getStudioSettings } from "@/lib/studio-settings.functions";
import { MasterTab } from "@/components/admin/settings/master-tab";
import { HoursTab } from "@/components/admin/settings/hours-tab";
import { TreatmentsTab } from "@/components/admin/settings/treatments-tab";
import { ContentTab } from "@/components/admin/settings/content-tab";
import { LinksTab } from "@/components/admin/settings/links-tab";

export const Route = createFileRoute("/_authenticated/admin/einstellungen")({
  head: () => ({
    meta: [
      { title: "Studio-Einstellungen" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const t = useAdminT();
  const { studioId } = useAdminStudio();
  const load = useServerFn(getStudioSettings);
  const [tab, setTab] = useState("master");

  const settings = useQuery({
    queryKey: ["admin", "studio-settings", studioId],
    queryFn: () => load({ data: { studioId } }),
  });

  if (settings.isLoading || !settings.data) {
    return <p className="text-sm text-charcoal-soft">{t.common.loading}</p>;
  }
  const data = settings.data;

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-charcoal">{t.settings.title}</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap justify-start gap-1 rounded-sm bg-transparent p-0">
          <TabsTrigger value="master" className="rounded-sm text-xs uppercase tracking-[0.18em]">
            {t.settings.tabMaster}
          </TabsTrigger>
          <TabsTrigger value="hours" className="rounded-sm text-xs uppercase tracking-[0.18em]">
            {t.settings.tabHours}
          </TabsTrigger>
          <TabsTrigger
            value="treatments"
            className="rounded-sm text-xs uppercase tracking-[0.18em]"
          >
            {t.settings.tabTreatments}
          </TabsTrigger>
          <TabsTrigger value="content" className="rounded-sm text-xs uppercase tracking-[0.18em]">
            {t.settings.tabContent}
          </TabsTrigger>
          <TabsTrigger value="links" className="rounded-sm text-xs uppercase tracking-[0.18em]">
            {t.settings.tabLinks}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="master" className="mt-6">
          <MasterTab
            studioId={studioId}
            master={data.master}
            onSaved={() => settings.refetch()}
          />
        </TabsContent>
        <TabsContent value="hours" className="mt-6">
          <HoursTab studioId={studioId} hours={data.hours} onSaved={() => settings.refetch()} />
        </TabsContent>
        <TabsContent value="treatments" className="mt-6">
          <TreatmentsTab
            studioId={studioId}
            slug={data.master.slug}
            treatments={data.treatments}
            onSaved={() => settings.refetch()}
          />
        </TabsContent>
        <TabsContent value="content" className="mt-6">
          <ContentTab studioId={studioId} />
        </TabsContent>
        <TabsContent value="links" className="mt-6">
          <LinksTab
            studioId={studioId}
            links={data.links}
            serviceAccountEmail={data.serviceAccountEmail}
            isPlatformAdmin={data.isPlatformAdmin}
            onSaved={() => settings.refetch()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
