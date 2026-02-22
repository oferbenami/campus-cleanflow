import { useEffect, useState } from "react";
import { Repeat2, CheckCircle2, ClipboardCheck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EventLog {
  id: string;
  event_type: string;
  user_id: string;
  event_payload: any;
  created_at: string;
}

const actionConfig: Record<string, { icon: typeof Repeat2; label: string; color: string }> = {
  task_start: { icon: CheckCircle2, label: "התחלת משימה", color: "text-success" },
  task_finish: { icon: CheckCircle2, label: "סיום משימה", color: "text-info" },
  nfc_scan: { icon: Repeat2, label: "סריקת NFC", color: "text-warning" },
  sla_alert: { icon: ClipboardCheck, label: "התראת SLA", color: "text-destructive" },
  break_fix_created: { icon: Repeat2, label: "תקלה מיידית", color: "text-destructive" },
};

interface ActivityTimelineProps {
  assignmentId: string;
}

const ActivityTimeline = ({ assignmentId }: ActivityTimelineProps) => {
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("events_log")
        .select("id, event_type, user_id, event_payload, created_at")
        .eq("assignment_id", assignmentId)
        .order("created_at", { ascending: false })
        .limit(20);
      setLogs((data || []) as EventLog[]);
      setLoading(false);
    };
    fetchLogs();
  }, [assignmentId]);

  if (loading) {
    return <div className="py-4 text-center text-xs text-muted-foreground">טוען...</div>;
  }

  if (logs.length === 0) {
    return <div className="py-4 text-center text-xs text-muted-foreground">אין פעילות מתועדת</div>;
  }

  return (
    <div className="space-y-0">
      {logs.map((log, i) => {
        const config = actionConfig[log.event_type] || actionConfig.nfc_scan;
        const Icon = config.icon;
        const time = new Date(log.created_at);
        const timeStr = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;
        const isLast = i === logs.length - 1;

        return (
          <div key={log.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${config.color} bg-muted`}>
                <Icon size={14} />
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-border" />}
            </div>
            <div className={`pb-4 flex-1 min-w-0`}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground mono">
                  <Clock size={10} />
                  {timeStr}
                </span>
              </div>
              <p className="text-xs text-foreground">
                {typeof log.event_payload === "object" && log.event_payload?.reason
                  ? log.event_payload.reason
                  : config.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityTimeline;

// Helper to log an activity — now uses events_log
export async function logActivity(params: {
  action_type: string;
  actor_id: string;
  actor_name: string;
  assignment_id?: string;
  target_staff_id?: string;
  target_staff_name?: string;
  details?: string;
}) {
  // Log to events_log instead of the dropped activity_logs table
  await supabase.from("events_log").insert({
    user_id: params.actor_id,
    event_type: "sla_alert" as any,
    assignment_id: params.assignment_id || null,
    event_payload: {
      action_type: params.action_type,
      actor_name: params.actor_name,
      target_staff_name: params.target_staff_name,
      details: params.details,
    },
  });
}
