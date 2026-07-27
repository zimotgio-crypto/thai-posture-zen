import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { StudioText } from "@/components/studio-text";
import { useAdminT } from "@/lib/admin-i18n";
import { useAdminStudio } from "@/lib/admin-studio-context";
import { getCampaignDetail } from "@/lib/marketing.functions";

function swiss(day: string) {
  const [y, m, d] = day.split("-");
  return `${d}.${m}.${y}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border/60 bg-card px-4 py-3">
      <p className="text-[0.6rem] uppercase tracking-[0.2em] text-charcoal-soft">{label}</p>
      <p className="mt-1 font-serif text-xl text-charcoal">{value}</p>
    </div>
  );
}

export function CampaignDetail({ campaignId }: { campaignId: string }) {
  const t = useAdminT();
  const { studioId } = useAdminStudio();
  const detailFn = useServerFn(getCampaignDetail);
  const query = useQuery({
    queryKey: ["admin", "campaigns", "detail", studioId, campaignId],
    queryFn: () => detailFn({ data: { id: campaignId, studioId } }),
  });

  if (query.isLoading) return <p className="p-6 text-sm text-charcoal-soft">{t.common.loading}</p>;
  if (query.isError || !query.data)
    return <p className="p-6 text-sm text-charcoal-soft">{t.common.error}</p>;

  const { campaign, bookings, analytics } = query.data;

  return (
    <div className="space-y-8 p-2">
      <header>
        <p className="text-[0.6rem] uppercase tracking-[0.3em] text-gold-deep">
          {t.marketing.detail.title}
        </p>
        <h2 className="font-serif text-2xl text-charcoal">
          <StudioText>{campaign.title}</StudioText>
        </h2>
        <p className="mt-1 text-xs text-charcoal-soft">
          {campaign.code} · {swiss(campaign.valid_from)} – {swiss(campaign.valid_to)}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label={t.marketing.detail.redemptions}
          value={`${campaign.redemptions_used} / ${campaign.max_redemptions ?? t.marketing.unlimited}`}
        />
        <Metric
          label={t.marketing.detail.remaining}
          value={analytics.remaining === null ? t.marketing.unlimited : String(analytics.remaining)}
        />
        <Metric label={t.marketing.detail.revenue} value={`CHF ${analytics.revenue.toFixed(2)}`} />
        <Metric
          label={t.marketing.detail.discountCost}
          value={`CHF ${analytics.discountCost.toFixed(2)}`}
        />
        <Metric
          label={t.marketing.detail.contribution}
          value={`CHF ${analytics.contribution.toFixed(2)}`}
        />
        <Metric label={t.marketing.detail.newClients} value={String(analytics.newClients)} />
        <Metric
          label={t.marketing.detail.returnRate}
          value={
            analytics.returnRate === null ? "—" : `${Math.round(analytics.returnRate * 100)} %`
          }
        />
      </div>

      <section>
        <h3 className="mb-3 text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">
          {t.marketing.detail.bookings}
        </h3>
        <div className="rounded-sm border border-border/60 bg-card overflow-x-auto">
          <table className="w-full min-w-[620px] table-auto text-sm">
            <thead className="bg-ivory-deep/40 text-[0.62rem] uppercase tracking-[0.2em] text-charcoal-soft">
              <tr>
                <th className="px-4 py-3 text-left">{t.marketing.detail.colDate}</th>
                <th className="px-4 py-3 text-left">{t.marketing.detail.colName}</th>
                <th className="px-4 py-3 text-left">{t.marketing.detail.colTreatment}</th>
                <th className="px-4 py-3 text-left">{t.marketing.detail.colPrice}</th>
                <th className="px-4 py-3 text-left">{t.marketing.detail.colDiscount}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const client = b.clients as
                  | { id: string; first_name: string | null; last_name: string | null }
                  | null;
                const name = client
                  ? `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim()
                  : "—";
                return (
                  <tr key={b.id as string} className="border-t border-border/50">
                    <td className="whitespace-nowrap px-4 py-3 text-charcoal-soft">
                      {swiss(b.day as string)}
                    </td>
                    <td className="px-4 py-3">
                      {client ? (
                        <Link
                          to="/admin/clients"
                          search={{ client: client.id } as never}
                          className="text-charcoal underline-offset-4 hover:text-gold-deep hover:underline"
                        >
                          <StudioText>{name}</StudioText>
                        </Link>
                      ) : (
                        name
                      )}
                    </td>
                    <td className="px-4 py-3 text-charcoal-soft">
                      <StudioText>{b.treatment as string}</StudioText>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-charcoal-soft">
                      CHF {Number(b.price_chf ?? 0).toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-charcoal-soft">
                      CHF {Number(b.discount_chf ?? 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-charcoal-soft">
                    {t.marketing.detail.noBookings}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
