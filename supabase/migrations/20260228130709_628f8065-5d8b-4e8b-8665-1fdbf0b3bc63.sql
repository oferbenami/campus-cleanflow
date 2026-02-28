
-- Add new columns to assigned_tasks for defer tracking
ALTER TABLE public.assigned_tasks
  ADD COLUMN IF NOT EXISTS deferred_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS partial_elapsed_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS defer_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resume_by TIMESTAMP WITH TIME ZONE;

-- Add new enum values to task_status
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'deferred';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'missed';

-- Add new event types
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'task_deferred';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'task_resumed';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'task_missed';
