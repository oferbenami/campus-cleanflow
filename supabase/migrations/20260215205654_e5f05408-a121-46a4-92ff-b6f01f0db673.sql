
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('campus_manager', 'property_manager', 'supervisor', 'cleaning_staff');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role app_role NOT NULL DEFAULT 'cleaning_staff',
  avatar_initials TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (per security instructions)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Sites
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Zones (Wings)
CREATE TABLE public.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  wing TEXT,
  floor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- Locations (Rooms)
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room_type TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Task Templates
CREATE TABLE public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'maintenance' CHECK (task_type IN ('maintenance', 'deep_clean')),
  shift TEXT NOT NULL DEFAULT 'morning' CHECK (shift IN ('morning', 'evening')),
  estimated_minutes INTEGER NOT NULL DEFAULT 30,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- Task Assignments
CREATE TABLE public.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_template_id UUID NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  elapsed_minutes INTEGER DEFAULT 0,
  is_break_fix BOOLEAN DEFAULT false,
  issues JSONB DEFAULT '[]',
  stock_low JSONB DEFAULT '[]',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- Quality Audits
CREATE TABLE public.quality_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_assignment_id UUID NOT NULL REFERENCES public.task_assignments(id) ON DELETE CASCADE,
  auditor_id UUID NOT NULL REFERENCES public.profiles(id),
  rating_cleanliness INTEGER NOT NULL CHECK (rating_cleanliness BETWEEN 1 AND 5),
  rating_thoroughness INTEGER NOT NULL CHECK (rating_thoroughness BETWEEN 1 AND 5),
  rating_timeliness INTEGER NOT NULL CHECK (rating_timeliness BETWEEN 1 AND 5),
  rating_supplies INTEGER NOT NULL CHECK (rating_supplies BETWEEN 1 AND 5),
  rating_safety INTEGER NOT NULL CHECK (rating_safety BETWEEN 1 AND 5),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quality_audits ENABLE ROW LEVEL SECURITY;

-- Helper function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: is_manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('campus_manager', 'property_manager')
  )
$$;

-- Helper: is_supervisor
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'supervisor'
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 1) || 
          LEFT(SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), ' ', 2), 1))
  );
  -- Default role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cleaning_staff');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.task_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- Profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_manager() OR public.is_supervisor());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- User roles
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_manager());
CREATE POLICY "Managers manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_manager());

-- Sites
CREATE POLICY "Authenticated read sites" ON public.sites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage sites" ON public.sites FOR ALL TO authenticated USING (public.is_manager());

-- Zones
CREATE POLICY "Authenticated read zones" ON public.zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage zones" ON public.zones FOR ALL TO authenticated USING (public.is_manager());

-- Locations
CREATE POLICY "Authenticated read locations" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage locations" ON public.locations FOR ALL TO authenticated USING (public.is_manager());

-- Task Templates
CREATE POLICY "Authenticated read templates" ON public.task_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage templates" ON public.task_templates FOR ALL TO authenticated USING (public.is_manager());

-- Task Assignments
CREATE POLICY "Staff read own assignments" ON public.task_assignments FOR SELECT TO authenticated 
  USING (staff_id = auth.uid() OR public.is_manager() OR public.is_supervisor());
CREATE POLICY "Managers/supervisors create assignments" ON public.task_assignments FOR INSERT TO authenticated 
  WITH CHECK (public.is_manager() OR public.is_supervisor());
CREATE POLICY "Update own or manage" ON public.task_assignments FOR UPDATE TO authenticated 
  USING (staff_id = auth.uid() OR public.is_manager() OR public.is_supervisor());
CREATE POLICY "Managers delete assignments" ON public.task_assignments FOR DELETE TO authenticated 
  USING (public.is_manager());

-- Quality Audits
CREATE POLICY "Managers/supervisors read audits" ON public.quality_audits FOR SELECT TO authenticated 
  USING (public.is_manager() OR public.is_supervisor());
CREATE POLICY "Supervisors create audits" ON public.quality_audits FOR INSERT TO authenticated 
  WITH CHECK (public.is_supervisor() OR public.is_manager());
CREATE POLICY "Managers update audits" ON public.quality_audits FOR UPDATE TO authenticated 
  USING (public.is_manager() OR auditor_id = auth.uid());
CREATE POLICY "Managers delete audits" ON public.quality_audits FOR DELETE TO authenticated 
  USING (public.is_manager());

-- Enable realtime for task_assignments
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignments;
