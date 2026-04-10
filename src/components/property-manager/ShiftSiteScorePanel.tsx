import { useMemo } from "react";
import {
  useLatestSiteScore,
  useScoreTrend,
  useShiftScore,
  useComputeShiftScore,
} from "@/hooks/useShiftScores";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Gauge,
  BarChart3,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Props {
  date: string;
  shiftType?: string;
  compact?: boolean;
}

const ShiftSiteScorePanel = ({ date, shiftType, compact = false }: Props) => {
  const { data: latestSite } = useLatestSiteScore();
  const { data: dayScores = [] } = useShiftScore(date);
  const { data: trend = [] } = useScoreTrend(14);
  const computeScore = useComputeShiftScore();

  const currentShiftScore = useMemo(() => {
    if (!shiftType) return dayScores[0] || null;
    return dayScores.find((s) => s.shift_type === shiftType) || null;
  }, [dayScores, shiftType]);

  const siteScore = latestSite?.site_score ?? 80;
  const prevSiteScore = currentShiftScore?.previous_site_score ?? siteScore;
  const siteTrend = siteScore > prevSiteScore ? "up" : siteScore < prevSiteScore ? "down" : "flat";

  const chartData = useMemo(() => {
    return trend.map((t) => ({
      label: `${t.date.slice(5)} ${t.shift_type === "morning" ? "☀️" : "🌙"}`,
      shift: Number(t.shift_score),
      site: Number(t.site_score),
    }));
  }, [trend]);

  const getScoreColor = (score: number) => {
    if (score >= 95) return "text-success";
    if (score >= 80) return "text-info";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreBg = (score: number) => {
    if (score >= 95) return "bg-success/10 border-success/30";
    if (score >= 80) return "bg-info/10 border-info/30";
    if (score >= 60) return "bg-warning/10 border-warning/30";
    return "bg-destructive/10 border-destructive/30";
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {/* Site Score - Main KPI */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 ${getScoreBg(siteScore)}`}>
          <Gauge size={18} className={getScoreColor(siteScore)} />
          <div>
            <span className={`text-xl font-bold mono ${getScoreColor(siteScore)}`}>
              {Math.round(siteScore)}
            </span>
            <span className="text-[10px] text-muted-foreground block leading-tight">ציון אתר</span>
          </div>
          {siteTrend === "up" && <TrendingUp size={14} className="text-success" />}
          {siteTrend === "down" && <TrendingDown size={14} className="text-destructive" />}
          {siteTrend === "flat" && <Minus size={14} className="text-muted-foreground" />}
        </div>

        {/* Today's shift score */}
        {currentShiftScore && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${getScoreBg(Number(currentShiftScore.shift_score))}`}>
            <Target size={16} className={getScoreColor(Number(currentShiftScore.shift_score))} />
            <div>
              <span className={`text-lg font-bold mono ${getScoreColor(Number(currentShiftScore.shift_score))}`}>
                {Math.round(Number(currentShiftScore.shift_score))}
              </span>
              <span className="text-[10px] text-muted-foreground block leading-tight">משמרת</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Score cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Site Score */}
        <div className={`task-card border-2 ${getScoreBg(siteScore)} text-center`}>
          <Gauge size={28} className={`mx-auto mb-2 ${getScoreColor(siteScore)}`} />
          <div className={`text-4xl font-bold mono ${getScoreColor(siteScore)}`}>
            {Math.round(siteScore)}
          </div>
          <p className="text-sm font-semibold mt-1">ציון אתר</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            {siteTrend === "up" && <><TrendingUp size={14} className="text-success" /><span className="text-[10px] text-success">עולה</span></>}
            {siteTrend === "down" && <><TrendingDown size={14} className="text-destructive" /><span className="text-[10px] text-destructive">יורד</span></>}
            {siteTrend === "flat" && <><Minus size={14} className="text-muted-foreground" /><span className="text-[10px] text-muted-foreground">יציב</span></>}
          </div>
        </div>

        {/* Shift Score */}
        <div className={`task-card border-2 ${currentShiftScore ? getScoreBg(Number(currentShiftScore.shift_score)) : "border-border"} text-center`}>
          <Target size={28} className={`mx-auto mb-2 ${currentShiftScore ? getScoreColor(Number(currentShiftScore.shift_score)) : "text-muted-foreground"}`} />
          <div className={`text-4xl font-bold mono ${currentShiftScore ? getScoreColor(Number(currentShiftScore.shift_score)) : "text-muted-foreground"}`}>
            {currentShiftScore ? Math.round(Number(currentShiftScore.shift_score)) : "—"}
          </div>
          <p className="text-sm font-semibold mt-1">ציון משמרת</p>
          {!currentShiftScore && (
            <button
              onClick={() => computeScore.mutate({ date, shiftType: shiftType || "morning" })}
              disabled={computeScore.isPending}
              className="mt-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 flex items-center gap-1 mx-auto"
            >
              {computeScore.isPending ? <Loader2 size={12} className="animate-spin" /> : <Calculator size={12} />}
              חשב ציון
            </button>
          )}
        </div>
      </div>

      {/* Score breakdown */}
      {currentShiftScore && (
        <div className="task-card">
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
            <BarChart3 size={14} /> פירוט ציון משמרת
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted rounded-lg p-2">
              <span className="text-muted-foreground">משימות שהושלמו</span>
              <span className="block font-bold mono">{currentShiftScore.tasks_completed}/{currentShiftScore.tasks_assigned}</span>
            </div>
            <div className="bg-muted rounded-lg p-2">
              <span className="text-muted-foreground">בסיס</span>
              <span className="block font-bold mono text-info">
                {(currentShiftScore.score_breakdown_json as any)?.base_score ?? "—"}
              </span>
            </div>
            <div className="bg-muted rounded-lg p-2 flex items-center gap-1">
              <XCircle size={12} className="text-destructive" />
              <div>
                <span className="text-muted-foreground">משימות שנכשלו</span>
                <span className="block font-bold mono text-destructive">{currentShiftScore.tasks_missed}</span>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-2 flex items-center gap-1">
              <AlertTriangle size={12} className="text-warning" />
              <div>
                <span className="text-muted-foreground">חריגות SLA</span>
                <span className="block font-bold mono text-warning">{currentShiftScore.sla_breaches}</span>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-2 flex items-center gap-1">
              <AlertTriangle size={12} className="text-destructive" />
              <div>
                <span className="text-muted-foreground">כשלי הנהלה</span>
                <span className="block font-bold mono text-destructive">{currentShiftScore.executive_failures}</span>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-2 flex items-center gap-1">
              {currentShiftScore.cleaning_actions_completed
                ? <CheckCircle2 size={12} className="text-success" />
                : <XCircle size={12} className="text-muted-foreground" />
              }
              <div>
                <span className="text-muted-foreground">ניקיון חובה</span>
                <span className="block font-bold mono">
                  {currentShiftScore.cleaning_actions_completed ? "הושלם" : "לא הושלם"}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 p-2 bg-muted/50 rounded-lg text-[10px] text-muted-foreground">
            ציון = בסיס + בונוס − קנסות | קנס: 5 × נכשלו + 3 × SLA + 10 × הנהלה
          </div>
        </div>
      )}

      {/* Trend chart */}
      {chartData.length >= 2 && (
        <div className="task-card">
          <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
            <TrendingUp size={14} /> מגמת ציונים (14 יום)
          </h4>
          <div className="h-48" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                <YAxis domain={[0, 120]} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <ReferenceLine y={100} stroke="hsl(var(--success))" strokeDasharray="3 3" label={{ value: "100", fontSize: 10 }} />
                <ReferenceLine y={80} stroke="hsl(var(--warning))" strokeDasharray="3 3" label={{ value: "80", fontSize: 10 }} />
                <Line type="monotone" dataKey="shift" name="ציון משמרת" stroke="hsl(var(--info))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="site" name="ציון אתר" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftSiteScorePanel;
