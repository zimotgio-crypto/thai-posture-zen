import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminT } from "@/lib/admin-i18n";
import { useAdminStudio } from "@/lib/admin-studio-context";
import {
  addStudioMember,
  createStudio,
  listAllStudios,
  setStudioActive,
} from "@/lib/platform-studios.functions";
import { SectionCard, TextField } from "@/components/admin/settings/field";

export const Route = createFileRoute("/_authenticated/admin/studios")({
  head: () => ({
    meta: [{ title: "Studios" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: StudiosPage,
});

function StudiosPage() {
  const t = useAdminT();
  const { isPlatformAdmin } = useAdminStudio();
  const list = useServerFn(listAllStudios);
  const create = useServerFn(createStudio);
  const toggle = useServerFn(setStudioActive);
  const addMember = useServerFn(addStudioMember);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    slug: "",
    name: "",
    street: "",
    zip: "",
    city: "",
    timezone: "Europe/Zurich",
  });
  const [memberEmail, setMemberEmail] = useState<Record<string, string>>({});

  const studios = useQuery({
    queryKey: ["admin", "all-studios"],
    queryFn: () => list(),
    enabled: isPlatformAdmin,
  });

  if (!isPlatformAdmin) {
    return <p className="text-sm text-charcoal-soft">{t.settings.readOnlyHint}</p>;
  }

  async function submit() {
    setBusy(true);
    try {
      await create({
        data: {
          slug: form.slug.trim().toLowerCase(),
          name: form.name.trim(),
          street: form.street.trim() || undefined,
          zip: form.zip.trim() || undefined,
          city: form.city.trim() || undefined,
          timezone: form.timezone.trim() || "Europe/Zurich",
          bufferMinutes: 15,
          slotStepMinutes: 15,
        },
      });
      setForm({ slug: "", name: "", street: "", zip: "", city: "", timezone: "Europe/Zurich" });
      await studios.refetch();
      toast.success(t.studios.created);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function invite(studioId: string) {
    const email = (memberEmail[studioId] ?? "").trim();
    if (!email) return;
    setBusy(true);
    try {
      const res = await addMember({ data: { studioId, email, role: "owner" } });
      if (!res.ok) {
        toast.error(t.studios.noUser);
        return;
      }
      setMemberEmail((m) => ({ ...m, [studioId]: "" }));
      await studios.refetch();
      toast.success(t.studios.memberAdded);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-charcoal">{t.studios.title}</h1>

      <SectionCard>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label={t.studios.name}
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
          />
          <TextField
            label={t.studios.slug}
            value={form.slug}
            onChange={(v) => setForm({ ...form, slug: v })}
            hint="a-z, 0-9, -"
          />
          <TextField
            label={t.settings.street}
            value={form.street}
            onChange={(v) => setForm({ ...form, street: v })}
          />
          <div className="grid grid-cols-[8rem_1fr] gap-3">
            <TextField
              label={t.settings.zip}
              value={form.zip}
              onChange={(v) => setForm({ ...form, zip: v })}
            />
            <TextField
              label={t.studios.city}
              value={form.city}
              onChange={(v) => setForm({ ...form, city: v })}
            />
          </div>
          <TextField
            label={t.studios.timezone}
            value={form.timezone}
            onChange={(v) => setForm({ ...form, timezone: v })}
          />
        </div>
        <Button
          onClick={submit}
          disabled={busy}
          className="btn-gold rounded-sm px-6 py-4 text-xs uppercase tracking-[0.22em]"
        >
          {t.studios.create}
        </Button>
      </SectionCard>

      {studios.isLoading && <p className="text-sm text-charcoal-soft">{t.common.loading}</p>}

      <div className="space-y-4">
        {(studios.data?.studios ?? []).map((s) => (
          <SectionCard key={s.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-serif text-xl text-charcoal">{s.name}</div>
                <div className="mt-1 text-[0.66rem] uppercase tracking-[0.22em] text-charcoal-soft">
                  /{s.slug}
                  {s.city ? ` · ${s.city}` : ""} · {s.members} {t.studios.members}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-charcoal-soft">
                  {s.active ? t.studios.active : t.studios.inactive}
                </span>
                <Button
                  variant="outline"
                  className="rounded-sm"
                  disabled={busy}
                  onClick={async () => {
                    await toggle({ data: { studioId: s.id, active: !s.active } });
                    await studios.refetch();
                  }}
                >
                  {s.active ? t.studios.deactivate : t.studios.activate}
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                value={memberEmail[s.id] ?? ""}
                placeholder={t.studios.memberEmail}
                aria-label={t.studios.memberEmail}
                onChange={(e) => setMemberEmail((m) => ({ ...m, [s.id]: e.target.value }))}
                className="rounded-sm sm:max-w-sm"
              />
              <Button
                variant="outline"
                className="rounded-sm"
                disabled={busy}
                onClick={() => invite(s.id)}
              >
                {t.studios.addMember}
              </Button>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
