
-- Activity log for tracking key actions (reassignment, manual override, audit submission)
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL CHECK (action_type IN ('reassignment', 'manual_override', 'audit_submission')),
  actor_id UUID NOT NULL,
  actor_name TEXT NOT NULL,
  assignment_id TEXT,
  target_staff_id TEXT,
  target_staff_name TEXT,
  details TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Managers can view all logs
CREATE POLICY "Managers can view activity logs"
  ON public.activity_logs FOR SELECT
  USING (true);

-- Managers can insert logs
CREATE POLICY "Authenticated users can insert activity logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- Index for fast lookups by assignment
CREATE INDEX idx_activity_logs_assignment ON public.activity_logs (assignment_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
