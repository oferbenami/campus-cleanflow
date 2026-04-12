
-- campus_locations: fix SELECT from public to authenticated
DROP POLICY IF EXISTS "Authenticated read campus_locations" ON public.campus_locations;
CREATE POLICY "Authenticated read campus_locations" ON public.campus_locations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Managers manage campus_locations" ON public.campus_locations;
CREATE POLICY "Managers manage campus_locations" ON public.campus_locations FOR ALL TO authenticated USING (is_manager());

-- addon_rules
DROP POLICY IF EXISTS "Authenticated read addon_rules" ON public.addon_rules;
CREATE POLICY "Authenticated read addon_rules" ON public.addon_rules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Managers manage addon_rules" ON public.addon_rules;
CREATE POLICY "Managers manage addon_rules" ON public.addon_rules FOR ALL TO authenticated USING (is_manager());

-- template_tasks
DROP POLICY IF EXISTS "Authenticated read template_tasks" ON public.template_tasks;
CREATE POLICY "Authenticated read template_tasks" ON public.template_tasks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Managers manage template_tasks" ON public.template_tasks;
CREATE POLICY "Managers manage template_tasks" ON public.template_tasks FOR ALL TO authenticated USING (is_manager());

-- assigned_tasks
DROP POLICY IF EXISTS "Staff read own assigned_tasks" ON public.assigned_tasks;
CREATE POLICY "Staff read own assigned_tasks" ON public.assigned_tasks FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM assignments a WHERE a.id = assigned_tasks.assignment_id AND (a.staff_user_id = auth.uid() OR is_manager() OR is_supervisor())));

DROP POLICY IF EXISTS "Managers create assigned_tasks" ON public.assigned_tasks;
CREATE POLICY "Managers create assigned_tasks" ON public.assigned_tasks FOR INSERT TO authenticated
WITH CHECK (is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Staff update own assigned_tasks" ON public.assigned_tasks;
CREATE POLICY "Staff update own assigned_tasks" ON public.assigned_tasks FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM assignments a WHERE a.id = assigned_tasks.assignment_id AND (a.staff_user_id = auth.uid() OR is_manager() OR is_supervisor())));

DROP POLICY IF EXISTS "Managers delete assigned_tasks" ON public.assigned_tasks;
CREATE POLICY "Managers delete assigned_tasks" ON public.assigned_tasks FOR DELETE TO authenticated USING (is_manager());

-- assignment_addons
DROP POLICY IF EXISTS "Staff read own assignment_addons" ON public.assignment_addons;
CREATE POLICY "Staff read own assignment_addons" ON public.assignment_addons FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM assignments a WHERE a.id = assignment_addons.assignment_id AND (a.staff_user_id = auth.uid() OR is_manager() OR is_supervisor())));

DROP POLICY IF EXISTS "Managers create assignment_addons" ON public.assignment_addons;
CREATE POLICY "Managers create assignment_addons" ON public.assignment_addons FOR INSERT TO authenticated WITH CHECK (is_manager());

DROP POLICY IF EXISTS "Managers update assignment_addons" ON public.assignment_addons;
CREATE POLICY "Managers update assignment_addons" ON public.assignment_addons FOR UPDATE TO authenticated USING (is_manager());

DROP POLICY IF EXISTS "Managers delete assignment_addons" ON public.assignment_addons;
CREATE POLICY "Managers delete assignment_addons" ON public.assignment_addons FOR DELETE TO authenticated USING (is_manager());

-- assignments
DROP POLICY IF EXISTS "Staff read own assignments" ON public.assignments;
CREATE POLICY "Staff read own assignments" ON public.assignments FOR SELECT TO authenticated
USING (staff_user_id = auth.uid() OR is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Managers create assignments" ON public.assignments;
CREATE POLICY "Managers create assignments" ON public.assignments FOR INSERT TO authenticated WITH CHECK (is_manager());

DROP POLICY IF EXISTS "Managers update assignments" ON public.assignments;
CREATE POLICY "Managers update assignments" ON public.assignments FOR UPDATE TO authenticated USING (is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Managers delete assignments" ON public.assignments;
CREATE POLICY "Managers delete assignments" ON public.assignments FOR DELETE TO authenticated USING (is_manager());

-- audit_inspections
DROP POLICY IF EXISTS "Managers/supervisors read inspections" ON public.audit_inspections;
CREATE POLICY "Managers/supervisors read inspections" ON public.audit_inspections FOR SELECT TO authenticated USING (is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Supervisors create inspections" ON public.audit_inspections;
CREATE POLICY "Supervisors create inspections" ON public.audit_inspections FOR INSERT TO authenticated WITH CHECK (is_supervisor() OR is_manager());

DROP POLICY IF EXISTS "Managers update inspections" ON public.audit_inspections;
CREATE POLICY "Managers update inspections" ON public.audit_inspections FOR UPDATE TO authenticated USING (is_manager() OR inspector_user_id = auth.uid());

DROP POLICY IF EXISTS "Managers delete inspections" ON public.audit_inspections;
CREATE POLICY "Managers delete inspections" ON public.audit_inspections FOR DELETE TO authenticated USING (is_manager());

-- break_fix_tickets
DROP POLICY IF EXISTS "Staff read assigned tickets" ON public.break_fix_tickets;
CREATE POLICY "Staff read assigned tickets" ON public.break_fix_tickets FOR SELECT TO authenticated
USING (created_by = auth.uid() OR assigned_to_user_id = auth.uid() OR is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Authenticated create tickets" ON public.break_fix_tickets;
CREATE POLICY "Authenticated create tickets" ON public.break_fix_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Managers/supervisors update tickets" ON public.break_fix_tickets;
CREATE POLICY "Managers/supervisors update tickets" ON public.break_fix_tickets FOR UPDATE TO authenticated
USING (is_manager() OR is_supervisor() OR assigned_to_user_id = auth.uid());

DROP POLICY IF EXISTS "Managers delete tickets" ON public.break_fix_tickets;
CREATE POLICY "Managers delete tickets" ON public.break_fix_tickets FOR DELETE TO authenticated USING (is_manager());

-- events_log
DROP POLICY IF EXISTS "Users read own events" ON public.events_log;
CREATE POLICY "Users read own events" ON public.events_log FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Authenticated insert events" ON public.events_log;
CREATE POLICY "Authenticated insert events" ON public.events_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- incident_events_log
DROP POLICY IF EXISTS "Read incident events" ON public.incident_events_log;
CREATE POLICY "Read incident events" ON public.incident_events_log FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Insert incident events" ON public.incident_events_log;
CREATE POLICY "Insert incident events" ON public.incident_events_log FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- incidents
DROP POLICY IF EXISTS "Authenticated read incidents" ON public.incidents;
CREATE POLICY "Authenticated read incidents" ON public.incidents FOR SELECT TO authenticated
USING (created_by_user_id = auth.uid() OR assigned_to_user_id = auth.uid() OR is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Authenticated create incidents" ON public.incidents;
CREATE POLICY "Authenticated create incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Update incidents" ON public.incidents;
CREATE POLICY "Update incidents" ON public.incidents FOR UPDATE TO authenticated
USING (is_manager() OR is_supervisor() OR assigned_to_user_id = auth.uid());

DROP POLICY IF EXISTS "Managers delete incidents" ON public.incidents;
CREATE POLICY "Managers delete incidents" ON public.incidents FOR DELETE TO authenticated USING (is_manager());

-- planned_absences
DROP POLICY IF EXISTS "Staff read own absences" ON public.planned_absences;
CREATE POLICY "Staff read own absences" ON public.planned_absences FOR SELECT TO authenticated
USING (staff_user_id = auth.uid() OR is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Staff create own absences" ON public.planned_absences;
CREATE POLICY "Staff create own absences" ON public.planned_absences FOR INSERT TO authenticated WITH CHECK (staff_user_id = auth.uid());

DROP POLICY IF EXISTS "Staff delete own absences" ON public.planned_absences;
CREATE POLICY "Staff delete own absences" ON public.planned_absences FOR DELETE TO authenticated USING (staff_user_id = auth.uid() AND absence_date > CURRENT_DATE);

DROP POLICY IF EXISTS "Managers update absences" ON public.planned_absences;
CREATE POLICY "Managers update absences" ON public.planned_absences FOR UPDATE TO authenticated USING (is_manager() OR is_supervisor());

-- supply_shortage_reports
DROP POLICY IF EXISTS "Staff read own reports" ON public.supply_shortage_reports;
CREATE POLICY "Staff read own reports" ON public.supply_shortage_reports FOR SELECT TO authenticated
USING (reported_by = auth.uid() OR is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Authenticated create reports" ON public.supply_shortage_reports;
CREATE POLICY "Authenticated create reports" ON public.supply_shortage_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Managers/supervisors update reports" ON public.supply_shortage_reports;
CREATE POLICY "Managers/supervisors update reports" ON public.supply_shortage_reports FOR UPDATE TO authenticated USING (is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Managers delete reports" ON public.supply_shortage_reports;
CREATE POLICY "Managers delete reports" ON public.supply_shortage_reports FOR DELETE TO authenticated USING (is_manager());

-- checklist_followup_tasks
DROP POLICY IF EXISTS "Managers/supervisors read followup tasks" ON public.checklist_followup_tasks;
CREATE POLICY "Managers/supervisors read followup tasks" ON public.checklist_followup_tasks FOR SELECT TO authenticated USING (is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Managers/supervisors create followup tasks" ON public.checklist_followup_tasks;
CREATE POLICY "Managers/supervisors create followup tasks" ON public.checklist_followup_tasks FOR INSERT TO authenticated WITH CHECK (is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Managers/supervisors update followup tasks" ON public.checklist_followup_tasks;
CREATE POLICY "Managers/supervisors update followup tasks" ON public.checklist_followup_tasks FOR UPDATE TO authenticated USING (is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Managers delete followup tasks" ON public.checklist_followup_tasks;
CREATE POLICY "Managers delete followup tasks" ON public.checklist_followup_tasks FOR DELETE TO authenticated USING (is_manager());

-- executive_area_checks
DROP POLICY IF EXISTS "Managers/supervisors read exec checks" ON public.executive_area_checks;
CREATE POLICY "Managers/supervisors read exec checks" ON public.executive_area_checks FOR SELECT TO authenticated USING (is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Managers/supervisors create exec checks" ON public.executive_area_checks;
CREATE POLICY "Managers/supervisors create exec checks" ON public.executive_area_checks FOR INSERT TO authenticated WITH CHECK (is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Managers/supervisors update exec checks" ON public.executive_area_checks;
CREATE POLICY "Managers/supervisors update exec checks" ON public.executive_area_checks FOR UPDATE TO authenticated USING (is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Managers delete exec checks" ON public.executive_area_checks;
CREATE POLICY "Managers delete exec checks" ON public.executive_area_checks FOR DELETE TO authenticated USING (is_manager());

-- shift_scores
DROP POLICY IF EXISTS "Managers/supervisors read scores" ON public.shift_scores;
CREATE POLICY "Managers/supervisors read scores" ON public.shift_scores FOR SELECT TO authenticated USING (is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Managers/supervisors create scores" ON public.shift_scores;
CREATE POLICY "Managers/supervisors create scores" ON public.shift_scores FOR INSERT TO authenticated WITH CHECK (is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Managers/supervisors update scores" ON public.shift_scores;
CREATE POLICY "Managers/supervisors update scores" ON public.shift_scores FOR UPDATE TO authenticated USING (is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Managers delete scores" ON public.shift_scores;
CREATE POLICY "Managers delete scores" ON public.shift_scores FOR DELETE TO authenticated USING (is_manager());

-- staff_default_packages
DROP POLICY IF EXISTS "Managers can view staff defaults" ON public.staff_default_packages;
CREATE POLICY "Managers can view staff defaults" ON public.staff_default_packages FOR SELECT TO authenticated USING (is_manager());

DROP POLICY IF EXISTS "Managers can manage staff defaults" ON public.staff_default_packages;
CREATE POLICY "Managers can manage staff defaults" ON public.staff_default_packages FOR ALL TO authenticated USING (is_manager());

-- site_readiness_checklists
DROP POLICY IF EXISTS "Managers/supervisors read checklists" ON public.site_readiness_checklists;
CREATE POLICY "Managers/supervisors read checklists" ON public.site_readiness_checklists FOR SELECT TO authenticated USING (is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Managers/supervisors create checklists" ON public.site_readiness_checklists;
CREATE POLICY "Managers/supervisors create checklists" ON public.site_readiness_checklists FOR INSERT TO authenticated WITH CHECK (is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Managers/supervisors update checklists" ON public.site_readiness_checklists;
CREATE POLICY "Managers/supervisors update checklists" ON public.site_readiness_checklists FOR UPDATE TO authenticated USING (is_manager() OR is_supervisor());

DROP POLICY IF EXISTS "Managers delete checklists" ON public.site_readiness_checklists;
CREATE POLICY "Managers delete checklists" ON public.site_readiness_checklists FOR DELETE TO authenticated USING (is_manager());
