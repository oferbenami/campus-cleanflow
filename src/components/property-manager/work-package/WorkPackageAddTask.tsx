import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

interface Props {
  packageId: string;
  onAdd: (data: {
    work_package_id: string;
    space_type?: string;
    description?: string;
    cleaning_type?: string;
    standard_minutes?: number;
    rounds_per_shift?: number;
    area_sqm?: number;
  }) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
}

const WorkPackageAddTask = ({ packageId, onAdd, onCancel, isPending }: Props) => {
  const [form, setForm] = useState({
    space_type: "",
    description: "",
    cleaning_type: "",
    standard_minutes: 10,
    rounds_per_shift: 1,
    area_sqm: "",
  });

  const handleSubmit = () => {
    onAdd({
      work_package_id: packageId,
      space_type: form.space_type || undefined,
      description: form.description || undefined,
      cleaning_type: form.cleaning_type || undefined,
      standard_minutes: form.standard_minutes,
      rounds_per_shift: form.rounds_per_shift,
      area_sqm: form.area_sqm ? parseFloat(form.area_sqm) : undefined,
    });
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
      <p className="text-xs font-semibold text-primary">משימה חדשה</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">סוג שטח</label>
          <input
            value={form.space_type}
            onChange={(e) => setForm(f => ({ ...f, space_type: e.target.value }))}
            className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
            placeholder="משרד, חדר ישיבות..."
            autoFocus
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">תיאור</label>
          <input
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">סוג ניקיון</label>
          <input
            value={form.cleaning_type}
            onChange={(e) => setForm(f => ({ ...f, cleaning_type: e.target.value }))}
            className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">דקות תקן</label>
          <input
            type="number"
            value={form.standard_minutes}
            onChange={(e) => setForm(f => ({ ...f, standard_minutes: parseFloat(e.target.value) || 0 }))}
            className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">סבבים</label>
          <input
            type="number"
            value={form.rounds_per_shift}
            onChange={(e) => setForm(f => ({ ...f, rounds_per_shift: parseInt(e.target.value) || 1 }))}
            className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">שטח (מ״ר)</label>
          <input
            type="number"
            value={form.area_sqm}
            onChange={(e) => setForm(f => ({ ...f, area_sqm: e.target.value }))}
            className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : <><Plus size={12} /> הוסף</>}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-muted text-xs">
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

export default WorkPackageAddTask;
