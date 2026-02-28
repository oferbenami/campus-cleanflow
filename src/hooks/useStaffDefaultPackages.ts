import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const QUERY_KEY = "staff-default-packages";

export interface StaffDefaultPackage {
  id: string;
  staff_user_id: string;
  work_package_id: string;
  created_at: string;
}

export function useStaffDefaultPackages() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_default_packages" as any)
        .select("*") as any;
      if (error) throw error;
      return (data || []) as StaffDefaultPackage[];
    },
  });
}

export function useSetStaffDefaults() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { staffId: string; workPackageIds: string[] }) => {
      // Delete existing defaults for this staff
      await (supabase as any)
        .from("staff_default_packages")
        .delete()
        .eq("staff_user_id", params.staffId);

      if (params.workPackageIds.length > 0) {
        const rows = params.workPackageIds.map((wpId) => ({
          staff_user_id: params.staffId,
          work_package_id: wpId,
        }));
        const { error } = await (supabase as any)
          .from("staff_default_packages")
          .insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast({ title: "ברירות מחדל נשמרו" });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}
