import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, RefreshCw, LogIn, AlertCircle } from 'lucide-react';

const API = 'http://localhost:3001/api';

interface Notebook {
  id: string;
  title: string;
  url?: string;
}

interface Props {
  onSelect: (notebook: Notebook) => void;
}

export default function NotebookList({ onSelect }: Props) {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loginOpened, setLoginOpened] = useState(false);

  useEffect(() => {
    loadNotebooks();
  }, []);

  async function loadNotebooks() {
    setLoading(true);
    setError(null);
    setNeedsLogin(false);

    try {
      const res = await fetch(`${API}/notebooklm/notebooks`);
      const data = await res.json();

      if (data.needsLogin) {
        setNeedsLogin(true);
      } else if (data.error) {
        setError(data.error);
      } else {
        setNotebooks(data.notebooks || []);
      }
    } catch {
      setError('לא ניתן להתחבר לשרת. ודא שהשרת פועל על פורט 3001.');
    } finally {
      setLoading(false);
    }
  }

  async function openLogin() {
    try {
      await fetch(`${API}/notebooklm/login`, { method: 'POST' });
      setLoginOpened(true);
    } catch {
      setError('שגיאה בפתיחת חלון הכניסה');
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">טוען מחברות מ-NotebookLM...</p>
      </div>
    );
  }

  if (needsLogin) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <AlertCircle className="w-10 h-10 text-orange-500" />
        <div>
          <h3 className="font-semibold text-lg">נדרש כניסה ל-Google</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {loginOpened
              ? 'התחבר ל-Google בחלון הדפדפן שנפתח, ולאחר מכן לחץ "טען מחדש"'
              : 'לא מחובר ל-NotebookLM. לחץ כדי לפתוח חלון כניסה.'}
          </p>
        </div>

        <div className="flex gap-2">
          {!loginOpened && (
            <Button onClick={openLogin}>
              <LogIn className="w-4 h-4 mr-2" />
              פתח חלון כניסה
            </Button>
          )}
          <Button variant="outline" onClick={loadNotebooks}>
            <RefreshCw className="w-4 h-4 mr-2" />
            טען מחדש
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={loadNotebooks}>
          <RefreshCw className="w-4 h-4 mr-2" />
          נסה שוב
        </Button>
      </div>
    );
  }

  if (notebooks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <BookOpen className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">לא נמצאו מחברות ב-NotebookLM</p>
        <Button variant="outline" onClick={loadNotebooks}>
          <RefreshCw className="w-4 h-4 mr-2" />
          רענן
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">בחר מחברת ({notebooks.length})</h2>
        <Button variant="ghost" size="sm" onClick={loadNotebooks}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid gap-2">
        {notebooks.map((nb) => (
          <Card
            key={nb.id}
            className="cursor-pointer hover:bg-accent transition-colors border hover:border-primary"
            onClick={() => onSelect(nb)}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="font-medium text-sm">{nb.title}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
