import { useState } from "react";
import { PackageOpen, CheckCircle2, Send, Clock, Loader2, ChevronDown, ChevronUp, Plus } from "lucide-react";
import type { ShortageReport } from "@/hooks/useShortageReports";

interface Props {
  reports: ShortageReport[];
  loading: boolean;
  /** supervisor can acknowledge + forward */
  canAcknowledge?: boolean;
  /** manager can resolve */
  canResolve?: boolean;
  onAcknowledge?: (id: string) => Promise<void>;
  onForward?: (id: string) => Promise<void>;
  onResolve?: (id: string) => Promise<void>;
  /** callback to open shortage report form */
  onReport?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "ממתין", color: "text-warning", icon: Clock },
  acknowledged: { label: "אושר", color: "text-info", icon: CheckCircle2 },
  forwarded: { label: "הועבר למחסן", color: "text-primary", icon: Send },
  resolved: { label: "טופל", color: "text-success", icon: CheckCircle2 },
};

const ShortageReportsPanel = ({
  reports,
  loading,
  canAcknowledge,
  canResolve,
  onAcknowledge,
  onForward,
  onResolve,
  onReport,
}: Props) => {
  const [expanded, setExpanded] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const handleAction = async (id: string, action: (id: string) => Promise<void>) => {
    setActing(id);
    try {
      await action(id);
    } catch {
      // error handled upstream
    }
    setActing(null);
  };

  const pending = reports.filter((r) => r.status === "pending");
  const acknowledged = reports.filter((r) => r.status === "acknowledged");
  const forwarded = reports.filter((r) => r.status === "forwarded");
  const resolved = reports.filter((r) => r.status === "resolved");

  const activeReports = canResolve
    ? [...pending, ...acknowledged, ...forwarded]
    : canAcknowledge
    ? [...pending, ...acknowledged]
    : reports;

  if (loading) {
    return (
      <div className="task-card flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="task-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <PackageOpen size={18} className="text-warning" />
          <h3 className="font-bold text-sm">דיווחי חוסרים</h3>
          {pending.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-warning/15 text-warning text-[10px] font-bold">
              {pending.length} חדשים
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onReport && (
            <button
              onClick={(e) => { e.stopPropagation(); onReport(); }}
              className="px-2.5 py-1 rounded-lg bg-warning/15 text-warning text-xs font-bold hover:bg-warning/25 transition-colors flex items-center gap-1"
            >
              <Plus size={12} />
              דווח
            </button>
          )}
          {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {activeReports.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">אין דיווחים פעילים</p>
          ) : (
            activeReports.map((report) => {
              const config = statusConfig[report.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <div
                  key={report.id}
                  className={`rounded-xl border p-3 ${
                    report.status === "pending" ? "border-warning/50 bg-warning/5" :
                    report.status === "forwarded" ? "border-primary/50 bg-primary/5" :
                    report.status === "resolved" ? "border-success/50 bg-success/5" :
                    "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{report.item_label}</span>
                    <span className={`text-[10px] font-bold flex items-center gap-1 ${config.color}`}>
                      <StatusIcon size={10} />
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span>כמות: {report.quantity}</span>
                    <span>·</span>
                    <span>{report.category}</span>
                    <span>·</span>
                    <span>{report.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {report.reporter_name} · {new Date(report.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div className="flex gap-1">
                      {canAcknowledge && report.status === "pending" && onAcknowledge && (
                        <button
                          onClick={() => handleAction(report.id, onAcknowledge)}
                          disabled={acting === report.id}
                          className="px-2 py-1 rounded-lg bg-info/15 text-info text-[10px] font-bold hover:bg-info/25 transition-colors disabled:opacity-50"
                        >
                          {acting === report.id ? <Loader2 size={10} className="animate-spin" /> : "אשר"}
                        </button>
                      )}
                      {canAcknowledge && report.status === "acknowledged" && onForward && (
                        <button
                          onClick={() => handleAction(report.id, onForward)}
                          disabled={acting === report.id}
                          className="px-2 py-1 rounded-lg bg-primary/15 text-primary text-[10px] font-bold hover:bg-primary/25 transition-colors disabled:opacity-50"
                        >
                          {acting === report.id ? <Loader2 size={10} className="animate-spin" /> : "העבר למחסן"}
                        </button>
                      )}
                      {canResolve && (report.status === "forwarded" || report.status === "acknowledged" || report.status === "pending") && onResolve && (
                        <button
                          onClick={() => handleAction(report.id, onResolve)}
                          disabled={acting === report.id}
                          className="px-2 py-1 rounded-lg bg-success/15 text-success text-[10px] font-bold hover:bg-success/25 transition-colors disabled:opacity-50"
                        >
                          {acting === report.id ? <Loader2 size={10} className="animate-spin" /> : "טופל ✓"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Resolved summary */}
          {resolved.length > 0 && (
            <p className="text-center text-[10px] text-muted-foreground pt-2">
              {resolved.length} דיווחים טופלו היום
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ShortageReportsPanel;
