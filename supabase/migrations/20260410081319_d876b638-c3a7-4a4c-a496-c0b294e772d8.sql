
CREATE TABLE public.site_readiness_checklists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.sites(id),
  date date NOT NULL DEFAULT CURRENT_DATE,
  shift_type text NOT NULL DEFAULT 'morning',
  submitted_by uuid NOT NULL REFERENCES public.profiles(id),
  checklist_items_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  cleaning_actions_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  special_areas_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  workforce_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_workers integer NOT NULL DEFAULT 0,
  total_actual_hours numeric NOT NULL DEFAULT 0,
  deviation_from_plan numeric NOT NULL DEFAULT 0,
  handover_notes text NOT NULL DEFAULT '',
  overall_status text NOT NULL DEFAULT 'submitted',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(site_id, date, shift_type)
);

ALTER TABLE public.site_readiness_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers/supervisors read checklists"
  ON public.site_readiness_checklists FOR SELECT
  USING (is_manager() OR is_supervisor());

CREATE POLICY "Managers/supervisors create checklists"
  ON public.site_readiness_checklists FOR INSERT
  WITH CHECK (is_manager() OR is_supervisor());

CREATE POLICY "Managers/supervisors update checklists"
  ON public.site_readiness_checklists FOR UPDATE
  USING (is_manager() OR is_supervisor());

CREATE POLICY "Managers delete checklists"
  ON public.site_readiness_checklists FOR DELETE
  USING (is_manager());

CREATE TRIGGER update_site_readiness_checklists_updated_at
  BEFORE UPDATE ON public.site_readiness_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
