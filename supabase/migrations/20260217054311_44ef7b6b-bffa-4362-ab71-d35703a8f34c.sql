
-- ========================
-- Incentive Config (global settings)
-- ========================
CREATE TABLE public.incentive_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id uuid REFERENCES public.sites(id),
  productivity_weight integer NOT NULL DEFAULT 50,
  quality_weight integer NOT NULL DEFAULT 30,
  discipline_weight integer NOT NULL DEFAULT 20,
  points_on_standard integer NOT NULL DEFAULT 50,
  points_tier1 integer NOT NULL DEFAULT 40,
  points_tier2 integer NOT NULL DEFAULT 25,
  points_tier3 integer NOT NULL DEFAULT 0,
  variance_on_standard numeric NOT NULL DEFAULT 100,
  variance_tier1 numeric NOT NULL DEFAULT 110,
  variance_tier2 numeric NOT NULL DEFAULT 120,
  quality_band_high integer NOT NULL DEFAULT 30,
  quality_band_mid integer NOT NULL DEFAULT 20,
  quality_band_low integer NOT NULL DEFAULT 10,
  quality_band_fail integer NOT NULL DEFAULT 0,
  discipline_full integer NOT NULL DEFAULT 20,
  late_threshold_minutes integer NOT NULL DEFAULT 10,
  no_audit_policy text NOT NULL DEFAULT 'rolling_average',
  base_bonus_amount numeric NOT NULL DEFAULT 500,
  tier_full_threshold integer NOT NULL DEFAULT 85,
  tier_80_threshold integer NOT NULL DEFAULT 75,
  tier_50_threshold integer NOT NULL DEFAULT 65,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incentive_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read incentive config"
  ON public.incentive_config FOR SELECT
  USING (true);

CREATE POLICY "Managers manage incentive config"
  ON public.incentive_config FOR ALL
  USING (is_manager());

CREATE TRIGGER update_incentive_config_updated_at
  BEFORE UPDATE ON public.incentive_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ========================
-- Daily Worker Scores
-- ========================
CREATE TABLE public.daily_worker_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id uuid NOT NULL REFERENCES public.profiles(id),
  score_date date NOT NULL DEFAULT CURRENT_DATE,
  productivity_points integer NOT NULL DEFAULT 0,
  quality_points integer NOT NULL DEFAULT 0,
  discipline_points integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  planned_minutes_total integer NOT NULL DEFAULT 0,
  actual_minutes_total integer NOT NULL DEFAULT 0,
  variance_percent numeric NOT NULL DEFAULT 0,
  audit_avg_score_used numeric,
  discipline_flags jsonb NOT NULL DEFAULT '{"late_start": false, "cancel": false, "reopen": false}'::jsonb,
  explanation_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(worker_id, score_date)
);

ALTER TABLE public.daily_worker_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read own scores"
  ON public.daily_worker_scores FOR SELECT
  USING (worker_id = auth.uid() OR is_manager() OR is_supervisor());

CREATE POLICY "System insert scores"
  ON public.daily_worker_scores FOR INSERT
  WITH CHECK (is_manager() OR is_supervisor());

CREATE POLICY "System update scores"
  ON public.daily_worker_scores FOR UPDATE
  USING (is_manager() OR is_supervisor());

CREATE POLICY "Managers delete scores"
  ON public.daily_worker_scores FOR DELETE
  USING (is_manager());

-- ========================
-- Monthly Incentive Summary
-- ========================
CREATE TABLE public.monthly_incentive_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id uuid NOT NULL REFERENCES public.profiles(id),
  month text NOT NULL,
  workdays_count integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  avg_daily_points numeric NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'NONE',
  payout_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(worker_id, month)
);

ALTER TABLE public.monthly_incentive_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read own summaries"
  ON public.monthly_incentive_summaries FOR SELECT
  USING (worker_id = auth.uid() OR is_manager() OR is_supervisor());

CREATE POLICY "Managers manage summaries"
  ON public.monthly_incentive_summaries FOR ALL
  USING (is_manager());

CREATE TRIGGER update_monthly_summaries_updated_at
  BEFORE UPDATE ON public.monthly_incentive_summaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
