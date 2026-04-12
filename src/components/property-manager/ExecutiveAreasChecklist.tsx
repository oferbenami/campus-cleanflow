import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SITE_ID } from "@/hooks/usePropertyManagerData";
import { toast } from "sonner";
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, Crown, RefreshCw,
  Send, ChevronDown, ChevronUp, TrendingUp, BarChart3,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

/* ─── Types ─── */

type ExecStatus = "ok" | "partial" | "not_ok";
type CleanLevel = "high" | "medium" | "low";

interface AreaCheck {
  area_name: string;
  area_label: string;
  status: ExecStatus;
  cleanliness_level: CleanLevel;
  gap_description: string;
  requires_reclean: boolean;
  reported_to_operations: boolean;
  notes: string;
}

const EXECUTIVE_AREAS: { name: string; label: string }[] = [
  { name: "ceo_office", label: "משרד מנכ״ל" },
  { name: "exec_offices", label: "משרדי הנהלה (חדרי דירקטוריון)" },
  { name: "exec_meeting_rooms", label: "חדרי ישיבות הנהלה" },
];

const STATUS_OPTIONS: { value: ExecStatus; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { value: "ok", label: "תקין", icon: CheckCircle2, color: "text-success" },
  { value: "partial", label: "חלקי", icon: AlertTriangle, color: "text-warning" },
  { value: "not_ok", label: "לא תקין", icon: XCircle, color: "text-destructive" },
];

const CLEAN_LEVELS: { value: CleanLevel; label: string }[] = [
  { value: "high", label: "גבוה" },
  { value: "medium", label: "בינוני" },
  { value: "low", label: "נמוך" },
];

/* ─── Hook: fetch existing checks ─── */

function useExecChecks(date: string) {
  return useQuery({
    queryKey: ["exec-area-checks", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("executive_area_checks")
        .select("*")
        .eq("site_id", SITE_ID)
        .eq("date", date);
      if (error) throw error;
      return data || [];
    },
  });
}

/* ─── Hook: KPI data (last 30 days) ─── */

function useExecKpis() {
  return useQuery({
    queryKey: ["exec-area-kpis"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await supabase
        .from("executive_area_checks")
        .select("*")
        .eq("site_id", SITE_ID)
        .gte("date", thirtyDaysAgo.toISOString().split("T")[0]);
      if (error) throw error;
      return data || [];
    },
  });
}

/* ─── Component ─── */

interface Props {
  date?: string;
  shiftType?: string;
  onSubmitComplete?: () => void;
}

const ExecutiveAreasChecklist = ({ date, onSubmitComplete }: Props) => {
  const today = date || new Date().toISOString().split("T")[0];
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: existingChecks, isLoading } = useExecChecks(today);
  const { data: kpiData } = useExecKpis();
  const [showKpis, setShowKpis] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  // Initialize area checks
  const [areas, setAreas] = useState<AreaCheck[]>(() =>
    EXECUTIVE_AREAS.map((a) => ({
      area_name: a.name,
      area_label: a.label,
      status: "ok",
      cleanliness_level: "high",
      gap_description: "",
      requires_reclean: false,
      reported_to_operations: false,
      notes: "",
    }))
  );

  // Load existing data
  useEffect(() => {
    if (existingChecks && existingChecks.length > 0) {
      setAreas((prev) =>
        prev.map((area) => {
          const existing = existingChecks.find((c: any) => c.area_name === area.area_name);
          if (existing) {
            return {
              ...area,
              status: existing.status as ExecStatus,
              cleanliness_level: existing.cleanliness_level as CleanLevel,
              gap_description: existing.gap_description || "",
              requires_reclean: existing.requires_reclean,
              reported_to_operations: existing.reported_to_operations,
              notes: existing.notes || "",
            };
          }
          return area;
        })
      );
      setSubmitted(true);
    }
  }, [existingChecks]);

  // KPI calculations
  const kpis = useMemo(() => {
    if (!kpiData || kpiData.length === 0) return null;
    const total = kpiData.length;
    const okCount = kpiData.filter((c: any) => c.status === "ok").length;
    const complianceRate = Math.round((okCount / total) * 100);
    const recleanCount = kpiData.filter((c: any) => c.requires_reclean).length;
    const recleanRate = Math.round((recleanCount / total) * 100);

    // Recurring issues per area
    const areaIssues: Record<string, number> = {};
    kpiData.forEach((c: any) => {
      if (c.status !== "ok") {
        areaIssues[c.area_label] = (areaIssues[c.area_label] || 0) + 1;
      }
    });

    return { complianceRate, recleanCount, recleanRate, total, okCount, areaIssues };
  }, [kpiData]);

  // Validation
  const validate = (): boolean => {
    // No blocking validation — allow submission even with gaps
    setValidationErrors({});
    return true;
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("לא מחובר");

      for (const area of areas) {
        const payload = {
          site_id: SITE_ID,
          date: today,
          area_name: area.area_name,
          area_label: area.area_label,
          status: area.status as any,
          cleanliness_level: area.cleanliness_level as any,
          gap_description: area.gap_description || null,
          requires_reclean: area.requires_reclean,
          reported_to_operations: area.reported_to_operations,
          checked_by: user.id,
          notes: area.notes || null,
        };

        const { error } = await supabase
          .from("executive_area_checks")
          .upsert(payload, { onConflict: "site_id,date,area_name" });
        if (error) throw error;
      }

      // Alert for non-OK areas
      const alertAreas = areas.filter((a) => a.status !== "ok");
      if (alertAreas.length > 0) {
        // Log events for operations manager alerts
        for (const area of alertAreas) {
          await supabase.from("events_log").insert({
            user_id: user.id,
            site_id: SITE_ID,
            event_type: "sla_alert" as any,
            event_payload: {
              alert_type: "executive_area_issue",
              area_name: area.area_name,
              area_label: area.area_label,
              status: area.status,
              cleanliness_level: area.cleanliness_level,
              gap_description: area.gap_description,
              requires_reclean: area.requires_reclean,
              date: today,
            },
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exec-area-checks"] });
      queryClient.invalidateQueries({ queryKey: ["exec-area-kpis"] });
      setSubmitted(true);
      toast.success("ביקורת אזורי הנהלה נשמרה בהצלחה");
      const alertCount = areas.filter((a) => a.status !== "ok").length;
      if (alertCount > 0) {
        toast.warning(`${alertCount} התראות נשלחו למנהל התפעול`, { duration: 5000 });
      }
      onSubmitComplete?.();
    },
    onError: (err: any) => {
      toast.error("שגיאה בשמירה: " + err.message);
    },
  });

  const handleSubmit = () => {
    if (!validate()) {
      toast.error("יש לתקן שגיאות לפני שליחה");
      return;
    }
    saveMutation.mutate();
  };

  const updateArea = (index: number, patch: Partial<AreaCheck>) => {
    setAreas((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
    // Clear validation errors for this area on change
    const areaName = areas[index].area_name;
    if (validationErrors[areaName]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[areaName];
        return next;
      });
    }
  };

  const allFilled = areas.every(
    (a) => a.status === "ok" || (a.gap_description.trim().length > 0)
  );

  if (isLoading) {
    return (
      <div className="task-card animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="task-card border-2 border-primary/30 bg-primary/5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Crown size={20} className="text-primary" />
            אזורים רגישים — הנהלה בכירה
          </h3>
          <button
            onClick={() => setShowKpis(!showKpis)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <TrendingUp size={14} />
            KPIs
            {showKpis ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          בקרה מחמירה · אפס סובלנות לפערים · דיווח חובה לכל חריגה
        </p>

        {/* KPI Panel */}
        {showKpis && kpis && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-background p-3 text-center">
              <p className={`text-2xl font-bold mono ${kpis.complianceRate >= 90 ? "text-success" : kpis.complianceRate >= 70 ? "text-warning" : "text-destructive"}`}>
                {kpis.complianceRate}%
              </p>
              <p className="text-[10px] text-muted-foreground">עמידה בתקן (30 יום)</p>
            </div>
            <div className="rounded-lg bg-background p-3 text-center">
              <p className="text-2xl font-bold mono text-foreground">{kpis.okCount}/{kpis.total}</p>
              <p className="text-[10px] text-muted-foreground">בדיקות תקינות</p>
            </div>
            <div className="rounded-lg bg-background p-3 text-center">
              <p className={`text-2xl font-bold mono ${kpis.recleanCount > 0 ? "text-warning" : "text-success"}`}>
                {kpis.recleanCount}
              </p>
              <p className="text-[10px] text-muted-foreground">ניקיונות חוזרים</p>
            </div>
            <div className="rounded-lg bg-background p-3 text-center">
              <p className="text-2xl font-bold mono text-foreground">{kpis.recleanRate}%</p>
              <p className="text-[10px] text-muted-foreground">שיעור ניקיון חוזר</p>
            </div>

            {/* Recurring issues */}
            {Object.entries(kpis.areaIssues).length > 0 && (
              <div className="col-span-2 md:col-span-4 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> בעיות חוזרות (30 יום)
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(kpis.areaIssues).map(([area, count]) => (
                    <span key={area} className="status-badge status-overdue text-[10px]">
                      {area}: {count} חריגות
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Area Cards */}
      {areas.map((area, idx) => {
        const errors = validationErrors[area.area_name] || [];
        const isNotOk = area.status !== "ok";

        return (
          <div
            key={area.area_name}
            className={`task-card transition-all ${
              isNotOk
                ? "border-2 border-destructive/40 bg-destructive/5"
                : submitted
                  ? "border border-success/40 bg-success/5"
                  : ""
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} className={isNotOk ? "text-destructive" : "text-primary"} />
              <h4 className="font-semibold text-sm">{area.area_label}</h4>
            </div>

            {/* Status */}
            <div className="mb-3">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">סטטוס</label>
              <div className="flex gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = area.status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => updateArea(idx, { status: opt.value })}
                      disabled={submitted}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                        selected
                          ? opt.value === "ok"
                            ? "bg-success/15 border-success text-success"
                            : opt.value === "partial"
                              ? "bg-warning/15 border-warning text-warning"
                              : "bg-destructive/15 border-destructive text-destructive"
                          : "border-border text-muted-foreground hover:bg-muted"
                      } disabled:opacity-60`}
                    >
                      <Icon size={14} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cleanliness Level */}
            <div className="mb-3">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">רמת ניקיון</label>
              <div className="flex gap-2">
                {CLEAN_LEVELS.map((lvl) => {
                  const selected = area.cleanliness_level === lvl.value;
                  return (
                    <button
                      key={lvl.value}
                      onClick={() => updateArea(idx, { cleanliness_level: lvl.value })}
                      disabled={submitted}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                        selected
                          ? "bg-primary/15 border-primary text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      } disabled:opacity-60`}
                    >
                      {lvl.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gap Description (required if not OK) */}
            {isNotOk && (
              <div className="mb-3 animate-slide-up">
                <label className="text-xs font-medium text-destructive mb-1 block">
                  תיאור הפער *
                </label>
                <Textarea
                  value={area.gap_description}
                  onChange={(e) => updateArea(idx, { gap_description: e.target.value })}
                  placeholder="תאר את הבעיה שנמצאה..."
                  className="text-sm min-h-[60px]"
                  disabled={submitted}
                />
                {errors.length > 0 && (
                  <p className="text-[10px] text-destructive mt-1">{errors[0]}</p>
                )}
              </div>
            )}

            {/* Requires Reclean & Reported */}
            {isNotOk && (
              <div className="flex gap-4 mb-3 animate-slide-up">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={area.requires_reclean}
                    onChange={(e) => updateArea(idx, { requires_reclean: e.target.checked })}
                    disabled={submitted}
                    className="rounded border-border"
                  />
                  <RefreshCw size={12} className="text-warning" />
                  נדרש ניקיון חוזר
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={area.reported_to_operations}
                    onChange={(e) => updateArea(idx, { reported_to_operations: e.target.checked })}
                    disabled={submitted}
                    className="rounded border-border"
                  />
                  <Send size={12} className="text-info" />
                  דווח למנהל תפעול
                </label>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">הערות</label>
              <Textarea
                value={area.notes}
                onChange={(e) => updateArea(idx, { notes: e.target.value })}
                placeholder="הערות נוספות (אופציונלי)"
                className="text-sm min-h-[40px]"
                disabled={submitted}
              />
            </div>
          </div>
        );
      })}

      {/* Submit */}
      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={!allFilled || saveMutation.isPending}
          className="btn-action-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <>טוען...</>
          ) : (
            <>
              <Shield size={16} />
              שמור ביקורת אזורי הנהלה
            </>
          )}
        </button>
      ) : (
        <div className="task-card bg-success/10 border-success/30 text-center">
          <CheckCircle2 size={24} className="mx-auto mb-2 text-success" />
          <p className="text-sm font-semibold text-success">ביקורת אזורי הנהלה הוגשה</p>
          <p className="text-xs text-muted-foreground mt-1">
            {areas.filter((a) => a.status !== "ok").length > 0
              ? `⚠️ ${areas.filter((a) => a.status !== "ok").length} התראות נשלחו למנהל התפעול`
              : "✓ כל האזורים תקינים"}
          </p>
        </div>
      )}
    </div>
  );
};

export default ExecutiveAreasChecklist;
