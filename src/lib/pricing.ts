// Central pricing/duration table used by both the public booking modal
// and admin dialogs. Prices are in CHF.
export type DurationOption = {
  minutes: number;
  price: number;
  label: string;
  meta: string;
};

export const DURATION_OPTIONS: DurationOption[] = [
  { minutes: 30, price: 60, label: "30 Min.", meta: "30 Min. · CHF 60.–" },
  { minutes: 60, price: 100, label: "60 Min.", meta: "60 Min. · CHF 100.–" },
  { minutes: 90, price: 150, label: "90 Min.", meta: "90 Min. · CHF 150.–" },
  { minutes: 120, price: 200, label: "120 Min.", meta: "120 Min. · CHF 200.–" },
];

export const BUFFER_MIN = 30;

export function priceFor(minutes: number): number {
  return DURATION_OPTIONS.find((d) => d.minutes === minutes)?.price ?? 0;
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "";
  return `${minutes} Min.`;
}

export function formatSwissDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}