import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin — Thai Posture Lab" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success("Account erstellt. Prüfe ggf. deine E-Mails zur Bestätigung.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/admin" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fehler beim Anmelden.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.3em] text-gold-deep">
            <Sparkles className="h-3.5 w-3.5" /> Studio-Admin
          </div>
          <h1 className="mt-3 font-serif text-3xl text-charcoal">Thai Posture Lab</h1>
          <p className="mt-2 text-sm text-charcoal-soft">Interner Zugang für das Studio-Team.</p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-sm border border-border/60 bg-card p-8 shadow-[var(--shadow-soft)] space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">
              E-Mail
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">
              Passwort
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="btn-gold w-full rounded-sm py-5 text-sm uppercase tracking-[0.24em] disabled:opacity-50"
          >
            {mode === "signup" ? "Konto erstellen" : "Anmelden"}
          </Button>
          <button
            type="button"
            onClick={() => setMode((m) => (m === "signup" ? "signin" : "signup"))}
            className="block w-full text-center text-xs uppercase tracking-[0.22em] text-charcoal-soft hover:text-charcoal"
          >
            {mode === "signup" ? "Schon ein Konto? Anmelden" : "Erstmalige Einrichtung? Konto erstellen"}
          </button>
        </form>
      </div>
    </div>
  );
}