import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Users, LogOut, Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { claimAdmin, getAdminStatus } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { AddBookingDialog } from "@/components/admin/add-booking-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Studio-Admin — Thai Posture Lab" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminShell,
});

function AdminShell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const getStatus = useServerFn(getAdminStatus);
  const claim = useServerFn(claimAdmin);

  const status = useQuery({
    queryKey: ["admin", "status"],
    queryFn: () => getStatus(),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function handleClaim() {
    try {
      const res = await claim();
      if (!res.ok) {
        toast.error("Es existiert bereits ein Admin-Konto.");
      } else {
        toast.success("Willkommen. Du bist jetzt Studio-Admin.");
        qc.invalidateQueries({ queryKey: ["admin", "status"] });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    }
  }

  if (status.isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-ivory">
        <p className="text-sm text-charcoal-soft">Lade…</p>
      </div>
    );
  }

  if (!status.data?.isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-ivory px-6">
        <div className="max-w-md text-center rounded-sm border border-border/60 bg-card p-10">
          <Sparkles className="mx-auto h-5 w-5 text-gold-deep" />
          <h1 className="mt-3 font-serif text-2xl text-charcoal">Studio-Admin</h1>
          {status.data?.canClaim ? (
            <>
              <p className="mt-3 text-sm text-charcoal-soft">
                Es ist noch kein Admin eingerichtet. Beanspruche jetzt den Zugang für dieses Konto.
              </p>
              <Button
                onClick={handleClaim}
                className="btn-gold mt-6 rounded-sm px-6 py-4 text-xs uppercase tracking-[0.22em]"
              >
                Admin-Zugang beanspruchen
              </Button>
            </>
          ) : (
            <p className="mt-3 text-sm text-charcoal-soft">
              Dieses Konto hat keinen Admin-Zugang.
            </p>
          )}
          <button
            onClick={signOut}
            className="mt-6 block w-full text-xs uppercase tracking-[0.22em] text-charcoal-soft hover:text-charcoal"
          >
            Abmelden
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { to: "/admin/calendar", label: "Kalender", icon: CalendarDays },
    { to: "/admin/clients", label: "Kunden", icon: Users },
  ] as const;

  return (
    <div className="min-h-screen bg-ivory">
      <header className="border-b border-border/60 bg-ivory/95 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/admin/calendar" className="flex flex-col leading-none">
            <span className="font-serif text-lg text-charcoal">Thai Posture Lab</span>
            <span className="text-[0.6rem] uppercase tracking-[0.3em] text-gold-deep">Studio-Admin</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((n) => {
              const active = pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
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
            <Button
              onClick={() => setAddOpen(true)}
              className="btn-gold rounded-sm px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.22em]"
            >
              <Plus className="h-4 w-4 mr-1" /> Termin
            </Button>
            <button
              onClick={signOut}
              aria-label="Abmelden"
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
                to={n.to}
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
  );
}