import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const SITE_ID = "37027ccd-c7d7-4d77-988d-6da914e347b4";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StaffingPosition {
  id: string;
  site_id: string;
  name: string;
  shift_type: "morning" | "evening";
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffingPositionPackage {
  id: string;
  staffing_position_id: string;
  work_package_id: string;
  created_at: string;
}

export interface StaffingPositionWithPackages extends StaffingPosition {
  package_ids: string[];
}

export type DayType = "regular" | "friday_eve" | "holiday";

export interface StaffingPositionAssignment {
  id: string;
  staffing_position_id: string;
  staff_user_id: string;
  is_permanent: boolean;
  effective_from: string;
  effective_until: string | null;
  applicable_day_types: DayType[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  staff_name?: string;
  position_name?: string;
}

export interface SpecialCalendarDay {
  id: string;
  date: string;
  day_type: "holiday_eve" | "holiday";
  description: string | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the effective day type for a given date, considering special calendar overrides.
 * Priority: special_calendar_days table > Saturday > Friday > regular
 */
export function getEffectiveDayType(
  date: Date,
  specialDays: SpecialCalendarDay[]
): DayType {
  const iso = date.toISOString().split("T")[0];
  const special = specialDays.find((d) => d.date === iso);
  if (special) {
    return special.day_type === "holiday_eve" ? "friday_eve" : "holiday";
  }
  const dow = date.getDay(); // 0=Sun, 5=Fri, 6=Sat
  if (dow === 6) return "holiday";
  if (dow === 5) return "friday_eve";
  return "regular";
}

// ─── Positions ───────────────────────────────────────────────────────────────

export function useStaffingPositions() {
  return useQuery({
    queryKey: ["staffing-positions"],
    queryFn: async () => {
      const { data: positions, error: pErr } = await (supabase as any)
        .from("staffing_positions")
        .select("*")
        .eq("site_id", SITE_ID)
        .eq("active", true)
        .order("name");
      if (pErr) throw pErr;
      if (!positions?.length) return [] as StaffingPositionWithPackages[];

      const posIds = positions.map((p: StaffingPosition) => p.id);
      const { data: pkgs, error: pkgErr } = await (supabase as any)
        .from("staffing_position_packages")
        .select("staffing_position_id, work_package_id")
        .in("staffing_position_id", posIds);
      if (pkgErr) throw pkgErr;

      const pkgMap: Record<string, string[]> = {};
      for (const row of pkgs || []) {
        if (!pkgMap[row.staffing_position_id]) pkgMap[row.staffing_position_id] = [];
        pkgMap[row.staffing_position_id].push(row.work_package_id);
      }

      return positions.map((p: StaffingPosition): StaffingPositionWithPackages => ({
        ...p,
        package_ids: pkgMap[p.id] || [],
      }));
    },
  });
}

export function useCreateStaffingPosition() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { name: string; shift_type: "morning" | "evening" }) => {
      const { data, error } = await (supabase as any)
        .from("staffing_positions")
        .insert({ site_id: SITE_ID, ...params, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as StaffingPosition;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staffing-positions"] });
      toast({ title: "תקן נוצר" });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateStaffingPosition() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; name?: string; shift_type?: "morning" | "evening"; active?: boolean }) => {
      const { id, ...updates } = params;
      const { error } = await (supabase as any)
        .from("staffing_positions")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staffing-positions"] });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteStaffingPosition() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("staffing_positions")
        .update({ active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staffing-positions"] });
      qc.invalidateQueries({ queryKey: ["position-assignments"] });
      toast({ title: "תקן הוסר" });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}

export function useSetPositionPackages() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { positionId: string; workPackageIds: string[] }) => {
      await (supabase as any)
        .from("staffing_position_packages")
        .delete()
        .eq("staffing_position_id", params.positionId);

      if (params.workPackageIds.length > 0) {
        const rows = params.workPackageIds.map((wpId) => ({
          staffing_position_id: params.positionId,
          work_package_id: wpId,
        }));
        const { error } = await (supabase as any)
          .from("staffing_position_packages")
          .insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staffing-positions"] });
      toast({ title: "חבילות עבודה עודכנו" });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}

// ─── Position Assignments ─────────────────────────────────────────────────────

export function usePositionAssignments() {
  return useQuery({
    queryKey: ["position-assignments"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("staffing_position_assignments")
        .select(`
          *,
          staffing_positions!staffing_position_id(name, shift_type),
          profiles!staff_user_id(full_name)
        `)
        .order("created_at");
      if (error) throw error;

      return (data || []).map((row: any): StaffingPositionAssignment => ({
        id: row.id,
        staffing_position_id: row.staffing_position_id,
        staff_user_id: row.staff_user_id,
        is_permanent: row.is_permanent,
        effective_from: row.effective_from,
        effective_until: row.effective_until,
        applicable_day_types: row.applicable_day_types || ["regular", "friday_eve"],
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        staff_name: row.profiles?.full_name,
        position_name: row.staffing_positions?.name,
      }));
    },
  });
}

export function useMyPositionAssignment() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-position-assignment", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await (supabase as any)
        .from("staffing_position_assignments")
        .select(`
          *,
          staffing_positions!staffing_position_id(
            id, name, shift_type,
            staffing_position_packages(work_package_id)
          )
        `)
        .eq("staff_user_id", user!.id)
        .lte("effective_from", today)
        .or(`effective_until.is.null,effective_until.gte.${today}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as (StaffingPositionAssignment & {
        staffing_positions: StaffingPosition & { staffing_position_packages: { work_package_id: string }[] };
      }) | null;
    },
  });
}

export function useAssignWorkerToPosition() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      staffing_position_id: string;
      staff_user_id: string;
      is_permanent: boolean;
      effective_from: string;
      effective_until?: string | null;
      applicable_day_types: DayType[];
    }) => {
      const { error } = await (supabase as any)
        .from("staffing_position_assignments")
        .insert({ ...params, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["position-assignments"] });
      qc.invalidateQueries({ queryKey: ["my-position-assignment"] });
      toast({ title: "עובד שובץ לתקן" });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}

export function useUnassignWorkerFromPosition() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await (supabase as any)
        .from("staffing_position_assignments")
        .delete()
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["position-assignments"] });
      qc.invalidateQueries({ queryKey: ["my-position-assignment"] });
      toast({ title: "שיבוץ הוסר" });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}

// ─── Special Calendar Days ────────────────────────────────────────────────────

export function useSpecialCalendarDays() {
  return useQuery({
    queryKey: ["special-calendar-days"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("special_calendar_days")
        .select("*")
        .order("date");
      if (error) throw error;
      return (data || []) as SpecialCalendarDay[];
    },
  });
}

export function useAddSpecialDay() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { date: string; day_type: "holiday_eve" | "holiday"; description?: string }) => {
      const { error } = await (supabase as any)
        .from("special_calendar_days")
        .insert(params);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["special-calendar-days"] });
      toast({ title: "יום מיוחד נוסף" });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteSpecialDay() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("special_calendar_days")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["special-calendar-days"] });
      toast({ title: "יום מיוחד הוסר" });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}
