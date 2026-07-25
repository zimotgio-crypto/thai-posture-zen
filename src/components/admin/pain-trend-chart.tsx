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
import {
  PAIN_COLORS,
  TENSION_ZONES,
  MOBILITY_ZONES,
  parseZoneScores,
} from "@/components/admin/assessment";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatSwissDate } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useAdminT, type AdminDict } from "@/lib/admin-i18n";

export type PainTrendLog = {
  id: string;
  pain_level: number | null;
  treatment_date: string | null;
  treatment_name: string | null;
  created_at: string;
  mobility: unknown;
  tension: unknown;
  bookings?: { day: string; treatment: string; duration_minutes?: number | null } | null;
};

export type PainTrendPoint = {
  id: string;
  date: string; // YYYY-MM-DD
  label: string;
  pain: number;
};

type MetricSource = "aggregate" | "tension" | "mobility";
export type MetricOption = { value: string; label: string; source: MetricSource };

function buildMetricOptions(t: AdminDict): { group: string; options: MetricOption[] }[] {
  return [
    {
      group: t.painTrend.groupTotal,
      options: [{ value: "aggregate", label: t.painTrend.aggregateLabel, source: "aggregate" }],
    },
    {
      group: t.painTrend.groupTension,
      options: Object.keys(TENSION_ZONES).map((key) => ({
        value: key,
        label: (t.tensionZones as Record<string, string>)[key] ?? key,
        source: "tension" as const,
      })),
    },
    {
      group: t.painTrend.groupMobility,
      options: Object.keys(MOBILITY_ZONES).map((key) => ({
        value: key,
        label: (t.mobilityZones as Record<string, string>)[key] ?? key,
        source: "mobility" as const,
      })),
    },
  ];
}

export function derivePainTrendPoints(
  logs: PainTrendLog[],
  metric: MetricOption,
  manualLabel = "Manuelle Notiz",
): PainTrendPoint[] {
  const pts: PainTrendPoint[] = [];
  for (const l of logs) {
    let value: number | null = null;
    if (metric.source === "aggregate") {
      value = l.pain_level;
    } else {
      const scores = parseZoneScores(metric.source === "tension" ? l.tension : l.mobility);
      value = scores[metric.value] ?? null;
    }
    if (value == null) continue;
    const linked = l.bookings ?? null;
    const headerDate = linked?.day ?? l.treatment_date ?? l.created_at.slice(0, 10);
    const label = linked?.treatment ?? l.treatment_name ?? manualLabel;
    pts.push({ id: l.id, date: headerDate, label, pain: value });
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

function aggregateMonthly(
  points: PainTrendPoint[],
  singular = "Behandlung",
  plural = "Behandlungen",
): ChartRow[] {
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
      title: `${values.length} ${values.length === 1 ? singular : plural}`,
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

function CustomTooltip({
  active,
  payload,
  metricLabel,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
  metricLabel: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-sm border border-border/60 bg-card p-3 text-xs shadow-lg">
      <p className="font-medium">{row.xLabel}</p>
      <p className="text-charcoal-soft">{row.title}</p>
      <p className="mt-1">
        {metricLabel}: <span className="font-semibold" style={{ color: colorForPain(row.pain) }}>{row.pain}</span>/10
      </p>
    </div>
  );
}

export function PainTrendDialog({
  open,
  onOpenChange,
  logs,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  logs: PainTrendLog[];
}) {
  const t = useAdminT();
  const METRIC_OPTIONS = useMemo(() => buildMetricOptions(t), [t]);
  const RANGE_OPTIONS: { key: Range; label: string }[] = [
    { key: "all", label: t.painTrend.rangeAll },
    { key: "3m", label: t.painTrend.range3m },
    { key: "6m", label: t.painTrend.range6m },
  ];
  const [range, setRange] = useState<Range>("all");
  const [monthly, setMonthly] = useState(false);
  const [metricValue, setMetricValue] = useState<string>("aggregate");
  const metric =
    METRIC_OPTIONS.flatMap((g) => g.options).find((o) => o.value === metricValue) ??
    METRIC_OPTIONS[0].options[0];

  const points = useMemo(
    () => derivePainTrendPoints(logs, metric, t.profile.manualNote),
    [logs, metric, t],
  );
  const filtered = useMemo(() => filterByRange(points, range), [points, range]);
  const rows = useMemo(
    () =>
      monthly
        ? aggregateMonthly(filtered, t.painTrend.treatmentsSingular, t.painTrend.treatmentsPlural)
        : toDailyRows(filtered),
    [filtered, monthly, t],
  );

  const manyTicks = rows.length > 8;
  const yAxisLabel = metric.label.length > 16 ? `${metric.label.slice(0, 16)}…` : metric.label;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t.painTrend.title}</DialogTitle>
          <p className="text-xs uppercase tracking-[0.2em] text-charcoal-soft">{metric.label}</p>
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
          <Select
            value={metric.value}
            onValueChange={setMetricValue}
          >
            <SelectTrigger className="ml-auto h-8 w-[240px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRIC_OPTIONS.map((g, i) => (
                <SelectGroup key={g.group}>
                  {i > 0 && <SelectSeparator />}
                  <SelectLabel>{g.group}</SelectLabel>
                  {g.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <Switch id="pain-monthly" checked={monthly} onCheckedChange={setMonthly} />
          <Label htmlFor="pain-monthly" className="text-xs text-charcoal-soft">
            {t.painTrend.monthly}
          </Label>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-sm border border-dashed border-border/70 px-4 py-8 text-center text-sm text-charcoal-soft">
            {t.painTrend.empty}
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
                  label={{ value: yAxisLabel, angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "var(--charcoal-soft)" } }}
                />
                <Tooltip content={<CustomTooltip metricLabel={metric.label} />} cursor={{ stroke: "var(--border, #e5e5e5)" }} />
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