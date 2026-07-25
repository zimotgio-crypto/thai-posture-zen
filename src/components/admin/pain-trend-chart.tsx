import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PAIN_COLORS } from "@/components/admin/assessment";
import { formatSwissDate } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export type PainTrendLog = {
  id: string;
  pain_level: number | null;
  treatment_date: string | null;
  treatment_name: string | null;
  created_at: string;
  bookings?: { day: string; treatment: string; duration_minutes?: number | null } | null;
};

export type PainTrendPoint = {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  pain: number;
};

export function derivePainTrendPoints(logs: PainTrendLog[]): PainTrendPoint[] {
  const pts: PainTrendPoint[] = [];
  for (const l of logs) {
    if (l.pain_level == null) continue;
    const linked = l.bookings ?? null;
    const headerDate = linked?.day ?? l.treatment_date ?? l.created_at.slice(0, 10);
    const label = linked?.treatment ?? l.treatment_name ?? "Manuelle Notiz";
    pts.push({ id: l.id, date: headerDate, label, pain: l.pain_level });
  }
  pts.sort((a, b) => a.date.localeCompare(b.date));
  return pts;
}

type Range = "all" | "3m" | "6m";

function filterByRange(points: PainTrendPoint[], range: Range): PainTrendPoint[] {
  if (range === "all") return points;
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - (range === "3m" ? 3 : 6));
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return points.filter((p) => p.date >= cutoffStr);
}

type ChartRow = {
  key: string;
  xLabel: string;
  pain: number;
  title: string;
  isAverage: boolean;
};

function aggregateMonthly(points: PainTrendPoint[]): ChartRow[] {
  const groups = new Map<string, number[]>();
  for (const p of points) {
    const ym = p.date.slice(0, 7); // YYYY-MM
    if (!groups.has(ym)) groups.set(ym, []);
    groups.get(ym)!.push(p.pain);
  }
  const rows: ChartRow[] = [];
  for (const [ym, values] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const rounded = Math.round(avg * 10) / 10;
    const [y, m] = ym.split("-");
    rows.push({
      key: ym,
      xLabel: `${m}.${y}`,
      pain: rounded,
      title: `${values.length} Behandlung${values.length === 1 ? "" : "en"}`,
      isAverage: true,
    });
  }
  return rows;
}

function toDailyRows(points: PainTrendPoint[]): ChartRow[] {
  return points.map((p) => ({
    key: p.id,
    xLabel: formatSwissDate(p.date),
    pain: p.pain,
    title: p.label,
    isAverage: false,
  }));
}

function colorForPain(v: number): string {
  const idx = Math.max(1, Math.min(10, Math.round(v))) - 1;
  return PAIN_COLORS[idx];
}

function CustomDot(props: { cx?: number; cy?: number; payload?: ChartRow }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={colorForPain(payload.pain)}
      stroke="var(--card, #fff)"
      strokeWidth={1.5}
    />
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartRow }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-sm border border-border/60 bg-card p-3 text-xs shadow-lg">
      <p className="font-medium">{row.xLabel}</p>
      <p className="text-charcoal-soft">{row.title}</p>
      <p className="mt-1">
        Schmerz: <span className="font-semibold" style={{ color: colorForPain(row.pain) }}>{row.pain}</span>/10
      </p>
    </div>
  );
}

const RANGE_OPTIONS: { key: Range; label: string }[] = [
  { key: "all", label: "Alle Termine" },
  { key: "3m", label: "Letzte 3 Monate" },
  { key: "6m", label: "Letzte 6 Monate" },
];

export function PainTrendDialog({
  open,
  onOpenChange,
  logs,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  logs: PainTrendLog[];
}) {
  const [range, setRange] = useState<Range>("all");
  const [monthly, setMonthly] = useState(false);

  const points = useMemo(() => derivePainTrendPoints(logs), [logs]);
  const filtered = useMemo(() => filterByRange(points, range), [points, range]);
  const rows = useMemo(
    () => (monthly ? aggregateMonthly(filtered) : toDailyRows(filtered)),
    [filtered, monthly],
  );

  const manyTicks = rows.length > 8;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Schmerzverlauf</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          {RANGE_OPTIONS.map((opt) => {
            const active = range === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className={cn(
                  "rounded-sm border px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.2em] transition-colors",
                  active
                    ? "border-gold-deep bg-gold-soft text-charcoal"
                    : "border-border/60 text-charcoal-soft hover:border-gold-deep/60 hover:text-gold-deep",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <Switch id="pain-monthly" checked={monthly} onCheckedChange={setMonthly} />
          <Label htmlFor="pain-monthly" className="text-xs text-charcoal-soft">
            Monats-Durchschnitt anzeigen
          </Label>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-sm border border-dashed border-border/70 px-4 py-8 text-center text-sm text-charcoal-soft">
            Keine Daten im gewählten Zeitraum.
          </p>
        ) : (
          <div className="h-64 w-full sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 10, right: 16, left: 0, bottom: manyTicks ? 24 : 8 }}>
                <CartesianGrid stroke="var(--border, #e5e5e5)" strokeOpacity={0.4} horizontal vertical={false} />
                <XAxis
                  dataKey="xLabel"
                  tick={{ fontSize: 11 }}
                  interval={manyTicks ? "preserveStartEnd" : 0}
                  angle={manyTicks ? -30 : 0}
                  textAnchor={manyTicks ? "end" : "middle"}
                  height={manyTicks ? 50 : 30}
                />
                <YAxis
                  domain={[1, 10]}
                  ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                  tick={{ fontSize: 11 }}
                  label={{ value: "Schmerz", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "var(--charcoal-soft)" } }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border, #e5e5e5)" }} />
                <Line
                  type="monotone"
                  dataKey="pain"
                  stroke="var(--gold-deep, #b48a3c)"
                  strokeWidth={2}
                  dot={<CustomDot />}
                  activeDot={<CustomDot />}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}