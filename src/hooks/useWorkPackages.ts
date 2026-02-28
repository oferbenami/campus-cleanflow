import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const SITE_ID = "37027ccd-c7d7-4d77-988d-6da914e347b4";

export interface WorkPackage {
  id: string;
  site_id: string;
  package_code: string;
  name: string;
  shift_type: string;
  building: string | null;
  floor: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
  is_recurring: boolean;
  days_of_week: number[];
}

export interface WorkPackageTask {
  id: string;
  work_package_id: string;
  location_ref: string | null;
  space_type: string | null;
  description: string | null;
  cleaning_type: string | null;
  building: string | null;
  floor: string | null;
  area_sqm: number | null;
  tools_qty: number | null;
  area_minutes_coeff: number | null;
  tools_minutes_coeff: number | null;
  standard_minutes: number;
  rounds_per_shift: number | null;
  notes: string | null;
}

export interface WorkPackageWithTasks extends WorkPackage {
  tasks: WorkPackageTask[];
}

/* ─── Fetch all work packages with tasks ─── */
export function useWorkPackages() {
  return useQuery({
    queryKey: ["work-packages"],
    queryFn: async () => {
      const { data: packages, error: pErr } = await supabase
        .from("work_packages")
        .select("*")
        .eq("site_id", SITE_ID)
        .eq("active", true)
        .order("package_code");

      if (pErr) throw pErr;
      if (!packages?.length) return [] as WorkPackageWithTasks[];

      const pkgIds = packages.map((p) => p.id);
      const { data: tasks, error: tErr } = await supabase
        .from("work_package_tasks")
        .select("*")
        .in("work_package_id", pkgIds);

      if (tErr) throw tErr;

      return packages.map((pkg) => ({
        ...pkg,
        tasks: (tasks || []).filter((t) => t.work_package_id === pkg.id),
      })) as WorkPackageWithTasks[];
    },
  });
}

/* ─── Compute standard minutes from coefficients ─── */
export function computeStandardMinutes(task: {
  area_sqm?: number | null;
  area_minutes_coeff?: number | null;
  tools_qty?: number | null;
  tools_minutes_coeff?: number | null;
  rounds_per_shift?: number | null;
}, applyRounds = false): number {
  let total = 0;
  if (task.area_sqm && task.area_minutes_coeff) {
    total += task.area_sqm * task.area_minutes_coeff;
  }
  if (task.tools_qty && task.tools_minutes_coeff) {
    total += task.tools_qty * task.tools_minutes_coeff;
  }
  if (applyRounds && task.rounds_per_shift && task.rounds_per_shift > 1) {
    total *= task.rounds_per_shift;
  }
  return Math.round(total * 100) / 100;
}

/* ─── Import work packages from parsed Excel data ─── */
export function useImportWorkPackages() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      packages: {
        package_code: string;
        name: string;
        shift_type: string;
        building: string | null;
        floor: string | null;
        tasks: Omit<WorkPackageTask, "id" | "work_package_id">[];
      }[];
      mode: "create" | "update" | "skip";
    }) => {
      let created = 0, updated = 0, skipped = 0, tasksCreated = 0;

      for (const pkg of params.packages) {
        // Check if package exists
        const { data: existing } = await supabase
          .from("work_packages")
          .select("id")
          .eq("site_id", SITE_ID)
          .eq("package_code", pkg.package_code)
          .maybeSingle();

        let packageId: string;

        if (existing) {
          if (params.mode === "skip") {
            skipped++;
            continue;
          }
          // Update existing - delete old tasks, re-insert
          packageId = existing.id;
          await supabase.from("work_package_tasks").delete().eq("work_package_id", packageId);
          await supabase.from("work_packages").update({
            name: pkg.name,
            shift_type: pkg.shift_type,
            building: pkg.building,
            floor: pkg.floor,
          }).eq("id", packageId);
          updated++;
        } else {
          const { data: newPkg, error } = await supabase
            .from("work_packages")
            .insert({
              site_id: SITE_ID,
              package_code: pkg.package_code,
              name: pkg.name,
              shift_type: pkg.shift_type,
              building: pkg.building,
              floor: pkg.floor,
              created_by: user?.id || null,
            })
            .select("id")
            .single();

          if (error) throw error;
          packageId = newPkg.id;
          created++;
        }

        // Insert tasks
        if (pkg.tasks.length > 0) {
          const taskRows = pkg.tasks.map((t) => ({
            work_package_id: packageId,
            location_ref: t.location_ref,
            space_type: t.space_type,
            description: t.description,
            cleaning_type: t.cleaning_type,
            building: t.building,
            floor: t.floor,
            area_sqm: t.area_sqm,
            tools_qty: t.tools_qty,
            area_minutes_coeff: t.area_minutes_coeff,
            tools_minutes_coeff: t.tools_minutes_coeff,
            standard_minutes: t.standard_minutes || 0,
            rounds_per_shift: t.rounds_per_shift,
            notes: t.notes,
          }));
          const { error: tErr } = await supabase.from("work_package_tasks").insert(taskRows);
          if (tErr) throw tErr;
          tasksCreated += taskRows.length;
        }
      }

      return { created, updated, skipped, tasksCreated };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["work-packages"] });
      toast({
        title: "ייבוא הושלם",
        description: `${result.created} חבילות נוצרו, ${result.updated} עודכנו, ${result.skipped} דולגו. ${result.tasksCreated} משימות נוצרו.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "שגיאת ייבוא", description: err.message, variant: "destructive" });
    },
  });
}

/* ─── Clone a work package ─── */
export function useCloneWorkPackage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      sourceId: string;
      newPackageCode: string;
      shiftType?: string;
      building?: string;
      floor?: string;
    }) => {
      // Fetch source
      const { data: source } = await supabase
        .from("work_packages")
        .select("*")
        .eq("id", params.sourceId)
        .single();
      if (!source) throw new Error("חבילה לא נמצאה");

      const { data: tasks } = await supabase
        .from("work_package_tasks")
        .select("*")
        .eq("work_package_id", params.sourceId);

      // Create new package
      const { data: newPkg, error } = await supabase
        .from("work_packages")
        .insert({
          site_id: source.site_id,
          package_code: params.newPackageCode,
          name: `${source.name} (עותק)`,
          shift_type: params.shiftType || source.shift_type,
          building: params.building ?? source.building,
          floor: params.floor ?? source.floor,
          created_by: user?.id || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Clone tasks
      if (tasks?.length) {
        const clonedTasks = tasks.map((t) => ({
          work_package_id: newPkg.id,
          location_ref: t.location_ref,
          space_type: t.space_type,
          description: t.description,
          cleaning_type: t.cleaning_type,
          building: t.building,
          floor: t.floor,
          area_sqm: t.area_sqm,
          tools_qty: t.tools_qty,
          area_minutes_coeff: t.area_minutes_coeff,
          tools_minutes_coeff: t.tools_minutes_coeff,
          standard_minutes: t.standard_minutes,
          rounds_per_shift: t.rounds_per_shift,
          notes: t.notes,
        }));
        await supabase.from("work_package_tasks").insert(clonedTasks);
      }

      return newPkg;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-packages"] });
      toast({ title: "חבילה שוכפלה בהצלחה" });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}

/* ─── Update a single task's standard minutes ─── */
export function useUpdateTaskStandardTime() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { taskId: string; standardMinutes: number }) => {
      const { error } = await supabase
        .from("work_package_tasks")
        .update({ standard_minutes: params.standardMinutes })
        .eq("id", params.taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-packages"] });
    },
  });
}

/* ─── Bulk update tasks ─── */
export function useBulkUpdateTasks() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      taskIds: string[];
      action: "set" | "multiply" | "recalculate";
      field?: string;
      value?: number;
      applyRounds?: boolean;
    }) => {
      if (params.action === "recalculate") {
        // Fetch tasks to recalculate
        const { data: tasks } = await supabase
          .from("work_package_tasks")
          .select("*")
          .in("id", params.taskIds);

        if (!tasks) return;

        for (const task of tasks) {
          const newMinutes = computeStandardMinutes(task, params.applyRounds);
          if (newMinutes > 0) {
            await supabase
              .from("work_package_tasks")
              .update({ standard_minutes: newMinutes })
              .eq("id", task.id);
          }
        }
      } else if (params.action === "set" && params.field && params.value !== undefined) {
        await supabase
          .from("work_package_tasks")
          .update({ [params.field]: params.value })
          .in("id", params.taskIds);
      } else if (params.action === "multiply" && params.value !== undefined) {
        const { data: tasks } = await supabase
          .from("work_package_tasks")
          .select("id, standard_minutes")
          .in("id", params.taskIds);

        if (tasks) {
          for (const t of tasks) {
            await supabase
              .from("work_package_tasks")
              .update({ standard_minutes: Math.round(t.standard_minutes * params.value! * 100) / 100 })
              .eq("id", t.id);
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-packages"] });
      toast({ title: "עדכון מרוכז בוצע" });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}

/* ─── Delete work package ─── */
export function useDeleteWorkPackage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-packages"] });
      toast({ title: "חבילה נמחקה" });
    },
  });
}

/* ─── Add a task to a work package ─── */
export function useAddWorkPackageTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      work_package_id: string;
      space_type?: string;
      description?: string;
      cleaning_type?: string;
      building?: string;
      floor?: string;
      standard_minutes?: number;
      rounds_per_shift?: number;
      area_sqm?: number;
    }) => {
      const { error } = await supabase.from("work_package_tasks").insert({
        work_package_id: params.work_package_id,
        space_type: params.space_type || null,
        description: params.description || null,
        cleaning_type: params.cleaning_type || null,
        building: params.building || null,
        floor: params.floor || null,
        standard_minutes: params.standard_minutes ?? 10,
        rounds_per_shift: params.rounds_per_shift ?? 1,
        area_sqm: params.area_sqm ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-packages"] });
      toast({ title: "משימה נוספה" });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}

/* ─── Delete a task from a work package ─── */
export function useDeleteWorkPackageTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("work_package_tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-packages"] });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}

/* ─── Update a task's fields ─── */
export function useUpdateWorkPackageTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      taskId: string;
      updates: Partial<Pick<WorkPackageTask, 'space_type' | 'description' | 'cleaning_type' | 'building' | 'floor' | 'standard_minutes' | 'rounds_per_shift' | 'area_sqm'>>;
    }) => {
      const { error } = await supabase
        .from("work_package_tasks")
        .update(params.updates)
        .eq("id", params.taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-packages"] });
    },
    onError: (err: any) => {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    },
  });
}
