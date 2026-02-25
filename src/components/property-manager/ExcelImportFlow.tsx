import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, Check, AlertTriangle, Loader2, ArrowRight, ArrowLeft, X } from "lucide-react";
import * as XLSX from "xlsx";
import { useImportWorkPackages, computeStandardMinutes } from "@/hooks/useWorkPackages";

// Hebrew column mapping
const HEBREW_COLUMN_MAP: Record<string, string> = {
  "חבילת עבודה מספר": "package_code",
  "משמרת": "shift_name",
  "בנין": "building",
  "קומה": "floor",
  "סוג שטח": "space_type",
  "תאור": "description",
  "שטח מ\"ר": "area_sqm",
  "כלים": "tools_qty",
  "סוג ניקוי": "cleaning_type",
  "מקדם שטח בדקות": "area_minutes_coeff",
  "מקדם כלים בדקות": "tools_minutes_coeff",
  "סה\"כ דקות": "standard_minutes",
  "סבבי ניקיון": "rounds_per_shift",
  "במשמרת": "in_shift_flag",
  "סה\"כ דקות למשמרת": "total_minutes_per_shift",
};

const FIELD_LABELS: Record<string, string> = {
  package_code: "קוד חבילה",
  shift_name: "משמרת",
  building: "בנין",
  floor: "קומה",
  space_type: "סוג שטח",
  description: "תאור",
  area_sqm: "שטח מ\"ר",
  tools_qty: "כלים",
  cleaning_type: "סוג ניקוי",
  area_minutes_coeff: "מקדם שטח",
  tools_minutes_coeff: "מקדם כלים",
  standard_minutes: "סה\"כ דקות",
  rounds_per_shift: "סבבי ניקיון",
  in_shift_flag: "במשמרת",
  total_minutes_per_shift: "סה\"כ דקות למשמרת",
};

const ALL_FIELDS = Object.keys(FIELD_LABELS);

type Step = "upload" | "preview" | "mapping" | "options" | "summary";

interface ParsedRow {
  [key: string]: any;
}

interface ValidationIssue {
  row: number;
  field: string;
  message: string;
}

const ExcelImportFlow = () => {
  const [step, setStep] = useState<Step>("upload");
  const [rawData, setRawData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importMode, setImportMode] = useState<"create" | "update" | "skip">("create");
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [fileName, setFileName] = useState("");

  const importMutation = useImportWorkPackages();

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: null });

      if (json.length === 0) return;

      const hdrs = Object.keys(json[0]);
      setHeaders(hdrs);
      setRawData(json);

      // Auto-map Hebrew columns
      const autoMap: Record<string, string> = {};
      hdrs.forEach((h) => {
        const trimmed = h.trim();
        if (HEBREW_COLUMN_MAP[trimmed]) {
          autoMap[h] = HEBREW_COLUMN_MAP[trimmed];
        }
      });
      setColumnMapping(autoMap);
      setStep("preview");
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const getMappedValue = (row: ParsedRow, field: string): any => {
    const headerKey = Object.entries(columnMapping).find(([, v]) => v === field)?.[0];
    if (!headerKey) return null;
    const val = row[headerKey];
    if (val === null || val === undefined || val === "" || (typeof val === "number" && isNaN(val))) return null;
    return val;
  };

  const validate = () => {
    const issues: ValidationIssue[] = [];
    rawData.forEach((row, idx) => {
      const pkgCode = getMappedValue(row, "package_code");
      if (!pkgCode) issues.push({ row: idx + 2, field: "package_code", message: "קוד חבילה חסר" });
    });
    setValidationIssues(issues);
    return issues.filter((i) => i.field === "package_code").length === 0;
  };

  const buildPackages = () => {
    const grouped: Record<string, any> = {};

    rawData.forEach((row) => {
      const pkgCode = String(getMappedValue(row, "package_code") || "unknown");
      const shiftName = String(getMappedValue(row, "shift_name") || "morning");
      const building = getMappedValue(row, "building");
      const floor = getMappedValue(row, "floor");
      const key = `${pkgCode}__${shiftName}`;

      if (!grouped[key]) {
        const shiftType = shiftName.includes("ערב") || shiftName.toLowerCase().includes("evening") ? "evening" : "morning";
        grouped[key] = {
          package_code: pkgCode,
          name: `${pkgCode} - ${shiftName}${building ? ` - ${building}` : ""}${floor ? `/${floor}` : ""}`,
          shift_type: shiftType,
          building: building ? String(building) : null,
          floor: floor ? String(floor) : null,
          tasks: [],
        };
      }

      const area_sqm = parseFloat(getMappedValue(row, "area_sqm")) || null;
      const tools_qty = parseFloat(getMappedValue(row, "tools_qty")) || null;
      const area_minutes_coeff = parseFloat(getMappedValue(row, "area_minutes_coeff")) || null;
      const tools_minutes_coeff = parseFloat(getMappedValue(row, "tools_minutes_coeff")) || null;
      const rawRounds = getMappedValue(row, "rounds_per_shift");
      const rounds = rawRounds != null ? parseInt(rawRounds) : null;
      // Use per-task standard_minutes (NOT total across rounds)
      let perTaskMinutes = parseFloat(getMappedValue(row, "standard_minutes")) || 0;

      // Compute per-task time if missing (without multiplying by rounds)
      if (!perTaskMinutes || perTaskMinutes <= 0) {
        perTaskMinutes = computeStandardMinutes({
          area_sqm,
          area_minutes_coeff,
          tools_qty,
          tools_minutes_coeff,
        }, false); // false = don't apply rounds
      }

      const spaceType = getMappedValue(row, "space_type");
      const desc = getMappedValue(row, "description");
      const cleaningType = getMappedValue(row, "cleaning_type");

      // If rounds is explicitly 0, skip this task entirely
      if (rounds === 0) return;

      // Split into N tasks when rounds > 1; if null/undefined treat as 1
      const taskCount = (rounds && rounds > 1) ? rounds : 1;
      for (let round = 1; round <= taskCount; round++) {
        const roundSuffix = taskCount > 1 ? ` (סבב ${round}/${taskCount})` : "";
        grouped[key].tasks.push({
          location_ref: [building, floor, spaceType, desc].filter(Boolean).join(" / "),
          space_type: spaceType ? String(spaceType) : null,
          description: desc ? `${String(desc || "")}${roundSuffix}`.trim() || null : roundSuffix.trim() || null,
          cleaning_type: cleaningType ? String(cleaningType) : null,
          area_sqm,
          tools_qty,
          area_minutes_coeff,
          tools_minutes_coeff,
          standard_minutes: perTaskMinutes,
          rounds_per_shift: 1, // Each split task is 1 round
          notes: taskCount > 1 ? `סבב ${round} מתוך ${taskCount}` : null,
        });
      }
    });

    return Object.values(grouped);
  };

  const handleImport = async () => {
    const packages = buildPackages();
    const result = await importMutation.mutateAsync({ packages, mode: importMode });
    setImportResult(result);
    setStep("summary");
  };

  const reset = () => {
    setStep("upload");
    setRawData([]);
    setHeaders([]);
    setColumnMapping({});
    setImportResult(null);
    setValidationIssues([]);
    setFileName("");
  };

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {(["upload", "preview", "mapping", "options", "summary"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            {i > 0 && <ArrowRight size={10} />}
            <span className={`px-2 py-0.5 rounded ${step === s ? "bg-primary text-primary-foreground font-bold" : "bg-muted"}`}>
              {s === "upload" ? "העלאה" : s === "preview" ? "תצוגה" : s === "mapping" ? "מיפוי" : s === "options" ? "אפשרויות" : "סיכום"}
            </span>
          </div>
        ))}
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-4">
          <FileSpreadsheet size={48} className="mx-auto text-muted-foreground" />
          <p className="text-sm font-semibold">העלה קובץ Excel (.xlsx)</p>
          <p className="text-xs text-muted-foreground">מבנה: שורה לכל משימה, קוד חבילת עבודה כעמודה מקבצת</p>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold cursor-pointer hover:bg-primary/90">
            <Upload size={16} />
            בחר קובץ
            <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">תצוגה מקדימה: {fileName}</h3>
              <p className="text-xs text-muted-foreground">{rawData.length} שורות, {headers.length} עמודות</p>
            </div>
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <X size={12} /> התחל מחדש
            </button>
          </div>
          <div className="overflow-auto max-h-[300px] border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="p-2 text-right font-semibold">#</th>
                  {headers.slice(0, 10).map((h) => (
                    <th key={h} className="p-2 text-right font-semibold whitespace-nowrap">{h}</th>
                  ))}
                  {headers.length > 10 && <th className="p-2 text-muted-foreground">+{headers.length - 10}</th>}
                </tr>
              </thead>
              <tbody>
                {rawData.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    {headers.slice(0, 10).map((h) => (
                      <td key={h} className="p-2 whitespace-nowrap max-w-[120px] truncate">
                        {row[h] != null ? String(row[h]) : <span className="text-muted-foreground/50">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rawData.length > 20 && <p className="text-xs text-muted-foreground text-center">מציג 20 מתוך {rawData.length} שורות</p>}
          <div className="flex justify-end">
            <button onClick={() => setStep("mapping")} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              המשך למיפוי <ArrowLeft size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Step: Column Mapping */}
      {step === "mapping" && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm">מיפוי עמודות</h3>
          <p className="text-xs text-muted-foreground">בדוק שהעמודות ממופות נכון. המערכת זיהתה אוטומטית כותרות בעברית.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_FIELDS.map((field) => {
              const mappedHeader = Object.entries(columnMapping).find(([, v]) => v === field)?.[0] || "";
              return (
                <div key={field} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                  <span className="text-xs font-semibold min-w-[80px]">{FIELD_LABELS[field]}</span>
                  <select
                    value={mappedHeader}
                    onChange={(e) => {
                      const newMap = { ...columnMapping };
                      // Remove old mapping for this field
                      Object.keys(newMap).forEach((k) => { if (newMap[k] === field) delete newMap[k]; });
                      if (e.target.value) newMap[e.target.value] = field;
                      setColumnMapping(newMap);
                    }}
                    className="flex-1 bg-background border border-input rounded px-2 py-1 text-xs"
                  >
                    <option value="">— לא ממופה —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  {mappedHeader && <Check size={14} className="text-primary shrink-0" />}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep("preview")} className="text-xs text-muted-foreground hover:text-foreground">חזור</button>
            <button
              onClick={() => {
                if (validate()) setStep("options");
              }}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
            >
              המשך <ArrowLeft size={14} />
            </button>
          </div>

          {validationIssues.length > 0 && (
            <div className="bg-destructive/10 rounded-lg p-3 space-y-1">
              <p className="text-xs font-bold text-destructive flex items-center gap-1">
                <AlertTriangle size={14} /> שגיאות אימות ({validationIssues.length})
              </p>
              {validationIssues.slice(0, 10).map((issue, i) => (
                <p key={i} className="text-xs text-destructive/80">שורה {issue.row}: {issue.message}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step: Options */}
      {step === "options" && (
        <div className="space-y-4">
          <h3 className="font-bold text-sm">אפשרויות ייבוא</h3>

          <div className="space-y-2">
            {[
              { value: "create" as const, label: "צור חבילות חדשות", desc: "ייבוא רק חבילות שלא קיימות" },
              { value: "update" as const, label: "עדכן חבילות קיימות", desc: "עדכן חבילות עם אותו קוד (מחיקת משימות ישנות)" },
              { value: "skip" as const, label: "דלג על כפילויות", desc: "ייבוא רק חבילות חדשות, דילוג על קיימות" },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  importMode === opt.value ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={importMode === opt.value}
                  onChange={() => setImportMode(opt.value)}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-semibold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Pre-import summary */}
          {(() => {
            const packages = buildPackages();
            const totalTasks = packages.reduce((s, p) => s + p.tasks.length, 0);
            const totalMinutes = packages.reduce(
              (s, p) => s + p.tasks.reduce((ts: number, t: any) => ts + (t.standard_minutes || 0), 0),
              0
            );
            return (
              <div className="bg-muted rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold">סיכום לפני ייבוא:</p>
                <p className="text-xs text-muted-foreground">{packages.length} חבילות עבודה</p>
                <p className="text-xs text-muted-foreground">{totalTasks} משימות</p>
                <p className="text-xs text-muted-foreground">{Math.round(totalMinutes)} דקות תקן סה״כ</p>
              </div>
            );
          })()}

          <div className="flex justify-between">
            <button onClick={() => setStep("mapping")} className="text-xs text-muted-foreground hover:text-foreground">חזור</button>
            <button
              onClick={handleImport}
              disabled={importMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
            >
              {importMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              בצע ייבוא
            </button>
          </div>
        </div>
      )}

      {/* Step: Summary */}
      {step === "summary" && importResult && (
      <div className="space-y-4 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Check size={32} className="text-primary" />
          </div>
          <h3 className="font-bold text-lg">ייבוא הושלם בהצלחה!</h3>
          <div className="bg-muted rounded-lg p-4 space-y-2 text-right">
            <p className="text-sm"><span className="font-semibold">{importResult.created}</span> חבילות נוצרו</p>
            <p className="text-sm"><span className="font-semibold">{importResult.updated}</span> חבילות עודכנו</p>
            <p className="text-sm"><span className="font-semibold">{importResult.skipped}</span> חבילות דולגו</p>
            <p className="text-sm"><span className="font-semibold">{importResult.tasksCreated}</span> משימות נוצרו</p>
          </div>
          <button onClick={reset} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
            ייבוא נוסף
          </button>
        </div>
      )}
    </div>
  );
};

export default ExcelImportFlow;
