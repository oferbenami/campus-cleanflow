import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, FileDown, Loader2, CheckCircle2, AlertTriangle, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  generateManualShiftPdf,
  type ManualShiftData,
  type ChecklistStatus,
  type AreaStatus,
  type CleanLevel,
  type ChecklistItemState,
  type SpecialAreaState,
  type ManualStaffRow,
  type ManualIncidentRow,
} from "@/lib/generate-manual-shift-pdf";

/* ─── Static definitions (mirrors SiteReadinessChecklist & ExecutiveAreasChecklist) ─── */

const CHECKLIST_ITEMS = [
  { id: "floors_mopped", label: "רצפות נשטפו ונוקו" },
  { id: "surfaces_wiped", label: "משטחים נוקו" },
  { id: "restrooms_cleaned", label: "שירותים נוקו וחומרים הושלמו" },
  { id: "kitchenettes_cleaned", label: "מטבחונים נוקו" },
  { id: "equipment_stored", label: "ציוד הוחזר למחסן" },
  { id: "supplies_stocked", label: "מלאי חומרים הושלם" },
];

const CLEANING_ACTIONS = [
  { id: "carpet_vacuuming", label: "שאיבת שטיחים הושלמה" },
  { id: "trash_bins_emptied", label: "פחי אשפה רוקנו בכל האזורים" },
];

const SPECIAL_AREAS = [
  { id: "ceo_office", label: "משרד מנכ״ל" },
  { id: "trading_room", label: "חדר מסחר" },
  { id: "entrance_building", label: "כניסת בניין" },
  { id: "meeting_erez", label: "חדרי ישיבות (ארז)" },
  { id: "meeting_shelters", label: "חדרי ישיבות (מקלטים)" },
  { id: "floor_lobby", label: "לובי קומה" },
  { id: "main_lobby", label: "לובי ראשי" },
  { id: "elevators", label: "מעליות" },
  { id: "glass_elevators", label: "מעליות זכוכית" },
  { id: "outdoor_plaza", label: "רחבת חוץ" },
];

const EXEC_AREAS = [
  { id: "ceo_office_exec", label: "משרד מנכ״ל" },
  { id: "exec_offices", label: "משרדי הנהלה (חדרי דירקטוריון)" },
  { id: "exec_meeting_rooms", label: "חדרי ישיבות הנהלה" },
];

/* ─── Helpers ─── */

const today = new Date().toISOString().slice(0, 10);

function initChecklist(defs: { id: string; label: string }[]): ChecklistItemState[] {
  return defs.map(d => ({ ...d, status: "ok" as ChecklistStatus, gapDescription: "" }));
}

function initAreas(defs: { id: string; label: string }[]): SpecialAreaState[] {
  return defs.map(d => ({ ...d, status: "ok" as AreaStatus, cleanlinessLevel: "high" as CleanLevel, gapDescription: "", requiresReclean: false }));
}

const emptyStaff = (): ManualStaffRow => ({ name: "", startTime: "", endTime: "", breakMinutes: "30", notes: "" });
const emptyIncident = (): ManualIncidentRow => ({ type: "other", description: "", priority: "medium", status: "open" });

/* ─── Status button rows ─── */

const CHECKLIST_STATUSES: { value: ChecklistStatus; label: string; icon: typeof CheckCircle2; cls: string }[] = [
  { value: "ok", label: "תקין", icon: CheckCircle2, cls: "text-green-600 border-green-500 bg-green-50" },
  { value: "partial", label: "חלקי", icon: AlertTriangle, cls: "text-yellow-600 border-yellow-500 bg-yellow-50" },
  { value: "not_ok", label: "לא תקין", icon: XCircle, cls: "text-red-600 border-red-500 bg-red-50" },
  { value: "na", label: "לא רלוונטי", icon: MinusCircle, cls: "text-muted-foreground border-border bg-muted" },
];

const AREA_STATUSES: { value: AreaStatus; label: string; icon: typeof CheckCircle2; cls: string }[] = [
  { value: "ok", label: "תקין", icon: CheckCircle2, cls: "text-green-600 border-green-500 bg-green-50" },
  { value: "partial", label: "חלקי", icon: AlertTriangle, cls: "text-yellow-600 border-yellow-500 bg-yellow-50" },
  { value: "not_ok", label: "לא תקין", icon: XCircle, cls: "text-red-600 border-red-500 bg-red-50" },
];

function ChecklistRow({
  item,
  onChange,
}: {
  item: ChecklistItemState;
  onChange: (field: keyof ChecklistItemState, val: string) => void;
}) {
  const isIssue = item.status === "partial" || item.status === "not_ok";
  return (
    <div className={cn("border rounded-lg p-3 space-y-2", isIssue && "border-orange-300 bg-orange-50/40")}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium flex-1">{item.label}</span>
        <div className="flex gap-1 shrink-0">
          {CHECKLIST_STATUSES.map(({ value, label, icon: Icon, cls }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange("status", value)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-all",
                item.status === value ? cls : "border-border text-muted-foreground hover:bg-muted"
              )}
              title={label}
            >
              <Icon size={12} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>
      {isIssue && (
        <Input
          placeholder="תיאור הפער..."
          value={item.gapDescription}
          onChange={e => onChange("gapDescription", e.target.value)}
          className="h-8 text-xs"
        />
      )}
    </div>
  );
}

function AreaRow({
  area,
  onChange,
}: {
  area: SpecialAreaState;
  onChange: (field: keyof SpecialAreaState, val: string | boolean) => void;
}) {
  const isIssue = area.status === "partial" || area.status === "not_ok";
  return (
    <div className={cn("border rounded-lg p-3 space-y-2", isIssue && "border-orange-300 bg-orange-50/40")}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-medium">{area.label}</span>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {AREA_STATUSES.map(({ value, label, icon: Icon, cls }) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange("status", value)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-all",
                  area.status === value ? cls : "border-border text-muted-foreground hover:bg-muted"
                )}
                title={label}
              >
                <Icon size={12} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          <Select value={area.cleanlinessLevel} onValueChange={v => onChange("cleanlinessLevel", v)}>
            <SelectTrigger className="h-7 text-xs w-[80px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high">גבוה</SelectItem>
              <SelectItem value="medium">בינוני</SelectItem>
              <SelectItem value="low">נמוך</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
            <Checkbox
              checked={area.requiresReclean}
              onCheckedChange={v => onChange("requiresReclean", !!v)}
            />
            ניקיון חוזר
          </label>
        </div>
      </div>
      {isIssue && (
        <Input
          placeholder="תיאור הפער..."
          value={area.gapDescription}
          onChange={e => onChange("gapDescription", e.target.value)}
          className="h-8 text-xs"
        />
      )}
    </div>
  );
}

/* ─── Main dialog ─── */

interface Props { open: boolean; onClose: () => void; }

export default function ManualShiftReportDialog({ open, onClose }: Props) {
  const [generating, setGenerating] = useState(false);

  // Header
  const [date, setDate] = useState(today);
  const [shiftType, setShiftType] = useState<"morning" | "evening">("morning");
  const [siteName, setSiteName] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [totalWorkers, setTotalWorkers] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");

  // Checklists
  const [checklistItems, setChecklistItems] = useState<ChecklistItemState[]>(initChecklist(CHECKLIST_ITEMS));
  const [cleaningActions, setCleaningActions] = useState<ChecklistItemState[]>(initChecklist(CLEANING_ACTIONS));
  const [specialAreas, setSpecialAreas] = useState<SpecialAreaState[]>(initAreas(SPECIAL_AREAS));
  const [execAreas, setExecAreas] = useState<SpecialAreaState[]>(initAreas(EXEC_AREAS));

  // Staff & incidents
  const [staff, setStaff] = useState<ManualStaffRow[]>([emptyStaff()]);
  const [incidents, setIncidents] = useState<ManualIncidentRow[]>([]);

  function updateChecklistItem(list: ChecklistItemState[], setList: typeof setChecklistItems, id: string, field: keyof ChecklistItemState, val: string) {
    setList(list.map(item => item.id === id ? { ...item, [field]: val } : item));
  }

  function updateArea(list: SpecialAreaState[], setList: typeof setSpecialAreas, id: string, field: keyof SpecialAreaState, val: string | boolean) {
    setList(list.map(a => a.id === id ? { ...a, [field]: val } : a));
  }

  function updateStaff(i: number, field: keyof ManualStaffRow, val: string) {
    setStaff(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }

  function updateIncident(i: number, field: keyof ManualIncidentRow, val: string) {
    setIncidents(prev => prev.map((inc, idx) => idx === i ? { ...inc, [field]: val } : inc));
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const data: ManualShiftData = {
        date, shiftType, siteName, reporterName, totalWorkers,
        checklistItems, cleaningActions, specialAreas, execAreas,
        staff, incidents, handoverNotes,
      };
      await generateManualShiftPdf(data);
    } catch (err: any) {
      toast({ title: "שגיאה ביצירת PDF", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !generating && !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileDown size={20} />
            דיווח ידני — סיום משמרת
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="header" className="w-full">
          <TabsList className="grid grid-cols-5 w-full mb-4 text-xs">
            <TabsTrigger value="header">פרטי משמרת</TabsTrigger>
            <TabsTrigger value="checklist">צ׳ק ליסט</TabsTrigger>
            <TabsTrigger value="areas">שטחים רגישים</TabsTrigger>
            <TabsTrigger value="staff">כוח אדם</TabsTrigger>
            <TabsTrigger value="incidents">תקלות</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Shift Details ── */}
          <TabsContent value="header" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>תאריך</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>משמרת</Label>
                <Select value={shiftType} onValueChange={v => setShiftType(v as "morning" | "evening")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">בוקר</SelectItem>
                    <SelectItem value="evening">ערב</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>שם הנכס / אתר</Label>
                <Input placeholder="לדוגמה: בניין הראשי" value={siteName} onChange={e => setSiteName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>שם המדווח</Label>
                <Input placeholder="שם מלא" value={reporterName} onChange={e => setReporterName(e.target.value)} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>מספר עובדים במשמרת</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="לדוגמה: 4"
                  value={totalWorkers}
                  onChange={e => setTotalWorkers(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>הערות מסירה למשמרת הבאה</Label>
              <Textarea
                placeholder="הערות, נושאים פתוחים, הנחיות..."
                rows={4}
                value={handoverNotes}
                onChange={e => setHandoverNotes(e.target.value)}
              />
            </div>
          </TabsContent>

          {/* ── Tab 2: General Checklist ── */}
          <TabsContent value="checklist" className="space-y-3">
            <p className="text-xs text-muted-foreground mb-1">סמן את מצב כל פריט. פריטים חלקיים / לא תקינים יחייבו תיאור פער.</p>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">משימות כלליות</p>
              <div className="space-y-2">
                {checklistItems.map(item => (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    onChange={(field, val) => updateChecklistItem(checklistItems, setChecklistItems, item.id, field, val)}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5 pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">פעולות ניקיון נוספות</p>
              <div className="space-y-2">
                {cleaningActions.map(item => (
                  <ChecklistRow
                    key={item.id}
                    item={item}
                    onChange={(field, val) => updateChecklistItem(cleaningActions, setCleaningActions, item.id, field, val)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 3: Sensitive Areas ── */}
          <TabsContent value="areas" className="space-y-4">
            <p className="text-xs text-muted-foreground mb-1">סמן סטטוס, רמת ניקיון, ואם נדרש ניקיון חוזר.</p>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">שטחים רגישים</p>
              <div className="space-y-2">
                {specialAreas.map(area => (
                  <AreaRow
                    key={area.id}
                    area={area}
                    onChange={(field, val) => updateArea(specialAreas, setSpecialAreas, area.id, field, val)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">אזורי הנהלה</p>
              <div className="space-y-2">
                {execAreas.map(area => (
                  <AreaRow
                    key={area.id}
                    area={area}
                    onChange={(field, val) => updateArea(execAreas, setExecAreas, area.id, field, val)}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 4: Staff ── */}
          <TabsContent value="staff" className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">{staff.filter(s => s.name).length} עובדים</span>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setStaff(p => [...p, emptyStaff()])}>
                <Plus size={14} /> הוסף עובד
              </Button>
            </div>
            {staff.map((s, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground w-5">{i + 1}.</span>
                  <Input
                    className="flex-1"
                    placeholder="שם עובד"
                    value={s.name}
                    onChange={e => updateStaff(i, "name", e.target.value)}
                  />
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => setStaff(p => p.filter((_, idx) => idx !== i))}
                    disabled={staff.length === 1}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 pr-7">
                  <div className="space-y-1">
                    <Label className="text-xs">שעת כניסה</Label>
                    <Input type="time" value={s.startTime} onChange={e => updateStaff(i, "startTime", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">שעת יציאה</Label>
                    <Input type="time" value={s.endTime} onChange={e => updateStaff(i, "endTime", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">הפסקה (דק׳)</Label>
                    <Input type="number" min="0" value={s.breakMinutes} onChange={e => updateStaff(i, "breakMinutes", e.target.value)} />
                  </div>
                  <Input className="col-span-3" placeholder="הערות" value={s.notes} onChange={e => updateStaff(i, "notes", e.target.value)} />
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ── Tab 5: Incidents ── */}
          <TabsContent value="incidents" className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">{incidents.length} תקלות</span>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setIncidents(p => [...p, emptyIncident()])}>
                <Plus size={14} /> הוסף תקלה
              </Button>
            </div>
            {incidents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">אין תקלות לדווח</p>
            )}
            {incidents.map((inc, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground w-5">{i + 1}.</span>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Select value={inc.type} onValueChange={v => updateIncident(i, "type", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spillage">שפיכה</SelectItem>
                        <SelectItem value="restroom">שירותים</SelectItem>
                        <SelectItem value="safety">בטיחות</SelectItem>
                        <SelectItem value="damage">נזק</SelectItem>
                        <SelectItem value="equipment">ציוד</SelectItem>
                        <SelectItem value="shortage">חוסר</SelectItem>
                        <SelectItem value="other">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={inc.priority} onValueChange={v => updateIncident(i, "priority", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">קריטי</SelectItem>
                        <SelectItem value="high">גבוה</SelectItem>
                        <SelectItem value="medium">בינוני</SelectItem>
                        <SelectItem value="low">נמוך</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={inc.status} onValueChange={v => updateIncident(i, "status", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">פתוח</SelectItem>
                        <SelectItem value="in_progress">בטיפול</SelectItem>
                        <SelectItem value="resolved">טופל</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => setIncidents(p => p.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div className="pr-7">
                  <Input placeholder="תיאור התקלה" value={inc.description} onChange={e => updateIncident(i, "description", e.target.value)} />
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 mt-2 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={generating}>ביטול</Button>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            {generating ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            צור דוח PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
