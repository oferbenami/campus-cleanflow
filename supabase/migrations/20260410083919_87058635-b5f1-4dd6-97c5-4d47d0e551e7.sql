
-- Create checklist followup tasks table
CREATE TABLE public.checklist_followup_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES public.site_readiness_checklists(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,
  area_label TEXT NOT NULL,
  gap_description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  source_section TEXT NOT NULL DEFAULT 'checklist_items',
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES public.profiles(id),
  due_date DATE NOT NULL,
  due_shift_type TEXT NOT NULL DEFAULT 'morning',
  completed_at TIMESTAMP WITH TIME ZONE,
  deferred_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checklist_followup_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Managers/supervisors read followup tasks"
  ON public.checklist_followup_tasks FOR SELECT
  USING (is_manager() OR is_supervisor());

CREATE POLICY "Managers/supervisors create followup tasks"
  ON public.checklist_followup_tasks FOR INSERT
  WITH CHECK (is_manager() OR is_supervisor());

CREATE POLICY "Managers/supervisors update followup tasks"
  ON public.checklist_followup_tasks FOR UPDATE
  USING (is_manager() OR is_supervisor());

CREATE POLICY "Managers delete followup tasks"
  ON public.checklist_followup_tasks FOR DELETE
  USING (is_manager());

-- Indexes
CREATE INDEX idx_followup_tasks_due ON public.checklist_followup_tasks(due_date, due_shift_type, status);
CREATE INDEX idx_followup_tasks_checklist ON public.checklist_followup_tasks(checklist_id);

-- Trigger for updated_at
CREATE TRIGGER update_followup_tasks_updated_at
  BEFORE UPDATE ON public.checklist_followup_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
