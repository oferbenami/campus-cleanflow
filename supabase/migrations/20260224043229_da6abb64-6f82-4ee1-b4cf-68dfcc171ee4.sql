
CREATE TABLE public.supply_shortage_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id),
  reported_by uuid NOT NULL REFERENCES public.profiles(id),
  item_key text NOT NULL,
  item_label text NOT NULL,
  category text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  location text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'forwarded', 'resolved')),
  acknowledged_by uuid REFERENCES public.profiles(id),
  acknowledged_at timestamptz,
  forwarded_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supply_shortage_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read own reports" ON public.supply_shortage_reports
  FOR SELECT USING (reported_by = auth.uid() OR is_manager() OR is_supervisor());

CREATE POLICY "Authenticated create reports" ON public.supply_shortage_reports
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Managers/supervisors update reports" ON public.supply_shortage_reports
  FOR UPDATE USING (is_manager() OR is_supervisor());

CREATE POLICY "Managers delete reports" ON public.supply_shortage_reports
  FOR DELETE USING (is_manager());

CREATE INDEX idx_supply_shortage_site ON public.supply_shortage_reports(site_id);
CREATE INDEX idx_supply_shortage_status ON public.supply_shortage_reports(status);
CREATE INDEX idx_supply_shortage_reported_by ON public.supply_shortage_reports(reported_by);
