import { cn } from "@/lib/utils";

export type MobilityState = Record<string, string>;
export type TensionState = Record<string, string>;

export const MOBILITY_GROUPS: { key: string; label: string; options: string[] }[] = [
  {
    key: "neck",
    label: "Nacken / Halswirbelsäule-Drehung",
    options: ["Frei", "Leicht eingeschränkt", "Stark eingeschränkt", "Schmerzhaft"],
  },
  {
    key: "shoulder",
    label: "Schulterbeweglichkeit (Überkopf)",
    options: ["Volle Reichweite", "Eingeschränkt", "Schmerzausstrahlend"],
  },
  {
    key: "lumbar",
    label: "Lendenwirbelsäule / Rumpfvorbeuge",
    options: ["Schmerzfrei möglich", "Ziehen im unteren Rücken", "Stark blockiert"],
  },
  {
    key: "hip",
    label: "Hüftöffnung / Drehung",
    options: ["Gut / Frei", "Hüftbeuger verkürzt", "Anziehmuskeln eingeschränkt"],
  },
];

export const TENSION_GROUPS: { key: string; label: string; options: string[] }[] = [
  {
    key: "trapezius",
    label: "Nacken & Kapuzenmuskel",
    options: ["Normal", "Verspannt", "Verhärtet (Muskelverhärtungen)"],
  },
  {
    key: "shoulderGirdle",
    label: "Schultergürtel / Brust",
    options: ["Aufgerichtet", "Brustmuskel verkürzt", "Rundrücken-Tendenz"],
  },
  {
    key: "lowBack",
    label: "Unterer Rücken / Kreuzbein-Darmbein-Gelenk",
    options: ["Unauffällig", "Erhöhte Spannung", "Gelenkblockade / Beckenschiefstand"],
  },
  {
    key: "glutes",
    label: "Gesäss / Birnenmuskel",
    options: ["Entspannt", "Druckschmerzhaft", "Ischias-Ausstrahlung"],
  },
  {
    key: "fascia",
    label: "Faszienspannung",
    options: ["Weich / Elastisch", "Erhöhte Grundspannung", "Extrem fest / Verklebt"],
  },
  {
    key: "diaphragm",
    label: "Zwerchfell / Atmung",
    options: ["Tiefe Bauchatmung", "Flach / Zwerchfellspannung"],
  },
];

export const MOBILITY_LABELS: Record<string, string> = Object.fromEntries(
  MOBILITY_GROUPS.map((g) => [g.key, g.label]),
);
export const TENSION_LABELS: Record<string, string> = Object.fromEntries(
  TENSION_GROUPS.map((g) => [g.key, g.label]),
);

// Green (1) -> Red (10) gradient
const PAIN_COLORS = [
  "#16a34a", "#4ca934", "#7fbf1f", "#b5c910", "#e0c81a",
  "#f0b400", "#f39017", "#ee6a1f", "#e04426", "#c1272d",
];

export function PainScale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <div className="text-[0.7rem] uppercase tracking-[0.22em] text-charcoal-soft">
        Schmerzstufe / Intensität (1–10)
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(active ? null : n)}
              aria-pressed={active}
              aria-label={`Schmerzstufe ${n}`}
              className={cn(
                "h-9 w-9 rounded-sm border text-sm font-medium transition",
                active
                  ? "text-white border-transparent shadow-sm scale-105"
                  : "text-charcoal border-border/60 bg-card hover:border-gold-deep/50",
              )}
              style={active ? { backgroundColor: PAIN_COLORS[n - 1] } : { borderLeft: `3px solid ${PAIN_COLORS[n - 1]}` }}
            >
              {n}
            </button>
          );
        })}
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-2 text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft hover:text-charcoal"
          >
            Zurücksetzen
          </button>
        )}
      </div>
    </div>
  );
}

function OptionGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div>
      <div className="text-[0.65rem] uppercase tracking-[0.2em] text-charcoal-soft">{label}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(active ? undefined : opt)}
              aria-pressed={active}
              className={cn(
                "rounded-sm border px-3 py-1.5 text-xs transition",
                active
                  ? "border-gold-deep bg-gold-soft/60 text-gold-deep"
                  : "border-border/60 bg-card text-charcoal hover:border-gold-deep/40",
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MobilityEditor({
  value,
  onChange,
}: {
  value: MobilityState;
  onChange: (v: MobilityState) => void;
}) {
  return (
    <div className="space-y-4">
      {MOBILITY_GROUPS.map((g) => (
        <OptionGroup
          key={g.key}
          label={g.label}
          options={g.options}
          value={value[g.key]}
          onChange={(v) => {
            const next = { ...value };
            if (v === undefined) delete next[g.key];
            else next[g.key] = v;
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

export function TensionEditor({
  value,
  onChange,
}: {
  value: TensionState;
  onChange: (v: TensionState) => void;
}) {
  return (
    <div className="space-y-4">
      {TENSION_GROUPS.map((g) => (
        <OptionGroup
          key={g.key}
          label={g.label}
          options={g.options}
          value={value[g.key]}
          onChange={(v) => {
            const next = { ...value };
            if (v === undefined) delete next[g.key];
            else next[g.key] = v;
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

export function parseRecord(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim()) out[k] = v;
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
      Schmerz {value}/10
    </span>
  );
}

export function FindingsList({
  title,
  labels,
  data,
}: {
  title: string;
  labels: Record<string, string>;
  data: Record<string, string>;
}) {
  const entries = Object.entries(data).filter(([k, v]) => labels[k] && v);
  if (entries.length === 0) return null;
  return (
    <div>
      <div className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-gold-deep">
        {title}
      </div>
      <ul className="mt-1.5 space-y-1 text-xs text-charcoal">
        {entries.map(([k, v]) => (
          <li key={k} className="flex gap-2">
            <span className="text-charcoal-soft">{labels[k]}:</span>
            <span className="font-medium">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}