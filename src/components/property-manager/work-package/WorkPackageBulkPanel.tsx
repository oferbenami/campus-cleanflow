import { Loader2 } from "lucide-react";
import type { WorkPackageTask } from "@/hooks/useWorkPackages";

interface Props {
  selectedCount: number;
  bulkAction: "set" | "multiply" | "recalculate";
  setBulkAction: (v: "set" | "multiply" | "recalculate") => void;
  bulkField: string;
  setBulkField: (v: string) => void;
  bulkValue: number;
  setBulkValue: (v: number) => void;
  tasks: WorkPackageTask[];
  selectedTaskIds: string[];
  onApply: () => void;
  isPending: boolean;
}

const WorkPackageBulkPanel = ({
  selectedCount, bulkAction, setBulkAction, bulkField, setBulkField,
  bulkValue, setBulkValue, tasks, selectedTaskIds, onApply, isPending,
}: Props) => (
  <div className="bg-warning/5 border border-warning/30 rounded-lg p-3 space-y-2">
    <p className="text-xs font-semibold">{selectedCount} משימות נבחרו</p>
    <div className="grid grid-cols-3 gap-2">
      {(["set", "multiply", "recalculate"] as const).map((action) => (
        <button
          key={action}
          onClick={() => setBulkAction(action)}
          className={`py-1.5 rounded text-xs font-semibold transition-colors ${
            bulkAction === action ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {action === "set" ? "קבע ערך" : action === "multiply" ? "הכפל" : "חשב מחדש"}
        </button>
      ))}
    </div>
    {bulkAction !== "recalculate" && (
      <div className="grid grid-cols-2 gap-2">
        {bulkAction === "set" && (
          <select
            value={bulkField}
            onChange={(e) => setBulkField(e.target.value)}
            className="bg-background border border-input rounded px-2 py-1 text-xs"
          >
            <option value="standard_minutes">דקות תקן</option>
            <option value="area_minutes_coeff">מקדם שטח</option>
            <option value="tools_minutes_coeff">מקדם כלים</option>
            <option value="rounds_per_shift">סבבים</option>
          </select>
        )}
        <input
          type="number"
          step="0.01"
          value={bulkValue}
          onChange={(e) => setBulkValue(parseFloat(e.target.value) || 0)}
          className="bg-background border border-input rounded px-2 py-1 text-xs"
          placeholder={bulkAction === "multiply" ? "מכפיל (1.10 = +10%)" : "ערך"}
        />
      </div>
    )}
    {bulkAction === "multiply" && (
      <div className="text-[10px] text-muted-foreground">
        {(() => {
          const selectedTasks = tasks.filter((t) => selectedTaskIds.includes(t.id));
          const before = selectedTasks.reduce((s, t) => s + t.standard_minutes, 0);
          const after = Math.round(before * bulkValue * 100) / 100;
          return `לפני: ${Math.round(before)} דק׳ → אחרי: ${Math.round(after)} דק׳ (${after - before > 0 ? "+" : ""}${Math.round(after - before)} דק׳)`;
        })()}
      </div>
    )}
    <button
      onClick={onApply}
      disabled={isPending}
      className="w-full py-2 rounded-lg bg-warning text-warning-foreground text-xs font-bold disabled:opacity-50"
    >
      {isPending ? <Loader2 size={12} className="animate-spin mx-auto" /> : "בצע עדכון מרוכז"}
    </button>
  </div>
);

export default WorkPackageBulkPanel;
