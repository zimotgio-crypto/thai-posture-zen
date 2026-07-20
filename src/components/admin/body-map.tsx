import { useId } from "react";

export type BodyPoint = { x: number; y: number };
export type BodyMapState = { front: BodyPoint[]; back: BodyPoint[] };

export const EMPTY_BODY_MAP: BodyMapState = { front: [], back: [] };

// Minimalist human outline path (proportional, viewBox 100x220).
// Same silhouette works for front and back — labels distinguish them.
const BODY_PATH =
  "M50 6c-6 0-10 4-10 10s4 11 10 11 10-5 10-11S56 6 50 6z" + // head
  "M40 29c-3 1-5 3-6 6l-4 14c-1 3-4 5-8 6l-8 3c-2 1-3 3-2 5 1 2 3 3 5 2l8-2 5-2-2 10-3 22c-1 4 1 7 5 8l3 1-2 30c0 4-2 24-3 34-1 4 2 7 6 7 3 0 5-2 6-6l4-32 2-18h4l2 18 4 32c1 4 3 6 6 6 4 0 7-3 6-7-1-10-3-30-3-34l-2-30 3-1c4-1 6-4 5-8l-3-22-2-10 5 2 8 2c2 1 4 0 5-2 1-2 0-4-2-5l-8-3c-4-1-7-3-8-6l-4-14c-1-3-3-5-6-6-3-1-6-2-10-2s-7 1-10 2z";

function BodyOutline({
  label,
  points,
  editable,
  onAdd,
  small,
}: {
  label: string;
  points: BodyPoint[];
  editable?: boolean;
  onAdd?: (p: BodyPoint) => void;
  small?: boolean;
}) {
  const gradId = useId();
  return (
    <div className="flex flex-col items-center gap-2">
      {!small && (
        <span className="text-[0.65rem] uppercase tracking-[0.3em] text-charcoal-soft">{label}</span>
      )}
      <svg
        viewBox="0 0 100 220"
        className={
          small
            ? "h-16 w-auto"
            : "h-[380px] w-auto max-w-full rounded-sm border border-border/60 bg-ivory"
        }
        onClick={(e) => {
          if (!editable || !onAdd) return;
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 220;
          onAdd({ x, y: (y / 220) * 100 });
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
        <path
          d={BODY_PATH}
          fill="rgba(0,0,0,0.02)"
          stroke="currentColor"
          strokeWidth={small ? 1.2 : 0.8}
          strokeLinejoin="round"
          className="text-charcoal-soft"
        />
        {points.map((p, i) => {
          const cx = p.x;
          const cy = (p.y / 100) * 220;
          return (
            <g key={i} pointerEvents="none">
              <circle cx={cx} cy={cy} r={small ? 3 : 5} fill={`url(#${gradId})`} />
              <circle cx={cx} cy={cy} r={small ? 1 : 1.6} fill="rgb(220 38 38)" />
            </g>
          );
        })}
      </svg>
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
          label="Front"
          points={value.front}
          editable
          onAdd={(p) => onChange({ ...value, front: [...value.front, p] })}
        />
        <BodyOutline
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
      <BodyOutline label="Front" points={value.front} small />
      <BodyOutline label="Back" points={value.back} small />
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