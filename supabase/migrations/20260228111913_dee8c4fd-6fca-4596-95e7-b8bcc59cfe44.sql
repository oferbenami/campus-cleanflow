
-- Table for staff to report planned absences
CREATE TABLE public.planned_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id),
  absence_date DATE NOT NULL,
  reason TEXT,
  reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(staff_user_id, absence_date)
);

ALTER TABLE public.planned_absences ENABLE ROW LEVEL SECURITY;

-- Staff can read their own absences, managers/supervisors can read all
CREATE POLICY "Staff read own absences"
  ON public.planned_absences FOR SELECT
  USING (staff_user_id = auth.uid() OR is_manager() OR is_supervisor());

-- Staff can insert their own absences
CREATE POLICY "Staff create own absences"
  ON public.planned_absences FOR INSERT
  WITH CHECK (staff_user_id = auth.uid());

-- Staff can delete their own future absences
CREATE POLICY "Staff delete own absences"
  ON public.planned_absences FOR DELETE
  USING (staff_user_id = auth.uid() AND absence_date > CURRENT_DATE);

-- Managers can update (acknowledge)
CREATE POLICY "Managers update absences"
  ON public.planned_absences FOR UPDATE
  USING (is_manager() OR is_supervisor());
