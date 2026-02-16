
-- Allow anonymous inserts for supply_alerts during demo/mock phase
DROP POLICY IF EXISTS "Staff create supply alerts" ON public.supply_alerts;
CREATE POLICY "Anyone can create supply alerts"
  ON public.supply_alerts FOR INSERT
  WITH CHECK (true);

-- Allow anonymous reads for supply_alerts during demo/mock phase  
DROP POLICY IF EXISTS "Staff read own alerts" ON public.supply_alerts;
CREATE POLICY "Anyone can read supply alerts"
  ON public.supply_alerts FOR SELECT
  USING (true);

-- Allow anonymous deletes for supply_alerts during demo/mock phase
DROP POLICY IF EXISTS "Managers delete alerts" ON public.supply_alerts;
CREATE POLICY "Anyone can delete supply alerts"
  ON public.supply_alerts FOR DELETE
  USING (true);
