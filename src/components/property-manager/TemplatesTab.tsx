import { useState } from "react";
import { Layers, Zap } from "lucide-react";
import TemplateBuilder from "@/components/property-manager/TemplateBuilder";

const TemplatesTab = () => {
  const [view, setView] = useState<"base" | "addon">("base");

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="kpi-card">
        <h2 className="font-bold mb-1 flex items-center gap-2">
          <Layers size={18} />
          ניהול תבניות
        </h2>
        <p className="text-xs text-muted-foreground">הגדר תבניות בסיס (שגרה יומית) וחבילות תוספת (מיוחדות)</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setView("base")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            view === "base"
              ? "bg-primary/10 border-2 border-primary text-primary"
              : "bg-muted border-2 border-transparent text-muted-foreground"
          }`}
        >
          <Layers size={16} /> תבניות בסיס
        </button>
        <button
          onClick={() => setView("addon")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            view === "addon"
              ? "bg-warning/10 border-2 border-warning text-warning"
              : "bg-muted border-2 border-transparent text-muted-foreground"
          }`}
        >
          <Zap size={16} /> חבילות תוספת
        </button>
      </div>

      <TemplateBuilder templateType={view} />
    </div>
  );
};

export default TemplatesTab;
