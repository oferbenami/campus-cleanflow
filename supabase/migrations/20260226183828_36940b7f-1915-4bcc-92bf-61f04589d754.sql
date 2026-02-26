
-- Add recurring settings to work_packages
ALTER TABLE public.work_packages 
  ADD COLUMN is_recurring boolean NOT NULL DEFAULT true,
  ADD COLUMN days_of_week integer[] NOT NULL DEFAULT '{0,1,2,3,4}'::integer[];
