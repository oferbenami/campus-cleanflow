import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import WhatsAppSetup from '@/components/notebooklm/WhatsAppSetup';
import NotebookList from '@/components/notebooklm/NotebookList';
import FileSelector from '@/components/notebooklm/FileSelector';
import SendDialog from '@/components/notebooklm/SendDialog';

const API = 'http://localhost:3001/api';

type Step = 'setup' | 'notebooks' | 'files' | 'send';

interface Notebook {
  id: string;
  title: string;
}

interface NotebookFile {
  type: string;
  label: string;
  description: string;
  downloadable: boolean;
}

export default function NotebookLMShare() {
  const [step, setStep] = useState<Step>('setup');
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [gmailConfigured, setGmailConfigured] = useState(false);

  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [selectedFile, setSelectedFile] = useState<NotebookFile | null>(null);
  const [downloadedFileKey, setDownloadedFileKey] = useState<string>('');

  useEffect(() => {
    checkServer();
  }, []);

  async function checkServer() {
    try {
      const res = await fetch(`${API}/status`, { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      setServerOnline(true);
      setWhatsappConnected(data.whatsapp?.status === 'connected');
      setGmailConfigured(data.gmail?.configured);

      // Skip WhatsApp setup if already connected
      if (data.whatsapp?.status === 'connected') {
        setStep('notebooks');
      }
    } catch {
      setServerOnline(false);
    }
  }

  function handleWhatsAppConnected() {
    setWhatsappConnected(true);
    setStep('notebooks');
  }

  function handleNotebookSelect(notebook: Notebook) {
    setSelectedNotebook(notebook);
    setStep('files');
  }

  function handleFileSelected(file: NotebookFile, fileKey: string) {
    setSelectedFile(file);
    setDownloadedFileKey(fileKey);
    setStep('send');
  }

  function handleReset() {
    setSelectedNotebook(null);
    setSelectedFile(null);
    setDownloadedFileKey('');
    setStep('notebooks');
  }

  // Progress steps indicator
  const steps = [
    { key: 'setup', label: 'WhatsApp' },
    { key: 'notebooks', label: 'מחברת' },
    { key: 'files', label: 'קובץ' },
    { key: 'send', label: 'שליחה' },
  ];
  const currentStepIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">NotebookLM Share</h1>
            <p className="text-sm text-muted-foreground">הורד וישלח קבצים מ-NotebookLM</p>
          </div>
          <div className="flex items-center gap-2">
            {serverOnline === null && (
              <Badge variant="secondary">בודק...</Badge>
            )}
            {serverOnline === true && (
              <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                <Wifi className="w-3 h-3" />
                שרת פעיל
              </Badge>
            )}
            {serverOnline === false && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                שרת לא זמין
              </Badge>
            )}
          </div>
        </div>

        {/* Server offline message */}
        {serverOnline === false && (
          <Card className="border-destructive">
            <CardContent className="pt-4 text-sm space-y-2">
              <p className="font-medium">השרת אינו פועל</p>
              <p className="text-muted-foreground">
                הפעל את השרת עם הפקודות:
              </p>
              <pre className="bg-muted p-2 rounded text-xs" dir="ltr">
                cd server{'\n'}
                npm install{'\n'}
                cp .env.example .env{'\n'}
                npm start
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Progress indicator */}
        {serverOnline && (
          <div className="flex items-center justify-center gap-1">
            {steps.map((s, idx) => (
              <div key={s.key} className="flex items-center gap-1">
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                  ${idx < currentStepIdx ? 'bg-primary text-primary-foreground' : ''}
                  ${idx === currentStepIdx ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' : ''}
                  ${idx > currentStepIdx ? 'bg-muted text-muted-foreground' : ''}
                `}>
                  {idx + 1}
                </div>
                <span className={`text-xs hidden sm:block ${idx === currentStepIdx ? 'font-medium' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
                {idx < steps.length - 1 && (
                  <div className={`w-6 h-0.5 ${idx < currentStepIdx ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Main content */}
        {serverOnline && (
          <Card>
            <CardContent className="pt-4">
              {step === 'setup' && (
                <WhatsAppSetup onConnected={handleWhatsAppConnected} />
              )}

              {step === 'notebooks' && (
                <NotebookList onSelect={handleNotebookSelect} />
              )}

              {step === 'files' && selectedNotebook && (
                <FileSelector
                  notebook={selectedNotebook}
                  onBack={() => setStep('notebooks')}
                  onFileSelected={handleFileSelected}
                />
              )}

              {step === 'send' && selectedFile && selectedNotebook && (
                <SendDialog
                  file={selectedFile}
                  fileKey={downloadedFileKey}
                  notebookTitle={selectedNotebook.title}
                  onBack={() => setStep('files')}
                  onDone={handleReset}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Gmail status notice */}
        {serverOnline && !gmailConfigured && step !== 'setup' && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-3 pb-3">
              <p className="text-sm text-orange-800">
                <strong>שים לב:</strong> Gmail אינו מוגדר. ערוך את <code>server/.env</code> והוסף GMAIL_USER ו-GMAIL_APP_PASSWORD.
              </p>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
