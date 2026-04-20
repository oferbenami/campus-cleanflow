import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, FileDown, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { generateManualShiftPdf, type ManualShiftData, type ManualTaskRow, type ManualStaffRow, type ManualIncidentRow } from "@/lib/generate-manual-shift-pdf";

interface Props {
  open: boolean;
  onClose: () => void;
}

const today = new Date().toISOString().slice(0, 10);

const emptyTask = (): ManualTaskRow => ({ taskName: "", location: "", standardMinutes: "", actualMinutes: "", status: "completed", notes: "" });
const emptyStaff = (): ManualStaffRow => ({ name: "", startTime: "", endTime: "", breakMinutes: "30", notes: "" });
const emptyIncident = (): ManualIncidentRow => ({ type: "other", description: "", priority: "medium", status: "open" });

export default function ManualShiftReportDialog({ open, onClose }: Props) {
  const [generating, setGenerating] = useState(false);

  const [date, setDate] = useState(today);
  const [shiftType, setShiftType] = useState<"morning" | "evening">("morning");
  const [siteName, setSiteName] = useState("");
  const [reporterName, setReporterName] = useState("");

  const [tasks, setTasks] = useState<ManualTaskRow[]>([emptyTask()]);
  const [staff, setStaff] = useState<ManualStaffRow[]>([emptyStaff()]);
  const [incidents, setIncidents] = useState<ManualIncidentRow[]>([]);
  const [handoverNotes, setHandoverNotes] = useState("");

  function updateTask(i: number, field: keyof ManualTaskRow, val: string) {
    setTasks(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  }
  function updateStaff(i: number, field: keyof ManualStaffRow, val: string) {
    setStaff(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }
  function updateIncident(i: number, field: keyof ManualIncidentRow, val: string) {
    setIncidents(prev => prev.map((inc, idx) => idx === i ? { ...inc, [field]: val } : inc));
  }

  async function handleGenerate() {
    const hasData = tasks.some(t => t.taskName.trim()) || staff.some(s => s.name.trim());
    if (!hasData) {
      toast({ title: "יש למלא לפחות משימה אחת או עובד אחד", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const data: ManualShiftData = { date, shiftType, siteName, reporterName, tasks, staff, incidents, handoverNotes };
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
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="header">פרטי משמרת</TabsTrigger>
            <TabsTrigger value="tasks">משימות</TabsTrigger>
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
            </div>
            <div className="space-y-1.5">
              <Label>הערות מסירה לסיום משמרת</Label>
              <Textarea
                placeholder="הערות, הנחיות למשמרת הבאה, נושאים פתוחים..."
                rows={4}
                value={handoverNotes}
                onChange={e => setHandoverNotes(e.target.value)}
              />
            </div>
          </TabsContent>

          {/* ── Tab 2: Tasks ── */}
          <TabsContent value="tasks" className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">{tasks.length} משימות</span>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setTasks(p => [...p, emptyTask()])}>
                <Plus size={14} /> הוסף משימה
              </Button>
            </div>
            {tasks.map((t, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground w-5">{i + 1}.</span>
                  <Input
                    className="flex-1"
                    placeholder="שם המשימה"
                    value={t.taskName}
                    onChange={e => updateTask(i, "taskName", e.target.value)}
                  />
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => setTasks(p => p.filter((_, idx) => idx !== i))}
                    disabled={tasks.length === 1}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 pr-7">
                  <Input placeholder="מיקום" value={t.location} onChange={e => updateTask(i, "location", e.target.value)} />
                  <Select value={t.status} onValueChange={v => updateTask(i, "status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">הושלם</SelectItem>
                      <SelectItem value="partial">חלקי</SelectItem>
                      <SelectItem value="in_progress">בביצוע</SelectItem>
                      <SelectItem value="deferred">נדחה</SelectItem>
                      <SelectItem value="cancelled">בוטל</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="דק׳ תקן" type="number" min="0" value={t.standardMinutes} onChange={e => updateTask(i, "standardMinutes", e.target.value)} />
                  <Input placeholder="דק׳ בפועל" type="number" min="0" value={t.actualMinutes} onChange={e => updateTask(i, "actualMinutes", e.target.value)} />
                  <Input className="col-span-2" placeholder="הערות" value={t.notes} onChange={e => updateTask(i, "notes", e.target.value)} />
                </div>
              </div>
            ))}
          </TabsContent>

          {/* ── Tab 3: Staff ── */}
          <TabsContent value="staff" className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">{staff.length} עובדים</span>
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

          {/* ── Tab 4: Incidents ── */}
          <TabsContent value="incidents" className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">{incidents.length} תקלות</span>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setIncidents(p => [...p, emptyIncident()])}>
                <Plus size={14} /> הוסף תקלה
              </Button>
            </div>
            {incidents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">אין תקלות לדווח — לחץ "הוסף תקלה" אם יש</p>
            )}
            {incidents.map((inc, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground w-5">{i + 1}.</span>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <Select value={inc.type} onValueChange={v => updateIncident(i, "type", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">קריטי</SelectItem>
                        <SelectItem value="high">גבוה</SelectItem>
                        <SelectItem value="medium">בינוני</SelectItem>
                        <SelectItem value="low">נמוך</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={inc.status} onValueChange={v => updateIncident(i, "status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={onClose} disabled={generating}>ביטול</Button>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            {generating ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            צור PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
