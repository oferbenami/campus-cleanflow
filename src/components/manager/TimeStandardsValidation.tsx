import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { FlaskConical, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { TaskAssignment } from "@/data/mockData";
import { BASE_TIME_LABELS } from "@/lib/scheduling-engine";

interface SpaceCategoryStats {
  category: string;
  label: string;
  calculatedMinutes: number;
  avgActualMinutes: number;
  sampleCount: number;
  deviationPercent: number;
}

interface TimeStandardsValidationProps {
  assignments: TaskAssignment[];
}

const TimeStandardsValidation = ({ assignments }: TimeStandardsValidationProps) => {
  const stats = useMemo(() => {
    // Group completed assignments by roomType (space category)
    const grouped = new Map<string, { planned: number[]; actual: number[] }>();

    for (const a of assignments) {
      if (a.status !== "completed" || a.elapsedMinutes === undefined) continue;
      const cat = a.task.zone.roomType?.toLowerCase().replace(/\s+/g, "_") || "general";
      const entry = grouped.get(cat) || { planned: [], actual: [] };
      entry.planned.push(a.task.estimatedMinutes);
      entry.actual.push(a.elapsedMinutes);
      grouped.set(cat, entry);
    }

    const result: SpaceCategoryStats[] = [];
    for (const [category, { planned, actual }] of grouped) {
      const avgPlanned = Math.round(planned.reduce((s, v) => s + v, 0) / planned.length);
      const avgActual = Math.round(actual.reduce((s, v) => s + v, 0) / actual.length);
      const deviation = avgPlanned > 0 ? Math.round(((avgActual - avgPlanned) / avgPlanned) * 100) : 0;

      result.push({
        category,
        label: BASE_TIME_LABELS[category] || category,
        calculatedMinutes: avgPlanned,
        avgActualMinutes: avgActual,
        sampleCount: planned.length,
        deviationPercent: deviation,
      });
    }

    return result.sort((a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent));
  }, [assignments]);

  if (stats.length === 0) {
    return null;
  }

  const significantDeviations = stats.filter((s) => Math.abs(s.deviationPercent) > 20);
  const overallAvgDeviation = stats.length > 0
    ? Math.round(stats.reduce((s, v) => s + v.deviationPercent, 0) / stats.length)
    : 0;

  const chartData = stats.map((s) => ({
    name: s.label,
    תקן: s.calculatedMinutes,
    בפועל: s.avgActualMinutes,
    deviation: s.deviationPercent,
  }));

  return (
    <div className="task-card">
      <div className="flex items-center gap-2 mb-4">
        <FlaskConical size={18} className="text-info" />
        <h3 className="font-bold text-sm">אימות תקני זמן</h3>
        <span className="status-badge bg-muted text-muted-foreground text-[10px] mr-auto">
          {stats.reduce((s, v) => s + v.sampleCount, 0)} מדידות
        </span>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className={`text-xl font-bold mono ${
            Math.abs(overallAvgDeviation) <= 10 ? "text-success" :
            Math.abs(overallAvgDeviation) <= 20 ? "text-warning" : "text-destructive"
          }`}>
            {overallAvgDeviation > 0 ? "+" : ""}{overallAvgDeviation}%
          </p>
          <p className="text-[10px] text-muted-foreground">סטייה ממוצעת</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className="text-xl font-bold mono">{stats.length}</p>
          <p className="text-[10px] text-muted-foreground">סוגי חללים</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <p className={`text-xl font-bold mono ${significantDeviations.length === 0 ? "text-success" : "text-destructive"}`}>
            {significantDeviations.length}
          </p>
          <p className="text-[10px] text-muted-foreground">חריגות {">"}20%</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              unit=" דק׳"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => [`${value} דק׳`, name]}
            />
            <Bar dataKey="תקן" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {chartData.map((_, i) => (
                <Cell key={i} fill="hsl(var(--muted-foreground) / 0.3)" />
              ))}
            </Bar>
            <Bar dataKey="בפועל" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    Math.abs(entry.deviation) <= 10
                      ? "hsl(var(--success))"
                      : Math.abs(entry.deviation) <= 20
                      ? "hsl(var(--warning))"
                      : "hsl(var(--destructive))"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail rows */}
      <div className="space-y-2">
        {stats.map((s) => {
          const isOver = s.deviationPercent > 0;
          const isSignificant = Math.abs(s.deviationPercent) > 20;
          return (
            <div
              key={s.category}
              className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                isSignificant ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/20"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{s.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  תקן: {s.calculatedMinutes} דק׳ · בפועל: {s.avgActualMinutes} דק׳ · {s.sampleCount} מדידות
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {isOver ? (
                  <TrendingUp size={14} className={isSignificant ? "text-destructive" : "text-warning"} />
                ) : s.deviationPercent < -10 ? (
                  <TrendingDown size={14} className="text-info" />
                ) : (
                  <Minus size={14} className="text-success" />
                )}
                <span className={`text-xs font-bold mono ${
                  isSignificant ? "text-destructive" :
                  Math.abs(s.deviationPercent) > 10 ? "text-warning" : "text-success"
                }`}>
                  {s.deviationPercent > 0 ? "+" : ""}{s.deviationPercent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeStandardsValidation;
