import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Smartphone, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const API = 'http://localhost:3001/api';

type WAStatus = 'disconnected' | 'qr_ready' | 'connected' | 'error' | 'loading';

interface Props {
  onConnected: () => void;
}

export default function WhatsAppSetup({ onConnected }: Props) {
  const [status, setStatus] = useState<WAStatus>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(checkStatus, 3000);
    checkStatus();
    return () => clearInterval(interval);
  }, [polling]);

  async function checkStatus() {
    try {
      const res = await fetch(`${API}/whatsapp/status`);
      const data = await res.json();
      setStatus(data.status as WAStatus);

      if (data.status === 'connected') {
        setPolling(false);
        onConnected();
        return;
      }

      if (data.hasQR) {
        const qrRes = await fetch(`${API}/whatsapp/qr`);
        if (qrRes.ok) {
          const { qr } = await qrRes.json();
          setQrCode(qr);
        }
      } else {
        setQrCode(null);
      }
    } catch {
      setStatus('error');
    }
  }

  const statusConfig = {
    loading: { color: 'secondary', label: 'בודק חיבור...', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
    disconnected: { color: 'destructive', label: 'מנותק', icon: <XCircle className="w-4 h-4" /> },
    qr_ready: { color: 'outline', label: 'ממתין לסריקה', icon: <Smartphone className="w-4 h-4" /> },
    connected: { color: 'default', label: 'מחובר', icon: <CheckCircle className="w-4 h-4" /> },
    error: { color: 'destructive', label: 'שגיאה', icon: <XCircle className="w-4 h-4" /> },
  } as const;

  const cfg = statusConfig[status];

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Smartphone className="w-5 h-5 text-green-500" />
          חיבור WhatsApp
          <Badge variant={cfg.color as any} className="flex items-center gap-1 mr-auto">
            {cfg.icon}
            {cfg.label}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {status === 'qr_ready' && qrCode && (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              פתח WhatsApp בטלפון → הגדרות → מכשירים מקושרים → קשר מכשיר
            </p>
            <div className="border rounded-lg p-2 inline-block bg-white">
              <img src={qrCode} alt="QR Code" className="w-48 h-48" />
            </div>
            <p className="text-xs text-muted-foreground">QR מתחדש אוטומטית</p>
          </div>
        )}

        {(status === 'disconnected' || status === 'error') && (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              השרת מאתחל את WhatsApp. המתן מספר שניות וקוד QR יופיע.
            </p>
            <Button variant="outline" size="sm" onClick={checkStatus}>
              <RefreshCw className="w-4 h-4 mr-2" />
              רענן
            </Button>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {status === 'connected' && (
          <div className="flex justify-center py-2">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
