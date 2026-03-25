import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileAudio, FileText, ChevronRight, AlertCircle, Download } from 'lucide-react';

const API = 'http://localhost:3001/api';

interface NotebookFile {
  type: string;
  label: string;
  description: string;
  downloadable: boolean;
}

interface Notebook {
  id: string;
  title: string;
}

interface Props {
  notebook: Notebook;
  onBack: () => void;
  onFileSelected: (file: NotebookFile, downloadedFileKey: string) => void;
}

export default function FileSelector({ notebook, onBack, onFileSelected }: Props) {
  const [files, setFiles] = useState<NotebookFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, [notebook.id]);

  async function loadFiles() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/notebooklm/notebooks/${notebook.id}/files`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setFiles(data.files || []);
      }
    } catch {
      setError('שגיאה בטעינת הקבצים');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(file: NotebookFile) {
    setDownloading(file.type);
    try {
      const res = await fetch(`${API}/notebooklm/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notebookId: notebook.id, fileType: file.type }),
      });
      const data = await res.json();

      if (data.error) {
        setError(`שגיאה בהורדה: ${data.error}`);
      } else if (data.success) {
        // Extract just the filename from the full path
        const fileKey = data.fileName;
        onFileSelected(file, fileKey);
      }
    } catch {
      setError('שגיאה בהורדת הקובץ');
    } finally {
      setDownloading(null);
    }
  }

  const fileIcon = (type: string) => {
    if (type === 'audio') return <FileAudio className="w-5 h-5 text-purple-500" />;
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-base font-semibold">בחר קובץ להורדה</h2>
          <p className="text-xs text-muted-foreground">{notebook.title}</p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-2">
          {files.map((file) => (
            <Card
              key={file.type}
              className="border hover:border-primary cursor-pointer transition-colors"
            >
              <CardContent className="flex items-center gap-3 p-4">
                {fileIcon(file.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{file.label}</span>
                    <Badge variant={file.downloadable ? 'default' : 'secondary'} className="text-xs">
                      {file.downloadable ? 'קובץ' : 'טקסט'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{file.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={downloading === file.type}
                  onClick={() => handleSelect(file)}
                >
                  {downloading === file.type ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
