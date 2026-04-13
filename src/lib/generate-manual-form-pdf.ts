import jsPDF from "jspdf";

/**
 * Generates a printable manual shift report form PDF (blank, for handwriting).
 * Uses basic Latin glyphs + simple box drawing since jsPDF default fonts lack Hebrew.
 * We render Hebrew via html2canvas approach instead.
 */

export async function generateManualFormPdf(): Promise<void> {
  // Build a hidden HTML element, render it with html2canvas, then embed in PDF
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:794px;background:#fff;padding:32px;font-family:Arial,sans-serif;direction:rtl;color:#000;";

  const today = new Date().toLocaleDateString("he-IL");

  container.innerHTML = `
    <style>
      * { box-sizing: border-box; }
      table { width:100%; border-collapse:collapse; margin-bottom:12px; }
      th, td { border:1px solid #333; padding:6px 8px; text-align:right; font-size:11px; }
      th { background:#e5e7eb; font-weight:bold; }
      h1 { font-size:20px; text-align:center; margin:0 0 4px; }
      h2 { font-size:14px; margin:16px 0 6px; border-bottom:2px solid #333; padding-bottom:4px; }
      .header-row { display:flex; justify-content:space-between; gap:16px; margin-bottom:8px; }
      .field { flex:1; border-bottom:1px solid #999; padding:4px; font-size:12px; min-height:24px; }
      .field-label { font-weight:bold; font-size:11px; }
      .checkbox-row { display:flex; gap:16px; align-items:center; font-size:12px; }
      .cb { display:inline-block; width:14px; height:14px; border:1.5px solid #333; margin-left:4px; }
      .gap-line { border-bottom:1px dotted #999; min-height:20px; }
      .status-cols td { text-align:center; width:50px; }
      .footer-note { font-size:10px; color:#555; text-align:center; margin-top:16px; }
    </style>

    <h1>טופס דיווח משמרת – מילוי ידני</h1>
    <p style="text-align:center;font-size:11px;color:#555;margin:0 0 12px;">CleanFlow – ${today}</p>

    <div class="header-row">
      <div><span class="field-label">תאריך: </span><span class="field" style="display:inline-block;width:120px;">&nbsp;</span></div>
      <div class="checkbox-row">
        <span class="field-label">משמרת:</span>
        <span><span class="cb"></span> בוקר</span>
        <span><span class="cb"></span> ערב</span>
      </div>
      <div><span class="field-label">שם מדווח: </span><span class="field" style="display:inline-block;width:150px;">&nbsp;</span></div>
    </div>
    <div class="header-row">
      <div><span class="field-label">אתר: </span><span class="field" style="display:inline-block;width:200px;">&nbsp;</span></div>
    </div>

    <h2>1. צ'קליסט מוכנות אתר</h2>
    <table>
      <thead>
        <tr>
          <th style="width:40%">פריט</th>
          <th style="width:10%">תקין</th>
          <th style="width:10%">חלקי</th>
          <th style="width:10%">לא תקין</th>
          <th style="width:10%">לא רלוונטי</th>
          <th style="width:20%">תיאור פער</th>
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
        ]
          .map(
            (item) =>
              `<tr>
                <td>${item}</td>
                <td style="text-align:center"><span class="cb"></span></td>
                <td style="text-align:center"><span class="cb"></span></td>
                <td style="text-align:center"><span class="cb"></span></td>
                <td style="text-align:center"><span class="cb"></span></td>
                <td class="gap-line"></td>
              </tr>`
          )
          .join("")}
      </tbody>
    </table>

    <h2>2. אזורי הנהלה</h2>
    <table>
      <thead>
        <tr>
          <th style="width:30%">אזור</th>
          <th style="width:10%">תקין</th>
          <th style="width:10%">חלקי</th>
          <th style="width:10%">לא תקין</th>
          <th style="width:10%">ניקוי חוזר</th>
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
        ]
          .map(
            (area) =>
              `<tr>
                <td>${area}</td>
                <td style="text-align:center"><span class="cb"></span></td>
                <td style="text-align:center"><span class="cb"></span></td>
                <td style="text-align:center"><span class="cb"></span></td>
                <td style="text-align:center"><span class="cb"></span></td>
                <td class="gap-line"></td>
              </tr>`
          )
          .join("")}
      </tbody>
    </table>

    <h2>3. כוח אדם</h2>
    <table>
      <thead>
        <tr>
          <th style="width:5%">#</th>
          <th style="width:25%">שם עובד</th>
          <th style="width:12%">שעת כניסה</th>
          <th style="width:12%">שעת יציאה</th>
          <th style="width:12%">שעות בפועל</th>
          <th style="width:34%">הערות</th>
        </tr>
      </thead>
      <tbody>
        ${Array.from({ length: 8 }, (_, i) => `
          <tr style="height:28px">
            <td style="text-align:center">${i + 1}</td>
            <td></td><td></td><td></td><td></td><td></td>
          </tr>
        `).join("")}
        <tr style="background:#f3f4f6;font-weight:bold">
          <td colspan="4" style="text-align:left">סה״כ שעות:</td>
          <td></td>
          <td>סטייה מתוכנן: ________</td>
        </tr>
      </tbody>
    </table>

    <h2>4. הערות למשמרת הבאה</h2>
    <div style="border:1px solid #333;min-height:80px;padding:8px;"></div>

    <div style="display:flex;justify-content:space-between;margin-top:24px;">
      <div><span class="field-label">חתימת מדווח: </span><span style="display:inline-block;width:180px;border-bottom:1px solid #333;">&nbsp;</span></div>
      <div><span class="field-label">חתימת מנהל: </span><span style="display:inline-block;width:180px;border-bottom:1px solid #333;">&nbsp;</span></div>
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
    const imgRatio = canvas.height / canvas.width;
    const imgHeight = pdfW * imgRatio;

    if (imgHeight <= pdfH) {
      pdf.addImage(imgData, "JPEG", 0, 0, pdfW, imgHeight);
    } else {
      // Multi-page
      let y = 0;
      const pageCanvasHeight = (pdfH / pdfW) * canvas.width;
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
    }

    pdf.save("טופס-דיווח-ידני.pdf");
  } finally {
    document.body.removeChild(container);
  }
}
