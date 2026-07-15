import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  const navigate = useNavigate();
  const clients = useQuery({
    queryKey: ["admin", "clients", q],
    queryFn: () => listFn({ data: { q: q || undefined } }),
  });

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
                onClick={() => navigate({ to: "/admin/clients/$id", params: { id: c.id } })}
                className="border-t border-border/50 cursor-pointer transition-colors hover:bg-gold-soft/30"
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
                  <Link
                    to="/admin/clients/$id"
                    params={{ id: c.id }}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Profil öffnen"
                    className="inline-flex items-center text-charcoal-soft hover:text-gold-deep"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
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