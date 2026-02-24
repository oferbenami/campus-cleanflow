import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart3, Clock, MapPin, TrendingUp, AlertTriangle, Repeat,
  Shield, Loader2, Timer
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface AnalyticsData {
  total: number;
  resolved: number;
  breached_response: number;
  breached_resolution: number;
  avg_response_min: number;
  avg_resolution_min: number;
  sla_compliance_pct: number;
  by_category: { name: string; count: number }[];
  by_location: { name: string; count: number }[];
  by_priority: { name: string; count: number }[];
  recurring_locations: { name: string; count: number }[];
}

const COLORS = ["hsl(var(--destructive))", "hsl(var(--warning))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--accent))", "hsl(var(--muted-foreground))"];

const categoryLabels: Record<string, string> = {
  spill: "שפיכה", restroom: "שירותים", safety: "בטיחות",
  damage: "נזק", equipment: "ציוד", other: "אחר",
};

const IncidentAnalyticsDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30>(7);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user?.id) return;
      setLoading(true);

      const { data: profile } = await supabase.from("profiles").select("site_id").eq("id", user.id).single();
      const siteId = profile?.site_id || "37027ccd-c7d7-4d77-988d-6da914e347b4";
      const since = new Date(Date.now() - period * 86400000).toISOString();

      const { data: incidents } = await supabase
        .from("incidents")
        .select(`
          id, priority, category, status, created_at, assigned_at, resolved_at,
          response_sla_minutes, resolution_sla_minutes, recurrence_flag,
          location:campus_locations!incidents_location_id_fkey ( name )
        `)
        .eq("site_id", siteId)
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      if (!incidents) { setLoading(false); return; }

      const total = incidents.length;
      const resolved = incidents.filter((i: any) => i.status === "resolved" || i.status === "closed").length;

      // MTTA & MTTR
      let totalResponse = 0, responseCount = 0;
      let totalResolution = 0, resolutionCount = 0;
      let breachedResponse = 0, breachedResolution = 0;

      incidents.forEach((i: any) => {
        if (i.assigned_at) {
          const ms = new Date(i.assigned_at).getTime() - new Date(i.created_at).getTime();
          totalResponse += ms / 60000;
          responseCount++;
          if (ms / 60000 > i.response_sla_minutes) breachedResponse++;
        }
        if (i.resolved_at) {
          const ms = new Date(i.resolved_at).getTime() - new Date(i.created_at).getTime();
          totalResolution += ms / 60000;
          resolutionCount++;
          if (ms / 60000 > i.resolution_sla_minutes) breachedResolution++;
        }
      });

      // Group by category
      const catMap: Record<string, number> = {};
      const locMap: Record<string, number> = {};
      const priMap: Record<string, number> = {};

      incidents.forEach((i: any) => {
        catMap[i.category] = (catMap[i.category] || 0) + 1;
        const locName = i.location?.name || "?";
        locMap[locName] = (locMap[locName] || 0) + 1;
        priMap[i.priority] = (priMap[i.priority] || 0) + 1;
      });

      const byCategory = Object.entries(catMap).map(([name, count]) => ({ name: categoryLabels[name] || name, count })).sort((a, b) => b.count - a.count);
      const byLocation = Object.entries(locMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
      const byPriority = Object.entries(priMap).map(([name, count]) => ({ name, count }));

      // Recurring locations (>= 3 in period)
      const recurringLocations = Object.entries(locMap)
        .filter(([, c]) => c >= 3)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      const slaCompliance = total > 0 ? Math.round(((total - breachedResponse - breachedResolution) / total) * 100) : 100;

      setData({
        total,
        resolved,
        breached_response: breachedResponse,
        breached_resolution: breachedResolution,
        avg_response_min: responseCount > 0 ? Math.round(totalResponse / responseCount) : 0,
        avg_resolution_min: resolutionCount > 0 ? Math.round(totalResolution / resolutionCount) : 0,
        sla_compliance_pct: slaCompliance,
        by_category: byCategory,
        by_location: byLocation,
        by_priority: byPriority,
        recurring_locations: recurringLocations,
      });
      setLoading(false);
    };
    fetchAnalytics();
  }, [user?.id, period]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-4">
      {/* Period Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-primary" />
          <h2 className="text-lg font-bold">ניתוח אירועים</h2>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-0.5">
          {([7, 30] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {p} ימים
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Timer} label="MTTA (זמן שיבוץ)" value={`${data.avg_response_min} דק׳`} color="text-info" />
        <KpiCard icon={Clock} label="MTTR (זמן פתרון)" value={`${data.avg_resolution_min} דק׳`} color="text-accent" />
        <KpiCard
          icon={Shield}
          label="עמידה ב-SLA"
          value={`${data.sla_compliance_pct}%`}
          color={data.sla_compliance_pct >= 90 ? "text-success" : data.sla_compliance_pct >= 70 ? "text-warning" : "text-destructive"}
        />
        <KpiCard icon={AlertTriangle} label="סה״כ אירועים" value={String(data.total)} subValue={`${data.resolved} נפתרו`} color="text-primary" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Category */}
        <div className="bg-card border rounded-xl p-4">
          <h3 className="text-sm font-bold mb-3">אירועים לפי קטגוריה</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.by_category} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11 }} />
              <ReTooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Priority */}
        <div className="bg-card border rounded-xl p-4">
          <h3 className="text-sm font-bold mb-3">התפלגות עדיפות</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.by_priority} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, count }) => `${name}: ${count}`}>
                {data.by_priority.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <ReTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Locations & Recurring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border rounded-xl p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <MapPin size={14} /> Top 5 מיקומים
          </h3>
          <div className="space-y-2">
            {data.by_location.map((loc, i) => (
              <div key={loc.name} className="flex items-center gap-2">
                <span className="w-5 text-xs text-muted-foreground font-mono">{i + 1}.</span>
                <span className="flex-1 text-xs font-semibold truncate">{loc.name}</span>
                <span className="text-xs mono font-bold">{loc.count}</span>
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(loc.count / (data.by_location[0]?.count || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <Repeat size={14} className="text-warning" /> בעיות חוזרות
          </h3>
          {data.recurring_locations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">לא זוהו בעיות חוזרות</p>
          ) : (
            <div className="space-y-2">
              {data.recurring_locations.map((loc) => (
                <div key={loc.name} className="flex items-center gap-2 p-2 rounded-lg bg-warning/5 border border-warning/20">
                  <AlertTriangle size={12} className="text-warning shrink-0" />
                  <span className="flex-1 text-xs font-semibold">{loc.name}</span>
                  <span className="text-xs mono font-bold text-warning">{loc.count}x</span>
                </div>
              ))}
              <p className="text-[10px] text-warning/80 italic">
                🔍 חשד לבעיה מבנית — נדרשת בדיקה
              </p>
            </div>
          )}
        </div>
      </div>

      {/* SLA Breach Details */}
      <div className="bg-card border rounded-xl p-4">
        <h3 className="text-sm font-bold mb-2">סיכום חריגות SLA</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 text-center">
            <p className="text-2xl font-bold mono text-destructive">{data.breached_response}</p>
            <p className="text-[10px] text-muted-foreground">חריגות תגובה</p>
          </div>
          <div className="rounded-lg bg-warning/5 border border-warning/20 p-3 text-center">
            <p className="text-2xl font-bold mono text-warning">{data.breached_resolution}</p>
            <p className="text-[10px] text-muted-foreground">חריגות פתרון</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, subValue, color }: { icon: any; label: string; value: string; subValue?: string; color: string }) => (
  <div className="bg-card border rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon size={16} className={color} />
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
    <p className={`text-2xl font-bold mono ${color}`}>{value}</p>
    {subValue && <p className="text-[10px] text-muted-foreground">{subValue}</p>}
  </div>
);

export default IncidentAnalyticsDashboard;
