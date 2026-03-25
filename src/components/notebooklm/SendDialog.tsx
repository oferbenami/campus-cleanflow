import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageCircle, Mail, CheckCircle, ChevronRight, AlertCircle } from 'lucide-react';

const API = 'http://localhost:3001/api';

interface NotebookFile {
  type: string;
  label: string;
  description: string;
}

interface Props {
  file: NotebookFile;
  fileKey: string;
  notebookTitle: string;
  onBack: () => void;
  onDone: () => void;
}

export default function SendDialog({ file, fileKey, notebookTitle, onBack, onDone }: Props) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WhatsApp fields
  const [phone, setPhone] = useState('');
  const [waMessage, setWaMessage] = useState(`קובץ מ-NotebookLM: "${notebookTitle}" - ${file.label}`);

  // Gmail fields
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(`NotebookLM: ${notebookTitle} - ${file.label}`);
  const [body, setBody] = useState(`מצורף ${file.label} מהמחברת "${notebookTitle}"`);

  async function sendWhatsApp() {
    if (!phone.trim()) return setError('הכנס מספר טלפון');
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API}/whatsapp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), message: waMessage, fileKey }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function sendEmail() {
    if (!email.trim()) return setError('הכנס כתובת מייל');
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API}/gmail/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: email.trim(), subject, body, fileKey }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <CheckCircle className="w-14 h-14 text-green-500" />
        <h3 className="text-lg font-semibold">נשלח בהצלחה!</h3>
        <p className="text-sm text-muted-foreground">הקובץ נשלח ליעד הנבחר</p>
        <Button onClick={onDone}>חזור להתחלה</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-base font-semibold">שלח קובץ</h2>
          <p className="text-xs text-muted-foreground">{file.label} · {notebookTitle}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Tabs defaultValue="whatsapp">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            מייל
          </TabsTrigger>
        </TabsList>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp">
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="phone">מספר טלפון (עם קידומת מדינה)</Label>
                <Input
                  id="phone"
                  placeholder="972501234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  דוגמה: 972501234567 (ישראל: 972 + המספר ללא 0)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wa-msg">הודעה</Label>
                <Textarea
                  id="wa-msg"
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={sendWhatsApp}
                disabled={sending}
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <MessageCircle className="w-4 h-4 mr-2" />
                )}
                שלח ב-WhatsApp
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email">
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="email">כתובת מייל</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">נושא</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">תוכן המייל</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                />
              </div>

              <Button className="w-full" onClick={sendEmail} disabled={sending}>
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                שלח במייל
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
