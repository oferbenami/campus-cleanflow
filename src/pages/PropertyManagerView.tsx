import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Users,
  CalendarPlus,
  ClipboardList,
  Database,
  LogOut,
  BarChart3,
  Layers,
} from "lucide-react";
import StaffListTab from "@/components/property-manager/StaffListTab";
import ShiftPlanningTab from "@/components/property-manager/ShiftPlanningTab";
import ZonePlanningTab from "@/components/property-manager/ZonePlanningTab";
import MasterDataTab from "@/components/property-manager/MasterDataTab";
import EndOfDayTab from "@/components/property-manager/EndOfDayTab";
import TemplatesTab from "@/components/property-manager/TemplatesTab";

type PMTab = "staff" | "templates" | "planning" | "assign" | "masterdata" | "eod";

const PropertyManagerView = () => {
  const [activeTab, setActiveTab] = useState<PMTab>("staff");
  const { signOut } = useAuth();

  const todayFormatted = new Date().toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const tabs: { key: PMTab; label: string; icon: React.ReactNode }[] = [
    { key: "staff", label: "עובדים", icon: <Users size={16} /> },
    { key: "templates", label: "תבניות", icon: <Layers size={16} /> },
    { key: "planning", label: "תכנון מחר", icon: <CalendarPlus size={16} /> },
    { key: "assign", label: "שיבוץ היום", icon: <ClipboardList size={16} /> },
    { key: "masterdata", label: "נכסים", icon: <Database size={16} /> },
    { key: "eod", label: "סוף יום", icon: <BarChart3 size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs opacity-75 uppercase tracking-wider">CleanFlow</p>
            <h1 className="text-xl font-bold">מנהל נכס</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-left">
              <p className="text-xs opacity-75">תאריך</p>
              <p className="text-sm font-semibold mono">{todayFormatted}</p>
            </div>
            <button onClick={signOut} className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors" title="התנתק">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-w-0 ${
                activeTab === tab.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "staff" && <StaffListTab />}
        {activeTab === "templates" && <TemplatesTab />}
        {activeTab === "planning" && <ShiftPlanningTab />}
        {activeTab === "assign" && <ZonePlanningTab />}
        {activeTab === "masterdata" && <MasterDataTab />}
        {activeTab === "eod" && <EndOfDayTab />}
      </div>
    </div>
  );
};

export default PropertyManagerView;
