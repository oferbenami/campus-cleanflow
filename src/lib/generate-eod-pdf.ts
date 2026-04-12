import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Generates a PDF from the EndOfDay report by rendering a hidden HTML element
 * to canvas (handles Hebrew/RTL natively) and embedding it in the PDF.
 */

export interface EodPdfData {
  date: string;
  shiftType: string;
  noAssignments: boolean;
  completionRate: number;
  efficiency: number;
  totalPlanned: number;
  totalActual: number;
  slaRate: number;
  slaBreach: number;
  auditAvg: number | null;
  staffRows: { name: string; done: number; total: number; planned: number; actual: number; breaches: number; avgScore: number | null }[];
  taskRows: { taskName: string; location: string; standardMinutes: number; actualMinutes: number | null; variancePercent: number | null; status: string }[];
  execAreas: { label: string; status: string; cleanlinessLevel: string; gapDescription: string; requiresReclean: boolean }[];
  checklistItems: { label: string; status: string; gapDescription: string }[];
  handoverNotes: string;
  totalWorkers: number;
  totalActualHours: number;
  deviationFromPlan: number;
}

const STATUS_HE: Record<string, string> = {
  ok: "תקין", partial: "חלקי", not_ok: "לא תקין", na: "לא רלוונטי",
  completed: "הושלם", in_progress: "בביצוע", queued: "ממתין", ready: "מוכן",
  blocked: "חסום", failed: "נכשל", high: "גבוה", medium: "בינוני", low: "נמוך",
};

function statusBadge(status: string): string {
  const label = STATUS_HE[status] || status;
  const colors: Record<string, string> = {
    ok: "#16a34a", completed: "#16a34a", high: "#16a34a",
    partial: "#ca8a04", in_progress: "#2563eb", medium: "#ca8a04",
    not_ok: "#dc2626", failed: "#dc2626", blocked: "#dc2626", low: "#dc2626",
  };
  const color = colors[status] || "#6b7280";
  return `<span style="color:${color};font-weight:600">${label}</span>`;
}

function buildHtml(data: EodPdfData): string {
  const shiftLabel = data.shiftType === "morning" ? "משמרת בוקר" : "משמרת ערב";

  let html = `
<div style="font-family:Arial,sans-serif;direction:rtl;padding:24px;color:#1a1a1a;max-width:800px;margin:0 auto">
  <h1 style="text-align:center;font-size:22px;margin-bottom:4px">דוח סיום משמרת</h1>
  <p style="text-align:center;color:#666;font-size:13px;margin-bottom:16px">${data.date} | ${shiftLabel}</p>`;

  if (data.noAssignments) {
    html += `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:10px;margin-bottom:16px;font-size:12px;color:#92400e">⚠️ דוח ללא משימות מוגדרות — כולל רק צ׳קליסט מוכנות ואזורי הנהלה</div>`;
  }

  // KPIs
  if (!data.noAssignments) {
    html += `
  <h2 style="font-size:15px;border-bottom:2px solid #3b82f6;padding-bottom:4px;margin:16px 0 8px">מדדי ביצוע</h2>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px">
    <tr style="background:#eff6ff">
      <td style="padding:6px 10px;border:1px solid #ddd"><strong>אחוז השלמה</strong></td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:center">${data.completionRate}%</td>
      <td style="padding:6px 10px;border:1px solid #ddd"><strong>יעילות</strong></td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:center">${data.efficiency}%</td>
    </tr>
    <tr>
      <td style="padding:6px 10px;border:1px solid #ddd"><strong>דקות תקן</strong></td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:center">${data.totalPlanned}</td>
      <td style="padding:6px 10px;border:1px solid #ddd"><strong>דקות בפועל</strong></td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:center">${data.totalActual}</td>
    </tr>
    <tr style="background:#eff6ff">
      <td style="padding:6px 10px;border:1px solid #ddd"><strong>עמידה ב-SLA</strong></td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:center">${data.slaRate}%</td>
      <td style="padding:6px 10px;border:1px solid #ddd"><strong>חריגות SLA</strong></td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:center">${data.slaBreach}</td>
    </tr>
    <tr>
      <td style="padding:6px 10px;border:1px solid #ddd"><strong>ציון ביקורת ממוצע</strong></td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:center" colspan="3">${data.auditAvg !== null ? data.auditAvg : "—"}</td>
    </tr>
  </table>`;

    // Staff table
    if (data.staffRows.length > 0) {
      html += `
  <h2 style="font-size:15px;border-bottom:2px solid #3b82f6;padding-bottom:4px;margin:16px 0 8px">ביצוע לפי עובד</h2>
  <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px">
    <thead><tr style="background:#3b82f6;color:white">
      <th style="padding:6px;border:1px solid #ddd">עובד</th>
      <th style="padding:6px;border:1px solid #ddd">הושלמו</th>
      <th style="padding:6px;border:1px solid #ddd">תקן (דק׳)</th>
      <th style="padding:6px;border:1px solid #ddd">בפועל (דק׳)</th>
      <th style="padding:6px;border:1px solid #ddd">חריגות</th>
      <th style="padding:6px;border:1px solid #ddd">ציון</th>
    </tr></thead><tbody>`;
      data.staffRows.forEach((s, i) => {
        const bg = i % 2 === 0 ? "#fff" : "#f9fafb";
        html += `<tr style="background:${bg}">
        <td style="padding:5px 8px;border:1px solid #ddd">${s.name}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${s.done}/${s.total}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${s.planned}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${s.actual}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${s.breaches}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${s.avgScore !== null ? s.avgScore : "—"}</td>
      </tr>`;
      });
      html += `</tbody></table>`;
    }

    // Task details
    if (data.taskRows.length > 0) {
      html += `
  <h2 style="font-size:15px;border-bottom:2px solid #3b82f6;padding-bottom:4px;margin:16px 0 8px">פירוט משימות</h2>
  <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:16px">
    <thead><tr style="background:#3b82f6;color:white">
      <th style="padding:5px;border:1px solid #ddd">משימה</th>
      <th style="padding:5px;border:1px solid #ddd">מיקום</th>
      <th style="padding:5px;border:1px solid #ddd">תקן</th>
      <th style="padding:5px;border:1px solid #ddd">בפועל</th>
      <th style="padding:5px;border:1px solid #ddd">סטייה</th>
      <th style="padding:5px;border:1px solid #ddd">סטטוס</th>
    </tr></thead><tbody>`;
      data.taskRows.forEach((t, i) => {
        const bg = i % 2 === 0 ? "#fff" : "#f9fafb";
        html += `<tr style="background:${bg}">
        <td style="padding:4px 6px;border:1px solid #ddd">${t.taskName}</td>
        <td style="padding:4px 6px;border:1px solid #ddd">${t.location}</td>
        <td style="padding:4px 6px;border:1px solid #ddd;text-align:center">${t.standardMinutes}'</td>
        <td style="padding:4px 6px;border:1px solid #ddd;text-align:center">${t.actualMinutes !== null ? `${t.actualMinutes}'` : "—"}</td>
        <td style="padding:4px 6px;border:1px solid #ddd;text-align:center">${t.variancePercent !== null ? `${Math.round(t.variancePercent)}%` : "—"}</td>
        <td style="padding:4px 6px;border:1px solid #ddd;text-align:center">${statusBadge(t.status)}</td>
      </tr>`;
      });
      html += `</tbody></table>`;
    }
  }

  // Executive areas
  if (data.execAreas.length > 0) {
    html += `
  <h2 style="font-size:15px;border-bottom:2px solid #dc2626;padding-bottom:4px;margin:16px 0 8px">אזורי הנהלה</h2>
  <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px">
    <thead><tr style="background:#dc2626;color:white">
      <th style="padding:6px;border:1px solid #ddd">אזור</th>
      <th style="padding:6px;border:1px solid #ddd">סטטוס</th>
      <th style="padding:6px;border:1px solid #ddd">ניקיון</th>
      <th style="padding:6px;border:1px solid #ddd">ניקיון חוזר</th>
      <th style="padding:6px;border:1px solid #ddd">תיאור פער</th>
    </tr></thead><tbody>`;
    data.execAreas.forEach((e, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#fef2f2";
      html += `<tr style="background:${bg}">
      <td style="padding:5px 8px;border:1px solid #ddd">${e.label}</td>
      <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${statusBadge(e.status)}</td>
      <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${statusBadge(e.cleanlinessLevel)}</td>
      <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${e.requiresReclean ? "כן" : "לא"}</td>
      <td style="padding:5px 8px;border:1px solid #ddd">${e.gapDescription || "—"}</td>
    </tr>`;
    });
    html += `</tbody></table>`;
  }

  // Checklist
  if (data.checklistItems.length > 0) {
    html += `
  <h2 style="font-size:15px;border-bottom:2px solid #16a34a;padding-bottom:4px;margin:16px 0 8px">צ׳קליסט מוכנות</h2>
  <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px">
    <thead><tr style="background:#16a34a;color:white">
      <th style="padding:6px;border:1px solid #ddd">פריט</th>
      <th style="padding:6px;border:1px solid #ddd">סטטוס</th>
      <th style="padding:6px;border:1px solid #ddd">תיאור פער</th>
    </tr></thead><tbody>`;
    data.checklistItems.forEach((c, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#f0fdf4";
      html += `<tr style="background:${bg}">
      <td style="padding:5px 8px;border:1px solid #ddd">${c.label}</td>
      <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${statusBadge(c.status)}</td>
      <td style="padding:5px 8px;border:1px solid #ddd">${c.gapDescription || "—"}</td>
    </tr>`;
    });
    html += `</tbody></table>`;
  }

  // Workforce summary
  html += `
  <h2 style="font-size:15px;border-bottom:2px solid #6b7280;padding-bottom:4px;margin:16px 0 8px">סיכום כוח אדם</h2>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px">
    <tr style="background:#f3f4f6">
      <td style="padding:6px 10px;border:1px solid #ddd"><strong>עובדים במשמרת</strong></td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:center">${data.totalWorkers}</td>
      <td style="padding:6px 10px;border:1px solid #ddd"><strong>שעות בפועל</strong></td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:center">${data.totalActualHours}</td>
    </tr>
    <tr>
      <td style="padding:6px 10px;border:1px solid #ddd"><strong>סטייה מתוכנית</strong></td>
      <td style="padding:6px 10px;border:1px solid #ddd;text-align:center" colspan="3">${data.deviationFromPlan}%</td>
    </tr>
  </table>`;

  if (data.handoverNotes) {
    html += `
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:12px">
    <strong style="font-size:12px">הערות מסירה:</strong>
    <p style="font-size:11px;margin:4px 0 0;color:#374151">${data.handoverNotes}</p>
  </div>`;
  }

  html += `
  <p style="text-align:center;font-size:9px;color:#9ca3af;margin-top:20px">נוצר אוטומטית · ${new Date().toLocaleString("he-IL")}</p>
</div>`;

  return html;
}

export async function generateEodPdf(data: EodPdfData): Promise<void> {
  // Create a hidden container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-9999px";
  container.style.left = "0";
  container.style.width = "800px";
  container.style.background = "white";
  container.innerHTML = buildHtml(data);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF("p", "mm", "a4");
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`shift-report-${data.date}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
