import { useState } from "react";
import { Smartphone, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface NfcScanSimulatorProps {
  expectedTagUid: string | null;
  onScanResult: (tagUid: string, isMatch: boolean) => void;
  mode: "entry" | "exit";
  locationName: string;
}

/**
 * Simulates NFC/QR scanning for proof-of-presence.
 * In production, this would use Web NFC API or camera-based QR scanning.
 */
const NfcScanSimulator = ({ expectedTagUid, onScanResult, mode, locationName }: NfcScanSimulatorProps) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<"match" | "mismatch" | null>(null);

  const simulateScan = (correct: boolean) => {
    setScanning(true);
    setResult(null);

    // Simulate a brief delay for the "scan"
    setTimeout(() => {
      const scannedUid = correct ? (expectedTagUid || "UNKNOWN") : "NFC-WRONG-LOCATION";
      const isMatch = scannedUid === expectedTagUid;
      setResult(isMatch ? "match" : "mismatch");
      setScanning(false);

      // Auto-callback after showing result
      setTimeout(() => {
        onScanResult(scannedUid, isMatch);
      }, 600);
    }, 1200);
  };

  const title = mode === "entry" ? "סריקת כניסה — הוכחת נוכחות" : "סריקת יציאה — הוכחת סיום";
  const subtitle = mode === "entry"
    ? `סרוק NFC/QR ב${locationName} כדי להתחיל`
    : `סרוק שוב ב${locationName} כדי לסיים`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6 animate-scale-in text-center space-y-5">
        {/* Header */}
        <div>
          <Smartphone size={40} className="mx-auto mb-3 text-primary" />
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>

        {/* Scanning state */}
        {scanning && (
          <div className="py-6 flex flex-col items-center gap-3">
            <Loader2 size={48} className="text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">מחפש תג NFC...</p>
          </div>
        )}

        {/* Result display */}
        {result === "match" && (
          <div className="py-4 flex flex-col items-center gap-2 animate-scale-in">
            <CheckCircle2 size={48} className="text-success" />
            <p className="text-base font-bold text-success">מיקום מאומת ✓</p>
          </div>
        )}

        {result === "mismatch" && (
          <div className="py-4 flex flex-col items-center gap-2 animate-scale-in">
            <XCircle size={48} className="text-destructive" />
            <p className="text-base font-bold text-destructive">מיקום לא תואם!</p>
            <p className="text-xs text-muted-foreground">התג שנסרק לא מתאים למיקום המשימה</p>
          </div>
        )}

        {/* Action buttons - only show when not scanning and no result yet */}
        {!scanning && !result && (
          <div className="space-y-3">
            {/* Simulate correct scan */}
            <button
              onClick={() => simulateScan(true)}
              className="w-full py-4 rounded-xl bg-success text-success-foreground font-bold text-base flex items-center justify-center gap-3 hover:bg-success/90 transition-colors min-h-[56px]"
            >
              <Smartphone size={20} />
              סרוק NFC (סימולציה — תואם)
            </button>

            {/* Simulate wrong scan */}
            <button
              onClick={() => simulateScan(false)}
              className="w-full py-3 rounded-xl border-2 border-destructive/30 text-destructive font-medium text-sm flex items-center justify-center gap-2 hover:bg-destructive/10 transition-colors"
            >
              סרוק NFC (סימולציה — לא תואם)
            </button>

            {/* Cancel */}
            <button
              onClick={() => onScanResult("", false)}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ביטול
            </button>
          </div>
        )}

        {/* Debug info */}
        <p className="text-[10px] text-muted-foreground mono">
          TAG: {expectedTagUid || "N/A"}
        </p>
      </div>
    </div>
  );
};

export default NfcScanSimulator;
