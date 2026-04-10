
CREATE TABLE public.shift_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id),
  date DATE NOT NULL,
  shift_type TEXT NOT NULL DEFAULT 'morning',
  shift_score NUMERIC NOT NULL DEFAULT 0,
  site_score NUMERIC NOT NULL DEFAULT 80,
  previous_site_score NUMERIC NOT NULL DEFAULT 80,
  tasks_assigned INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_missed INTEGER NOT NULL DEFAULT 0,
  extra_tasks_completed INTEGER NOT NULL DEFAULT 0,
  sla_breaches INTEGER NOT NULL DEFAULT 0,
  executive_failures INTEGER NOT NULL DEFAULT 0,
  cleaning_actions_completed BOOLEAN NOT NULL DEFAULT false,
  score_breakdown_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(site_id, date, shift_type)
);

ALTER TABLE public.shift_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers/supervisors read scores"
  ON public.shift_scores FOR SELECT
  USING (is_manager() OR is_supervisor());

CREATE POLICY "Managers/supervisors create scores"
  ON public.shift_scores FOR INSERT
  WITH CHECK (is_manager() OR is_supervisor());

CREATE POLICY "Managers/supervisors update scores"
  ON public.shift_scores FOR UPDATE
  USING (is_manager() OR is_supervisor());

CREATE POLICY "Managers delete scores"
  ON public.shift_scores FOR DELETE
  USING (is_manager());

CREATE INDEX idx_shift_scores_site_date ON public.shift_scores(site_id, date DESC);

CREATE TRIGGER update_shift_scores_updated_at
  BEFORE UPDATE ON public.shift_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
