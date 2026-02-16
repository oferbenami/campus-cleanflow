
-- Allow anonymous inserts/reads for activity_logs during demo/mock phase
DROP POLICY IF EXISTS "Managers can view activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;

CREATE POLICY "Anyone can read activity logs"
  ON public.activity_logs FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);
