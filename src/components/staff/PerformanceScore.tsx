import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, Trophy, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { TaskAssignment } from "@/data/mockData";
import { getPlannedMinutesUpToNow } from "@/data/staffSchedule";

interface PerformanceScoreProps {
  assignments: TaskAssignment[];
}

const PerformanceScore = ({ assignments }: PerformanceScoreProps) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const completedCount = assignments.filter((a) => a.status === "completed").length;
  const totalCount = assignments.length;
  const breakFixCount = assignments.filter((a) => a.isBreakFix).length;
  const breakFixMinutes = assignments
    .filter((a) => a.isBreakFix && a.elapsedMinutes)
    .reduce((sum, a) => sum + (a.elapsedMinutes || 0), 0);

  const endOfDayScore = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const { shouldBeCompleted } = getPlannedMinutesUpToNow(
    assignments,
    now.getHours(),
    now.getMinutes()
  );

  const completedMinutes = assignments
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + (a.elapsedMinutes || a.task.estimatedMinutes), 0);

  const progressScore = shouldBeCompleted > 0
    ? Math.min(Math.round((completedMinutes / shouldBeCompleted) * 100), 100)
    : completedCount > 0 ? 100 : 0;

  const plannedMinutesForCompleted = assignments
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + a.task.estimatedMinutes, 0);
  
  const efficiencyScore = plannedMinutesForCompleted > 0
    ? Math.round((plannedMinutesForCompleted / Math.max(completedMinutes, 1)) * 100)
    : 0;

  const getTrendIcon = (score: number) => {
    if (score >= 90) return <TrendingUp size={14} className="text-success" />;
    if (score >= 70) return <Minus size={14} className="text-warning" />;
    return <TrendingDown size={14} className="text-destructive" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="task-card">
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={16} className="text-accent" />
        <p className="text-xs font-semibold uppercase tracking-wider">ציון ביצוע</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            {getTrendIcon(progressScore)}
            <span className={`text-xl font-bold mono ${getScoreColor(progressScore)}`}>
              {progressScore}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">מול תכנון</p>
          <Progress
            value={progressScore}
            className={`h-1.5 mt-1 ${progressScore >= 90 ? '[&>div]:bg-success' : progressScore >= 70 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'}`}
          />
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            {getTrendIcon(efficiencyScore)}
            <span className={`text-xl font-bold mono ${getScoreColor(efficiencyScore)}`}>
              {efficiencyScore}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">יעילות</p>
          <Progress
            value={efficiencyScore}
            className={`h-1.5 mt-1 ${efficiencyScore >= 90 ? '[&>div]:bg-success' : efficiencyScore >= 70 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'}`}
          />
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            {getTrendIcon(endOfDayScore)}
            <span className={`text-xl font-bold mono ${getScoreColor(endOfDayScore)}`}>
              {endOfDayScore}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">סוף יום</p>
          <Progress
            value={endOfDayScore}
            className={`h-1.5 mt-1 ${endOfDayScore >= 90 ? '[&>div]:bg-success' : endOfDayScore >= 70 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive'}`}
          />
        </div>
      </div>

      {/* Break-fix stats */}
      {breakFixCount > 0 && (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-warning" />
            <span className="text-xs font-semibold">תקלות מיידיות:</span>
          </div>
          <span className="text-xs mono font-bold">{breakFixCount}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{breakFixMinutes} דק׳ מסדר היום</span>
        </div>
      )}
    </div>
  );
};

export default PerformanceScore;
