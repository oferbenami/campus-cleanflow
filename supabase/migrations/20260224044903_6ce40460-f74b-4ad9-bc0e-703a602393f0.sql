
-- 1) New enum for template type
CREATE TYPE public.template_type AS ENUM ('base', 'addon');

-- 2) Extend task_templates with template_type, description, created_by
ALTER TABLE public.task_templates
  ADD COLUMN template_type public.template_type NOT NULL DEFAULT 'base',
  ADD COLUMN description text,
  ADD COLUMN created_by uuid REFERENCES public.profiles(id);

-- 3) Extend template_tasks with explicit recurrence columns and is_optional
ALTER TABLE public.template_tasks
  ADD COLUMN days_of_week integer[] NOT NULL DEFAULT '{0,1,2,3,4}',
  ADD COLUMN window_start time,
  ADD COLUMN window_end time,
  ADD COLUMN is_optional boolean NOT NULL DEFAULT false;

-- Backfill days_of_week from existing recurrence_rule jsonb
UPDATE public.template_tasks
SET days_of_week = COALESCE(
  (SELECT array_agg(d::int) FROM jsonb_array_elements_text(recurrence_rule->'days') AS d),
  '{0,1,2,3,4}'
),
window_start = (recurrence_rule->>'start')::time,
window_end = (recurrence_rule->>'end')::time
WHERE recurrence_rule IS NOT NULL;

-- 4) addon_rules table
CREATE TABLE public.addon_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_template_id uuid NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  trigger_type text NOT NULL CHECK (trigger_type IN ('manual', 'date_range', 'weekday', 'event_flag', 'high_traffic')),
  trigger_payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.addon_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read addon_rules" ON public.addon_rules FOR SELECT USING (true);
CREATE POLICY "Managers manage addon_rules" ON public.addon_rules FOR ALL USING (is_manager());

-- 5) assignment_addons table
CREATE TABLE public.assignment_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  addon_template_id uuid NOT NULL REFERENCES public.task_templates(id),
  apply_mode text NOT NULL DEFAULT 'merge' CHECK (apply_mode IN ('merge', 'override')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, addon_template_id)
);

ALTER TABLE public.assignment_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read own assignment_addons" ON public.assignment_addons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM assignments a WHERE a.id = assignment_addons.assignment_id
    AND (a.staff_user_id = auth.uid() OR is_manager() OR is_supervisor())
  ));
CREATE POLICY "Managers create assignment_addons" ON public.assignment_addons FOR INSERT
  WITH CHECK (is_manager());
CREATE POLICY "Managers update assignment_addons" ON public.assignment_addons FOR UPDATE
  USING (is_manager());
CREATE POLICY "Managers delete assignment_addons" ON public.assignment_addons FOR DELETE
  USING (is_manager());

-- 6) Extend assigned_tasks with source tracking and deferral
ALTER TABLE public.assigned_tasks
  ADD COLUMN source_template_id uuid REFERENCES public.task_templates(id),
  ADD COLUMN source_type text DEFAULT 'base' CHECK (source_type IN ('base', 'addon')),
  ADD COLUMN queue_order integer DEFAULT 0,
  ADD COLUMN is_deferred boolean NOT NULL DEFAULT false,
  ADD COLUMN defer_reason text;

-- Indexes
CREATE INDEX idx_addon_rules_template ON public.addon_rules(addon_template_id);
CREATE INDEX idx_assignment_addons_assignment ON public.assignment_addons(assignment_id);
CREATE INDEX idx_assigned_tasks_source ON public.assigned_tasks(source_template_id);
CREATE INDEX idx_template_tasks_days ON public.template_tasks USING GIN(days_of_week);
