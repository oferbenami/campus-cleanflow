import jsPDF from "jspdf";

/**
 * Generates a comprehensive printable manual shift report form PDF (blank, for handwriting).
 * Uses html2canvas to render Hebrew RTL content correctly.
 */

export async function generateManualFormPdf(): Promise<void> {
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:794px;background:#fff;padding:24px 32px;font-family:Arial,sans-serif;direction:rtl;color:#000;";

  const today = new Date().toLocaleDateString("he-IL");

  const checkboxRow = (items: string[], cols: { label: string; width: string }[], extraColWidth = "20%") => {
    const header = cols.map(c => `<th style="width:${c.width}">${c.label}</th>`).join("");
    const rows = items.map(item => `<tr>
      <td>${item}</td>
      ${cols.slice(1).map(() => `<td style="text-align:center"><span class="cb"></span></td>`).join("")}
      <td class="gap-line"></td>
    </tr>`).join("");
    return `<table><thead><tr>${header}<th style="width:${extraColWidth}">תיאור פער</th></tr></thead><tbody>${rows}</tbody></table>`;
  };

  const emptyRows = (n: number, colCount: number) =>
    Array.from({ length: n }, (_, i) => `<tr style="height:26px"><td style="text-align:center">${i + 1}</td>${"<td></td>".repeat(colCount - 1)}</tr>`).join("");

  container.innerHTML = `
    <style>
      * { box-sizing: border-box; margin:0; padding:0; }
      table { width:100%; border-collapse:collapse; margin-bottom:10px; }
      th, td { border:1px solid #333; padding:4px 6px; text-align:right; font-size:10px; }
      th { background:#e5e7eb; font-weight:bold; }
      h1 { font-size:18px; text-align:center; margin:0 0 2px; }
      h2 { font-size:12px; margin:12px 0 4px; border-bottom:2px solid #333; padding-bottom:2px; }
      .header-row { display:flex; justify-content:space-between; gap:12px; margin-bottom:6px; }
      .field { flex:1; border-bottom:1px solid #999; padding:2px 4px; font-size:11px; min-height:20px; }
      .field-label { font-weight:bold; font-size:10px; }
      .checkbox-row { display:flex; gap:12px; align-items:center; font-size:11px; }
      .cb { display:inline-block; width:12px; height:12px; border:1.5px solid #333; margin-left:3px; }
      .gap-line { border-bottom:1px dotted #999; min-height:18px; }
      .footer-note { font-size:9px; color:#555; text-align:center; margin-top:12px; }
      .section-note { font-size:9px; color:#666; margin-bottom:4px; }
    </style>

    <h1>טופס דיווח משמרת – מילוי ידני</h1>
    <p style="text-align:center;font-size:10px;color:#555;margin:0 0 8px;">CleanFlow – ${today}</p>

    <!-- Header fields -->
    <div class="header-row">
      <div><span class="field-label">תאריך: </span><span class="field" style="display:inline-block;width:100px;">&nbsp;</span></div>
      <div class="checkbox-row">
        <span class="field-label">משמרת:</span>
        <span><span class="cb"></span> בוקר</span>
        <span><span class="cb"></span> ערב</span>
      </div>
      <div><span class="field-label">שם מדווח: </span><span class="field" style="display:inline-block;width:130px;">&nbsp;</span></div>
    </div>
    <div class="header-row">
      <div><span class="field-label">אתר: </span><span class="field" style="display:inline-block;width:180px;">&nbsp;</span></div>
      <div><span class="field-label">בניין: </span><span class="field" style="display:inline-block;width:120px;">&nbsp;</span></div>
      <div><span class="field-label">קומה: </span><span class="field" style="display:inline-block;width:80px;">&nbsp;</span></div>
    </div>

    <!-- 1. Site Readiness Checklist -->
    <h2>1. צ'קליסט מוכנות אתר</h2>
    <table>
      <thead>
        <tr>
          <th style="width:35%">פריט</th>
          <th style="width:9%">תקין</th>
          <th style="width:9%">חלקי</th>
          <th style="width:9%">לא תקין</th>
          <th style="width:9%">לא רלוונטי</th>
          <th style="width:29%">תיאור פער (חובה אם חריג)</th>
        </tr>
      </thead>
      <tbody>
        ${[
          "ריהוט מסודר ותקין",
          "תאורה תקינה בכל האזורים",
          "שילוט בטיחות במקום",
          "מערכות כיבוי אש תקינות",
          "ניקיון כללי – רצפות",
          "ניקיון כללי – משטחים",
          "פחי אשפה רוקנו",
          "חדרי שירותים מצוידים",
          "מעליות נקיות",
          "חניון נקי ומסודר",
        ].map(item => `<tr>
          <td>${item}</td>
          <td style="text-align:center"><span class="cb"></span></td>
          <td style="text-align:center"><span class="cb"></span></td>
          <td style="text-align:center"><span class="cb"></span></td>
          <td style="text-align:center"><span class="cb"></span></td>
          <td class="gap-line"></td>
        </tr>`).join("")}
      </tbody>
    </table>

    <!-- 2. Executive Areas -->
    <h2>2. אזורי הנהלה</h2>
    <table>
      <thead>
        <tr>
          <th style="width:25%">אזור</th>
          <th style="width:9%">תקין</th>
          <th style="width:9%">חלקי</th>
          <th style="width:9%">לא תקין</th>
          <th style="width:9%">ניקוי חוזר</th>
          <th style="width:9%">דווח לתפעול</th>
          <th style="width:30%">תיאור פער</th>
        </tr>
      </thead>
      <tbody>
        ${[
          "חדר מנכ״ל",
          "חדר סמנכ״ל",
          "חדר ישיבות הנהלה",
          "לובי קומת הנהלה",
          "מטבחון הנהלה",
          "שירותי הנהלה",
          "משרד כספים",
          "חדר ישיבות A",
          "חדר ישיבות B",
          "קבלה ראשית",
        ].map(area => `<tr>
          <td>${area}</td>
          <td style="text-align:center"><span class="cb"></span></td>
          <td style="text-align:center"><span class="cb"></span></td>
          <td style="text-align:center"><span class="cb"></span></td>
          <td style="text-align:center"><span class="cb"></span></td>
          <td style="text-align:center"><span class="cb"></span></td>
          <td class="gap-line"></td>
        </tr>`).join("")}
      </tbody>
    </table>

    <!-- 3. Task Details -->
    <h2>3. פירוט משימות</h2>
    <p class="section-note">רשמו כל משימה שבוצעה או לא בוצעה במשמרת</p>
    <table>
      <thead>
        <tr>
          <th style="width:5%">#</th>
          <th style="width:22%">שם משימה</th>
          <th style="width:15%">מיקום</th>
          <th style="width:8%">תקן (דק׳)</th>
          <th style="width:8%">בפועל (דק׳)</th>
          <th style="width:8%">סטייה %</th>
          <th style="width:10%">סטטוס</th>
          <th style="width:24%">הערות</th>
        </tr>
      </thead>
      <tbody>
        ${emptyRows(12, 8)}
        <tr style="background:#f3f4f6;font-weight:bold">
          <td colspan="3" style="text-align:left">סה״כ:</td>
          <td></td><td></td><td></td>
          <td colspan="2">סטטוס: בוצע ☐ | חלקי ☐ | נדחה ☐ | בוטל ☐</td>
        </tr>
      </tbody>
    </table>

    <!-- 4. Workforce -->
    <h2>4. כוח אדם</h2>
    <table>
      <thead>
        <tr>
          <th style="width:5%">#</th>
          <th style="width:20%">שם עובד</th>
          <th style="width:10%">שעת כניסה</th>
          <th style="width:10%">שעת יציאה</th>
          <th style="width:10%">הפסקה (דק׳)</th>
          <th style="width:10%">שעות בפועל</th>
          <th style="width:10%">חבילת עבודה</th>
          <th style="width:25%">הערות</th>
        </tr>
      </thead>
      <tbody>
        ${emptyRows(8, 8)}
        <tr style="background:#f3f4f6;font-weight:bold">
          <td colspan="5" style="text-align:left">סה״כ שעות:</td>
          <td></td>
          <td colspan="2">סטייה מתוכנן: ________</td>
        </tr>
      </tbody>
    </table>

    <!-- 5. Incidents & Shortage -->
    <h2>5. תקלות ודיווחי חוסרים</h2>
    <table>
      <thead>
        <tr>
          <th style="width:5%">#</th>
          <th style="width:12%">סוג</th>
          <th style="width:15%">מיקום</th>
          <th style="width:10%">עדיפות</th>
          <th style="width:28%">תיאור</th>
          <th style="width:15%">שויך לעובד</th>
          <th style="width:15%">סטטוס</th>
        </tr>
      </thead>
      <tbody>
        ${emptyRows(6, 7)}
      </tbody>
    </table>
    <p class="section-note">סוג: תקלה / שפיכה / שירותים / בטיחות / נזק / ציוד / חוסר מלאי</p>
    <p class="section-note">עדיפות: קריטי / דחוף / גבוה / רגיל / נמוך &nbsp;&nbsp;|&nbsp;&nbsp; סטטוס: ממתין / בטיפול / טופל</p>

    <!-- 6. Cleaning Actions -->
    <h2>6. פעולות ניקיון מיוחדות</h2>
    <table>
      <thead>
        <tr>
          <th style="width:5%">#</th>
          <th style="width:30%">פעולה</th>
          <th style="width:20%">מיקום</th>
          <th style="width:10%">בוצע</th>
          <th style="width:35%">הערות</th>
        </tr>
      </thead>
      <tbody>
        ${Array.from({ length: 5 }, (_, i) => `<tr style="height:26px">
          <td style="text-align:center">${i + 1}</td>
          <td></td><td></td>
          <td style="text-align:center"><span class="cb"></span></td>
          <td></td>
        </tr>`).join("")}
      </tbody>
    </table>

    <!-- 7. Supply Inventory -->
    <h2>7. מלאי חומרים ואספקה</h2>
    <table>
      <thead>
        <tr>
          <th style="width:5%">#</th>
          <th style="width:25%">פריט</th>
          <th style="width:12%">כמות נוכחית</th>
          <th style="width:12%">כמות נדרשת</th>
          <th style="width:10%">חסר</th>
          <th style="width:36%">הערות</th>
        </tr>
      </thead>
      <tbody>
        ${[
          "נייר טואלט",
          "סבון ידיים",
          "מגבות נייר",
          "שקיות אשפה",
          "חומר ניקוי רצפות",
          "חומר חיטוי",
          "מטליות",
          "כפפות",
        ].map((item, i) => `<tr style="height:26px">
          <td style="text-align:center">${i + 1}</td>
          <td>${item}</td>
          <td></td><td></td>
          <td style="text-align:center"><span class="cb"></span></td>
          <td></td>
        </tr>`).join("")}
      </tbody>
    </table>

    <!-- 8. Handover Notes -->
    <h2>8. הערות למשמרת הבאה</h2>
    <div style="border:1px solid #333;min-height:60px;padding:6px;"></div>

    <!-- 9. Shift Summary -->
    <h2>9. סיכום משמרת</h2>
    <div class="header-row" style="margin-top:6px;">
      <div><span class="field-label">ציון משמרת: </span><span class="field" style="display:inline-block;width:60px;">&nbsp;</span><span style="font-size:10px;"> / 100</span></div>
      <div><span class="field-label">משימות שהושלמו: </span><span class="field" style="display:inline-block;width:50px;">&nbsp;</span><span style="font-size:10px;"> מתוך </span><span class="field" style="display:inline-block;width:50px;">&nbsp;</span></div>
      <div><span class="field-label">הפרות SLA: </span><span class="field" style="display:inline-block;width:50px;">&nbsp;</span></div>
    </div>

    <!-- Signatures -->
    <div style="display:flex;justify-content:space-between;margin-top:20px;">
      <div><span class="field-label">חתימת מדווח: </span><span style="display:inline-block;width:160px;border-bottom:1px solid #333;">&nbsp;</span></div>
      <div><span class="field-label">חתימת מפקח: </span><span style="display:inline-block;width:160px;border-bottom:1px solid #333;">&nbsp;</span></div>
      <div><span class="field-label">חתימת מנהל: </span><span style="display:inline-block;width:160px;border-bottom:1px solid #333;">&nbsp;</span></div>
    </div>

    <p class="footer-note">טופס זה מיועד לשימוש כגיבוי ידני בהעדר קישוריות. יש להזין את הנתונים למערכת בהקדם האפשרי.</p>
  `;

  document.body.appendChild(container);

  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const pageCanvasHeight = (pdfH / pdfW) * canvas.width;

    let y = 0;
    while (y < canvas.height) {
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.min(pageCanvasHeight, canvas.height - y);
      const ctx = pageCanvas.getContext("2d")!;
      ctx.drawImage(canvas, 0, -y);
      const pageImg = pageCanvas.toDataURL("image/jpeg", 0.95);
      if (y > 0) pdf.addPage();
      pdf.addImage(pageImg, "JPEG", 0, 0, pdfW, (pageCanvas.height / canvas.width) * pdfW);
      y += pageCanvasHeight;
    }

    pdf.save("טופס-דיווח-ידני.pdf");
  } finally {
    document.body.removeChild(container);
  }
}
