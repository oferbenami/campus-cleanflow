import { Trophy, Settings, Users, Calendar } from "lucide-react";

/**
 * IncentivesPanel — placeholder until incentive tables are re-created
 * The old tables (incentive_config, daily_worker_scores, monthly_incentive_summaries)
 * were dropped during the schema migration. This will be rebuilt in a future phase.
 */
const IncentivesPanel = () => {
  return (
    <div className="space-y-4">
      <div className="kpi-card text-center py-12">
        <Trophy size={40} className="mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-bold text-lg mb-2">מערכת תמריצים</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          מערכת התמריצים והניקוד תישמר בשלב הבא לאחר השלמת מבנה הנתונים החדש.
        </p>
      </div>
    </div>
  );
};

export default IncentivesPanel;
