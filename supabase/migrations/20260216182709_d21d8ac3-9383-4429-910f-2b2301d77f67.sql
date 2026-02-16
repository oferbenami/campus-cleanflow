
-- Buildings table (between sites and zones)
CREATE TABLE public.buildings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read buildings" ON public.buildings FOR SELECT USING (true);
CREATE POLICY "Managers manage buildings" ON public.buildings FOR ALL USING (is_manager());

-- Add building_id to zones (nullable for backward compat)
ALTER TABLE public.zones ADD COLUMN building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL;

-- Events/Triggers table (Phase B ready, Manual only in Phase A)
CREATE TABLE public.event_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'iot', 'buzzok', 'sensor')),
  event_type TEXT NOT NULL DEFAULT 'issue',
  location_id UUID REFERENCES public.locations(id),
  zone_id UUID REFERENCES public.zones(id),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  reported_by UUID REFERENCES public.profiles(id),
  assigned_task_id UUID REFERENCES public.task_assignments(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
ALTER TABLE public.event_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read events" ON public.event_triggers FOR SELECT USING (true);
CREATE POLICY "Staff create events" ON public.event_triggers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Managers manage events" ON public.event_triggers FOR ALL USING (is_manager() OR is_supervisor());

-- Event routing rules (Phase B ready)
CREATE TABLE public.event_routing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  zone_id UUID REFERENCES public.zones(id),
  auto_assign_role TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.event_routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read routing rules" ON public.event_routing_rules FOR SELECT USING (true);
CREATE POLICY "Managers manage routing rules" ON public.event_routing_rules FOR ALL USING (is_manager());

-- Corrective Actions (CAPA) table
CREATE TABLE public.corrective_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.quality_audits(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.corrective_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers/supervisors read CAPA" ON public.corrective_actions FOR SELECT USING (is_manager() OR is_supervisor());
CREATE POLICY "Managers/supervisors create CAPA" ON public.corrective_actions FOR INSERT WITH CHECK (is_manager() OR is_supervisor());
CREATE POLICY "Managers/supervisors update CAPA" ON public.corrective_actions FOR UPDATE USING (is_manager() OR is_supervisor());
CREATE POLICY "Managers delete CAPA" ON public.corrective_actions FOR DELETE USING (is_manager());

-- Add SLA fields to task_templates
ALTER TABLE public.task_templates ADD COLUMN sla_minutes INTEGER;
ALTER TABLE public.task_templates ADD COLUMN sla_warning_minutes INTEGER;

-- Add trigger for corrective_actions updated_at
CREATE TRIGGER update_corrective_actions_updated_at
  BEFORE UPDATE ON public.corrective_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Audit checklist categories with weights
CREATE TABLE public.audit_checklist_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_he TEXT NOT NULL,
  weight NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_checklist_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read audit categories" ON public.audit_checklist_categories FOR SELECT USING (true);
CREATE POLICY "Managers manage audit categories" ON public.audit_checklist_categories FOR ALL USING (is_manager());

-- Seed default audit categories
INSERT INTO public.audit_checklist_categories (name, name_he, weight, sort_order) VALUES
  ('cleanliness', 'ניקיון', 1.0, 1),
  ('thoroughness', 'יסודיות', 0.9, 2),
  ('timeliness', 'עמידה בזמנים', 0.8, 3),
  ('supplies', 'ציוד וחומרים', 0.7, 4),
  ('safety', 'בטיחות', 1.0, 5);
