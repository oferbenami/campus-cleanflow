
-- Add building and floor columns to work_package_tasks
ALTER TABLE public.work_package_tasks
ADD COLUMN building text,
ADD COLUMN floor text;
