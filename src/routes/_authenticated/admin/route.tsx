import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Users, LogOut, Plus, Sparkles, Settings, Building2, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentStudio, listMyStudios } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { AddBookingDialog } from "@/components/admin/add-booking-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AdminLanguageProvider, useAdminLanguage, useAdminT } from "@/lib/admin-i18n";
import { AdminStudioProvider } from "@/lib/admin-studio-context";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Studio-Admin — Thai Posture Lab" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminShellWrapper,
});

function AdminShellWrapper() {
  return (
    <AdminLanguageProvider>
      <AdminShell />
    </AdminLanguageProvider>
  );
}

function LangToggle() {
  const { lang, setLang } = useAdminLanguage();
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center gap-1 text-[0.68rem] uppercase tracking-[0.22em] text-charcoal-soft"
    >
      <button
        onClick={() => setLang("de")}
        aria-pressed={lang === "de"}
        className={cn(
          "px-1 transition hover:text-charcoal",
          lang === "de" ? "text-gold-deep" : ""
        )}
      >
        DE
      </button>
      <span aria-hidden className="text-border">|</span>
      <button
        onClick={() => setLang("th")}
        aria-pressed={lang === "th"}
        className={cn(
          "px-1 transition hover:text-charcoal",
          lang === "th" ? "text-gold-deep" : ""
        )}
      >
        ไทย
      </button>
    </div>
  );
}

function AdminShell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const t = useAdminT();
  const { lang } = useAdminLanguage();
  const [addOpen, setAddOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const listStudiosFn = useServerFn(listMyStudios);
  const getStudioFn = useServerFn(getCurrentStudio);
  const [selectedStudioId, setSelectedStudioId] = useState<string | null>(null);

  const myStudios = useQuery({
    queryKey: ["admin", "my-studios"],
    queryFn: () => listStudiosFn(),
  });

  const studioId = selectedStudioId ?? myStudios.data?.studios[0]?.id ?? null;

  const currentStudio = useQuery({
    queryKey: ["admin", "current-studio", studioId],
    queryFn: () => getStudioFn({ data: studioId ? { studioId } : {} }),
    enabled: Boolean(studioId),
  });

  function switchStudio(id: string) {
    setSelectedStudioId(id);
    qc.removeQueries({ queryKey: ["admin", "bookings"] });
    qc.removeQueries({ queryKey: ["admin", "clients"] });
    qc.removeQueries({ queryKey: ["admin", "client"] });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (myStudios.isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-ivory" data-lang={lang}>
        <p className="text-sm text-charcoal-soft">{t.common.loading}</p>
      </div>
    );
  }

  if (myStudios.isError) {
    return (
      <div className="min-h-screen grid place-items-center bg-ivory px-6" data-lang={lang}>
        <div className="max-w-md text-center rounded-sm border border-border/60 bg-card p-10">
          <Sparkles className="mx-auto h-5 w-5 text-gold-deep" />
          <h1 className="mt-3 font-serif text-2xl text-charcoal">{t.shell.subtitle}</h1>
          <p className="mt-3 text-sm text-charcoal-soft">{t.shell.noAccess}</p>
          <button
            onClick={signOut}
            className="mt-6 block w-full text-xs uppercase tracking-[0.22em] text-charcoal-soft hover:text-charcoal"
          >
            {t.shell.signOut}
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { to: "/admin/calendar", label: t.shell.calendar, icon: CalendarDays },
    { to: "/admin/clients", label: t.shell.clients, icon: Users },
    { to: "/admin/marketing", label: t.marketing.title, icon: Megaphone },
    { to: "/admin/einstellungen", label: t.settings.title, icon: Settings },
    ...(myStudios.data?.isPlatformAdmin
      ? [{ to: "/admin/studios", label: t.studios.title, icon: Building2 } as const]
      : []),
  ] as { to: string; label: string; icon: typeof CalendarDays }[];

  // Signed in, but not linked to any studio yet.
  if (myStudios.isSuccess && myStudios.data.studios.length === 0) {
    return (
      <div className="min-h-screen grid place-items-center bg-ivory px-6" data-lang={lang}>
        <div className="max-w-md text-center rounded-sm border border-border/60 bg-card p-10">
          <Sparkles className="mx-auto h-5 w-5 text-gold-deep" />
          <h1 className="mt-3 font-serif text-2xl text-charcoal">Kein Studio zugeordnet</h1>
          <p className="mt-3 text-sm text-charcoal-soft">
            Dein Konto ist noch keinem Studio zugeordnet. Bitte wende dich an den Betreiber.
          </p>
          <button
            onClick={signOut}
            className="mt-6 block w-full text-xs uppercase tracking-[0.22em] text-charcoal-soft hover:text-charcoal"
          >
            {t.shell.signOut}
          </button>
        </div>
      </div>
    );
  }

  if (!studioId || !currentStudio.data) {
    return (
      <div className="min-h-screen grid place-items-center bg-ivory" data-lang={lang}>
        <p className="text-sm text-charcoal-soft">{t.common.loading}</p>
      </div>
    );
  }

  const studio = currentStudio.data.studio;

  return (
   <AdminStudioProvider
     value={{
       studioId,
       studio: {
         id: studio.id,
         slug: studio.slug,
         name: studio.name,
         street: studio.street,
         zip: studio.zip,
         city: studio.city,
         phone: studio.phone,
         email: studio.email,
       },
       treatments: currentStudio.data.treatments.map((tr) => ({
         key: tr.key,
         label: tr.label,
         options: tr.options,
       })),
       studios: myStudios.data?.studios ?? [],
       isPlatformAdmin: myStudios.data?.isPlatformAdmin ?? false,
       setStudioId: switchStudio,
     }}
   >
    <div className="min-h-screen bg-ivory" data-lang={lang}>
      <header className="border-b border-border/60 bg-ivory/95 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/admin/calendar" className="flex flex-col leading-none">
            <span className="font-serif text-lg text-charcoal">{studio.name}</span>
            <span className="text-[0.6rem] uppercase tracking-[0.3em] text-gold-deep">
              {studio.city ?? t.shell.subtitle}
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((n) => {
              const active = pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to as "/admin/calendar"}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-sm px-4 py-2 text-[0.72rem] uppercase tracking-[0.22em] transition",
                    active
                      ? "bg-gold-soft/60 text-gold-deep"
                      : "text-charcoal-soft hover:bg-gold-soft/30 hover:text-charcoal"
                  )}
                >
                  <n.icon className="h-4 w-4" /> {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3">
            {(myStudios.data?.isPlatformAdmin ?? false) &&
              (myStudios.data?.studios.length ?? 0) > 1 && (
                <select
                  aria-label="Studio"
                  value={studioId}
                  onChange={(e) => switchStudio(e.target.value)}
                  className="rounded-sm border border-border/60 bg-card px-2 py-1.5 text-[0.7rem] uppercase tracking-[0.16em] text-charcoal"
                >
                  {myStudios.data?.studios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.city ? ` · ${s.city}` : ""}
                    </option>
                  ))}
                </select>
              )}
            <LangToggle />
            <Button
              onClick={() => setAddOpen(true)}
              className="btn-gold rounded-sm px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.22em]"
            >
              <Plus className="h-4 w-4 mr-1" /> {t.shell.addBooking}
            </Button>
            <button
              onClick={signOut}
              aria-label={t.shell.signOut}
              className="flex h-9 w-9 items-center justify-center rounded-sm text-charcoal-soft hover:bg-gold-soft/30 hover:text-charcoal"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="md:hidden border-t border-border/60 mx-auto max-w-7xl flex items-center px-6 py-2 gap-1">
          {navItems.map((n) => {
            const active = pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to as "/admin/calendar"}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-2 rounded-sm px-3 py-2 text-[0.7rem] uppercase tracking-[0.2em] transition",
                  active ? "bg-gold-soft/60 text-gold-deep" : "text-charcoal-soft"
                )}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>

      <AddBookingDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
   </AdminStudioProvider>
  );
}