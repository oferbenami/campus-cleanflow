import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery type in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "הסיסמה עודכנה בהצלחה!" });
      navigate("/auth", { replace: true });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-6">
          <h2 className="text-xl font-bold text-center">איפוס סיסמה</h2>
          {ready ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="flex items-center gap-2 text-sm">
                  <Lock size={14} />
                  סיסמה חדשה
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "מעדכן..." : "עדכן סיסמה"}
              </Button>
            </form>
          ) : (
            <p className="text-center text-muted-foreground text-sm">
              קישור איפוס לא תקין. נסה לבקש קישור חדש.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
