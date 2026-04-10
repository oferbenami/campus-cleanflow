import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SITE_ID } from "@/hooks/usePropertyManagerData";
import {
  AlertTriangle, CheckCircle2, Clock, FileText, ArrowRight,
  ChevronDown, ChevronUp, XCircle,
} from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface FollowupTask {
  id: string;
  checklist_id: string;
  area_name: string;
  area_label: string;
  gap_description: string;
  priority: string;
  source_section: string;
  status: string;
  assigned_to: string | null;
  due_date: string;
  due_shift_type: string;
  created_at: string;
  deferred_reason: string | null;
}

interface StaffOption {
  id: string;
  full_name: string;
}

export function useFollowupTasks(date: string, shiftType: string) {
  return useQuery({
    queryKey: ["checklist-followup-tasks", date, shiftType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_followup_tasks")
        .select("*")
        .eq("due_date", date)
        .eq("due_shift_type", shiftType)
        .in("status", ["pending", "assigned"])
        .order("priority", { ascending: true });
      if (error) throw error;
      return (data || []) as FollowupTask[];
    },
  });
}

// Analytics hook
export function useFollowupAnalytics() {
  return useQuery({
    queryKey: ["followup-analytics"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const since = thirtyDaysAgo.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("checklist_followup_tasks")
        .select("*")
        .gte("due_date", since);
      if (error) throw error;

      const tasks = (data || []) as FollowupTask[];
      const total = tasks.length;
      const completed = tasks.filter((t) => t.status === "completed").length;
      const pending = tasks.filter((t) => t.status === "pending").length;
      const closureRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Recurring gaps by area
      const areaCounts: Record<string, number> = {};
      tasks.forEach((t) => {
        areaCounts[t.area_label] = (areaCounts[t.area_label] || 0) + 1;
      });
      const recurringGaps = Object.entries(areaCounts)
        .filter(([, count]) => count >= 2)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      return { total, completed, pending, closureRate, recurringGaps };
    },
  });
}

interface Props {
  date: string;
  shiftType: string;
  staff?: StaffOption[];
}

const PRIORITY_CONFIG = {
  critical: { label: "קריטי", color: "bg-destructive text-destructive-foreground", icon: XCircle },
  high: { label: "גבוה", color: "bg-warning/20 text-warning", icon: AlertTriangle },
  normal: { label: "רגיל", color: "bg-muted text-muted-foreground", icon: Clock },
};

const SOURCE_LABELS: Record<string, string> = {
  checklist_items: "בקרה כללית",
  cleaning_actions: "פעולות ניקיון",
  special_areas: "אזורים מיוחדים",
};

const PreviousShiftTasks = ({ date, shiftType, staff = [] }: Props) => {
  const { data: tasks = [], isLoading } = useFollowupTasks(date, shiftType);
  const { data: analytics } = useFollowupAnalytics();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [deferTaskId, setDeferTaskId] = useState<string | null>(null);
  const [deferReason, setDeferReason] = useState("");

  const assignMutation = useMutation({
    mutationFn: async ({ taskId, staffId }: { taskId: string; staffId: string }) => {
      const { error } = await supabase
        .from("checklist_followup_tasks")
        .update({ assigned_to: staffId, status: "assigned" } as any)
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-followup-tasks"] });
      toast.success("משימה שובצה");
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("checklist_followup_tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() } as any)
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-followup-tasks"] });
      toast.success("משימה הושלמה");
    },
  });

  const deferMutation = useMutation({
    mutationFn: async ({ taskId, reason }: { taskId: string; reason: string }) => {
      // Defer to next shift
      const nextDate = shiftType === "morning"
        ? date
        : new Date(new Date(date).getTime() + 86400000).toISOString().split("T")[0];
      const nextShift = shiftType === "morning" ? "evening" : "morning";

      const { error } = await supabase
        .from("checklist_followup_tasks")
        .update({
          status: "deferred",
          deferred_reason: reason,
          due_date: nextDate,
          due_shift_type: nextShift,
        } as any)
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-followup-tasks"] });
      setDeferTaskId(null);
      setDeferReason("");
      toast.success("משימה נדחתה למשמרת הבאה");
    },
  });

  const sortedTasks = useMemo(() => {
    const priorityOrder = { critical: 0, high: 1, normal: 2 };
    return [...tasks].sort(
      (a, b) => (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
                (priorityOrder[b.priority as keyof typeof priorityOrder] || 2)
    );
  }, [tasks]);

  if (isLoading) return null;
  if (tasks.length === 0 && !analytics) return null;

  const unassignedCount = tasks.filter((t) => t.status === "pending").length;
  const criticalCount = tasks.filter((t) => t.priority === "critical").length;

  return (
    <div className={`task-card border-2 ${criticalCount > 0 ? "border-destructive/40 bg-destructive/5" : unassignedCount > 0 ? "border-warning/40 bg-warning/5" : "border-success/30 bg-success/5"}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-sm font-bold flex items-center gap-2">
          <FileText size={16} className="text-primary" />
          משימות ממשמרת קודמת
          {tasks.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {tasks.length}
            </span>
          )}
          {unassignedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
              {unassignedCount} לא משובצות
            </span>
          )}
        </h3>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Analytics summary */}
          {analytics && analytics.total > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-card rounded-lg p-2">
                <div className="text-lg font-bold">{analytics.closureRate}%</div>
                <div className="text-[10px] text-muted-foreground">שיעור סגירה (30 יום)</div>
              </div>
              <div className="bg-card rounded-lg p-2">
                <div className="text-lg font-bold">{analytics.total}</div>
                <div className="text-[10px] text-muted-foreground">סה״כ פערים</div>
              </div>
              <div className="bg-card rounded-lg p-2">
                <div className="text-lg font-bold">{analytics.completed}</div>
                <div className="text-[10px] text-muted-foreground">נסגרו</div>
              </div>
            </div>
          )}

          {/* Recurring gaps */}
          {analytics && analytics.recurringGaps.length > 0 && (
            <div className="bg-warning/10 rounded-lg p-2">
              <h4 className="text-[10px] font-bold text-warning mb-1">⚠️ פערים חוזרים</h4>
              <div className="flex flex-wrap gap-1">
                {analytics.recurringGaps.map(([area, count]) => (
                  <span key={area} className="px-2 py-0.5 rounded-full bg-warning/20 text-[10px] font-medium">
                    {area} ({count}×)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tasks list */}
          {sortedTasks.map((task) => {
            const config = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.normal;
            const Icon = config.icon;
            const assignedStaff = staff.find((s) => s.id === task.assigned_to);

            return (
              <div key={task.id} className="bg-card rounded-lg p-3 space-y-2 border border-border/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${config.color}`}>
                        <Icon size={10} className="inline mr-1" />
                        {config.label}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-muted text-[10px]">
                        {SOURCE_LABELS[task.source_section] || task.source_section}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold">
                      מעקב — {task.area_label}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.gap_description}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      נוצר: {new Date(task.created_at).toLocaleString("he-IL", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </p>
                  </div>
                </div>

                {/* Assignment controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {task.status === "pending" && staff.length > 0 && (
                    <Select
                      onValueChange={(staffId) => assignMutation.mutate({ taskId: task.id, staffId })}
                    >
                      <SelectTrigger className="h-7 text-xs w-40">
                        <SelectValue placeholder="שבץ עובד..." />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            {s.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {task.status === "assigned" && assignedStaff && (
                    <span className="text-xs flex items-center gap-1">
                      <ArrowRight size={12} />
                      <span className="font-medium">{assignedStaff.full_name}</span>
                    </span>
                  )}

                  <button
                    onClick={() => completeMutation.mutate(task.id)}
                    className="h-7 px-2 rounded bg-success/20 text-success text-[10px] font-medium hover:bg-success/30 flex items-center gap-1"
                  >
                    <CheckCircle2 size={12} /> בוצע
                  </button>

                  {deferTaskId === task.id ? (
                    <div className="flex items-center gap-1 w-full mt-1">
                      <Textarea
                        value={deferReason}
                        onChange={(e) => setDeferReason(e.target.value)}
                        placeholder="סיבת דחייה (חובה)..."
                        className="h-8 text-xs min-h-[32px]"
                      />
                      <button
                        onClick={() => {
                          if (!deferReason.trim()) {
                            toast.error("סיבת דחייה חובה");
                            return;
                          }
                          deferMutation.mutate({ taskId: task.id, reason: deferReason });
                        }}
                        className="h-7 px-2 rounded bg-warning/20 text-warning text-[10px] font-medium whitespace-nowrap"
                      >
                        אשר דחייה
                      </button>
                      <button
                        onClick={() => { setDeferTaskId(null); setDeferReason(""); }}
                        className="h-7 px-1 text-muted-foreground"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeferTaskId(task.id)}
                      className="h-7 px-2 rounded bg-muted text-muted-foreground text-[10px] font-medium hover:bg-muted/80 flex items-center gap-1"
                    >
                      <Clock size={12} /> דחה
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {tasks.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <CheckCircle2 size={20} className="mx-auto mb-1 text-success" />
              אין משימות פתוחות ממשמרת קודמת
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PreviousShiftTasks;
