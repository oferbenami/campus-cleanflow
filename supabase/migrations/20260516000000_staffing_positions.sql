-- ============================================================
-- MIGRATION: Staffing Positions (תקנות), Permanent Assignments & Shift Check-In/Out
-- ============================================================

-- ============================================================
-- Table: staffing_positions
-- A named staffing slot (תקן) per site + shift type.
-- Bundles a set of work packages into a reusable position definition.
-- ============================================================

CREATE TABLE public.staffing_positions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id    uuid        NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  shift_type text        NOT NULL CHECK (shift_type IN ('morning','evening')),
  active     boolean     NOT NULL DEFAULT true,
  created_by uuid        REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id, name, shift_type)
);

ALTER TABLE public.staffing_positions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_staffing_positions_updated_at
  BEFORE UPDATE ON public.staffing_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Authenticated read staffing_positions"
  ON public.staffing_positions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers manage staffing_positions"
  ON public.staffing_positions FOR ALL TO authenticated USING (public.is_manager());

-- ============================================================
-- Table: staffing_position_packages
-- Many-to-many: a position bundles one or more work packages.
-- ============================================================

CREATE TABLE public.staffing_position_packages (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  staffing_position_id uuid        NOT NULL REFERENCES public.staffing_positions(id) ON DELETE CASCADE,
  work_package_id      uuid        NOT NULL REFERENCES public.work_packages(id) ON DELETE CASCADE,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE(staffing_position_id, work_package_id)
);

ALTER TABLE public.staffing_position_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read staffing_position_packages"
  ON public.staffing_position_packages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers manage staffing_position_packages"
  ON public.staffing_position_packages FOR ALL TO authenticated USING (public.is_manager());

CREATE INDEX idx_spp_position ON public.staffing_position_packages(staffing_position_id);
CREATE INDEX idx_spp_package  ON public.staffing_position_packages(work_package_id);

-- ============================================================
-- Table: staffing_position_assignments
-- Links a specific worker to a position (permanent or date-ranged).
-- applicable_day_types controls which day types trigger auto-generation:
--   'regular'    = Sunday–Thursday
--   'friday_eve' = Fridays and holiday eves (ערבי חג)
--   'holiday'    = Saturdays and Jewish holidays
-- ============================================================

CREATE TABLE public.staffing_position_assignments (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  staffing_position_id  uuid        NOT NULL REFERENCES public.staffing_positions(id) ON DELETE CASCADE,
  staff_user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_permanent          boolean     NOT NULL DEFAULT true,
  effective_from        date        NOT NULL DEFAULT CURRENT_DATE,
  effective_until       date,
  applicable_day_types  text[]      NOT NULL DEFAULT ARRAY['regular','friday_eve'],
  created_by            uuid        REFERENCES public.profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staffing_position_assignments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_staffing_position_assignments_updated_at
  BEFORE UPDATE ON public.staffing_position_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Staff read own position assignments"
  ON public.staffing_position_assignments FOR SELECT TO authenticated
  USING (staff_user_id = auth.uid() OR public.is_manager() OR public.is_supervisor());

CREATE POLICY "Managers manage staffing_position_assignments"
  ON public.staffing_position_assignments FOR ALL TO authenticated USING (public.is_manager());

CREATE INDEX idx_spa_position ON public.staffing_position_assignments(staffing_position_id);
CREATE INDEX idx_spa_staff    ON public.staffing_position_assignments(staff_user_id);

-- ============================================================
-- Table: special_calendar_days
-- Manager-maintained list of holiday eves and holidays.
-- Global (not per-site) — Israeli holidays apply to all sites.
-- day_type: 'holiday_eve' (ערב חג) | 'holiday' (שבת/חג)
-- ============================================================

CREATE TABLE public.special_calendar_days (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date        NOT NULL UNIQUE,
  day_type    text        NOT NULL CHECK (day_type IN ('holiday_eve','holiday')),
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.special_calendar_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read special_calendar_days"
  ON public.special_calendar_days FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers manage special_calendar_days"
  ON public.special_calendar_days FOR ALL TO authenticated USING (public.is_manager());

-- ============================================================
-- Alter: assignments
-- Add shift check-in / check-out timestamps and position back-link.
-- ============================================================

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS shift_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS shift_ended_at   timestamptz,
  ADD COLUMN IF NOT EXISTS position_id      uuid REFERENCES public.staffing_positions(id) ON DELETE SET NULL;

CREATE INDEX idx_assignments_position ON public.assignments(position_id) WHERE position_id IS NOT NULL;

-- ============================================================
-- Realtime
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.staffing_positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staffing_position_assignments;
