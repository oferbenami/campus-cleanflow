import { Trophy, TrendingUp } from "lucide-react";

/**
 * MyPointsWidget — placeholder until daily_worker_scores table is rebuilt.
 * The old scoring tables were dropped during schema migration.
 */
const MyPointsWidget = () => {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
          <Trophy size={18} className="text-primary" />
        </div>
        <h3 className="font-bold text-sm">הנקודות שלי</h3>
      </div>
      <div className="text-center py-4">
        <p className="text-4xl mb-2">⏳</p>
        <p className="text-sm text-muted-foreground">מערכת הניקוד תופעל בקרוב</p>
      </div>
    </div>
  );
};

export default MyPointsWidget;
