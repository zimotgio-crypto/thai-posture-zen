import { createFileRoute, Link } from "@tanstack/react-router";
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
            placeholder="Suchen: Name, E-Mail, Telefon…"
            className="pl-9 w-72"
          />
        </div>
      </div>

      <div className="rounded-sm border border-border/60 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ivory-deep/40 text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
            <tr>
              <th className="text-left px-5 py-3">Name</th>
              <th className="text-left px-5 py-3 hidden md:table-cell">E-Mail</th>
              <th className="text-left px-5 py-3 hidden sm:table-cell">Telefon</th>
              <th className="text-left px-5 py-3 hidden md:table-cell">Ort</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(clients.data ?? []).map((c) => (
              <tr key={c.id} className="border-t border-border/50 hover:bg-gold-soft/20">
                <td className="px-5 py-3 font-medium text-charcoal">
                  <Link to="/admin/clients/$id" params={{ id: c.id }}>
                    {c.name}
                  </Link>
                </td>
                <td className="px-5 py-3 text-charcoal-soft hidden md:table-cell">{c.email}</td>
                <td className="px-5 py-3 text-charcoal-soft hidden sm:table-cell">{c.phone}</td>
                <td className="px-5 py-3 text-charcoal-soft hidden md:table-cell">{c.city}</td>
                <td className="px-5 py-3 text-right">
                  <Link
                    to="/admin/clients/$id"
                    params={{ id: c.id }}
                    className="inline-flex items-center text-charcoal-soft hover:text-gold-deep"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {clients.data && clients.data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-charcoal-soft">
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