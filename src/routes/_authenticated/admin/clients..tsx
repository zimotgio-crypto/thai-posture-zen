import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ClientProfileView } from "@/components/admin/client-profile-view";

export const Route = createFileRoute("/_authenticated/admin/clients/")({
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const navigate = Route.useNavigate();
  return (
    <div className="space-y-8">
      <Link
        to="/admin/clients"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-charcoal-soft hover:text-charcoal"
      >
        <ArrowLeft className="h-3 w-3" /> Alle Kunden
      </Link>
      <ClientProfileView
        clientId={id}
        onDeleted={() => navigate({ to: "/admin/clients" })}
      />
    </div>
  );
}
