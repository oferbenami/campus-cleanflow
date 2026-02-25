import {
  GripVertical, Edit3, Save, X, Calculator, CheckSquare, Square, Trash2,
} from "lucide-react";
import type { WorkPackageTask } from "@/hooks/useWorkPackages";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";

interface Props {
  task: WorkPackageTask;
  isBulk: boolean;
  isSelected: boolean;
  isEditing: boolean;
  editFields: Partial<WorkPackageTask>;
  onToggleSelect: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditFieldChange: (field: string, value: any) => void;
  onDelete: () => void;
  onRecalculate: () => void;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
}

const WorkPackageTaskRow = ({
  task, isBulk, isSelected, isEditing, editFields,
  onToggleSelect, onStartEdit, onSaveEdit, onCancelEdit,
  onEditFieldChange, onDelete, onRecalculate, dragHandleProps,
}: Props) => {
  if (isEditing) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground">סוג שטח</label>
            <input
              value={editFields.space_type || ""}
              onChange={(e) => onEditFieldChange("space_type", e.target.value)}
              className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">תיאור</label>
            <input
              value={editFields.description || ""}
              onChange={(e) => onEditFieldChange("description", e.target.value)}
              className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">סוג ניקיון</label>
            <input
              value={editFields.cleaning_type || ""}
              onChange={(e) => onEditFieldChange("cleaning_type", e.target.value)}
              className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">דקות תקן</label>
            <input
              type="number"
              value={editFields.standard_minutes ?? 0}
              onChange={(e) => onEditFieldChange("standard_minutes", parseFloat(e.target.value) || 0)}
              className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">סבבים</label>
            <input
              type="number"
              value={editFields.rounds_per_shift ?? 1}
              onChange={(e) => onEditFieldChange("rounds_per_shift", parseInt(e.target.value) || 1)}
              className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">שטח (מ״ר)</label>
            <input
              type="number"
              value={editFields.area_sqm ?? ""}
              onChange={(e) => onEditFieldChange("area_sqm", parseFloat(e.target.value) || null)}
              className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onSaveEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
            <Save size={12} /> שמור
          </button>
          <button onClick={onCancelEdit} className="px-3 py-1.5 rounded-lg bg-muted text-xs">
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 group">
      {/* Drag handle */}
      <div {...dragHandleProps} className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground">
        <GripVertical size={14} />
      </div>

      {isBulk && (
        <button onClick={onToggleSelect} className="shrink-0">
          {isSelected ? (
            <CheckSquare size={14} className="text-primary" />
          ) : (
            <Square size={14} className="text-muted-foreground" />
          )}
        </button>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">
          {task.space_type || "—"} {task.description ? `/ ${task.description}` : ""}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
          {task.cleaning_type && <span>{task.cleaning_type}</span>}
          {task.area_sqm && <span>{task.area_sqm} מ״ר</span>}
          {task.rounds_per_shift && task.rounds_per_shift > 1 && <span>{task.rounds_per_shift} סבבים</span>}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-xs font-bold text-primary">{Math.round(task.standard_minutes)} דק׳</span>
        <button onClick={onStartEdit} className="p-1 text-muted-foreground hover:text-foreground rounded" title="ערוך משימה">
          <Edit3 size={10} />
        </button>
        <button onClick={onRecalculate} className="p-1 text-muted-foreground hover:text-foreground rounded" title="חשב מחדש">
          <Calculator size={10} />
        </button>
        <button
          onClick={() => { if (confirm("למחוק משימה זו?")) onDelete(); }}
          className="p-1 text-destructive/50 hover:text-destructive rounded opacity-0 group-hover:opacity-100 transition-opacity"
          title="מחק משימה"
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
};

export default WorkPackageTaskRow;
