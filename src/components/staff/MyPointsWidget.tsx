import { useState, useEffect } from "react";
import { Trophy, TrendingUp, Star, Shield, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type DailyScore = {
  id: string;
  score_date: string;
  productivity_points: number;
  quality_points: number;
  discipline_points: number;
  total_points: number;
  explanation_text: string | null;
  variance_percent: number;
  audit_avg_score_used: number | null;
  discipline_flags: { late_start: boolean; cancel: boolean; reopen: boolean };
};

const tierProjection = (avg: number) => {
  if (avg >= 85) return { label: "בונוס מלא", color: "text-success", emoji: "🏆" };
  if (avg >= 75) return { label: "80% בונוס", color: "text-warning", emoji: "🥈" };
  if (avg >= 65) return { label: "50% בונוס", color: "text-orange-500", emoji: "🥉" };
  return { label: "ללא בונוס", color: "text-muted-foreground", emoji: "—" };
};

const MyPointsWidget = () => {
  const { user } = useAuth();
  const [todayScore, setTodayScore] = useState<DailyScore | null>(null);
  const [monthAvg, setMonthAvg] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchScores = async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const monthStart = today.slice(0, 7) + "-01";

      const [todayRes, monthRes] = await Promise.all([
        supabase
          .from("daily_worker_scores")
          .select("*")
          .eq("worker_id", user.id)
          .eq("score_date", today)
          .maybeSingle(),
        supabase
          .from("daily_worker_scores")
          .select("total_points")
          .eq("worker_id", user.id)
          .gte("score_date", monthStart)
          .lte("score_date", today),
      ]);

      if (todayRes.data) setTodayScore(todayRes.data as unknown as DailyScore);
      if (monthRes.data && monthRes.data.length > 0) {
        const avg = monthRes.data.reduce((s, r) => s + (r.total_points || 0), 0) / monthRes.data.length;
        setMonthAvg(Math.round(avg * 10) / 10);
      }
      setLoading(false);
    };
    fetchScores();
  }, [user?.id]);

  const tier = tierProjection(monthAvg);
  const score = todayScore?.total_points ?? 0;
  const scoreColor = score >= 85 ? "text-success" : score >= 65 ? "text-warning" : "text-destructive";

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4" />
        <div className="h-12 bg-muted rounded w-1/2 mb-3" />
        <div className="h-4 bg-muted rounded w-full" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
          <Trophy size={18} className="text-primary" />
        </div>
        <h3 className="font-bold text-sm">הנקודות שלי</h3>
      </div>

      {todayScore ? (
        <>
          {/* Today's score */}
          <div className="text-center">
            <p className={`text-5xl font-black mono ${scoreColor}`}>{score}</p>
            <p className="text-xs text-muted-foreground mt-1">נקודות היום</p>
          </div>

          {/* Breakdown bars */}
          <div className="space-y-2">
            <ScoreBar icon={Zap} label="פרודוקטיביות" points={todayScore.productivity_points} max={50} color="bg-blue-500" />
            <ScoreBar icon={Star} label="איכות" points={todayScore.quality_points} max={30} color="bg-amber-500" />
            <ScoreBar icon={Shield} label="משמעת" points={todayScore.discipline_points} max={20} color="bg-emerald-500" />
          </div>

          {/* Explanation */}
          {todayScore.explanation_text && (
            <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 leading-relaxed">
              {todayScore.explanation_text}
            </p>
          )}
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-4xl mb-2">⏳</p>
          <p className="text-sm text-muted-foreground">הניקוד יחושב בסוף היום</p>
        </div>
      )}

      {/* Monthly projection */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">ממוצע חודשי</span>
          </div>
          <span className="text-sm font-bold mono">{monthAvg || "—"}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">צפי בונוס</span>
          <span className={`text-xs font-bold ${tier.color}`}>
            {tier.emoji} {tier.label}
          </span>
        </div>
      </div>
    </div>
  );
};

const ScoreBar = ({ icon: Icon, label, points, max, color }: {
  icon: React.ElementType; label: string; points: number; max: number; color: string;
}) => {
  const pct = Math.round((points / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className="text-muted-foreground shrink-0" />
      <span className="text-[11px] w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-bold mono w-10 text-left">{points}/{max}</span>
    </div>
  );
};

export default MyPointsWidget;
