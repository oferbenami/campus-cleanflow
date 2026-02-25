import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Users,
  CalendarPlus,
  ClipboardList,
  Database,
  LogOut,
  BarChart3,
  Layers,
  LayoutGrid,
  Package,
} from "lucide-react";
import StaffListTab from "@/components/property-manager/StaffListTab";
import ShiftPlanningTab from "@/components/property-manager/ShiftPlanningTab";
import ZonePlanningTab from "@/components/property-manager/ZonePlanningTab";
import MasterDataTab from "@/components/property-manager/MasterDataTab";
import EndOfDayTab from "@/components/property-manager/EndOfDayTab";
import TemplatesTab from "@/components/property-manager/TemplatesTab";
import WorkPackagesTab from "@/components/property-manager/WorkPackagesTab";
import VisualControlBoard from "@/components/control-board/VisualControlBoard";

type PMTab = "staff" | "templates" | "workpackages" | "planning" | "assign" | "controlBoard" | "masterdata" | "eod";

const PropertyManagerView = () => {
  const [activeTab, setActiveTab] = useState<PMTab>("staff");
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const todayFormatted = new Date().toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const tabs: { key: PMTab; label: string; icon: React.ReactNode }[] = [
    { key: "staff", label: "עובדים", icon: <Users size={16} /> },
    { key: "templates", label: "תבניות", icon: <Layers size={16} /> },
    { key: "workpackages", label: "חבילות", icon: <Package size={16} /> },
    { key: "planning", label: "תכנון מחר", icon: <CalendarPlus size={16} /> },
    { key: "assign", label: "שיבוץ היום", icon: <ClipboardList size={16} /> },
    { key: "controlBoard", label: "לוח בקרה", icon: <LayoutGrid size={16} /> },
    { key: "masterdata", label: "נכסים", icon: <Database size={16} /> },
    { key: "eod", label: "סוף יום", icon: <BarChart3 size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs opacity-75 uppercase tracking-wider">CleanFlow</p>
            <h1 className="text-lg sm:text-xl font-bold">מנהל נכס</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-left hidden sm:block">
              <p className="text-xs opacity-75">תאריך</p>
              <p className="text-sm font-semibold mono">{todayFormatted}</p>
            </div>
            <button onClick={async () => { await signOut(); navigate("/auth", { replace: true }); }} className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors" title="התנתק">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="sticky top-[52px] sm:top-[60px] z-40 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-2">
          <div className="flex gap-1 bg-muted rounded-xl p-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-w-[4rem] ${
                  activeTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${activeTab === "controlBoard" ? "max-w-full" : "max-w-7xl"} mx-auto px-4 sm:px-6 pb-6`}>
        {activeTab === "staff" && <StaffListTab />}
        {activeTab === "templates" && <TemplatesTab />}
        {activeTab === "workpackages" && <WorkPackagesTab />}
        {activeTab === "planning" && <ShiftPlanningTab />}
        {activeTab === "assign" && <ZonePlanningTab />}
        {activeTab === "controlBoard" && <VisualControlBoard />}
        {activeTab === "masterdata" && <MasterDataTab />}
        {activeTab === "eod" && <EndOfDayTab />}
      </div>
    </div>
  );
};

export default PropertyManagerView;
