import { useEffect, useState } from "react";
import { Repeat2, CheckCircle2, ClipboardCheck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ActivityLog {
  id: string;
  action_type: string;
  actor_name: string;
  details: string | null;
  target_staff_name: string | null;
  created_at: string;
}

const actionConfig: Record<string, { icon: typeof Repeat2; label: string; color: string }> = {
  reassignment: { icon: Repeat2, label: "שיבוץ מחדש", color: "text-info" },
  manual_override: { icon: CheckCircle2, label: "השלמה ידנית", color: "text-warning" },
  audit_submission: { icon: ClipboardCheck, label: "הגשת ביקורת", color: "text-success" },
};

interface ActivityTimelineProps {
  assignmentId: string;
}

const ActivityTimeline = ({ assignmentId }: ActivityTimelineProps) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("id, action_type, actor_name, details, target_staff_name, created_at")
        .eq("assignment_id", assignmentId)
        .order("created_at", { ascending: false });
      setLogs((data as ActivityLog[]) || []);
      setLoading(false);
    };
    fetchLogs();
  }, [assignmentId]);

  if (loading) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground">טוען...</div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground">אין פעילות מתועדת</div>
    );
  }

  return (
    <div className="space-y-0">
      {logs.map((log, i) => {
        const config = actionConfig[log.action_type] || actionConfig.reassignment;
        const Icon = config.icon;
        const time = new Date(log.created_at);
        const timeStr = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;
        const isLast = i === logs.length - 1;

        return (
          <div key={log.id} className="flex gap-3">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${config.color} bg-muted`}>
                <Icon size={14} />
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-border" />}
            </div>

            {/* Content */}
            <div className={`pb-4 flex-1 min-w-0 ${isLast ? "" : ""}`}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground mono">
                  <Clock size={10} />
                  {timeStr}
                </span>
              </div>
              <p className="text-xs text-foreground">{log.details || config.label}</p>
              <p className="text-[10px] text-muted-foreground">ע״י {log.actor_name}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityTimeline;

// Helper to log an activity from anywhere
export async function logActivity(params: {
  action_type: "reassignment" | "manual_override" | "audit_submission";
  actor_id: string;
  actor_name: string;
  assignment_id?: string;
  target_staff_id?: string;
  target_staff_name?: string;
  details?: string;
}) {
  await supabase.from("activity_logs").insert({
    action_type: params.action_type,
    actor_id: params.actor_id,
    actor_name: params.actor_name,
    assignment_id: params.assignment_id || null,
    target_staff_id: params.target_staff_id || null,
    target_staff_name: params.target_staff_name || null,
    details: params.details || null,
  });
}
