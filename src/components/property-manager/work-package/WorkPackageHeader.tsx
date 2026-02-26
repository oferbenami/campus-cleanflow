import { Package, Copy, Trash2, ChevronDown, ChevronUp, Repeat, CalendarOff } from "lucide-react";
import type { WorkPackageWithTasks } from "@/hooks/useWorkPackages";

const DAY_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

interface Props {
  pkg: WorkPackageWithTasks;
  totalMinutes: number;
  isExpanded: boolean;
  onToggle: () => void;
  onClone: () => void;
  onDelete: () => void;
}

const WorkPackageHeader = ({ pkg, totalMinutes, isExpanded, onToggle, onClone, onDelete }: Props) => (
  <div className="flex items-center gap-3 cursor-pointer" onClick={onToggle}>
    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
      <Package size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-sm">{pkg.name || pkg.package_code}</p>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
        <span>{pkg.shift_type === "evening" ? "🌙 ערב" : "☀️ בוקר"}</span>
        <span>·</span>
        <span className="flex items-center gap-0.5">
          {pkg.is_recurring ? <><Repeat size={9} /> מחזורי</> : <><CalendarOff size={9} /> חד-פעמי</>}
        </span>
        {pkg.is_recurring && (
          <>
            <span>·</span>
            <span>{pkg.days_of_week.map(d => DAY_LABELS[d]).join(",")}</span>
          </>
        )}
        <span>·</span>
        <span>{pkg.tasks.length} משימות</span>
        <span>·</span>
        <span>{Math.round(totalMinutes)} דק׳</span>
        {pkg.building && <><span>·</span><span>{pkg.building}{pkg.floor ? `/${pkg.floor}` : ""}</span></>}
      </div>
    </div>
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => { e.stopPropagation(); onClone(); }}
        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title="שכפל"
      >
        <Copy size={14} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="מחק"
      >
        <Trash2 size={14} />
      </button>
      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </div>
  </div>
);

export default WorkPackageHeader;
