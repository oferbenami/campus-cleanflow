
-- Table for task set templates (a named collection of tasks)
CREATE TABLE public.task_set_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  shift text NOT NULL DEFAULT 'morning',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Items within a task set template
CREATE TABLE public.task_set_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_template_id uuid NOT NULL REFERENCES public.task_set_templates(id) ON DELETE CASCADE,
  task_template_id uuid NOT NULL REFERENCES public.task_templates(id) ON DELETE CASCADE,
  sequence_order integer NOT NULL DEFAULT 0,
  planned_start text NOT NULL DEFAULT '07:00',
  planned_end text NOT NULL DEFAULT '07:30',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.task_set_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_set_items ENABLE ROW LEVEL SECURITY;

-- Policies: managers can CRUD, all authenticated can read
CREATE POLICY "Authenticated read task sets"
  ON public.task_set_templates FOR SELECT
  USING (true);

CREATE POLICY "Managers manage task sets"
  ON public.task_set_templates FOR ALL
  USING (is_manager());

CREATE POLICY "Authenticated read task set items"
  ON public.task_set_items FOR SELECT
  USING (true);

CREATE POLICY "Managers manage task set items"
  ON public.task_set_items FOR ALL
  USING (is_manager());

-- Timestamp trigger
CREATE TRIGGER update_task_set_templates_updated_at
  BEFORE UPDATE ON public.task_set_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
