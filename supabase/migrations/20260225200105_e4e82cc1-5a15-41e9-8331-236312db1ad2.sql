
-- Add work_package_id to assignments table to bridge work packages to assignments
ALTER TABLE public.assignments 
ADD COLUMN work_package_id uuid REFERENCES public.work_packages(id) ON DELETE SET NULL;

-- Make template_id nullable since assignments can now be work-package-based
ALTER TABLE public.assignments 
ALTER COLUMN template_id DROP NOT NULL;
