import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ─── Types ─── */

export type ChecklistStatus = "ok" | "partial" | "not_ok" | "na";
export type AreaStatus = "ok" | "partial" | "not_ok";
export type CleanLevel = "high" | "medium" | "low";

export interface ChecklistItemState {
  id: string;
  label: string;
  status: ChecklistStatus;
  gapDescription: string;
}

export interface SpecialAreaState {
  id: string;
  label: string;
  status: AreaStatus;
  cleanlinessLevel: CleanLevel;
  gapDescription: string;
  requiresReclean: boolean;
}

export interface ManualStaffRow {
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: string;
  notes: string;
}

export interface ManualIncidentRow {
  type: string;
  description: string;
  priority: string;
  status: string;
}

export interface ManualShiftData {
  date: string;
  shiftType: "morning" | "evening";
  siteName: string;
  reporterName: string;
  totalWorkers: string;
  checklistItems: ChecklistItemState[];
  cleaningActions: ChecklistItemState[];
  specialAreas: SpecialAreaState[];
  execAreas: SpecialAreaState[];
  staff: ManualStaffRow[];
  incidents: ManualIncidentRow[];
  handoverNotes: string;
}

/* ─── Helpers ─── */

const STATUS_HE: Record<string, string> = {
  ok: "תקין", partial: "חלקי", not_ok: "לא תקין", na: "לא רלוונטי",
  high: "גבוה", medium: "בינוני", low: "נמוך",
  open: "פתוח", in_progress: "בטיפול", resolved: "טופל",
  critical: "קריטי",
  spillage: "שפיכה", restroom: "שירותים", safety: "בטיחות",
  damage: "נזק", equipment: "ציוד", shortage: "חוסר", other: "אחר",
};

const STATUS_COLOR: Record<string, string> = {
  ok: "#16a34a", resolved: "#16a34a", high: "#16a34a",
  partial: "#ca8a04", in_progress: "#2563eb", medium: "#ca8a04",
  not_ok: "#dc2626", open: "#dc2626", critical: "#dc2626", low: "#6b7280",
  na: "#9ca3af",
};

function badge(key: string): string {
  const label = STATUS_HE[key] || key;
  const color = STATUS_COLOR[key] || "#374151";
  return `<span style="color:${color};font-weight:700;font-size:11px">${label}</span>`;
}

function calcActualHours(start: string, end: string, breakMin: string): string {
  if (!start || !end) return "—";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const totalMin = (eh * 60 + em) - (sh * 60 + sm) - (Number(breakMin) || 0);
  if (totalMin <= 0) return "—";
  return `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, "0")}`;
}

function kpiBox(value: string, label: string, bg: string, color: string): string {
  return `<div style="flex:1;background:${bg};border:1px solid ${color}33;border-radius:8px;padding:10px;text-align:center">
    <div style="font-size:22px;font-weight:700;color:${color}">${value}</div>
    <div style="font-size:10px;color:#6b7280;margin-top:2px">${label}</div>
  </div>`;
}

function sectionTitle(label: string, color: string): string {
  return `<h2 style="font-size:14px;font-weight:700;border-bottom:2px solid ${color};padding-bottom:4px;margin:18px 0 8px;color:#1a1a1a">${label}</h2>`;
}

/* ─── HTML builder ─── */

function buildHtml(d: ManualShiftData): string {
  const shiftLabel = d.shiftType === "morning" ? "משמרת בוקר" : "משמרת ערב";

  // Checklist stats
  const allChecklist = [...d.checklistItems, ...d.cleaningActions];
  const checkOk = allChecklist.filter(i => i.status === "ok").length;
  const checkTotal = allChecklist.filter(i => i.status !== "na").length;
  const checkRate = checkTotal > 0 ? Math.round((checkOk / checkTotal) * 100) : 100;

  // Special areas stats
  const allAreas = [...d.specialAreas, ...d.execAreas];
  const areasOk = allAreas.filter(a => a.status === "ok").length;
  const areasTotal = allAreas.length;
  const areasRate = areasTotal > 0 ? Math.round((areasOk / areasTotal) * 100) : 100;

  const validStaff = d.staff.filter(s => s.name.trim());
  const validIncidents = d.incidents.filter(i => i.description.trim());
  const openIncidents = validIncidents.filter(i => i.status === "open" || i.status === "in_progress").length;

  let html = `
<div style="font-family:Arial,sans-serif;direction:rtl;padding:24px;color:#1a1a1a;max-width:800px;margin:0 auto">

  <h1 style="text-align:center;font-size:20px;font-weight:700;margin-bottom:2px">דוח סיום משמרת — דיווח ידני</h1>
  <p style="text-align:center;color:#555;font-size:12px;margin-bottom:16px">
    ${d.date} | ${shiftLabel}${d.siteName ? ` | ${d.siteName}` : ""}${d.reporterName ? ` | מדווח: ${d.reporterName}` : ""}
  </p>

  <!-- KPI row -->
  <div style="display:flex;gap:8px;margin-bottom:18px">
    ${kpiBox(`${checkRate}%`, "עמידה בצ׳ק ליסט", "#eff6ff", "#2563eb")}
    ${kpiBox(`${areasRate}%`, "שטחים תקינים", "#f0fdf4", "#16a34a")}
    ${kpiBox(d.totalWorkers || validStaff.length.toString() || "—", "עובדים במשמרת", "#fef3c7", "#ca8a04")}
    ${kpiBox(openIncidents.toString(), "תקלות פתוחות", openIncidents > 0 ? "#fef2f2" : "#f9fafb", openIncidents > 0 ? "#dc2626" : "#6b7280")}
  </div>`;

  /* ── Checklist items ── */
  if (d.checklistItems.length > 0 || d.cleaningActions.length > 0) {
    html += sectionTitle("צ׳ק ליסט משימות כלליות", "#2563eb");
    html += `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:4px">
      <thead><tr style="background:#2563eb;color:white">
        <th style="padding:6px 10px;border:1px solid #ddd;text-align:right">פריט</th>
        <th style="padding:6px;border:1px solid #ddd;width:80px">סטטוס</th>
        <th style="padding:6px 10px;border:1px solid #ddd;text-align:right">תיאור פער / הערה</th>
      </tr></thead><tbody>`;

    [...d.checklistItems, ...d.cleaningActions].forEach((item, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#eff6ff";
      const isIssue = item.status === "not_ok" || item.status === "partial";
      html += `<tr style="background:${isIssue ? "#fff7ed" : bg}">
        <td style="padding:5px 10px;border:1px solid #ddd">${item.label}${isIssue ? ' <span style="color:#dc2626">⚠</span>' : ""}</td>
        <td style="padding:5px;border:1px solid #ddd;text-align:center">${badge(item.status)}</td>
        <td style="padding:5px 10px;border:1px solid #ddd;font-size:10px;color:#555">${item.gapDescription || "—"}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
  }

  /* ── Special areas ── */
  if (d.specialAreas.length > 0) {
    html += sectionTitle("שטחים רגישים", "#7c3aed");
    html += `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:4px">
      <thead><tr style="background:#7c3aed;color:white">
        <th style="padding:6px 10px;border:1px solid #ddd;text-align:right">אזור</th>
        <th style="padding:6px;border:1px solid #ddd;width:70px">סטטוס</th>
        <th style="padding:6px;border:1px solid #ddd;width:70px">ניקיון</th>
        <th style="padding:6px;border:1px solid #ddd;width:60px">ניקיון חוזר</th>
        <th style="padding:6px 10px;border:1px solid #ddd;text-align:right">פער / הערה</th>
      </tr></thead><tbody>`;

    d.specialAreas.forEach((area, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#faf5ff";
      html += `<tr style="background:${area.status === "not_ok" ? "#fef2f2" : bg}">
        <td style="padding:5px 10px;border:1px solid #ddd;font-weight:600">${area.label}</td>
        <td style="padding:5px;border:1px solid #ddd;text-align:center">${badge(area.status)}</td>
        <td style="padding:5px;border:1px solid #ddd;text-align:center">${badge(area.cleanlinessLevel)}</td>
        <td style="padding:5px;border:1px solid #ddd;text-align:center">${area.requiresReclean ? '<span style="color:#dc2626;font-weight:700">כן</span>' : "לא"}</td>
        <td style="padding:5px 10px;border:1px solid #ddd;font-size:10px;color:#555">${area.gapDescription || "—"}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
  }

  /* ── Executive areas ── */
  if (d.execAreas.length > 0) {
    html += sectionTitle("אזורי הנהלה", "#dc2626");
    html += `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:4px">
      <thead><tr style="background:#dc2626;color:white">
        <th style="padding:6px 10px;border:1px solid #ddd;text-align:right">אזור הנהלה</th>
        <th style="padding:6px;border:1px solid #ddd;width:70px">סטטוס</th>
        <th style="padding:6px;border:1px solid #ddd;width:70px">רמת ניקיון</th>
        <th style="padding:6px;border:1px solid #ddd;width:60px">ניקיון חוזר</th>
        <th style="padding:6px 10px;border:1px solid #ddd;text-align:right">פער / הערה</th>
      </tr></thead><tbody>`;

    d.execAreas.forEach((area, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#fef2f2";
      html += `<tr style="background:${area.status === "not_ok" ? "#fee2e2" : bg}">
        <td style="padding:5px 10px;border:1px solid #ddd;font-weight:600">${area.label}</td>
        <td style="padding:5px;border:1px solid #ddd;text-align:center">${badge(area.status)}</td>
        <td style="padding:5px;border:1px solid #ddd;text-align:center">${badge(area.cleanlinessLevel)}</td>
        <td style="padding:5px;border:1px solid #ddd;text-align:center">${area.requiresReclean ? '<span style="color:#dc2626;font-weight:700">כן</span>' : "לא"}</td>
        <td style="padding:5px 10px;border:1px solid #ddd;font-size:10px;color:#555">${area.gapDescription || "—"}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
  }

  /* ── Workforce ── */
  if (validStaff.length > 0) {
    html += sectionTitle("כוח אדם", "#16a34a");
    html += `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:4px">
      <thead><tr style="background:#16a34a;color:white">
        <th style="padding:6px 10px;border:1px solid #ddd;text-align:right">שם עובד</th>
        <th style="padding:6px;border:1px solid #ddd;width:65px">כניסה</th>
        <th style="padding:6px;border:1px solid #ddd;width:65px">יציאה</th>
        <th style="padding:6px;border:1px solid #ddd;width:65px">הפסקה</th>
        <th style="padding:6px;border:1px solid #ddd;width:65px">שעות</th>
        <th style="padding:6px 10px;border:1px solid #ddd;text-align:right">הערות</th>
      </tr></thead><tbody>`;

    validStaff.forEach((s, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#f0fdf4";
      html += `<tr style="background:${bg}">
        <td style="padding:5px 10px;border:1px solid #ddd;font-weight:600">${s.name}</td>
        <td style="padding:5px;border:1px solid #ddd;text-align:center">${s.startTime || "—"}</td>
        <td style="padding:5px;border:1px solid #ddd;text-align:center">${s.endTime || "—"}</td>
        <td style="padding:5px;border:1px solid #ddd;text-align:center">${s.breakMinutes ? `${s.breakMinutes}׳` : "—"}</td>
        <td style="padding:5px;border:1px solid #ddd;text-align:center;font-weight:600">${calcActualHours(s.startTime, s.endTime, s.breakMinutes)}</td>
        <td style="padding:5px 10px;border:1px solid #ddd;font-size:10px;color:#555">${s.notes || "—"}</td>
      </tr>`;
    });

    // Total row
    html += `<tr style="background:#dcfce7;font-weight:700">
      <td style="padding:5px 10px;border:1px solid #ddd">סה״כ עובדים: ${d.totalWorkers || validStaff.length}</td>
      <td colspan="5" style="padding:5px 10px;border:1px solid #ddd;text-align:center;color:#16a34a">——</td>
    </tr>`;
    html += `</tbody></table>`;
  }

  /* ── Incidents ── */
  if (validIncidents.length > 0) {
    html += sectionTitle("תקלות ואירועים", "#dc2626");
    html += `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:4px">
      <thead><tr style="background:#dc2626;color:white">
        <th style="padding:6px 8px;border:1px solid #ddd;width:70px">סוג</th>
        <th style="padding:6px 10px;border:1px solid #ddd;text-align:right">תיאור</th>
        <th style="padding:6px 8px;border:1px solid #ddd;width:60px">עדיפות</th>
        <th style="padding:6px 8px;border:1px solid #ddd;width:60px">סטטוס</th>
      </tr></thead><tbody>`;

    validIncidents.forEach((inc, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#fef2f2";
      html += `<tr style="background:${bg}">
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${STATUS_HE[inc.type] || inc.type}</td>
        <td style="padding:5px 10px;border:1px solid #ddd">${inc.description}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${badge(inc.priority)}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${badge(inc.status)}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
  }

  /* ── Handover notes ── */
  if (d.handoverNotes.trim()) {
    html += `
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-top:14px">
    <strong style="font-size:12px">הערות מסירה:</strong>
    <p style="font-size:11px;margin:6px 0 0;color:#374151;white-space:pre-line">${d.handoverNotes}</p>
  </div>`;
  }

  /* ── Signatures ── */
  html += `
  <div style="display:flex;gap:24px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">
    <div style="flex:1;text-align:center">
      <div style="border-bottom:1px solid #374151;margin-bottom:6px;height:36px"></div>
      <span style="font-size:10px;color:#6b7280">חתימת מדווח — ${d.reporterName || "__________"}</span>
    </div>
    <div style="flex:1;text-align:center">
      <div style="border-bottom:1px solid #374151;margin-bottom:6px;height:36px"></div>
      <span style="font-size:10px;color:#6b7280">חתימת מפקח</span>
    </div>
    <div style="flex:1;text-align:center">
      <div style="border-bottom:1px solid #374151;margin-bottom:6px;height:36px"></div>
      <span style="font-size:10px;color:#6b7280">חתימת מנהל</span>
    </div>
  </div>
  <p style="text-align:center;font-size:9px;color:#9ca3af;margin-top:16px">דיווח ידני · CleanFlow · ${new Date().toLocaleString("he-IL")}</p>
</div>`;

  return html;
}

/* ─── Export ─── */

export async function generateManualShiftPdf(data: ManualShiftData): Promise<void> {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;top:-9999px;left:0;width:800px;background:white";
  container.innerHTML = buildHtml(data);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff" });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 210;
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

    const pdfBlob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(new Blob([pdfBlob], { type: "application/pdf" }));

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `manual-shift-report-${data.date}.pdf`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;background:rgba(0,0,0,0.6);display:flex;flex-direction:column";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:8px 16px;background:#1e293b;color:white;font-family:Arial,sans-serif";

    const title = document.createElement("span");
    title.textContent = `דוח משמרת ידני — ${data.date} | ${data.shiftType === "morning" ? "בוקר" : "ערב"}`;
    title.style.fontSize = "14px";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ סגור";
    closeBtn.style.cssText = "padding:6px 18px;background:#ef4444;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-weight:bold";
    closeBtn.onclick = () => { document.body.removeChild(overlay); URL.revokeObjectURL(blobUrl); };

    header.appendChild(title);
    header.appendChild(closeBtn);

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "flex:1;border:none;background:white";
    iframe.src = blobUrl;

    overlay.appendChild(header);
    overlay.appendChild(iframe);
    document.body.appendChild(overlay);
  } finally {
    document.body.removeChild(container);
  }
}
