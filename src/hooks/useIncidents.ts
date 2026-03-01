import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Incident {
  id: string;
  site_id: string;
  location_id: string;
  location_name: string;
  created_by_user_id: string;
  created_by_name: string;
  assigned_to_user_id: string | null;
  assigned_to_name: string | null;
  priority: "critical" | "urgent" | "high" | "normal" | "low";
  category: "spill" | "restroom" | "safety" | "damage" | "equipment" | "other";
  description: string;
  photo_url: string | null;
  status: "pending_dispatch" | "assigned" | "in_progress" | "resolved" | "closed" | "escalated";
  response_sla_minutes: number;
  resolution_sla_minutes: number;
  created_at: string;
  assigned_at: string | null;
  started_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  escalation_level: number;
  escalated_at: string | null;
  source_role: string;
  recurrence_flag: boolean;
  related_incident_id: string | null;
  close_reason: string | null;
  // Computed
  response_sla_remaining_min: number | null;
  resolution_sla_remaining_min: number | null;
  is_response_breached: boolean;
  is_resolution_breached: boolean;
}

export interface IncidentEvent {
  id: string;
  incident_id: string;
  event_type: string;
  event_payload: Record<string, any>;
  user_id: string;
  user_name: string;
  created_at: string;
}

export interface WorkerLoad {
  id: string;
  full_name: string;
  avatar_initials: string | null;
  planned_minutes_remaining: number;
  active_task_name: string | null;
  active_task_location: string | null;
  incident_count: number;
}

export function useIncidents() {
  const { user, role } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("site_id")
        .eq("id", user.id)
        .single();
      const siteId = profile?.site_id || "37027ccd-c7d7-4d77-988d-6da914e347b4";

      const { data, error } = await supabase
        .from("incidents")
        .select(`
          *,
          location:campus_locations!incidents_location_id_fkey ( name ),
          creator:profiles!incidents_created_by_user_id_fkey ( full_name ),
          assignee:profiles!incidents_assigned_to_user_id_fkey ( full_name )
        `)
        .eq("site_id", siteId)
        .not("status", "eq", "closed")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const now = Date.now();
      const mapped: Incident[] = (data || []).map((d: any) => {
        const createdMs = new Date(d.created_at).getTime();
        const assignedMs = d.assigned_at ? new Date(d.assigned_at).getTime() : null;

        // Response SLA: time from creation to assignment
        let responseSlaRemaining: number | null = null;
        let isResponseBreached = false;
        if (!d.assigned_at) {
          const elapsed = (now - createdMs) / 60000;
          responseSlaRemaining = d.response_sla_minutes - elapsed;
          isResponseBreached = responseSlaRemaining <= 0;
        }

        // Resolution SLA: time from creation to resolution
        let resolutionSlaRemaining: number | null = null;
        let isResolutionBreached = false;
        if (!d.resolved_at) {
          const elapsed = (now - createdMs) / 60000;
          resolutionSlaRemaining = d.resolution_sla_minutes - elapsed;
          isResolutionBreached = resolutionSlaRemaining <= 0;
        }

        return {
          id: d.id,
          site_id: d.site_id,
          location_id: d.location_id,
          location_name: d.location?.name || "",
          created_by_user_id: d.created_by_user_id,
          created_by_name: d.creator?.full_name || "",
          assigned_to_user_id: d.assigned_to_user_id,
          assigned_to_name: d.assignee?.full_name || null,
          priority: d.priority,
          category: d.category,
          description: d.description,
          photo_url: d.photo_url,
          status: d.status,
          response_sla_minutes: d.response_sla_minutes,
          resolution_sla_minutes: d.resolution_sla_minutes,
          created_at: d.created_at,
          assigned_at: d.assigned_at,
          started_at: d.started_at,
          resolved_at: d.resolved_at,
          closed_at: d.closed_at,
          escalation_level: d.escalation_level,
          escalated_at: d.escalated_at,
          source_role: d.source_role,
          recurrence_flag: d.recurrence_flag,
          related_incident_id: d.related_incident_id,
          close_reason: d.close_reason,
          response_sla_remaining_min: responseSlaRemaining,
          resolution_sla_remaining_min: resolutionSlaRemaining,
          is_response_breached: isResponseBreached,
          is_resolution_breached: isResolutionBreached,
        };
      });
      setIncidents(mapped);
    } catch (err) {
      console.error("Incidents fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Realtime
  useEffect(() => {
    fetchIncidents();
    const channel = supabase
      .channel("incidents-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, () => fetchIncidents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchIncidents]);

  // Refresh SLA timers every 30s
  useEffect(() => {
    const iv = setInterval(() => {
      setIncidents(prev => prev.map(inc => {
        const now = Date.now();
        const createdMs = new Date(inc.created_at).getTime();
        let responseSlaRemaining: number | null = null;
        let isResponseBreached = false;
        if (!inc.assigned_at) {
          const elapsed = (now - createdMs) / 60000;
          responseSlaRemaining = inc.response_sla_minutes - elapsed;
          isResponseBreached = responseSlaRemaining <= 0;
        }
        let resolutionSlaRemaining: number | null = null;
        let isResolutionBreached = false;
        if (!inc.resolved_at) {
          const elapsed = (now - createdMs) / 60000;
          resolutionSlaRemaining = inc.resolution_sla_minutes - elapsed;
          isResolutionBreached = resolutionSlaRemaining <= 0;
        }
        return {
          ...inc,
          response_sla_remaining_min: responseSlaRemaining,
          resolution_sla_remaining_min: resolutionSlaRemaining,
          is_response_breached: isResponseBreached,
          is_resolution_breached: isResolutionBreached,
        };
      }));
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  // ── Actions ──

  const createIncident = useCallback(async (params: {
    locationId: string;
    description: string;
    priority: Incident["priority"];
    category: Incident["category"];
    assignToUserId?: string;
    photoUrl?: string;
  }) => {
    if (!user?.id) return;
    const { data: profile } = await supabase.from("profiles").select("site_id").eq("id", user.id).single();
    const siteId = profile?.site_id || "37027ccd-c7d7-4d77-988d-6da914e347b4";

    const insertData: any = {
      site_id: siteId,
      location_id: params.locationId,
      created_by_user_id: user.id,
      description: params.description,
      priority: params.priority,
      category: params.category,
      source_role: role || "cleaning_staff",
      photo_url: params.photoUrl || null,
    };

    if (params.assignToUserId) {
      insertData.assigned_to_user_id = params.assignToUserId;
      insertData.status = "assigned";
      insertData.assigned_at = new Date().toISOString();
    }

    const { error } = await supabase.from("incidents").insert(insertData);
    if (error) throw error;
    await fetchIncidents();
  }, [user?.id, role, fetchIncidents]);

  const assignIncident = useCallback(async (incidentId: string, assignToUserId: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("incidents")
      .update({
        assigned_to_user_id: assignToUserId,
        status: "assigned" as any,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", incidentId);
    if (error) throw error;

    await supabase.from("incident_events_log").insert({
      incident_id: incidentId,
      event_type: "assigned" as any,
      user_id: user.id,
      event_payload: { assigned_to: assignToUserId },
    });
    await fetchIncidents();
  }, [user?.id, fetchIncidents]);

  const startIncident = useCallback(async (incidentId: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("incidents")
      .update({ status: "in_progress" as any, started_at: new Date().toISOString() })
      .eq("id", incidentId);
    if (error) throw error;

    await supabase.from("incident_events_log").insert({
      incident_id: incidentId,
      event_type: "started" as any,
      user_id: user.id,
    });
    await fetchIncidents();
  }, [user?.id, fetchIncidents]);

  const resolveIncident = useCallback(async (incidentId: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("incidents")
      .update({ status: "resolved" as any, resolved_at: new Date().toISOString() })
      .eq("id", incidentId);
    if (error) throw error;

    await supabase.from("incident_events_log").insert({
      incident_id: incidentId,
      event_type: "resolved" as any,
      user_id: user.id,
    });
    await fetchIncidents();
  }, [user?.id, fetchIncidents]);

  const closeIncident = useCallback(async (incidentId: string, reason: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("incidents")
      .update({
        status: "closed" as any,
        closed_at: new Date().toISOString(),
        close_reason: reason,
      })
      .eq("id", incidentId);
    if (error) throw error;

    await supabase.from("incident_events_log").insert({
      incident_id: incidentId,
      event_type: "closed" as any,
      user_id: user.id,
      event_payload: { reason },
    });
    await fetchIncidents();
  }, [user?.id, fetchIncidents]);

  const escalateIncident = useCallback(async (incidentId: string, level: number) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("incidents")
      .update({
        escalation_level: level,
        escalated_at: new Date().toISOString(),
        status: level >= 2 ? "escalated" as any : undefined,
      })
      .eq("id", incidentId);
    if (error) throw error;

    await supabase.from("incident_events_log").insert({
      incident_id: incidentId,
      event_type: "escalated" as any,
      user_id: user.id,
      event_payload: { level },
    });
    await fetchIncidents();
  }, [user?.id, fetchIncidents]);

  const reassignIncident = useCallback(async (incidentId: string, newUserId: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("incidents")
      .update({
        assigned_to_user_id: newUserId,
        assigned_at: new Date().toISOString(),
        status: "assigned" as any,
      })
      .eq("id", incidentId);
    if (error) throw error;

    await supabase.from("incident_events_log").insert({
      incident_id: incidentId,
      event_type: "reassigned" as any,
      user_id: user.id,
      event_payload: { new_assignee: newUserId },
    });
    await fetchIncidents();
  }, [user?.id, fetchIncidents]);

  const markDuplicate = useCallback(async (incidentId: string, originalId: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("incidents")
      .update({
        related_incident_id: originalId,
        status: "closed" as any,
        closed_at: new Date().toISOString(),
        close_reason: "duplicate",
      })
      .eq("id", incidentId);
    if (error) throw error;

    await supabase.from("incident_events_log").insert({
      incident_id: incidentId,
      event_type: "marked_duplicate" as any,
      user_id: user.id,
      event_payload: { original_id: originalId },
    });
    await fetchIncidents();
  }, [user?.id, fetchIncidents]);

  // Grouped by status
  const byStatus = useMemo(() => {
    const groups: Record<string, Incident[]> = {
      pending_dispatch: [],
      assigned: [],
      in_progress: [],
      resolved: [],
      escalated: [],
    };
    incidents.forEach((inc) => {
      const key = inc.is_response_breached && inc.status === "pending_dispatch" ? "pending_dispatch" : inc.status;
      if (groups[key]) groups[key].push(inc);
    });
    // Sort each group by priority then SLA remaining
    const priorityOrder = { critical: 0, urgent: 1, high: 2, normal: 3, low: 4 };
    Object.values(groups).forEach((arr) => {
      arr.sort((a, b) => {
        const pa = priorityOrder[a.priority] ?? 3;
        const pb = priorityOrder[b.priority] ?? 3;
        if (pa !== pb) return pa - pb;
        return (a.resolution_sla_remaining_min ?? 999) - (b.resolution_sla_remaining_min ?? 999);
      });
    });
    return groups;
  }, [incidents]);

  // My assigned incidents (for staff view)
  const myIncidents = useMemo(() => {
    if (!user?.id) return [];
    return incidents.filter(
      (i) => i.assigned_to_user_id === user.id && !["resolved", "closed"].includes(i.status)
    );
  }, [incidents, user?.id]);

  // Count of resolved incidents by current user (for stats)
  const myResolvedCount = useMemo(() => {
    if (!user?.id) return 0;
    return incidents.filter(
      (i) => i.assigned_to_user_id === user.id && ["resolved", "closed"].includes(i.status)
    ).length;
  }, [incidents, user?.id]);

  return {
    incidents,
    byStatus,
    myIncidents,
    myResolvedCount,
    loading,
    createIncident,
    assignIncident,
    startIncident,
    resolveIncident,
    closeIncident,
    escalateIncident,
    reassignIncident,
    markDuplicate,
    refetch: fetchIncidents,
  };
}
