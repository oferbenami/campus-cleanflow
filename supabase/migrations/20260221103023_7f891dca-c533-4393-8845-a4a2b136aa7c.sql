
-- ==========================================
-- CleanFlow PRD Phase 1: Database Schema Migration
-- ==========================================

-- Phase 1: New enum types
CREATE TYPE public.location_level AS ENUM ('building', 'wing', 'floor', 'zone', 'room');
CREATE TYPE public.space_type AS ENUM ('office', 'meeting_room', 'restroom', 'kitchenette', 'lobby', 'other');
CREATE TYPE public.shift_type AS ENUM ('morning', 'evening');
CREATE TYPE public.assignment_status AS ENUM ('planned', 'active', 'completed', 'cancelled');
CREATE TYPE public.task_status AS ENUM ('queued', 'ready', 'in_progress', 'blocked', 'completed', 'failed');
CREATE TYPE public.event_type AS ENUM ('nfc_scan', 'task_start', 'task_finish', 'photo_upload', 'inventory_shortage', 'break_fix_created', 'break_fix_assigned', 'sla_alert');
CREATE TYPE public.ticket_priority AS ENUM ('urgent', 'high', 'normal');
CREATE TYPE public.ticket_status AS ENUM ('open', 'assigned', 'in_progress', 'resolved', 'closed');
CREATE TYPE public.task_priority AS ENUM ('normal', 'high');

-- Phase 2: Alter sites table
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Jerusalem',
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Phase 3: Alter profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id),
  ADD COLUMN IF NOT EXISTS default_work_days jsonb DEFAULT '[0,1,2,3,4]',
  ADD COLUMN IF NOT EXISTS default_shift_start time DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS default_shift_end time DEFAULT '15:00',
  ADD COLUMN IF NOT EXISTS default_break_minutes integer DEFAULT 30;

-- Phase 4: campus_locations (self-referencing hierarchy)
CREATE TABLE public.campus_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  parent_location_id uuid REFERENCES public.campus_locations(id) ON DELETE CASCADE,
  level_type public.location_level NOT NULL,
  name text NOT NULL,
  space_type public.space_type DEFAULT 'other',
  nfc_tag_uid text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campus_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read campus_locations" ON public.campus_locations FOR SELECT USING (true);
CREATE POLICY "Managers manage campus_locations" ON public.campus_locations FOR ALL USING (is_manager());

-- Migrate buildings
INSERT INTO public.campus_locations (id, site_id, level_type, name)
SELECT id, site_id, 'building'::location_level, name FROM public.buildings;

-- Migrate floors under buildings
INSERT INTO public.campus_locations (id, site_id, parent_location_id, level_type, name)
SELECT f.id, b.site_id, f.building_id, 'floor'::location_level, f.name
FROM public.floors f JOIN public.buildings b ON b.id = f.building_id;

-- Migrate zones under floors
INSERT INTO public.campus_locations (id, site_id, parent_location_id, level_type, name)
SELECT z.id, z.site_id, COALESCE(z.floor_id, z.building_id), 'zone'::location_level, z.name
FROM public.zones z;

-- Phase 5: Drop old tables (no data in task_assignments, locations, etc.)
DROP TABLE IF EXISTS public.corrective_actions CASCADE;
DROP TABLE IF EXISTS public.quality_audits CASCADE;
DROP TABLE IF EXISTS public.supply_alerts CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.event_triggers CASCADE;
DROP TABLE IF EXISTS public.event_routing_rules CASCADE;
DROP TABLE IF EXISTS public.task_set_items CASCADE;
DROP TABLE IF EXISTS public.task_set_templates CASCADE;
DROP TABLE IF EXISTS public.cleaning_protocols CASCADE;
DROP TABLE IF EXISTS public.audit_checklist_categories CASCADE;
DROP TABLE IF EXISTS public.task_assignments CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.zones CASCADE;
DROP TABLE IF EXISTS public.floors CASCADE;
DROP TABLE IF EXISTS public.buildings CASCADE;
DROP TABLE IF EXISTS public.daily_worker_scores CASCADE;
DROP TABLE IF EXISTS public.monthly_incentive_summaries CASCADE;
DROP TABLE IF EXISTS public.incentive_config CASCADE;

-- Phase 6: Restructure task_templates
ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id),
  ADD COLUMN IF NOT EXISTS shift_type public.shift_type DEFAULT 'morning',
  ADD COLUMN IF NOT EXISTS sop_text text,
  ADD COLUMN IF NOT EXISTS standard_source text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE public.task_templates
  DROP COLUMN IF EXISTS task_type,
  DROP COLUMN IF EXISTS estimated_minutes,
  DROP COLUMN IF EXISTS shift,
  DROP COLUMN IF EXISTS sla_minutes,
  DROP COLUMN IF EXISTS sla_warning_minutes,
  DROP COLUMN IF EXISTS location_id;

-- Phase 7: template_tasks
CREATE TABLE public.template_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.campus_locations(id),
  task_name text NOT NULL,
  checklist_json jsonb DEFAULT '[]',
  standard_minutes integer NOT NULL DEFAULT 30,
  recurrence_rule jsonb DEFAULT '{"days":[0,1,2,3,4],"start":"07:00","end":"10:00"}',
  priority public.task_priority NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.template_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read template_tasks" ON public.template_tasks FOR SELECT USING (true);
CREATE POLICY "Managers manage template_tasks" ON public.template_tasks FOR ALL USING (is_manager());

-- Phase 8: assignments
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id),
  date date NOT NULL DEFAULT CURRENT_DATE,
  shift_type public.shift_type NOT NULL DEFAULT 'morning',
  staff_user_id uuid NOT NULL REFERENCES public.profiles(id),
  template_id uuid NOT NULL REFERENCES public.task_templates(id),
  status public.assignment_status NOT NULL DEFAULT 'planned',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read own assignments" ON public.assignments FOR SELECT USING (staff_user_id = auth.uid() OR is_manager() OR is_supervisor());
CREATE POLICY "Managers create assignments" ON public.assignments FOR INSERT WITH CHECK (is_manager());
CREATE POLICY "Managers update assignments" ON public.assignments FOR UPDATE USING (is_manager() OR is_supervisor());
CREATE POLICY "Managers delete assignments" ON public.assignments FOR DELETE USING (is_manager());

-- Phase 9: assigned_tasks
CREATE TABLE public.assigned_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.campus_locations(id),
  task_name text NOT NULL,
  checklist_json jsonb DEFAULT '[]',
  standard_minutes integer NOT NULL DEFAULT 30,
  window_start timestamptz,
  window_end timestamptz,
  priority public.task_priority NOT NULL DEFAULT 'normal',
  status public.task_status NOT NULL DEFAULT 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  start_tag_uid text,
  finish_tag_uid text,
  actual_minutes integer,
  variance_percent numeric,
  sequence_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assigned_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read own assigned_tasks" ON public.assigned_tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND (a.staff_user_id = auth.uid() OR is_manager() OR is_supervisor()))
);
CREATE POLICY "Managers create assigned_tasks" ON public.assigned_tasks FOR INSERT WITH CHECK (is_manager() OR is_supervisor());
CREATE POLICY "Staff update own assigned_tasks" ON public.assigned_tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND (a.staff_user_id = auth.uid() OR is_manager() OR is_supervisor()))
);
CREATE POLICY "Managers delete assigned_tasks" ON public.assigned_tasks FOR DELETE USING (is_manager());

-- Phase 10: events_log
CREATE TABLE public.events_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES public.sites(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  assignment_id uuid REFERENCES public.assignments(id),
  assigned_task_id uuid REFERENCES public.assigned_tasks(id),
  event_type public.event_type NOT NULL,
  event_payload jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own events" ON public.events_log FOR SELECT USING (user_id = auth.uid() OR is_manager() OR is_supervisor());
CREATE POLICY "Authenticated insert events" ON public.events_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Phase 11: break_fix_tickets
CREATE TABLE public.break_fix_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id),
  location_id uuid NOT NULL REFERENCES public.campus_locations(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  description text NOT NULL,
  photo_url text,
  priority public.ticket_priority NOT NULL DEFAULT 'normal',
  status public.ticket_status NOT NULL DEFAULT 'open',
  assigned_to_user_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.break_fix_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read assigned tickets" ON public.break_fix_tickets FOR SELECT USING (created_by = auth.uid() OR assigned_to_user_id = auth.uid() OR is_manager() OR is_supervisor());
CREATE POLICY "Authenticated create tickets" ON public.break_fix_tickets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Managers/supervisors update tickets" ON public.break_fix_tickets FOR UPDATE USING (is_manager() OR is_supervisor() OR assigned_to_user_id = auth.uid());
CREATE POLICY "Managers delete tickets" ON public.break_fix_tickets FOR DELETE USING (is_manager());

-- Phase 12: audit_inspections
CREATE TABLE public.audit_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id),
  assigned_task_id uuid NOT NULL REFERENCES public.assigned_tasks(id),
  inspector_user_id uuid NOT NULL REFERENCES public.profiles(id),
  scores_json jsonb NOT NULL DEFAULT '{}',
  total_score numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers/supervisors read inspections" ON public.audit_inspections FOR SELECT USING (is_manager() OR is_supervisor());
CREATE POLICY "Supervisors create inspections" ON public.audit_inspections FOR INSERT WITH CHECK (is_supervisor() OR is_manager());
CREATE POLICY "Managers update inspections" ON public.audit_inspections FOR UPDATE USING (is_manager() OR inspector_user_id = auth.uid());
CREATE POLICY "Managers delete inspections" ON public.audit_inspections FOR DELETE USING (is_manager());

-- Phase 13: Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.assigned_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.break_fix_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events_log;

-- Phase 14: Trigger for updated_at
CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Phase 15: Indexes for performance
CREATE INDEX idx_campus_locations_site ON public.campus_locations(site_id);
CREATE INDEX idx_campus_locations_parent ON public.campus_locations(parent_location_id);
CREATE INDEX idx_campus_locations_nfc ON public.campus_locations(nfc_tag_uid);
CREATE INDEX idx_assignments_date_staff ON public.assignments(date, staff_user_id);
CREATE INDEX idx_assignments_site_date ON public.assignments(site_id, date);
CREATE INDEX idx_assigned_tasks_assignment ON public.assigned_tasks(assignment_id);
CREATE INDEX idx_assigned_tasks_status ON public.assigned_tasks(status);
CREATE INDEX idx_events_log_task ON public.events_log(assigned_task_id);
CREATE INDEX idx_break_fix_tickets_status ON public.break_fix_tickets(status);
CREATE INDEX idx_template_tasks_template ON public.template_tasks(template_id);
