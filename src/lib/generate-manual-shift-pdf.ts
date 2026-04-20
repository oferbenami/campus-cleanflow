import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface ManualTaskRow {
  taskName: string;
  location: string;
  standardMinutes: string;
  actualMinutes: string;
  status: string;
  notes: string;
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
  tasks: ManualTaskRow[];
  staff: ManualStaffRow[];
  incidents: ManualIncidentRow[];
  handoverNotes: string;
}

const TASK_STATUS_HE: Record<string, string> = {
  completed: "הושלם",
  partial: "חלקי",
  deferred: "נדחה",
  cancelled: "בוטל",
  in_progress: "בביצוע",
};

const INCIDENT_PRIORITY_HE: Record<string, string> = {
  critical: "קריטי",
  high: "גבוה",
  medium: "בינוני",
  low: "נמוך",
};

const INCIDENT_STATUS_HE: Record<string, string> = {
  open: "פתוח",
  in_progress: "בטיפול",
  resolved: "טופל",
};

const INCIDENT_TYPE_HE: Record<string, string> = {
  spillage: "שפיכה",
  restroom: "שירותים",
  safety: "בטיחות",
  damage: "נזק",
  equipment: "ציוד",
  shortage: "חוסר",
  other: "אחר",
};

function badge(text: string, color: string) {
  return `<span style="color:${color};font-weight:600">${text}</span>`;
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    completed: "#16a34a", ok: "#16a34a", resolved: "#16a34a",
    partial: "#ca8a04", in_progress: "#2563eb", open: "#dc2626",
    deferred: "#6b7280", cancelled: "#6b7280",
    critical: "#dc2626", high: "#f59e0b", medium: "#3b82f6", low: "#6b7280",
  };
  return map[status] || "#374151";
}

function calcActualHours(start: string, end: string, breakMin: string): string {
  if (!start || !end) return "—";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const totalMin = (eh * 60 + em) - (sh * 60 + sm) - (Number(breakMin) || 0);
  if (totalMin <= 0) return "—";
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function buildHtml(d: ManualShiftData): string {
  const shiftLabel = d.shiftType === "morning" ? "משמרת בוקר" : "משמרת ערב";
  const validTasks = d.tasks.filter(t => t.taskName.trim());
  const validStaff = d.staff.filter(s => s.name.trim());
  const validIncidents = d.incidents.filter(i => i.description.trim());

  const completedCount = validTasks.filter(t => t.status === "completed").length;
  const completionRate = validTasks.length > 0
    ? Math.round((completedCount / validTasks.length) * 100)
    : 0;

  let html = `
<div style="font-family:Arial,sans-serif;direction:rtl;padding:24px;color:#1a1a1a;max-width:800px;margin:0 auto">
  <h1 style="text-align:center;font-size:22px;margin-bottom:4px">דוח סיום משמרת — דיווח ידני</h1>
  <p style="text-align:center;color:#666;font-size:13px;margin-bottom:4px">${d.date} | ${shiftLabel}</p>
  <p style="text-align:center;color:#444;font-size:12px;margin-bottom:16px">
    ${d.siteName ? `נכס: ${d.siteName}` : ""} ${d.reporterName ? ` · מדווח: ${d.reporterName}` : ""}
  </p>`;

  // Summary row
  if (validTasks.length > 0) {
    html += `
  <div style="display:flex;gap:8px;margin-bottom:16px">
    <div style="flex:1;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:22px;font-weight:700;color:#2563eb">${completionRate}%</div>
      <div style="font-size:10px;color:#6b7280">אחוז השלמה</div>
    </div>
    <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:22px;font-weight:700;color:#16a34a">${completedCount}/${validTasks.length}</div>
      <div style="font-size:10px;color:#6b7280">משימות הושלמו</div>
    </div>
    <div style="flex:1;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:22px;font-weight:700;color:#ca8a04">${validStaff.length}</div>
      <div style="font-size:10px;color:#6b7280">עובדים במשמרת</div>
    </div>
    <div style="flex:1;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:22px;font-weight:700;color:#dc2626">${validIncidents.length}</div>
      <div style="font-size:10px;color:#6b7280">תקלות</div>
    </div>
  </div>`;
  }

  // Tasks section
  if (validTasks.length > 0) {
    html += `
  <h2 style="font-size:15px;border-bottom:2px solid #3b82f6;padding-bottom:4px;margin:16px 0 8px">פירוט משימות</h2>
  <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px">
    <thead><tr style="background:#3b82f6;color:white">
      <th style="padding:6px 8px;border:1px solid #ddd;text-align:right">משימה</th>
      <th style="padding:6px 8px;border:1px solid #ddd;text-align:right">מיקום</th>
      <th style="padding:6px 8px;border:1px solid #ddd">תקן<br/>(דק׳)</th>
      <th style="padding:6px 8px;border:1px solid #ddd">בפועל<br/>(דק׳)</th>
      <th style="padding:6px 8px;border:1px solid #ddd">סטייה</th>
      <th style="padding:6px 8px;border:1px solid #ddd">סטטוס</th>
      <th style="padding:6px 8px;border:1px solid #ddd;text-align:right">הערות</th>
    </tr></thead><tbody>`;
    validTasks.forEach((t, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#f9fafb";
      const std = Number(t.standardMinutes) || 0;
      const act = Number(t.actualMinutes) || 0;
      const variance = std > 0 && act > 0 ? Math.round(((act - std) / std) * 100) : null;
      const varStr = variance !== null ? `${variance > 0 ? "+" : ""}${variance}%` : "—";
      const varColor = variance === null ? "#374151" : variance > 15 ? "#dc2626" : variance > 0 ? "#ca8a04" : "#16a34a";
      html += `<tr style="background:${bg}">
        <td style="padding:5px 8px;border:1px solid #ddd">${t.taskName}</td>
        <td style="padding:5px 8px;border:1px solid #ddd">${t.location || "—"}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${t.standardMinutes || "—"}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${t.actualMinutes || "—"}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center;color:${varColor};font-weight:600">${varStr}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${badge(TASK_STATUS_HE[t.status] || t.status, statusColor(t.status))}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;font-size:10px">${t.notes || "—"}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
  }

  // Staff section
  if (validStaff.length > 0) {
    html += `
  <h2 style="font-size:15px;border-bottom:2px solid #16a34a;padding-bottom:4px;margin:16px 0 8px">כוח אדם</h2>
  <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px">
    <thead><tr style="background:#16a34a;color:white">
      <th style="padding:6px 8px;border:1px solid #ddd;text-align:right">שם עובד</th>
      <th style="padding:6px 8px;border:1px solid #ddd">כניסה</th>
      <th style="padding:6px 8px;border:1px solid #ddd">יציאה</th>
      <th style="padding:6px 8px;border:1px solid #ddd">הפסקה<br/>(דק׳)</th>
      <th style="padding:6px 8px;border:1px solid #ddd">שעות<br/>בפועל</th>
      <th style="padding:6px 8px;border:1px solid #ddd;text-align:right">הערות</th>
    </tr></thead><tbody>`;
    validStaff.forEach((s, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#f0fdf4";
      html += `<tr style="background:${bg}">
        <td style="padding:5px 8px;border:1px solid #ddd">${s.name}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${s.startTime || "—"}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${s.endTime || "—"}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${s.breakMinutes || "0"}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${calcActualHours(s.startTime, s.endTime, s.breakMinutes)}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;font-size:10px">${s.notes || "—"}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
  }

  // Incidents section
  if (validIncidents.length > 0) {
    html += `
  <h2 style="font-size:15px;border-bottom:2px solid #dc2626;padding-bottom:4px;margin:16px 0 8px">תקלות ואירועים</h2>
  <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px">
    <thead><tr style="background:#dc2626;color:white">
      <th style="padding:6px 8px;border:1px solid #ddd">סוג</th>
      <th style="padding:6px 8px;border:1px solid #ddd;text-align:right">תיאור</th>
      <th style="padding:6px 8px;border:1px solid #ddd">עדיפות</th>
      <th style="padding:6px 8px;border:1px solid #ddd">סטטוס</th>
    </tr></thead><tbody>`;
    validIncidents.forEach((inc, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#fef2f2";
      html += `<tr style="background:${bg}">
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${INCIDENT_TYPE_HE[inc.type] || inc.type}</td>
        <td style="padding:5px 8px;border:1px solid #ddd">${inc.description}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${badge(INCIDENT_PRIORITY_HE[inc.priority] || inc.priority, statusColor(inc.priority))}</td>
        <td style="padding:5px 8px;border:1px solid #ddd;text-align:center">${badge(INCIDENT_STATUS_HE[inc.status] || inc.status, statusColor(inc.status))}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
  }

  // Handover notes
  if (d.handoverNotes.trim()) {
    html += `
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:16px">
    <strong style="font-size:12px">הערות מסירה:</strong>
    <p style="font-size:11px;margin:6px 0 0;color:#374151;white-space:pre-line">${d.handoverNotes}</p>
  </div>`;
  }

  // Signature area
  html += `
  <div style="display:flex;gap:24px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">
    <div style="flex:1;text-align:center">
      <div style="border-bottom:1px solid #374151;margin-bottom:4px;height:32px"></div>
      <span style="font-size:10px;color:#6b7280">חתימת מדווח</span>
    </div>
    <div style="flex:1;text-align:center">
      <div style="border-bottom:1px solid #374151;margin-bottom:4px;height:32px"></div>
      <span style="font-size:10px;color:#6b7280">חתימת מפקח</span>
    </div>
    <div style="flex:1;text-align:center">
      <div style="border-bottom:1px solid #374151;margin-bottom:4px;height:32px"></div>
      <span style="font-size:10px;color:#6b7280">חתימת מנהל</span>
    </div>
  </div>
  <p style="text-align:center;font-size:9px;color:#9ca3af;margin-top:20px">נוצר ידנית · CleanFlow · ${new Date().toLocaleString("he-IL")}</p>
</div>`;

  return html;
}

export async function generateManualShiftPdf(data: ManualShiftData): Promise<void> {
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
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;background:rgba(0,0,0,0.5);display:flex;flex-direction:column";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:8px 16px;background:#1e293b;color:white;font-family:Arial,sans-serif";

    const title = document.createElement("span");
    title.textContent = `דוח משמרת ידני — ${data.date}`;
    title.style.fontSize = "14px";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ סגור תצוגה";
    closeBtn.style.cssText = "padding:6px 18px;background:#ef4444;color:white;border:none;border-radius:6px;font-size:15px;cursor:pointer;font-family:Arial,sans-serif;font-weight:bold";
    closeBtn.onclick = () => {
      document.body.removeChild(overlay);
      URL.revokeObjectURL(blobUrl);
    };

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
