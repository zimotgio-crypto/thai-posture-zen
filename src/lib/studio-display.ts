// Client-safe formatting helpers for studio master data coming from the database.
import type { PublicStudio } from "@/lib/studio-public.functions";

export function fill(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map((n) => Number(n));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export type HoursLine = { d: string; h: string };

// Groups consecutive weekdays (Mon → Sun) with identical windows into one line.
export function formatOpeningHours(
  openingHours: Record<string, { open: number; close: number }>,
  weekdayNames: readonly string[],
  closedLabel: string,
): HoursLine[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const cells = order.map((wd) => {
    const win = openingHours[String(wd)];
    return {
      name: weekdayNames[wd] ?? String(wd),
      value: win ? `${minutesToTime(win.open)} – ${minutesToTime(win.close)}` : closedLabel,
    };
  });
  const lines: HoursLine[] = [];
  let i = 0;
  while (i < cells.length) {
    let j = i;
    while (j + 1 < cells.length && cells[j + 1].value === cells[i].value) j++;
    const label = i === j ? cells[i].name : `${cells[i].name} – ${cells[j].name}`;
    lines.push({ d: label, h: cells[i].value });
    i = j + 1;
  }
  return lines;
}

export function addressLinesOf(
  studio: Pick<PublicStudio, "street" | "zip" | "city" | "country">,
  countries: Record<string, string>,
): string[] {
  const lines: string[] = [];
  if (studio.street) lines.push(studio.street);
  const cityLine = [studio.zip, studio.city].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  if (studio.country) lines.push(countries[studio.country] ?? studio.country);
  return lines;
}

export function mapsQueryOf(
  studio: Pick<PublicStudio, "street" | "zip" | "city">,
): string {
  return [studio.street, studio.zip, studio.city].filter(Boolean).join(" ");
}

export function formatPrice(price: number): string {
  return `CHF ${price}.–`;
}
