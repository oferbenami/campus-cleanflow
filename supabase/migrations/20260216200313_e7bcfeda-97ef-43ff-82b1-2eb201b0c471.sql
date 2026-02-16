
-- Table to store supply shortage reports from workers
CREATE TABLE public.supply_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL,
  assignment_id TEXT NOT NULL,
  item TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supply_alerts ENABLE ROW LEVEL SECURITY;

-- Staff can create alerts
CREATE POLICY "Staff create supply alerts"
  ON public.supply_alerts
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Staff can read own alerts
CREATE POLICY "Staff read own alerts"
  ON public.supply_alerts
  FOR SELECT
  USING (staff_id = auth.uid() OR is_manager() OR is_supervisor());

-- Managers can read all and delete
CREATE POLICY "Managers delete alerts"
  ON public.supply_alerts
  FOR DELETE
  USING (is_manager());
