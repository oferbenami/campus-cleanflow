import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Users, Trash2, Shield, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  id: string;
  full_name: string;
  avatar_initials: string | null;
  created_at: string;
  role: AppRole;
}

const ROLE_LABELS: Record<AppRole, string> = {
  campus_manager: "מנהל קמפוס",
  property_manager: "מנהל נכס",
  supervisor: "מפקח",
  cleaning_staff: "עובד ניקיון",
};

const ROLE_COLORS: Record<AppRole, string> = {
  campus_manager: "bg-primary/15 text-primary",
  property_manager: "bg-info/15 text-info",
  supervisor: "bg-warning/15 text-warning",
  cleaning_staff: "bg-muted text-muted-foreground",
};

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<UserWithRole | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles and roles
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_initials, created_at");

      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rErr) throw rErr;

      const roleMap = new Map<string, AppRole>();
      roles?.forEach((r) => roleMap.set(r.user_id, r.role as AppRole));

      const merged: UserWithRole[] = (profiles || []).map((p) => ({
        ...p,
        role: roleMap.get(p.id) || "cleaning_staff",
      }));

      // Sort: managers first, then by name
      merged.sort((a, b) => {
        const order: Record<AppRole, number> = { campus_manager: 0, property_manager: 1, supervisor: 2, cleaning_staff: 3 };
        return (order[a.role] - order[b.role]) || a.full_name.localeCompare(b.full_name, "he");
      });

      setUsers(merged);
    } catch (err: any) {
      toast({ title: "שגיאה בטעינת משתמשים", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (userId === currentUser?.id) {
      toast({ title: "לא ניתן לשנות את התפקיד שלך", variant: "destructive" });
      return;
    }
    setUpdatingRole(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;

      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      toast({ title: "התפקיד עודכן בהצלחה" });
    } catch (err: any) {
      toast({ title: "שגיאה בעדכון תפקיד", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: deleteTarget.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      toast({ title: `${deleteTarget.full_name || "משתמש"} נמחק בהצלחה` });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: "שגיאה במחיקת משתמש", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            ניהול משתמשים
            <Badge variant="secondary" className="mr-auto">{users.length} משתמשים</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" size={32} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">תפקיד</TableHead>
                  <TableHead className="text-right">הצטרף</TableHead>
                  <TableHead className="text-right w-[60px]">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {u.avatar_initials || u.full_name?.charAt(0) || "?"}
                          </div>
                          <span>{u.full_name || "—"}</span>
                          {isSelf && <Badge variant="outline" className="text-[10px]">את/ה</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isSelf ? (
                          <Badge className={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                        ) : (
                          <Select
                            value={u.role}
                            onValueChange={(val) => handleRoleChange(u.id, val as AppRole)}
                            disabled={updatingRole === u.id}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(ROLE_LABELS) as AppRole[]).map((r) => (
                                <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("he-IL")}
                      </TableCell>
                      <TableCell>
                        {!isSelf && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => !deleting && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Shield size={20} />
              מחיקת משתמש
            </DialogTitle>
            <DialogDescription>
              האם למחוק את <strong>{deleteTarget?.full_name}</strong>? פעולה זו בלתי הפיכה ותמחק את כל נתוני המשתמש.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
              מחק לצמיתות
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
