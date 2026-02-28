
-- Junction table: default work packages per staff member
CREATE TABLE public.staff_default_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_package_id UUID NOT NULL REFERENCES public.work_packages(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_user_id, work_package_id)
);

ALTER TABLE public.staff_default_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view staff defaults"
  ON public.staff_default_packages FOR SELECT
  USING (public.is_manager());

CREATE POLICY "Managers can manage staff defaults"
  ON public.staff_default_packages FOR ALL
  USING (public.is_manager());
