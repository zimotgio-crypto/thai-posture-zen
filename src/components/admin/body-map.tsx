import { useId } from "react";

export type BodyPoint = { x: number; y: number };
export type BodyMapState = { front: BodyPoint[]; back: BodyPoint[] };

export const EMPTY_BODY_MAP: BodyMapState = { front: [], back: [] };

const BODY_IMAGES = {
  front: "/images/body-front.png",
  back: "/images/body-back.png",
} as const;

type BodyView = keyof typeof BODY_IMAGES;

function BodyOutline({
  view,
  label,
  points,
  editable,
  onAdd,
  small,
}: {
  view: BodyView;
  label: string;
  points: BodyPoint[];
  editable?: boolean;
  onAdd?: (p: BodyPoint) => void;
  small?: boolean;
}) {
  const gradId = useId();
  const src = BODY_IMAGES[view];
  return (
    <div className="flex flex-col items-center gap-2">
      {!small && (
        <span className="text-[0.65rem] uppercase tracking-[0.3em] text-charcoal-soft">
          {label}
        </span>
      )}
      <div
        className={
          "relative inline-block " +
          (small
            ? "h-16"
            : "h-[380px] rounded-sm border border-border/60 bg-ivory")
        }
      >
        <img
          src={src}
          alt={label}
          draggable={false}
          className="h-full w-auto select-none object-contain"
        />
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          onClick={(e) => {
            if (!editable || !onAdd) return;
            const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            onAdd({ x, y });
          }}
          style={editable ? { cursor: "crosshair" } : undefined}
        >
          <defs>
            <radialGradient id={gradId}>
              <stop offset="0%" stopColor="rgb(220 38 38)" stopOpacity="0.9" />
              <stop offset="60%" stopColor="rgb(220 38 38)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="rgb(220 38 38)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {points.map((p, i) => (
            <g key={i} pointerEvents="none">
              <circle cx={p.x} cy={p.y} r={small ? 2.5 : 3.2} fill={`url(#${gradId})`} />
              <circle cx={p.x} cy={p.y} r={small ? 0.9 : 1.2} fill="rgb(220 38 38)" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export function BodyMapEditor({
  value,
  onChange,
}: {
  value: BodyMapState;
  onChange: (next: BodyMapState) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <BodyOutline
          view="front"
          label="Front"
          points={value.front}
          editable
          onAdd={(p) => onChange({ ...value, front: [...value.front, p] })}
        />
        <BodyOutline
          view="back"
          label="Back"
          points={value.back}
          editable
          onAdd={(p) => onChange({ ...value, back: [...value.back, p] })}
        />
      </div>
      <div className="rounded-sm border border-border/60 bg-card p-4">
        <div className="text-[0.65rem] uppercase tracking-[0.3em] text-gold-deep">
          Markierungstools
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-sm border border-gold/50 bg-gold-soft/30 px-3 py-2 text-xs uppercase tracking-[0.2em] text-charcoal">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 ring-4 ring-red-600/20" />
            Schmerzpunkt setzen
          </span>
          <button
            type="button"
            onClick={() => onChange(EMPTY_BODY_MAP)}
            className="rounded-sm border border-border/70 px-3 py-2 text-xs uppercase tracking-[0.2em] text-charcoal-soft transition hover:border-charcoal hover:text-charcoal"
          >
            Markierungen löschen
          </button>
          <span className="ml-auto text-xs text-charcoal-soft">
            {value.front.length + value.back.length} Markierung
            {value.front.length + value.back.length === 1 ? "" : "en"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function BodyMapThumbnail({ value }: { value: BodyMapState }) {
  return (
    <div className="flex gap-1">
      <BodyOutline view="front" label="Front" points={value.front} small />
      <BodyOutline view="back" label="Back" points={value.back} small />
    </div>
  );
}

export function parseBodyMap(raw: unknown): BodyMapState {
  if (!raw || typeof raw !== "object") return EMPTY_BODY_MAP;
  const r = raw as { front?: unknown; back?: unknown };
  const clean = (arr: unknown): BodyPoint[] =>
    Array.isArray(arr)
      ? arr
          .filter(
            (p): p is BodyPoint =>
              !!p && typeof (p as BodyPoint).x === "number" && typeof (p as BodyPoint).y === "number"
          )
          .map((p) => ({ x: p.x, y: p.y }))
      : [];
  return { front: clean(r.front), back: clean(r.back) };
}
