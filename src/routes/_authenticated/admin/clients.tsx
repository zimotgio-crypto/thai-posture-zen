import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, ChevronRight, Plus, Phone, Mail, MapPin, Sparkles } from "lucide-react";
import { addSessionLog, getClient, listClients } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddClientDialog } from "@/components/admin/add-client-dialog";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/clients")({
  component: ClientsPage,
});

type ClientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
};

function clientName(client: Pick<ClientRow, "first_name" | "last_name">) {
  return `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim();
}

function ClientsPage() {
  const [q, setQ] = useState("");
  const listFn = useServerFn(listClients);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const clients = useQuery({
    queryKey: ["admin", "clients", q],
    queryFn: () => listFn({ data: { q: q || undefined } }),
  });

  function handleRowClick(client: ClientRow) {
    setSelectedClient(client);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-2xl text-charcoal">Kunden</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-soft" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Suchen: Vor-, Nachname, E-Mail, Telefon…"
              className="pl-9 w-72"
            />
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="btn-gold rounded-sm px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.22em]"
          >
            <Plus className="h-4 w-4 mr-1" /> Kunde
          </Button>
        </div>
      </div>

      <div className="rounded-sm border border-border/60 bg-card overflow-x-auto">
        <table className="min-w-[1120px] w-full table-auto text-sm">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[24%]" />
            <col className="w-[14%]" />
            <col className="w-[22%]" />
            <col className="w-[8%]" />
            <col className="w-[10%]" />
            <col className="w-[4%]" />
          </colgroup>
          <thead className="bg-ivory-deep/40 text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
            <tr>
              <th className="min-w-[180px] px-5 py-3 text-left">Name</th>
              <th className="min-w-[240px] px-5 py-3 text-left">E-Mail</th>
              <th className="min-w-[150px] px-5 py-3 text-left">Telefon</th>
              <th className="min-w-[220px] px-5 py-3 text-left">Strasse / Nr.</th>
              <th className="min-w-[90px] px-5 py-3 text-left">PLZ</th>
              <th className="min-w-[120px] px-5 py-3 text-left">Ort</th>
              <th className="min-w-[64px]" />
            </tr>
          </thead>
          <tbody>
            {(clients.data ?? []).map((c) => (
              <tr
                key={c.id}
                role="link"
                tabIndex={0}
                aria-label={`Profil von ${clientName(c)} öffnen`}
                aria-current={selectedClient?.id === c.id ? "page" : undefined}
                onClick={() => handleRowClick(c)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleRowClick(c);
                  }
                }}
                className="cursor-pointer border-t border-border/50 transition-colors hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none"
              >
                <td className="min-w-[180px] px-5 py-3 font-medium text-charcoal truncate" title={clientName(c)}>
                  {clientName(c)}
                </td>
                <td className="min-w-[240px] px-5 py-3 text-charcoal-soft truncate" title={c.email ?? undefined}>
                  {c.email}
                </td>
                <td className="min-w-[150px] whitespace-nowrap px-5 py-3 text-charcoal-soft">{c.phone}</td>
                <td className="min-w-[220px] px-5 py-3 text-charcoal-soft truncate" title={c.street ?? undefined}>
                  {c.street}
                </td>
                <td className="min-w-[90px] whitespace-nowrap px-5 py-3 text-charcoal-soft">{c.zip}</td>
                <td className="min-w-[120px] whitespace-nowrap px-5 py-3 text-charcoal-soft" title={c.city ?? undefined}>
                  {c.city}
                </td>
                <td className="min-w-[64px] px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRowClick(c);
                    }}
                    aria-label="Profil öffnen"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-charcoal-soft transition-colors hover:bg-gold-soft/40 hover:text-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {clients.data && clients.data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-charcoal-soft">
                  Keine Kunden gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <AddClientDialog open={addOpen} onOpenChange={setAddOpen} />
      <Sheet open={Boolean(selectedClient)} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <SheetContent side="right" className="!w-[92vw] !max-w-none overflow-y-auto sm:!w-[760px]">
          {selectedClient && <ClientProfileSheet client={selectedClient} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ClientProfileSheet({ client }: { client: ClientRow }) {
  const qc = useQueryClient();
  const getClientFn = useServerFn(getClient);
  const addLog = useServerFn(addSessionLog);
  const [bodyHtml, setBodyHtml] = useState("");
  const [linkBookingId, setLinkBookingId] = useState("");
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "client", client.id],
    queryFn: () => getClientFn({ data: { id: client.id } }),
  });

  const loadedClient = q.data?.client ?? client;
  const bookings = q.data?.bookings ?? [];
  const logs = q.data?.logs ?? [];
  const pastBookings = useMemo(
    () => bookings.filter((b) => new Date(`${b.day}T${b.time}`) < new Date()),
    [bookings]
  );

  async function saveNote() {
    const text = bodyHtml.replace(/<[^>]+>/g, "").trim();
    if (!text) {
      toast.error("Notiz darf nicht leer sein.");
      return;
    }
    setBusy(true);
    try {
      await addLog({
        data: {
          clientId: client.id,
          bookingId: linkBookingId || null,
          bodyHtml,
        },
      });
      toast.success("Notiz gespeichert");
      setBodyHtml("");
      setLinkBookingId("");
      qc.invalidateQueries({ queryKey: ["admin", "client", client.id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-7 pr-2">
      <SheetHeader className="space-y-3 text-left">
        <div className="text-[0.68rem] uppercase tracking-[0.28em] text-gold-deep">Kundenprofil</div>
        <SheetTitle className="font-serif text-3xl font-normal text-charcoal">
          {clientName(loadedClient)}
        </SheetTitle>
      </SheetHeader>

      <section className="grid gap-3 rounded-sm border border-border/60 bg-ivory-deep/20 p-5 text-sm text-charcoal-soft sm:grid-cols-2">
        <span className="inline-flex min-w-0 items-center gap-2">
          <Phone className="h-4 w-4 shrink-0 text-gold-deep" />
          <span className="truncate">{loadedClient.phone}</span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-gold-deep" />
          <span className="truncate">{loadedClient.email}</span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-2 sm:col-span-2">
          <MapPin className="h-4 w-4 shrink-0 text-gold-deep" />
          <span className="select-text">
            {loadedClient.street}, {loadedClient.zip} {loadedClient.city}
          </span>
        </span>
      </section>

      <section>
        <h2 className="font-serif text-xl text-charcoal">Termine</h2>
        <div className="mt-4 divide-y divide-border/50 rounded-sm border border-border/60 bg-card">
          {q.isLoading && <p className="p-5 text-sm text-charcoal-soft">Lade Termine…</p>}
          {!q.isLoading && bookings.length === 0 && (
            <p className="p-5 text-sm text-charcoal-soft">Noch keine Termine.</p>
          )}
          {bookings.map((b) => (
            <div key={b.id} className="p-4">
              <div className="text-[0.65rem] uppercase tracking-[0.22em] text-charcoal-soft">
                {b.day} · {b.time}
              </div>
              <div className="mt-1 text-sm text-charcoal">{b.treatment}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <div className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.3em] text-gold-deep">
            <Sparkles className="h-3.5 w-3.5" /> Massagetagebuch
          </div>
          <h2 className="mt-2 font-serif text-2xl text-charcoal">Neuer Eintrag</h2>
        </div>
        {pastBookings.length > 0 && (
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">
              Termin verknüpfen (optional)
            </label>
            <select
              value={linkBookingId}
              onChange={(e) => setLinkBookingId(e.target.value)}
              className="mt-2 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— keiner —</option>
              {pastBookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.day} · {b.time} · {b.treatment}
                </option>
              ))}
            </select>
          </div>
        )}
        <TiptapEditor
          value={bodyHtml}
          onChange={setBodyHtml}
          placeholder="z.B. Verhärtung im oberen Trapezmuskel gelöst, Haltung leicht verbessert…"
        />
        <div className="flex justify-end">
          <Button
            onClick={saveNote}
            disabled={busy || q.isLoading}
            className="btn-gold rounded-sm px-6 py-4 text-[0.72rem] uppercase tracking-[0.22em] disabled:opacity-50"
          >
            Notiz speichern
          </Button>
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl text-charcoal">Verlauf</h2>
        <div className="mt-4 space-y-4">
          {!q.isLoading && logs.length === 0 && (
            <p className="rounded-sm border border-dashed border-border/70 px-4 py-8 text-center text-sm text-charcoal-soft">
              Noch keine Einträge im Massagetagebuch.
            </p>
          )}
          {logs.map((l) => (
            <article key={l.id} className="rounded-sm border border-border/60 bg-card p-5">
              <div className="text-[0.65rem] uppercase tracking-[0.22em] text-charcoal-soft">
                {new Date(l.created_at).toLocaleString("de-CH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
              <div
                className="prose prose-sm mt-3 max-w-none text-charcoal"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: rich-text notes authored by admin
                dangerouslySetInnerHTML={{ __html: l.body_html }}
              />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}