// Formatierungshelfer. Preise und Dauern kommen ausschliesslich aus der
// treatments-Tabelle des jeweiligen Studios.
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "";
  return `${minutes} Min.`;
}

export function formatSwissDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}