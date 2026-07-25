import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ChevronRight, Plus } from "lucide-react";
import { listClients } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddClientDialog } from "@/components/admin/add-client-dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ClientProfileView } from "@/components/admin/client-profile-view";
import { useAdminT } from "@/lib/admin-i18n";

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
  const t = useAdminT();
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
        <h1 className="font-serif text-2xl text-charcoal">{t.clients.title}</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-soft" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.clients.searchPlaceholder}
              className="pl-9 w-72"
            />
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="btn-gold rounded-sm px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.22em]"
          >
            <Plus className="h-4 w-4 mr-1" /> {t.clients.add}
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
              <th className="min-w-[180px] px-5 py-3 text-left">{t.clients.colName}</th>
              <th className="min-w-[240px] px-5 py-3 text-left">{t.clients.colEmail}</th>
              <th className="min-w-[150px] px-5 py-3 text-left">{t.clients.colPhone}</th>
              <th className="min-w-[220px] px-5 py-3 text-left">{t.clients.colStreet}</th>
              <th className="min-w-[90px] px-5 py-3 text-left">{t.clients.colZip}</th>
              <th className="min-w-[120px] px-5 py-3 text-left">{t.clients.colCity}</th>
              <th className="min-w-[64px]" />
            </tr>
          </thead>
          <tbody>
            {(clients.data ?? []).map((c) => (
              <tr
                key={c.id}
                role="link"
                tabIndex={0}
                aria-label={t.clients.openProfileOf(clientName(c))}
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
                    aria-label={t.clients.openProfile}
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
                  {t.clients.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <AddClientDialog open={addOpen} onOpenChange={setAddOpen} />
      <Sheet open={Boolean(selectedClient)} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <SheetContent side="right" className="!w-[95vw] !max-w-none overflow-y-auto sm:!w-[1100px]">
          {selectedClient && (
            <ClientProfileView
              clientId={selectedClient.id}
              fallback={selectedClient}
              onDeleted={() => setSelectedClient(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

