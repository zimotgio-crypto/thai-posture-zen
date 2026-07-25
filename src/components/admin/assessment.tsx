import { cn } from "@/lib/utils";

export type ZoneScores = Partial<Record<string, number>>;

export const TENSION_ZONES = {
  kopf: "Kopf",
  nacken: "Nacken",
  schulterblatt: "Schulterblatt",
  arme: "Arme",
  haende: "Hände",
  oberschenkel: "Oberschenkel",
  fuesse: "Füsse",
  waden: "Waden",
  gesaess: "Gesäss",
  obererRuecken: "Oberer Rücken",
  untererRuecken: "Unterer Rücken",
  brust: "Brust",
  bauch: "Bauch",
  faszienAllgemein: "Faszien (Allgemein)",
} as const;

export const MOBILITY_ZONES = {
  halswirbelsaeule: "Halswirbelsäule & Nackendrehung",
  schultergurtel: "Schultergürtel (Überkopf & Rotation)",
  brustwirbelsaeule: "Brustwirbelsäule & Aufrichtung",
  lendenwirbelsaeule: "Lendenwirbelsäule & Rumpfbeugung",
  hueftoeffnung: "Hüftöffnung & Adduktoren",
} as const;

export type TensionZoneKey = keyof typeof TENSION_ZONES;
export type MobilityZoneKey = keyof typeof MOBILITY_ZONES;

export const TENSION_ZONES_LIST: { key: string; label: string }[] = Object.entries(TENSION_ZONES).map(
  ([key, label]) => ({ key, label }),
);
export const MOBILITY_ZONES_LIST: { key: string; label: string }[] = Object.entries(MOBILITY_ZONES).map(
  ([key, label]) => ({ key, label }),
);

export function initialZoneScores(zones: { key: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const z of zones) out[z.key] = 1;
  return out;
}

// Green (1) -> Red (10) gradient
export const PAIN_COLORS = [
  "#16a34a", "#4ca934", "#7fbf1f", "#b5c910", "#e0c81a",
  "#f0b400", "#f39017", "#ee6a1f", "#e04426", "#c1272d",
];

export function ZoneScaleGrid({
  zones,
  value,
  onChange,
  leftHint,
  rightHint,
}: {
  zones: { key: string; label: string }[];
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
  leftHint: string;
  rightHint: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-[0.6rem] uppercase tracking-[0.2em] text-charcoal-soft">
        <span>{leftHint}</span>
        <span>{rightHint}</span>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
        {zones.map((z) => {
          const current = value[z.key] ?? 1;
          return (
            <div key={z.key} className="flex items-center gap-3">
              <div className="w-[40%] shrink-0 truncate text-xs text-charcoal" title={z.label}>
                {z.label}
              </div>
              <div className="flex flex-1 items-center gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                  const active = current === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onChange({ ...value, [z.key]: n })}
                      aria-pressed={active}
                      aria-label={`${z.label}: ${n}`}
                      className={cn(
                        "h-6 w-6 rounded-sm border text-[0.65rem] font-medium transition",
                        active
                          ? "text-white border-transparent shadow-sm"
                          : "text-charcoal border-border/60 bg-card hover:border-gold-deep/50",
                      )}
                      style={active ? { backgroundColor: PAIN_COLORS[n - 1] } : undefined}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function parseZoneScores(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 10) {
      out[k] = Math.round(v);
    }
  }
  return out;
}

export function PainBadge({ value }: { value: number | null | undefined }) {
  if (value == null) return null;
  const color = PAIN_COLORS[Math.max(1, Math.min(10, value)) - 1];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.18em]"
      style={{ borderColor: color, color }}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      Max. Spannung {value}/10
    </span>
  );
}

export function ZoneScoreBadgeGrid({
  labels,
  data,
}: {
  labels: Record<string, string>;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data).filter(([k, v]) => labels[k] && typeof v === "number");
  if (entries.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {entries.map(([k, v]) => {
        const color = PAIN_COLORS[Math.max(1, Math.min(10, v)) - 1];
        return (
          <div
            key={k}
            className="flex items-center justify-between gap-2 rounded-sm border px-2 py-1.5 text-[0.68rem]"
            style={{ borderColor: color }}
          >
            <span className="truncate text-charcoal" title={labels[k]}>
              {labels[k]}
            </span>
            <span
              className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-sm px-1 text-[0.65rem] font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              {v}
            </span>
          </div>
        );
      })}
    </div>
  );
}