
-- Work Packages table (template-level grouping from Excel)
CREATE TABLE public.work_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.sites(id),
  package_code TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  shift_type TEXT NOT NULL DEFAULT 'morning',
  building TEXT,
  floor TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(site_id, package_code)
);

ALTER TABLE public.work_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read work_packages" ON public.work_packages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers manage work_packages" ON public.work_packages
  FOR ALL TO authenticated USING (is_manager());

-- Work Package Tasks table
CREATE TABLE public.work_package_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_package_id UUID NOT NULL REFERENCES public.work_packages(id) ON DELETE CASCADE,
  location_ref TEXT,
  space_type TEXT,
  description TEXT,
  cleaning_type TEXT,
  area_sqm NUMERIC,
  tools_qty NUMERIC,
  area_minutes_coeff NUMERIC,
  tools_minutes_coeff NUMERIC,
  standard_minutes NUMERIC NOT NULL DEFAULT 0,
  rounds_per_shift INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.work_package_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read work_package_tasks" ON public.work_package_tasks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers manage work_package_tasks" ON public.work_package_tasks
  FOR ALL TO authenticated USING (is_manager());

-- Update trigger for timestamps
CREATE TRIGGER update_work_packages_updated_at
  BEFORE UPDATE ON public.work_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_work_package_tasks_updated_at
  BEFORE UPDATE ON public.work_package_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_packages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.work_package_tasks;
