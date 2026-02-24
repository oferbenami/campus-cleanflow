import { useState } from "react";
import { FileSpreadsheet, Package } from "lucide-react";
import ExcelImportFlow from "./ExcelImportFlow";
import WorkPackageManager from "./WorkPackageManager";

const WorkPackagesTab = () => {
  const [view, setView] = useState<"manage" | "import">("manage");

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="kpi-card">
        <h2 className="font-bold mb-1 flex items-center gap-2">
          <Package size={18} />
          חבילות עבודה ויבוא Excel
        </h2>
        <p className="text-xs text-muted-foreground">ייבא חבילות עבודה מ-Excel, שכפל, ערוך דקות תקן ובצע עדכונים מרוכזים</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setView("manage")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            view === "manage"
              ? "bg-primary/10 border-2 border-primary text-primary"
              : "bg-muted border-2 border-transparent text-muted-foreground"
          }`}
        >
          <Package size={16} /> ניהול חבילות
        </button>
        <button
          onClick={() => setView("import")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            view === "import"
              ? "bg-primary/10 border-2 border-primary text-primary"
              : "bg-muted border-2 border-transparent text-muted-foreground"
          }`}
        >
          <FileSpreadsheet size={16} /> ייבוא מ-Excel
        </button>
      </div>

      {view === "manage" ? <WorkPackageManager /> : <ExcelImportFlow />}
    </div>
  );
};

export default WorkPackagesTab;
