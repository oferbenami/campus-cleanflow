
-- 1. Add floors table (Site→Building→Floor→Zone→Room)
CREATE TABLE public.floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  floor_number INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read floors" ON public.floors FOR SELECT USING (true);
CREATE POLICY "Managers manage floors" ON public.floors FOR ALL USING (is_manager());

-- 2. Enrich zones: add floor_id, area, traffic
ALTER TABLE public.zones
  ADD COLUMN floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL,
  ADD COLUMN area_sqm NUMERIC,
  ADD COLUMN traffic_level TEXT NOT NULL DEFAULT 'medium' CHECK (traffic_level IN ('low','medium','high','very_high'));

-- 3. Enrich locations (rooms): area, logistics fields
ALTER TABLE public.locations
  ADD COLUMN area_sqm NUMERIC,
  ADD COLUMN traffic_level TEXT NOT NULL DEFAULT 'medium' CHECK (traffic_level IN ('low','medium','high','very_high')),
  ADD COLUMN space_category TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN floor_type TEXT NOT NULL DEFAULT 'tile' CHECK (floor_type IN ('tile','carpet','wood','concrete','vinyl','mixed')),
  ADD COLUMN has_glass BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN has_active_kitchen BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL;

-- 4. Cleaning protocols per space category
CREATE TABLE public.cleaning_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_category TEXT NOT NULL,
  name TEXT NOT NULL,
  name_he TEXT NOT NULL,
  frequency_per_day INTEGER NOT NULL DEFAULT 1,
  sla_minutes INTEGER NOT NULL DEFAULT 30,
  sla_warning_minutes INTEGER NOT NULL DEFAULT 25,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_materials JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(space_category)
);
ALTER TABLE public.cleaning_protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read protocols" ON public.cleaning_protocols FOR SELECT USING (true);
CREATE POLICY "Managers manage protocols" ON public.cleaning_protocols FOR ALL USING (is_manager());

-- Trigger for updated_at
CREATE TRIGGER update_cleaning_protocols_updated_at
  BEFORE UPDATE ON public.cleaning_protocols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. Seed default protocols
INSERT INTO public.cleaning_protocols (space_category, name, name_he, frequency_per_day, sla_minutes, sla_warning_minutes, checklist, required_materials, required_equipment) VALUES
  ('office', 'Office Protocol', 'פרוטוקול משרד', 1, 30, 25,
   '["vacuum","dust_surfaces","empty_bins","wipe_desks"]'::jsonb,
   '["all_purpose_cleaner","trash_bags","microfiber_cloth"]'::jsonb,
   '["vacuum_cleaner","mop_bucket"]'::jsonb),
  ('restroom', 'Restroom Protocol', 'פרוטוקול שירותים', 3, 20, 15,
   '["sanitize_toilets","clean_sinks","refill_soap","refill_paper","mop_floor","check_drains"]'::jsonb,
   '["disinfectant","soap_refill","paper_towels","toilet_paper","air_freshener"]'::jsonb,
   '["mop_bucket","scrub_brush","gloves"]'::jsonb),
  ('lobby', 'Lobby Protocol', 'פרוטוקול לובי', 2, 25, 20,
   '["sweep_floor","mop_floor","clean_glass","dust_furniture","empty_bins"]'::jsonb,
   '["glass_cleaner","all_purpose_cleaner","trash_bags"]'::jsonb,
   '["mop_bucket","glass_squeegee"]'::jsonb),
  ('laboratory', 'Lab Protocol', 'פרוטוקול מעבדה', 1, 45, 35,
   '["sterilize_surfaces","clean_equipment","mop_floor","check_hazmat","empty_bins"]'::jsonb,
   '["sterilizer","disinfectant","hazmat_bags","microfiber_cloth"]'::jsonb,
   '["mop_bucket","protective_gear","sterilization_kit"]'::jsonb),
  ('kitchen', 'Kitchen Protocol', 'פרוטוקול מטבח', 3, 40, 30,
   '["degrease_surfaces","clean_appliances","sanitize_counters","mop_floor","empty_grease_trap"]'::jsonb,
   '["degreaser","sanitizer","trash_bags","steel_wool"]'::jsonb,
   '["mop_bucket","scrub_brush","protective_gloves"]'::jsonb),
  ('meeting_room', 'Meeting Room Protocol', 'פרוטוקול חדר ישיבות', 2, 15, 12,
   '["wipe_table","clean_whiteboard","vacuum","empty_bins"]'::jsonb,
   '["whiteboard_cleaner","all_purpose_cleaner","trash_bags"]'::jsonb,
   '["vacuum_cleaner"]'::jsonb),
  ('server_room', 'Server Room Protocol', 'פרוטוקול חדר שרתים', 1, 25, 20,
   '["dust_equipment","check_filters","sweep_floor","check_temp"]'::jsonb,
   '["antistatic_cloth","compressed_air"]'::jsonb,
   '["antistatic_tools"]'::jsonb),
  ('general', 'General Protocol', 'פרוטוקול כללי', 1, 30, 25,
   '["sweep","mop","dust","empty_bins"]'::jsonb,
   '["all_purpose_cleaner","trash_bags"]'::jsonb,
   '["mop_bucket","broom"]'::jsonb);

-- 6. Link locations to protocols
ALTER TABLE public.locations
  ADD COLUMN protocol_id UUID REFERENCES public.cleaning_protocols(id) ON DELETE SET NULL;

-- 7. Indexes
CREATE INDEX idx_floors_building ON public.floors(building_id);
CREATE INDEX idx_zones_floor ON public.zones(floor_id);
CREATE INDEX idx_locations_floor ON public.locations(floor_id);
CREATE INDEX idx_locations_protocol ON public.locations(protocol_id);
CREATE INDEX idx_locations_space_category ON public.locations(space_category);
