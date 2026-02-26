import { useMemo } from "react";
import { Sun, Moon, ClipboardList, Clock, Users } from "lucide-react";

interface StaffProfile {
  id: string;
  full_name: string;
  avatar_initials: string | null;
}

interface WorkPackageTask {
  id: string;
  standard_minutes: number;
  [key: string]: any;
}

interface WorkPackage {
  id: string;
  name: string;
  package_code: string;
  shift_type: string;
  tasks: WorkPackageTask[];
  [key: string]: any;
}

interface ExistingAssignment {
  id: string;
  staff_user_id: string;
  shift_type: "morning" | "evening";
  work_package_id?: string | null;
  [key: string]: any;
}

interface ShiftSelections {
  morningWps: string[];
  eveningWps: string[];
}

interface Props {
  staff: StaffProfile[];
  workPackages: WorkPackage[];
  existingAssignments: ExistingAssignment[];
  selections: Record<string, ShiftSelections>;
  tomorrowFormatted: string;
}

const DailySummaryTable = ({
  staff,
  workPackages,
  existingAssignments,
  selections,
  tomorrowFormatted,
}: Props) => {
  const summaryRows = useMemo(() => {
    const rows: {
      staffName: string;
      initials: string;
      shift: "morning" | "evening";
      wpName: string;
      taskCount: number;
      totalMinutes: number;
      source: "existing" | "planned";
    }[] = [];

    // Existing assignments
    for (const a of existingAssignments) {
      const s = staff.find((st) => st.id === a.staff_user_id);
      const wp = a.work_package_id
        ? workPackages.find((w) => w.id === a.work_package_id)
        : null;
      rows.push({
        staffName: s?.full_name || "—",
        initials: s?.avatar_initials || "?",
        shift: a.shift_type,
        wpName: wp ? wp.name || wp.package_code : "—",
        taskCount: wp ? wp.tasks.length : 0,
        totalMinutes: wp
          ? wp.tasks.reduce((s, t) => s + (Number(t.standard_minutes) || 0), 0)
          : 0,
        source: "existing",
      });
    }

    // Planned (not yet saved)
    for (const [staffId, sel] of Object.entries(selections)) {
      const s = staff.find((st) => st.id === staffId);
      for (const shift of ["morning", "evening"] as const) {
        const wpIds = shift === "morning" ? sel.morningWps : sel.eveningWps;
        for (const wpId of wpIds) {
          const wp = workPackages.find((w) => w.id === wpId);
          rows.push({
            staffName: s?.full_name || "—",
            initials: s?.avatar_initials || "?",
            shift,
            wpName: wp ? wp.name || wp.package_code : "—",
            taskCount: wp ? wp.tasks.length : 0,
            totalMinutes: wp
              ? wp.tasks.reduce(
                  (s, t) => s + (Number(t.standard_minutes) || 0),
                  0
                )
              : 0,
            source: "planned",
          });
        }
      }
    }

    // Sort: morning first, then by staff name
    rows.sort((a, b) => {
      if (a.shift !== b.shift) return a.shift === "morning" ? -1 : 1;
      return a.staffName.localeCompare(b.staffName, "he");
    });

    return rows;
  }, [staff, workPackages, existingAssignments, selections]);

  const totalExisting = summaryRows.filter((r) => r.source === "existing").length;
  const totalPlanned = summaryRows.filter((r) => r.source === "planned").length;
  const totalMinutes = summaryRows.reduce((s, r) => s + r.totalMinutes, 0);
  const totalTasks = summaryRows.reduce((s, r) => s + r.taskCount, 0);
  const uniqueStaff = new Set(summaryRows.map((r) => r.staffName)).size;

  if (summaryRows.length === 0) {
    return (
      <div className="kpi-card text-center text-muted-foreground text-sm py-6">
        <ClipboardList size={24} className="mx-auto mb-2 opacity-50" />
        אין שיבוצים למחר עדיין
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="kpi-card">
        <h3 className="font-bold text-sm flex items-center gap-2 mb-1">
          <ClipboardList size={16} />
          סיכום יומי — {tomorrowFormatted}
        </h3>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users size={12} /> {uniqueStaff} עובדים
          </span>
          <span className="flex items-center gap-1">
            <ClipboardList size={12} /> {totalTasks} משימות
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> {totalMinutes} דק׳
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground">
              <th className="text-right py-2 px-3 font-semibold">עובד</th>
              <th className="text-center py-2 px-3 font-semibold">משמרת</th>
              <th className="text-right py-2 px-3 font-semibold">חבילת עבודה</th>
              <th className="text-center py-2 px-3 font-semibold">משימות</th>
              <th className="text-center py-2 px-3 font-semibold">דק׳</th>
              <th className="text-center py-2 px-3 font-semibold">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((row, i) => (
              <tr
                key={i}
                className="border-t border-border/50 hover:bg-muted/30 transition-colors"
              >
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold shrink-0">
                      {row.initials}
                    </div>
                    <span className="font-medium">{row.staffName}</span>
                  </div>
                </td>
                <td className="py-2 px-3 text-center">
                  {row.shift === "morning" ? (
                    <span className="inline-flex items-center gap-1 text-warning">
                      <Sun size={12} /> בוקר
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-info">
                      <Moon size={12} /> ערב
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 font-medium">{row.wpName}</td>
                <td className="py-2 px-3 text-center font-mono">
                  {row.taskCount}
                </td>
                <td className="py-2 px-3 text-center font-mono">
                  {row.totalMinutes}
                </td>
                <td className="py-2 px-3 text-center">
                  {row.source === "existing" ? (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-semibold">
                      נשמר
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-warning/15 text-warning text-[10px] font-semibold">
                      טיוטה
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 text-[10px] text-muted-foreground justify-end">
        <span>{totalExisting} נשמרו</span>
        <span>·</span>
        <span>{totalPlanned} טיוטה</span>
      </div>
    </div>
  );
};

export default DailySummaryTable;
