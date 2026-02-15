import { useState } from "react";
import {
  AlertTriangle,
  MapPin,
  Star,
  Send,
  ClipboardCheck,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { mockZones, mockAssignments } from "@/data/mockData";

const SupervisorView = () => {
  const [activeTab, setActiveTab] = useState<"breakfix" | "audit">("breakfix");
  const [selectedZone, setSelectedZone] = useState("");
  const [breakfixDesc, setBreakfixDesc] = useState("");
  const [breakfixSent, setBreakfixSent] = useState(false);

  // Audit state
  const completedTasks = mockAssignments.filter((a) => a.status === "completed");
  const [selectedTask, setSelectedTask] = useState("");
  const [ratings, setRatings] = useState({
    cleanliness: 0,
    thoroughness: 0,
    timeliness: 0,
    supplies: 0,
    safety: 0,
  });
  const [auditNotes, setAuditNotes] = useState("");
  const [auditSent, setAuditSent] = useState(false);

  const handleBreakfixSubmit = () => {
    setBreakfixSent(true);
    setTimeout(() => {
      setBreakfixSent(false);
      setSelectedZone("");
      setBreakfixDesc("");
    }, 2000);
  };

  const handleAuditSubmit = () => {
    setAuditSent(true);
    setTimeout(() => {
      setAuditSent(false);
      setSelectedTask("");
      setRatings({ cleanliness: 0, thoroughness: 0, timeliness: 0, supplies: 0, safety: 0 });
      setAuditNotes("");
    }, 2000);
  };

  const StarRating = ({
    value,
    onChange,
    label,
  }: {
    value: number;
    onChange: (v: number) => void;
    label: string;
  }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className="transition-colors"
          >
            <Star
              size={22}
              className={star <= value ? "text-accent fill-accent" : "text-muted"}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs opacity-75 uppercase tracking-wider">CleanFlow</p>
          <h1 className="text-lg font-bold">Supervisor Panel</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
          <button
            onClick={() => setActiveTab("breakfix")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "breakfix"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Zap size={16} />
            Break-Fix
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "audit"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <ClipboardCheck size={16} />
            Quality Audit
          </button>
        </div>

        {/* Break-Fix Tab */}
        {activeTab === "breakfix" && (
          <div className="animate-slide-up space-y-4">
            <div className="task-card">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-destructive" />
                <h2 className="font-bold">Emergency Task</h2>
              </div>

              <label className="block mb-4">
                <span className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Location
                </span>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select location...</option>
                  {mockZones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} (Wing {z.wing}, Floor {z.floor})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block mb-4">
                <span className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Description
                </span>
                <textarea
                  value={breakfixDesc}
                  onChange={(e) => setBreakfixDesc(e.target.value)}
                  placeholder="Describe the emergency..."
                  rows={3}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              {breakfixSent ? (
                <div className="flex items-center justify-center gap-2 py-4 text-success font-semibold">
                  <CheckCircle2 size={20} />
                  Emergency task dispatched!
                </div>
              ) : (
                <button
                  onClick={handleBreakfixSubmit}
                  disabled={!selectedZone || !breakfixDesc}
                  className="btn-action-danger w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                  Dispatch Emergency
                </button>
              )}
            </div>
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === "audit" && (
          <div className="animate-slide-up space-y-4">
            <div className="task-card">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardCheck size={20} className="text-info" />
                <h2 className="font-bold">Quality Inspection</h2>
              </div>

              <label className="block mb-4">
                <span className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Select Completed Task
                </span>
                <select
                  value={selectedTask}
                  onChange={(e) => setSelectedTask(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select task...</option>
                  {completedTasks.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.task.name} — {a.staff.name} ({a.completedAt})
                    </option>
                  ))}
                </select>
              </label>

              {selectedTask && (
                <>
                  <div className="border-t border-border pt-4 space-y-1">
                    <StarRating
                      label="Cleanliness"
                      value={ratings.cleanliness}
                      onChange={(v) => setRatings((r) => ({ ...r, cleanliness: v }))}
                    />
                    <StarRating
                      label="Thoroughness"
                      value={ratings.thoroughness}
                      onChange={(v) => setRatings((r) => ({ ...r, thoroughness: v }))}
                    />
                    <StarRating
                      label="Timeliness"
                      value={ratings.timeliness}
                      onChange={(v) => setRatings((r) => ({ ...r, timeliness: v }))}
                    />
                    <StarRating
                      label="Supplies"
                      value={ratings.supplies}
                      onChange={(v) => setRatings((r) => ({ ...r, supplies: v }))}
                    />
                    <StarRating
                      label="Safety"
                      value={ratings.safety}
                      onChange={(v) => setRatings((r) => ({ ...r, safety: v }))}
                    />
                  </div>

                  <label className="block my-4">
                    <span className="text-sm font-medium text-muted-foreground mb-1.5 block">
                      Notes (Optional)
                    </span>
                    <textarea
                      value={auditNotes}
                      onChange={(e) => setAuditNotes(e.target.value)}
                      placeholder="Additional comments..."
                      rows={2}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>

                  {auditSent ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-success font-semibold">
                      <CheckCircle2 size={20} />
                      Audit submitted!
                    </div>
                  ) : (
                    <button
                      onClick={handleAuditSubmit}
                      disabled={Object.values(ratings).some((v) => v === 0)}
                      className="btn-action-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={18} />
                      Submit Audit
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorView;
