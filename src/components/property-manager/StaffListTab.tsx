import { useState } from "react";
import { Users, Phone, Shield, Building } from "lucide-react";
import { useStaffProfiles, type StaffProfile } from "@/hooks/usePropertyManagerData";

const roleLabels: Record<string, string> = {
  cleaning_staff: "עובד ניקיון",
  supervisor: "מפקח",
  property_manager: "מנהל נכס",
  campus_manager: "מנהל קמפוס",
};

const StaffListTab = () => {
  const { data: staff = [], isLoading } = useStaffProfiles();
  const [selected, setSelected] = useState<StaffProfile | null>(null);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="grid grid-cols-2 gap-3">
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold">{staff.length}</p>
          <p className="text-xs text-muted-foreground">סה״כ עובדים</p>
        </div>
        <div className="kpi-card text-center">
          <p className="text-2xl font-bold text-success">{staff.length}</p>
          <p className="text-xs text-muted-foreground">רשומים</p>
        </div>
      </div>

      <div className="task-card overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold flex items-center gap-2">
            <Users size={18} />
            רשימת עובדים
          </h2>
        </div>
        {staff.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">אין עובדים רשומים</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right">
                <th className="py-2 px-3 text-xs text-muted-foreground font-medium">עובד</th>
                <th className="py-2 px-3 text-xs text-muted-foreground font-medium">אימייל</th>
                <th className="py-2 px-3 text-xs text-muted-foreground font-medium">משמרת ברירת מחדל</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelected(s)}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        {s.avatar_initials || "?"}
                      </div>
                      <span className="font-semibold">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 mono text-xs">{s.email || "—"}</td>
                  <td className="py-3 px-3 text-xs">
                    {s.default_shift_start?.slice(0, 5)} – {s.default_shift_end?.slice(0, 5)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">פרטי עובד</h2>
              <button onClick={() => setSelected(null)} className="px-3 py-1.5 rounded-lg bg-muted text-sm font-medium">סגור</button>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                {selected.avatar_initials || "?"}
              </div>
              <div>
                <p className="text-xl font-bold">{selected.full_name}</p>
                <p className="text-sm text-muted-foreground">{roleLabels[selected.role]}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Phone size={18} className="text-info" />
                <div>
                  <p className="text-xs text-muted-foreground">אימייל</p>
                  <p className="font-semibold mono text-sm">{selected.email || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Building size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">שעות עבודה</p>
                  <p className="font-semibold text-sm">
                    {selected.default_shift_start?.slice(0, 5)} – {selected.default_shift_end?.slice(0, 5)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffListTab;
