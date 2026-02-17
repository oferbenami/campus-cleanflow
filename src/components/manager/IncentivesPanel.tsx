import { useState, useEffect, useCallback } from "react";
import { Trophy, Settings, Users, Calendar, Check, AlertTriangle, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type IncentiveConfig = {
  id: string;
  points_on_standard: number;
  points_tier1: number;
  points_tier2: number;
  points_tier3: number;
  variance_tier1: number;
  variance_tier2: number;
  quality_band_high: number;
  quality_band_mid: number;
  quality_band_low: number;
  discipline_full: number;
  late_threshold_minutes: number;
  no_audit_policy: string;
  base_bonus_amount: number;
  tier_full_threshold: number;
  tier_80_threshold: number;
  tier_50_threshold: number;
};

type DailyScore = {
  id: string;
  worker_id: string;
  score_date: string;
  productivity_points: number;
  quality_points: number;
  discipline_points: number;
  total_points: number;
  variance_percent: number;
  audit_avg_score_used: number | null;
  explanation_text: string | null;
};

type MonthlySummary = {
  id: string;
  worker_id: string;
  month: string;
  workdays_count: number;
  total_points: number;
  avg_daily_points: number;
  tier: string;
  payout_amount: number;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
};

type SubTab = "config" | "daily" | "monthly";

const IncentivesPanel = () => {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>("daily");
  const [config, setConfig] = useState<IncentiveConfig | null>(null);
  const [dailyScores, setDailyScores] = useState<DailyScore[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>([]);
  const [workers, setWorkers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [configEditing, setConfigEditing] = useState(false);
  const [editConfig, setEditConfig] = useState<Partial<IncentiveConfig>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [configRes, scoresRes, summariesRes, workersRes] = await Promise.all([
      supabase.from("incentive_config").select("*").eq("is_active", true).limit(1),
      supabase.from("daily_worker_scores").select("*").order("score_date", { ascending: false }).limit(200),
      supabase.from("monthly_incentive_summaries").select("*").order("month", { ascending: false }).limit(50),
      supabase.from("profiles").select("id, full_name").eq("role", "cleaning_staff"),
    ]);
    if (configRes.data?.[0]) {
      setConfig(configRes.data[0] as unknown as IncentiveConfig);
      setEditConfig(configRes.data[0] as unknown as IncentiveConfig);
    }
    setDailyScores((scoresRes.data || []) as unknown as DailyScore[]);
    setMonthlySummaries((summariesRes.data || []) as unknown as MonthlySummary[]);
    setWorkers((workersRes.data || []) as { id: string; full_name: string }[]);
    setLoading(false);
  };

  const workerName = useCallback((id: string) => workers.find(w => w.id === id)?.full_name || id.slice(0, 8), [workers]);

  const handleSaveConfig = async () => {
    if (!editConfig) return;
    const { id, ...rest } = editConfig as IncentiveConfig;
    if (config?.id) {
      const { error } = await supabase.from("incentive_config").update(rest).eq("id", config.id);
      if (error) { toast({ title: "שגיאה", variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("incentive_config").insert(rest);
      if (error) { toast({ title: "שגיאה", variant: "destructive" }); return; }
    }
    toast({ title: "✓ הגדרות נשמרו" });
    setConfigEditing(false);
    fetchData();
  };

  const handleApproveSummary = async (summary: MonthlySummary) => {
    const { error } = await supabase
      .from("monthly_incentive_summaries")
      .update({ status: "approved", approved_by: user?.id, approved_at: new Date().toISOString() })
      .eq("id", summary.id);
    if (error) { toast({ title: "שגיאה", variant: "destructive" }); return; }
    toast({ title: "✓ אושר" });
    fetchData();
  };

  const subTabs: { key: SubTab; icon: React.ElementType; label: string }[] = [
    { key: "daily", icon: Calendar, label: "ניקוד יומי" },
    { key: "monthly", icon: Users, label: "סיכום חודשי" },
    { key: "config", icon: Settings, label: "הגדרות" },
  ];

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-10 bg-muted rounded" /><div className="h-40 bg-muted rounded" /></div>;

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {subTabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
              subTab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Daily Scores */}
      {subTab === "daily" && (
        <div className="space-y-3">
          <h3 className="font-bold flex items-center gap-2"><Trophy size={16} className="text-primary" /> ניקוד יומי לפי עובד</h3>
          {dailyScores.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">אין נתוני ניקוד עדיין</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="py-2 text-right pr-3">תאריך</th>
                    <th className="py-2 text-right">עובד</th>
                    <th className="py-2 text-center">פרודוק׳</th>
                    <th className="py-2 text-center">איכות</th>
                    <th className="py-2 text-center">משמעת</th>
                    <th className="py-2 text-center font-bold">סה"כ</th>
                    <th className="py-2 text-center">סטייה%</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyScores.map((s) => {
                    const qualityRisk = s.productivity_points >= 40 && (s.audit_avg_score_used ?? 5) < 3.5;
                    return (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-2 pr-3 mono text-xs">{s.score_date}</td>
                        <td className="py-2 text-xs font-medium">{workerName(s.worker_id)}</td>
                        <td className="py-2 text-center mono">{s.productivity_points}</td>
                        <td className="py-2 text-center mono">{s.quality_points}</td>
                        <td className="py-2 text-center mono">{s.discipline_points}</td>
                        <td className="py-2 text-center font-bold mono">
                          <span className={s.total_points >= 85 ? "text-success" : s.total_points >= 65 ? "text-warning" : "text-destructive"}>
                            {s.total_points}
                          </span>
                        </td>
                        <td className="py-2 text-center mono text-xs">
                          {s.variance_percent}%
                          {qualityRisk && (
                            <span className="mr-1 text-destructive" title="סיכון איכות">⚠️</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Monthly Summaries */}
      {subTab === "monthly" && (
        <div className="space-y-3">
          <h3 className="font-bold flex items-center gap-2"><Users size={16} className="text-primary" /> סיכום חודשי</h3>
          {monthlySummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">אין סיכומים חודשיים עדיין</p>
          ) : (
            <div className="space-y-2">
              {monthlySummaries.map((s) => (
                <div key={s.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">{workerName(s.worker_id)}</span>
                      <span className="text-xs text-muted-foreground mono">{s.month}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{s.workdays_count} ימי עבודה</span>
                      <span>ממוצע: <b className="text-foreground">{s.avg_daily_points}</b></span>
                      <span>דרגה: <b className={s.tier === "FULL" ? "text-success" : s.tier === "NONE" ? "text-destructive" : "text-warning"}>{s.tier}</b></span>
                      <span>תשלום: <b className="text-foreground">₪{s.payout_amount}</b></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.status === "draft" && (
                      <button
                        onClick={() => handleApproveSummary(s)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success text-success-foreground text-xs font-bold hover:bg-success/90 transition-colors"
                      >
                        <Check size={12} /> אשר
                      </button>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      s.status === "approved" ? "bg-success/15 text-success" :
                      s.status === "paid" ? "bg-primary/15 text-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {s.status === "draft" ? "טיוטה" : s.status === "approved" ? "אושר" : "שולם"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Config */}
      {subTab === "config" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2"><Settings size={16} className="text-primary" /> הגדרות תמריצים</h3>
            {!configEditing ? (
              <button onClick={() => setConfigEditing(true)} className="text-xs text-primary font-medium hover:underline">ערוך</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setConfigEditing(false)} className="text-xs text-muted-foreground hover:underline">ביטול</button>
                <button onClick={handleSaveConfig} className="text-xs text-success font-bold hover:underline">שמור</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <ConfigField label="בונוס בסיס (₪)" value={editConfig.base_bonus_amount} field="base_bonus_amount" editing={configEditing} onChange={(v) => setEditConfig(p => ({ ...p, base_bonus_amount: Number(v) }))} />
            <ConfigField label="סף איחור (דקות)" value={editConfig.late_threshold_minutes} field="late_threshold_minutes" editing={configEditing} onChange={(v) => setEditConfig(p => ({ ...p, late_threshold_minutes: Number(v) }))} />
            <ConfigField label="סף בונוס מלא" value={editConfig.tier_full_threshold} field="tier_full_threshold" editing={configEditing} onChange={(v) => setEditConfig(p => ({ ...p, tier_full_threshold: Number(v) }))} />
            <ConfigField label="סף 80% בונוס" value={editConfig.tier_80_threshold} field="tier_80_threshold" editing={configEditing} onChange={(v) => setEditConfig(p => ({ ...p, tier_80_threshold: Number(v) }))} />
            <ConfigField label="סף 50% בונוס" value={editConfig.tier_50_threshold} field="tier_50_threshold" editing={configEditing} onChange={(v) => setEditConfig(p => ({ ...p, tier_50_threshold: Number(v) }))} />
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-muted-foreground">מדיניות ללא ביקורת</label>
              {configEditing ? (
                <select
                  value={editConfig.no_audit_policy || "rolling_average"}
                  onChange={(e) => setEditConfig(p => ({ ...p, no_audit_policy: e.target.value }))}
                  className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background"
                >
                  <option value="rolling_average">ממוצע נע</option>
                  <option value="no_quality_points">ללא נקודות איכות</option>
                </select>
              ) : (
                <p className="text-sm font-medium">{config?.no_audit_policy === "rolling_average" ? "ממוצע נע" : "ללא נקודות"}</p>
              )}
            </div>
          </div>

          {/* Points breakdown reference */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3 text-xs">
            <p className="font-bold text-sm">טבלת ניקוד</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="font-semibold mb-1">פרודוקטיביות (מקס 50)</p>
                <p>≤100% → 50 נק׳</p>
                <p>≤110% → 40 נק׳</p>
                <p>≤120% → 25 נק׳</p>
                <p>&gt;120% → 0 נק׳</p>
              </div>
              <div>
                <p className="font-semibold mb-1">איכות (מקס 30)</p>
                <p>4.5–5.0 → 30 נק׳</p>
                <p>4.0–4.49 → 20 נק׳</p>
                <p>3.5–3.99 → 10 נק׳</p>
                <p>&lt;3.5 → 0 נק׳</p>
              </div>
              <div>
                <p className="font-semibold mb-1">משמעת (מקס 20)</p>
                <p>ללא איחור + ללא ביטול + ללא פתיחה מחדש = 20</p>
                <p>אחרת = 0</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ConfigField = ({ label, value, field, editing, onChange }: {
  label: string; value: any; field: string; editing: boolean; onChange: (v: string) => void;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-[11px] text-muted-foreground">{label}</label>
    {editing ? (
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background"
      />
    ) : (
      <p className="text-sm font-medium">{value ?? "—"}</p>
    )}
  </div>
);

export default IncentivesPanel;
