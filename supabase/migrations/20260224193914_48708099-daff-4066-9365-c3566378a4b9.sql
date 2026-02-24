
-- ============================================================
-- INCIDENT MANAGEMENT MODULE - Database Schema
-- ============================================================

-- 1) Incident priority enum (extends existing ticket_priority with 'low')
-- We'll use a new enum to avoid conflicts
CREATE TYPE public.incident_priority AS ENUM ('critical', 'urgent', 'high', 'normal', 'low');

-- 2) Incident category enum
CREATE TYPE public.incident_category AS ENUM ('spill', 'restroom', 'safety', 'damage', 'equipment', 'other');

-- 3) Incident status enum
CREATE TYPE public.incident_status AS ENUM (
  'pending_dispatch', 'assigned', 'in_progress', 'resolved', 'closed', 'escalated'
);

-- 4) Incident event type enum
CREATE TYPE public.incident_event_type AS ENUM (
  'created', 'assigned', 'escalated', 'reassigned', 'started', 'resolved', 'closed',
  'deferred', 'merged', 'marked_duplicate', 'comment'
);

-- ============================================================
-- INCIDENTS TABLE
-- ============================================================
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id),
  location_id UUID NOT NULL REFERENCES public.campus_locations(id),
  created_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  assigned_to_user_id UUID REFERENCES public.profiles(id),
  
  priority public.incident_priority NOT NULL DEFAULT 'normal',
  category public.incident_category NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  photo_url TEXT,
  
  status public.incident_status NOT NULL DEFAULT 'pending_dispatch',
  
  -- SLA configuration (in minutes)
  response_sla_minutes INT NOT NULL DEFAULT 15,
  resolution_sla_minutes INT NOT NULL DEFAULT 60,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Escalation
  escalation_level INT NOT NULL DEFAULT 0,
  escalated_at TIMESTAMPTZ,
  
  -- Source tracking
  source_role public.app_role NOT NULL DEFAULT 'cleaning_staff',
  
  -- Recurrence
  recurrence_flag BOOLEAN NOT NULL DEFAULT false,
  related_incident_id UUID REFERENCES public.incidents(id),
  
  -- Close reason
  close_reason TEXT
);

-- Indexes for performance
CREATE INDEX idx_incidents_site_status ON public.incidents(site_id, status);
CREATE INDEX idx_incidents_assigned_to ON public.incidents(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;
CREATE INDEX idx_incidents_created_at ON public.incidents(created_at DESC);
CREATE INDEX idx_incidents_location_category ON public.incidents(location_id, category);
CREATE INDEX idx_incidents_escalation ON public.incidents(escalation_level) WHERE escalation_level > 0;

-- ============================================================
-- INCIDENT EVENTS LOG
-- ============================================================
CREATE TABLE public.incident_events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  event_type public.incident_event_type NOT NULL,
  event_payload JSONB DEFAULT '{}'::jsonb,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_events_incident ON public.incident_events_log(incident_id, created_at DESC);

-- ============================================================
-- RLS POLICIES - INCIDENTS
-- ============================================================
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read incidents for their site
CREATE POLICY "Authenticated read incidents"
  ON public.incidents FOR SELECT
  USING (
    created_by_user_id = auth.uid()
    OR assigned_to_user_id = auth.uid()
    OR is_manager()
    OR is_supervisor()
  );

-- Any authenticated user can create incidents
CREATE POLICY "Authenticated create incidents"
  ON public.incidents FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Managers and supervisors can update incidents; assigned staff can update their own
CREATE POLICY "Update incidents"
  ON public.incidents FOR UPDATE
  USING (
    is_manager()
    OR is_supervisor()
    OR assigned_to_user_id = auth.uid()
  );

-- Only managers can delete
CREATE POLICY "Managers delete incidents"
  ON public.incidents FOR DELETE
  USING (is_manager());

-- ============================================================
-- RLS POLICIES - INCIDENT EVENTS LOG
-- ============================================================
ALTER TABLE public.incident_events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read incident events"
  ON public.incident_events_log FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_manager()
    OR is_supervisor()
  );

CREATE POLICY "Insert incident events"
  ON public.incident_events_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incident_events_log;

-- ============================================================
-- AUTO-SET SLA based on priority (trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_incident_sla()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Set SLA defaults based on priority if not explicitly provided
  IF NEW.response_sla_minutes = 15 THEN
    CASE NEW.priority
      WHEN 'critical' THEN NEW.response_sla_minutes := 5; NEW.resolution_sla_minutes := 30;
      WHEN 'urgent' THEN NEW.response_sla_minutes := 10; NEW.resolution_sla_minutes := 45;
      WHEN 'high' THEN NEW.response_sla_minutes := 15; NEW.resolution_sla_minutes := 60;
      WHEN 'normal' THEN NEW.response_sla_minutes := 30; NEW.resolution_sla_minutes := 120;
      WHEN 'low' THEN NEW.response_sla_minutes := 60; NEW.resolution_sla_minutes := 240;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_incident_sla
  BEFORE INSERT ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_incident_sla();

-- ============================================================
-- AUTO-LOG incident creation event
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_incident_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.incident_events_log (incident_id, event_type, user_id, event_payload)
  VALUES (
    NEW.id,
    'created',
    NEW.created_by_user_id,
    jsonb_build_object(
      'priority', NEW.priority::text,
      'category', NEW.category::text,
      'status', NEW.status::text,
      'description', LEFT(NEW.description, 200)
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_incident_creation
  AFTER INSERT ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.log_incident_creation();
