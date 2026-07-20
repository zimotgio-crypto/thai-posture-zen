import { useId } from "react";

export type BodyPoint = { x: number; y: number };
export type BodyMapState = { front: BodyPoint[]; back: BodyPoint[] };

export const EMPTY_BODY_MAP: BodyMapState = { front: [], back: [] };

// Detailed anatomical line-art human figures (viewBox 100x220).
// Shared silhouette outline (torso, arms, legs) used by both front and back.
const SILHOUETTE_D =
  // head
  "M50 6c-6 0-10.5 4.2-10.5 10.5 0 3.2 1.1 6 3 8.2 -0.4 1.6 -0.6 3.1 -0.6 4.3 0 0.6 0.1 1.2 0.3 1.8 " +
  // neck
  "-1.4 0.6 -2.6 1.4 -3.7 2.3 " +
  // shoulders + arms down to hands
  "-2.6 2.1 -6.3 3.6 -10 4.8 l-8 2.6 c-3.4 1.2 -6.3 3.3 -8.3 6.3 " +
  "-1.4 2.1 -2.4 4.6 -3 7.3 l-3 14 c-0.6 2.8 -0.8 5.4 -0.6 7.8 0.1 1.4 -0.1 2.8 -0.6 4.1 l-2.4 6.5 " +
  "c-0.4 1.1 0.2 2.3 1.3 2.6 1.1 0.3 2.3 -0.4 2.6 -1.5 l1.9 -5.6 c0.5 -1.4 1.2 -2.7 2.1 -3.9 " +
  "0.6 2.6 1.6 5.2 2.9 7.6 1.1 1.9 1.8 3.9 2.1 6 l1.4 8.4 c0.2 1.1 1.2 1.9 2.3 1.7 1.1 -0.2 1.9 -1.2 1.7 -2.3 " +
  "l-1.4 -8.5 c-0.3 -2.3 -1 -4.5 -2.1 -6.5 -2.2 -4 -3.5 -8.4 -3.8 -12.9 l-0.4 -5.8 c-0.1 -2 0.1 -4 0.6 -5.9 l3 -11.6 " +
  // side of torso down to hip
  "c0.4 -1.5 1.3 -2.8 2.5 -3.7 l0.4 8 c0.3 5.6 1 11.2 2.2 16.7 l3.4 15.7 c0.4 1.9 0.5 3.9 0.3 5.9 " +
  "l-1.6 15.2 c-0.2 1.8 -0.5 3.5 -1 5.2 " +
  // left leg down
  "l-4.4 15.4 c-0.5 1.7 -0.9 3.5 -1.1 5.3 l-2.2 18.6 c-0.2 1.7 -0.4 3.5 -0.6 5.2 l-1.4 11.7 " +
  "c-0.2 1.5 0.9 2.9 2.4 3 1.5 0.1 2.9 -1 3 -2.5 l1.4 -11.7 c0.2 -1.7 0.4 -3.4 0.6 -5.1 l2.2 -18.5 " +
  "c0.2 -1.6 0.5 -3.2 1 -4.7 l4.2 -14.7 c0.7 -2.4 1.2 -4.8 1.5 -7.3 l1.4 -12.4 " +
  // feet left
  "c0.2 -1.8 0.6 -3.6 1.1 -5.3 l1.3 -4.3 c0.6 -2 3.4 -2 4 0 l1.3 4.3 c0.5 1.7 0.9 3.5 1.1 5.3 " +
  "l1.4 12.4 c0.3 2.5 0.8 4.9 1.5 7.3 l4.2 14.7 c0.4 1.5 0.8 3.1 1 4.7 l2.2 18.5 c0.2 1.7 0.4 3.4 0.6 5.1 " +
  // right leg up
  "l1.4 11.7 c0.1 1.5 1.5 2.6 3 2.5 1.5 -0.1 2.6 -1.5 2.4 -3 l-1.4 -11.7 c-0.2 -1.7 -0.4 -3.5 -0.6 -5.2 " +
  "l-2.2 -18.6 c-0.2 -1.8 -0.6 -3.6 -1.1 -5.3 l-4.4 -15.4 c-0.5 -1.7 -0.8 -3.4 -1 -5.2 l-1.6 -15.2 " +
  "c-0.2 -2 -0.1 -4 0.3 -5.9 l3.4 -15.7 c1.2 -5.5 1.9 -11.1 2.2 -16.7 l0.4 -8 c1.2 0.9 2.1 2.2 2.5 3.7 " +
  "l3 11.6 c0.5 1.9 0.7 3.9 0.6 5.9 l-0.4 5.8 c-0.3 4.5 -1.6 8.9 -3.8 12.9 -1.1 2 -1.8 4.2 -2.1 6.5 " +
  "l-1.4 8.5 c-0.2 1.1 0.6 2.1 1.7 2.3 1.1 0.2 2.1 -0.6 2.3 -1.7 l1.4 -8.4 c0.3 -2.1 1 -4.1 2.1 -6 " +
  "1.3 -2.4 2.3 -5 2.9 -7.6 0.9 1.2 1.6 2.5 2.1 3.9 l1.9 5.6 c0.3 1.1 1.5 1.8 2.6 1.5 1.1 -0.3 1.7 -1.5 1.3 -2.6 " +
  "l-2.4 -6.5 c-0.5 -1.3 -0.7 -2.7 -0.6 -4.1 0.2 -2.4 0 -5 -0.6 -7.8 l-3 -14 c-0.6 -2.7 -1.6 -5.2 -3 -7.3 " +
  "-2 -3 -4.9 -5.1 -8.3 -6.3 l-8 -2.6 c-3.7 -1.2 -7.4 -2.7 -10 -4.8 -1.1 -0.9 -2.3 -1.7 -3.7 -2.3 " +
  "0.2 -0.6 0.3 -1.2 0.3 -1.8 0 -1.2 -0.2 -2.7 -0.6 -4.3 1.9 -2.2 3 -5 3 -8.2 C60.5 10.2 56 6 50 6 z";

// Front-only anatomical detail lines (face, chest, abs, knees, palms).
const FRONT_DETAILS: string[] = [
  // face: eye line
  "M45.5 15.5 h2 M52.5 15.5 h2",
  // nose
  "M50 17 v3",
  // mouth
  "M47.5 22 q2.5 1.5 5 0",
  // collarbones
  "M39 33 q11 3 22 0",
  // sternum
  "M50 33 v18",
  // pectoral curve
  "M40 36 q10 8 20 0",
  // ribcage / lower chest
  "M42 52 q8 4 16 0",
  // linea alba (abs center)
  "M50 52 v22",
  // ab creases
  "M44 60 q6 3 12 0 M44 66 q6 3 12 0 M44 72 q6 3 12 0",
  // navel
  "M50 78 v2",
  // hip crease
  "M40 92 q10 5 20 0",
  // knees
  "M42 148 q3 3 6 0 M52 148 q3 3 6 0",
  // palm crease left
  "M15 96 q3 2 6 0 M85 96 q-3 2 -6 0",
  // fingers left hand
  "M14 100 v6 M17 100 v7 M20 100 v6 M23 100 v5",
  // fingers right hand
  "M86 100 v6 M83 100 v7 M80 100 v6 M77 100 v5",
];

// Back-only anatomical detail lines (spine, scapula, glutes, hamstrings, heels).
const BACK_DETAILS: string[] = [
  // back of head hairline
  "M42 20 q8 -3 16 0",
  // trapezius upper line
  "M40 32 q10 -5 20 0",
  // spine (long central line)
  "M50 33 v55",
  // shoulder blades (scapulae)
  "M42 40 q4 8 8 8 M58 40 q-4 8 -8 8",
  // mid-back ribs hints
  "M44 56 q6 3 12 0",
  // lower back / lumbar
  "M44 78 q6 4 12 0",
  // sacrum triangle
  "M46 88 l4 6 4 -6",
  // gluteal cleft
  "M50 96 v10",
  // gluteal curves
  "M42 96 q8 8 16 0",
  // hamstring center lines
  "M42 118 v20 M58 118 v20",
  // knee back creases
  "M42 148 h6 M52 148 h6",
  // calf definition
  "M40 165 q4 6 8 0 M52 165 q4 6 8 0",
  // achilles / heels
  "M43 198 v6 M53 198 v6",
  // knuckle lines back of hand
  "M14 100 v5 M17 100 v6 M20 100 v5 M23 100 v4",
  "M86 100 v5 M83 100 v6 M80 100 v5 M77 100 v4",
];

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