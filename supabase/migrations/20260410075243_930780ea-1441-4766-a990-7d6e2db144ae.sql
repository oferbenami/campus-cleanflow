
-- Create enum for executive area status
CREATE TYPE public.exec_area_status AS ENUM ('ok', 'partial', 'not_ok');

-- Create enum for cleanliness level
CREATE TYPE public.cleanliness_level AS ENUM ('high', 'medium', 'low');

-- Create the executive area checks table
CREATE TABLE public.executive_area_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  area_name TEXT NOT NULL, -- e.g. 'ceo_office', 'exec_offices', 'exec_meeting_rooms'
  area_label TEXT NOT NULL, -- Display name in Hebrew
  status public.exec_area_status NOT NULL DEFAULT 'ok',
  cleanliness_level public.cleanliness_level NOT NULL DEFAULT 'high',
  gap_description TEXT,
  requires_reclean BOOLEAN NOT NULL DEFAULT false,
  reported_to_operations BOOLEAN NOT NULL DEFAULT false,
  checked_by UUID NOT NULL REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(site_id, date, area_name)
);

-- Enable RLS
ALTER TABLE public.executive_area_checks ENABLE ROW LEVEL SECURITY;

-- Read policy: managers and supervisors
CREATE POLICY "Managers/supervisors read exec checks"
ON public.executive_area_checks
FOR SELECT
USING (is_manager() OR is_supervisor());

-- Insert policy: managers and supervisors
CREATE POLICY "Managers/supervisors create exec checks"
ON public.executive_area_checks
FOR INSERT
WITH CHECK (is_manager() OR is_supervisor());

-- Update policy: managers and supervisors
CREATE POLICY "Managers/supervisors update exec checks"
ON public.executive_area_checks
FOR UPDATE
USING (is_manager() OR is_supervisor());

-- Delete policy: managers only
CREATE POLICY "Managers delete exec checks"
ON public.executive_area_checks
FOR DELETE
USING (is_manager());

-- Trigger for updated_at
CREATE TRIGGER update_exec_area_checks_updated_at
BEFORE UPDATE ON public.executive_area_checks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.executive_area_checks;
