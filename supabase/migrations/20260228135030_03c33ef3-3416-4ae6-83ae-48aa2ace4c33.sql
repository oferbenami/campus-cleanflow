-- Add new event types for task management actions
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'task_reassigned';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'task_cancelled';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'priority_changed';

-- Add task_cancelled to task_status enum
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'cancelled';