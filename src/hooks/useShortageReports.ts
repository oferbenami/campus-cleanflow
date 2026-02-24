import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const SITE_ID = "37027ccd-c7d7-4d77-988d-6da914e347b4";

export interface ShortageReport {
  id: string;
  item_key: string;
  item_label: string;
  category: string;
  quantity: number;
  location: string;
  status: string;
  reported_by: string;
  reporter_name?: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  forwarded_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
}

interface SelectedItem {
  key: string;
  label: string;
  quantity: number;
}

export const useShortageReports = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ShortageReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    const { data, error } = await supabase
      .from("supply_shortage_reports")
      .select("*")
      .eq("site_id", SITE_ID)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Fetch reporter names
      const reporterIds = [...new Set(data.map((r: any) => r.reported_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", reporterIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.id] = p.full_name; });

      setReports(data.map((r: any) => ({
        ...r,
        reporter_name: nameMap[r.reported_by] || "לא ידוע",
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const submitShortageReport = useCallback(async (
    items: SelectedItem[],
    location: string,
    category: string,
  ) => {
    if (!user) throw new Error("לא מחובר");

    const rows = items.map((item) => ({
      site_id: SITE_ID,
      reported_by: user.id,
      item_key: item.key,
      item_label: item.label,
      category,
      quantity: item.quantity,
      location,
    }));

    const { error } = await supabase
      .from("supply_shortage_reports")
      .insert(rows);

    if (error) throw error;
    await fetchReports();
  }, [user, fetchReports]);

  const acknowledgeReport = useCallback(async (reportId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("supply_shortage_reports")
      .update({
        status: "acknowledged",
        acknowledged_by: user.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", reportId);
    if (error) throw error;
    await fetchReports();
  }, [user, fetchReports]);

  const forwardReport = useCallback(async (reportId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("supply_shortage_reports")
      .update({
        status: "forwarded",
        forwarded_at: new Date().toISOString(),
      })
      .eq("id", reportId);
    if (error) throw error;
    await fetchReports();
  }, [user, fetchReports]);

  const resolveReport = useCallback(async (reportId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("supply_shortage_reports")
      .update({
        status: "resolved",
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);
    if (error) throw error;
    await fetchReports();
  }, [user, fetchReports]);

  return {
    reports,
    loading,
    submitShortageReport,
    acknowledgeReport,
    forwardReport,
    resolveReport,
    refetch: fetchReports,
  };
};
