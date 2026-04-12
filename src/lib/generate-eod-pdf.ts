import jsPDF from "jspdf";
import "jspdf-autotable";

/* ─── Hebrew RTL helper ─── */
// jsPDF doesn't support RTL natively, so we reverse Hebrew strings for display
function reverseHebrew(text: string): string {
  // Split by spaces, reverse each word's characters only if it contains Hebrew
  const hasHebrew = /[\u0590-\u05FF]/;
  if (!hasHebrew.test(text)) return text;
  // Reverse the entire string character-by-character for pure Hebrew
  return text.split("").reverse().join("");
}

function rh(text: string): string {
  // For mixed content: reverse word order and Hebrew characters
  const hasHebrew = /[\u0590-\u05FF]/;
  if (!hasHebrew.test(text)) return text;

  const words = text.split(" ");
  return words
    .map((w) => (hasHebrew.test(w) ? w.split("").reverse().join("") : w))
    .reverse()
    .join(" ");
}

/* ─── Types ─── */

interface StaffRow {
  name: string;
  done: number;
  total: number;
  planned: number;
  actual: number;
  breaches: number;
  avgScore: number | null;
}

interface TaskRow {
  taskName: string;
  location: string;
  standardMinutes: number;
  actualMinutes: number | null;
  variancePercent: number | null;
  status: string;
}

interface ExecAreaRow {
  label: string;
  status: string;
  cleanlinessLevel: string;
  gapDescription: string;
  requiresReclean: boolean;
}

interface ChecklistItemRow {
  label: string;
  status: string;
  gapDescription: string;
}

export interface EodPdfData {
  date: string;
  shiftType: string;
  siteName?: string;
  noAssignments: boolean;

  // KPIs
  completionRate: number;
  efficiency: number;
  totalPlanned: number;
  totalActual: number;
  slaRate: number;
  slaBreach: number;
  auditAvg: number | null;

  // Tables
  staffRows: StaffRow[];
  taskRows: TaskRow[];
  execAreas: ExecAreaRow[];
  checklistItems: ChecklistItemRow[];

  // Checklist summary
  handoverNotes: string;
  totalWorkers: number;
  totalActualHours: number;
  deviationFromPlan: number;
}

const STATUS_LABELS: Record<string, string> = {
  ok: "תקין",
  partial: "חלקי",
  not_ok: "לא תקין",
  na: "לא רלוונטי",
  completed: "הושלם",
  in_progress: "בביצוע",
  queued: "ממתין",
  ready: "מוכן",
  blocked: "חסום",
  failed: "נכשל",
  high: "גבוה",
  medium: "בינוני",
  low: "נמוך",
};

function sl(key: string): string {
  return rh(STATUS_LABELS[key] || key);
}

export function generateEodPdf(data: EodPdfData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(rh("דוח סיום משמרת"), pageWidth / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.date}  |  ${rh(data.shiftType === "morning" ? "משמרת בוקר" : "משמרת ערב")}`, pageWidth / 2, y, { align: "center" });
  y += 4;

  if (data.noAssignments) {
    doc.setTextColor(200, 120, 0);
    doc.text(rh("דוח ללא משימות מוגדרות"), pageWidth / 2, y, { align: "center" });
    doc.setTextColor(0);
    y += 4;
  }

  y += 4;

  // Separator line
  doc.setDrawColor(200);
  doc.line(15, y, pageWidth - 15, y);
  y += 6;

  // KPIs section (only if there are assignments)
  if (!data.noAssignments) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(rh("מדדי ביצוע"), pageWidth - 15, y, { align: "right" });
    y += 7;

    const kpiData = [
      [rh("אחוז השלמה"), `${data.completionRate}%`],
      [rh("יעילות"), `${data.efficiency}%`],
      [rh("דקות תקן"), `${data.totalPlanned}`],
      [rh("דקות בפועל"), `${data.totalActual}`],
      [rh("עמידה ב-SLA"), `${data.slaRate}%`],
      [rh("חריגות SLA"), `${data.slaBreach}`],
      [rh("ציון ביקורת ממוצע"), data.auditAvg !== null ? `${data.auditAvg}` : "—"],
    ];

    (doc as any).autoTable({
      startY: y,
      head: [[rh("מדד"), rh("ערך")]],
      body: kpiData,
      theme: "grid",
      styles: { fontSize: 10, halign: "center", font: "helvetica" },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { halign: "right" }, 1: { halign: "center" } },
      margin: { left: 15, right: 15 },
      tableWidth: "auto",
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Staff performance table
    if (data.staffRows.length > 0) {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(rh("ביצוע לפי עובד"), pageWidth - 15, y, { align: "right" });
      y += 7;

      const staffHead = [
        [rh("עובד"), rh("הושלמו"), rh("תקן"), rh("בפועל"), rh("חריגות"), rh("ציון")],
      ];
      const staffBody = data.staffRows.map((s) => [
        rh(s.name),
        `${s.done}/${s.total}`,
        `${s.planned}`,
        `${s.actual}`,
        `${s.breaches}`,
        s.avgScore !== null ? `${s.avgScore}` : "—",
      ]);

      (doc as any).autoTable({
        startY: y,
        head: staffHead,
        body: staffBody,
        theme: "striped",
        styles: { fontSize: 9, halign: "center", font: "helvetica" },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
        columnStyles: { 0: { halign: "right" } },
        margin: { left: 15, right: 15 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Task details table
    if (data.taskRows.length > 0) {
      if (y > 240) { doc.addPage(); y = 15; }

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(rh("פירוט משימות"), pageWidth - 15, y, { align: "right" });
      y += 7;

      const taskHead = [
        [rh("משימה"), rh("מיקום"), rh("תקן"), rh("בפועל"), rh("סטייה"), rh("סטטוס")],
      ];
      const taskBody = data.taskRows.map((t) => [
        rh(t.taskName),
        rh(t.location),
        `${t.standardMinutes}'`,
        t.actualMinutes !== null ? `${t.actualMinutes}'` : "—",
        t.variancePercent !== null ? `${Math.round(t.variancePercent)}%` : "—",
        sl(t.status),
      ]);

      (doc as any).autoTable({
        startY: y,
        head: taskHead,
        body: taskBody,
        theme: "striped",
        styles: { fontSize: 8, halign: "center", font: "helvetica" },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
        columnStyles: { 0: { halign: "right" }, 1: { halign: "right" } },
        margin: { left: 15, right: 15 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // Executive Areas section
  if (data.execAreas.length > 0) {
    if (y > 240) { doc.addPage(); y = 15; }

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(rh("אזורי הנהלה"), pageWidth - 15, y, { align: "right" });
    y += 7;

    const execHead = [
      [rh("אזור"), rh("סטטוס"), rh("ניקיון"), rh("ניקיון חוזר"), rh("תיאור פער")],
    ];
    const execBody = data.execAreas.map((e) => [
      rh(e.label),
      sl(e.status),
      sl(e.cleanlinessLevel),
      e.requiresReclean ? rh("כן") : rh("לא"),
      e.gapDescription ? rh(e.gapDescription.slice(0, 40)) : "—",
    ]);

    (doc as any).autoTable({
      startY: y,
      head: execHead,
      body: execBody,
      theme: "striped",
      styles: { fontSize: 9, halign: "center", font: "helvetica" },
      headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { halign: "right" }, 4: { halign: "right" } },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Checklist items
  if (data.checklistItems.length > 0) {
    if (y > 240) { doc.addPage(); y = 15; }

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(rh("צ׳קליסט מוכנות"), pageWidth - 15, y, { align: "right" });
    y += 7;

    const clHead = [[rh("פריט"), rh("סטטוס"), rh("תיאור פער")]];
    const clBody = data.checklistItems.map((c) => [
      rh(c.label),
      sl(c.status),
      c.gapDescription ? rh(c.gapDescription.slice(0, 50)) : "—",
    ]);

    (doc as any).autoTable({
      startY: y,
      head: clHead,
      body: clBody,
      theme: "striped",
      styles: { fontSize: 9, halign: "center", font: "helvetica" },
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { halign: "right" }, 2: { halign: "right" } },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Workforce summary
  if (y > 260) { doc.addPage(); y = 15; }
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const summaryLines = [
    `${rh("עובדים במשמרת")}: ${data.totalWorkers}`,
    `${rh("שעות בפועל")}: ${data.totalActualHours}`,
    `${rh("סטייה מתוכנית")}: ${data.deviationFromPlan}%`,
  ];
  summaryLines.forEach((line) => {
    doc.text(line, pageWidth - 15, y, { align: "right" });
    y += 5;
  });

  if (data.handoverNotes) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text(rh("הערות מסירה:"), pageWidth - 15, y, { align: "right" });
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const noteLines = doc.splitTextToSize(rh(data.handoverNotes), pageWidth - 30);
    doc.text(noteLines, pageWidth - 15, y, { align: "right" });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `${rh("עמוד")} ${i} / ${pageCount}  |  ${rh("נוצר אוטומטית")} ${new Date().toLocaleString("he-IL")}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
    doc.setTextColor(0);
  }

  // Download
  doc.save(`shift-report-${data.date}.pdf`);
}
