import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import type { WorkPackageTask } from "@/hooks/useWorkPackages";

interface Props {
  tasks: WorkPackageTask[];
  onFilteredChange: (filtered: WorkPackageTask[]) => void;
}

const WorkPackageTaskFilter = ({ tasks, onFilteredChange }: Props) => {
  const [search, setSearch] = useState("");
  const [spaceFilter, setSpaceFilter] = useState<string>("");
  const [cleaningFilter, setCleaningFilter] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  const uniqueSpaceTypes = [...new Set(tasks.map((t) => t.space_type).filter(Boolean))] as string[];
  const uniqueCleaningTypes = [...new Set(tasks.map((t) => t.cleaning_type).filter(Boolean))] as string[];

  const applyFilters = (s: string, space: string, cleaning: string) => {
    let filtered = tasks;
    if (s.trim()) {
      const q = s.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          (t.space_type || "").toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q) ||
          (t.cleaning_type || "").toLowerCase().includes(q) ||
          (t.notes || "").toLowerCase().includes(q)
      );
    }
    if (space) filtered = filtered.filter((t) => t.space_type === space);
    if (cleaning) filtered = filtered.filter((t) => t.cleaning_type === cleaning);
    onFilteredChange(filtered);
  };

  const updateSearch = (v: string) => {
    setSearch(v);
    applyFilters(v, spaceFilter, cleaningFilter);
  };

  const updateSpace = (v: string) => {
    setSpaceFilter(v);
    applyFilters(search, v, cleaningFilter);
  };

  const updateCleaning = (v: string) => {
    setCleaningFilter(v);
    applyFilters(search, spaceFilter, v);
  };

  const clearAll = () => {
    setSearch("");
    setSpaceFilter("");
    setCleaningFilter("");
    onFilteredChange(tasks);
  };

  const hasActiveFilters = search || spaceFilter || cleaningFilter;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="חיפוש משימות..."
            className="w-full bg-background border border-input rounded-lg pr-7 pl-2 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            dir="rtl"
          />
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
            isOpen || hasActiveFilters
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-input bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          <Filter size={12} />
          סינון
        </button>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
          >
            <X size={10} /> נקה
          </button>
        )}
      </div>

      {isOpen && (
        <div className="flex items-center gap-2 flex-wrap" dir="rtl">
          {uniqueSpaceTypes.length > 0 && (
            <select
              value={spaceFilter}
              onChange={(e) => updateSpace(e.target.value)}
              className="text-[11px] bg-background border border-input rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">כל סוגי השטח</option>
              {uniqueSpaceTypes.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          )}
          {uniqueCleaningTypes.length > 0 && (
            <select
              value={cleaningFilter}
              onChange={(e) => updateCleaning(e.target.value)}
              className="text-[11px] bg-background border border-input rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">כל סוגי הניקיון</option>
              {uniqueCleaningTypes.map((ct) => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkPackageTaskFilter;
