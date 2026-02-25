import { Loader2 } from "lucide-react";

interface Props {
  cloneCode: string;
  setCloneCode: (v: string) => void;
  onClone: () => void;
  onCancel: () => void;
  isPending: boolean;
}

const WorkPackageCloneDialog = ({ cloneCode, setCloneCode, onClone, onCancel, isPending }: Props) => (
  <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border space-y-2">
    <p className="text-xs font-semibold">שכפול חבילה</p>
    <input
      value={cloneCode}
      onChange={(e) => setCloneCode(e.target.value)}
      placeholder="קוד חבילה חדש"
      className="w-full bg-background border border-input rounded px-3 py-2 text-xs"
      autoFocus
    />
    <div className="flex gap-2">
      <button
        onClick={onClone}
        disabled={!cloneCode.trim() || isPending}
        className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
      >
        {isPending ? <Loader2 size={12} className="animate-spin mx-auto" /> : "שכפל"}
      </button>
      <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-muted text-xs">
        ביטול
      </button>
    </div>
  </div>
);

export default WorkPackageCloneDialog;
