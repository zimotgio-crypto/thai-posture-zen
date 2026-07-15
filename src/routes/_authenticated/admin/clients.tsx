import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { listClients } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  const [q, setQ] = useState("");
  const listFn = useServerFn(listClients);
  const navigate = useNavigate({ from: "/admin/clients" });
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const clients = useQuery({
    queryKey: ["admin", "clients", q],
    queryFn: () => listFn({ data: { q: q || undefined } }),
  });

  function handleRowClick(clientId: string) {
    setSelectedClientId(clientId);
    navigate({ to: "/admin/clients/$id", params: { id: clientId } });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-2xl text-charcoal">Kunden</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-soft" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suchen: Vor-, Nachname, E-Mail, Telefon…"
            className="pl-9 w-72"
          />
        </div>
      </div>

      <div className="rounded-sm border border-border/60 bg-card overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[22%]" />
            <col className="w-[16%]" />
            <col className="w-[22%]" />
            <col className="w-[8%]" />
            <col className="w-[6%]" />
            <col className="w-[4%]" />
          </colgroup>
          <thead className="bg-ivory-deep/40 text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
            <tr>
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3 hidden md:table-cell">E-Mail</th>
              <th className="text-left px-5 py-3 hidden sm:table-cell">Telefon</th>
              <th className="text-left px-5 py-3 hidden md:table-cell">Strasse / Nr.</th>
              <th className="text-left px-5 py-3 hidden lg:table-cell">PLZ</th>
              <th className="text-left px-5 py-3 hidden md:table-cell">Ort</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(clients.data ?? []).map((c) => (
              <tr
                key={c.id}
                role="link"
                tabIndex={0}
                aria-label={`Profil von ${`${c.first_name} ${c.last_name}`.trim()} öffnen`}
                aria-current={selectedClientId === c.id ? "page" : undefined}
                onClick={() => handleRowClick(c.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleRowClick(c.id);
                  }
                }}
                className="border-t border-border/50 cursor-pointer transition-colors hover:bg-gold-soft/30 focus-visible:outline-none focus-visible:bg-gold-soft/30"
              >
                <td className="px-5 py-3 font-medium text-charcoal truncate">
                  {`${c.first_name} ${c.last_name}`.trim()}
                </td>
                <td className="px-5 py-3 text-charcoal-soft hidden md:table-cell truncate" title={c.email}>
                  {c.email}
                </td>
                <td className="px-5 py-3 text-charcoal-soft hidden sm:table-cell truncate">{c.phone}</td>
                <td className="px-5 py-3 text-charcoal-soft hidden md:table-cell truncate" title={c.street}>
                  {c.street}
                </td>
                <td className="px-5 py-3 text-charcoal-soft hidden lg:table-cell truncate">{c.zip}</td>
                <td className="px-5 py-3 text-charcoal-soft hidden md:table-cell truncate" title={c.city}>
                  {c.city}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRowClick(c.id);
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
    </div>
  );
}