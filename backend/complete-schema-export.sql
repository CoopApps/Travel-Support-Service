-- Complete Database Schema Export
-- Exported from: travel_support_dev
-- Date: 2025-11-03T02:10:02.546Z

-- ============================================
-- SEQUENCES
-- ============================================

CREATE SEQUENCE IF NOT EXISTS billing_events_event_id_seq;
CREATE SEQUENCE IF NOT EXISTS billing_settings_setting_id_seq;
CREATE SEQUENCE IF NOT EXISTS commonwealth_apps_app_id_seq;
CREATE SEQUENCE IF NOT EXISTS cooperative_allocations_allocation_id_seq;
CREATE SEQUENCE IF NOT EXISTS cooperative_board_members_board_member_id_seq;
CREATE SEQUENCE IF NOT EXISTS cooperative_governance_governance_id_seq;
CREATE SEQUENCE IF NOT EXISTS cooperative_meetings_meeting_id_seq;
CREATE SEQUENCE IF NOT EXISTS cooperative_members_member_id_seq;
CREATE SEQUENCE IF NOT EXISTS cooperative_membership_membership_id_seq;
CREATE SEQUENCE IF NOT EXISTS cooperative_policies_policy_id_seq;
CREATE SEQUENCE IF NOT EXISTS cooperative_profit_sharing_distribution_id_seq;
CREATE SEQUENCE IF NOT EXISTS cooperative_reports_report_id_seq;
CREATE SEQUENCE IF NOT EXISTS cooperative_votes_cast_ballot_id_seq;
CREATE SEQUENCE IF NOT EXISTS cooperative_voting_vote_id_seq;
CREATE SEQUENCE IF NOT EXISTS credit_notes_credit_note_id_seq;
CREATE SEQUENCE IF NOT EXISTS customer_feedback_id_seq;
CREATE SEQUENCE IF NOT EXISTS customer_message_reads_read_id_seq;
CREATE SEQUENCE IF NOT EXISTS customer_messages_to_office_message_id_seq;
CREATE SEQUENCE IF NOT EXISTS driver_message_reads_read_id_seq;
CREATE SEQUENCE IF NOT EXISTS driver_messages_message_id_seq;
CREATE SEQUENCE IF NOT EXISTS driver_to_office_messages_message_id_seq;
CREATE SEQUENCE IF NOT EXISTS incidents_id_seq;
CREATE SEQUENCE IF NOT EXISTS invoices_invoice_id_seq;
CREATE SEQUENCE IF NOT EXISTS master_tenant_directory_directory_id_seq;
CREATE SEQUENCE IF NOT EXISTS payment_methods_payment_method_id_seq;
CREATE SEQUENCE IF NOT EXISTS payments_payment_id_seq;
CREATE SEQUENCE IF NOT EXISTS platform_admins_admin_id_seq;
CREATE SEQUENCE IF NOT EXISTS risk_assessments_id_seq;
CREATE SEQUENCE IF NOT EXISTS subscription_history_history_id_seq;
CREATE SEQUENCE IF NOT EXISTS subscription_plans_plan_id_seq;
CREATE SEQUENCE IF NOT EXISTS subscriptions_subscription_id_seq;
CREATE SEQUENCE IF NOT EXISTS support_tickets_ticket_id_seq;
CREATE SEQUENCE IF NOT EXISTS system_api_config_config_id_seq;
CREATE SEQUENCE IF NOT EXISTS system_health_health_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_adhoc_conflicts_log_conflict_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_adhoc_customer_requests_request_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_adhoc_driver_availability_availability_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_adhoc_journeys_journey_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_admin_audit_log_log_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_admin_notifications_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_admin_permissions_permission_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_announcements_announcement_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_api_usage_usage_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_assignment_history_history_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_audit_log_audit_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_bank_accounts_account_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_board_meetings_meeting_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_board_members_member_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_budget_categories_budget_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_budgets_budget_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_business_metrics_metric_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_cash_flow_cash_flow_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_company_settings_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_compliance_incidents_incident_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_compliance_records_compliance_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_compliance_tracking_compliance_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_cost_center_expenses_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_cost_centers_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_customer_audit_audit_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_customer_feedback_feedback_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_customer_holiday_balances_balance_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_customers_customer_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_daily_metrics_metric_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_driver_alerts_alert_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_driver_assignments_assignment_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_driver_fuel_fuel_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_driver_fuel_submissions_submission_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_driver_holiday_balances_balance_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_driver_holidays_holiday_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_driver_hours_submission_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_driver_performance_metrics_metric_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_driver_permits_permit_record_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_driver_roles_role_record_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_driver_status_updates_update_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_driver_timesheets_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_driver_training_records_record_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_drivers_driver_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_email_log_email_log_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_email_templates_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_email_templates_template_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_employee_vehicles_assignment_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_employees_employee_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_financial_periods_period_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_financial_transactions_transaction_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_freelance_submissions_submission_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_fuel_cards_card_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_fuel_efficiency_efficiency_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_fuel_settings_setting_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_fuel_transactions_transaction_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_fuelcards_fuel_card_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_holiday_balances_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_holiday_blackout_dates_blackout_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_holiday_requests_request_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_holidays_holiday_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_insurance_policies_policy_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_invoice_alerts_alert_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_invoice_emails_email_log_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_invoice_line_items_line_item_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_invoice_reminder_log_log_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_invoice_reminders_reminder_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_invoice_split_payments_split_payment_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_invoices_invoice_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_licenses_permits_license_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_maintenance_maintenance_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_messages_message_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_office_staff_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_organization_details_organization_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_organizational_permits_permit_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_outing_bookings_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_outing_rotas_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_payment_records_payment_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_payroll_audit_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_payroll_movements_movement_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_payroll_periods_period_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_payroll_records_record_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_permit_audit_log_audit_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_permit_reminders_reminder_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_permits_permit_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_pickup_statuses_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_preference_requests_request_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_provider_invoice_settings_setting_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_providers_provider_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_route_optimization_history_optimization_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_route_templates_template_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_safeguarding_attachments_attachment_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_safeguarding_reports_report_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_saved_routes_route_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_schedule_assignments_assignment_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_schedule_conflicts_conflict_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_schedule_templates_template_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_schedules_schedule_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_settings_setting_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_social_outings_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_split_payment_records_split_payment_record_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_staff_members_staff_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_subscription_history_history_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_system_metrics_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_training_records_training_record_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_training_types_training_type_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_trip_records_trip_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_trips_trip_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_user_preferences_preference_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_user_security_log_log_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_users_user_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_vehicle_incidents_incident_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_vehicle_maintenance_maintenance_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenant_vehicles_vehicle_id_seq;
CREATE SEQUENCE IF NOT EXISTS tenants_tenant_id_seq;
CREATE SEQUENCE IF NOT EXISTS users_id_seq;

-- ============================================
-- TABLES (without foreign keys)
-- ============================================


-- Table: billing_events
CREATE TABLE IF NOT EXISTS billing_events (
  event_id INTEGER DEFAULT nextval('billing_events_event_id_seq'::regclass) NOT NULL,
  subscription_id INTEGER,
  event_type VARCHAR(50) NOT NULL,
  event_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'GBP'::character varying,
  reference_id INTEGER,
  reference_type VARCHAR(50),
  metadata JSONB,
  created_by VARCHAR(100) DEFAULT 'system'::character varying,
  notes TEXT,
  PRIMARY KEY (event_id)
);

-- Table: billing_settings
CREATE TABLE IF NOT EXISTS billing_settings (
  setting_id INTEGER DEFAULT nextval('billing_settings_setting_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  auto_billing_enabled BOOLEAN DEFAULT true,
  billing_day_of_month INTEGER DEFAULT 1,
  payment_terms_days INTEGER DEFAULT 30,
  late_fee_percentage DECIMAL(5,2) DEFAULT 0,
  dunning_enabled BOOLEAN DEFAULT true,
  require_payment_method BOOLEAN DEFAULT true,
  preferred_payment_method VARCHAR(50) DEFAULT 'card'::character varying,
  billing_email VARCHAR(255),
  invoice_prefix VARCHAR(10) DEFAULT 'INV'::character varying,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_id)
);

-- Table: commonwealth_apps
CREATE TABLE IF NOT EXISTS commonwealth_apps (
  app_id INTEGER DEFAULT nextval('commonwealth_apps_app_id_seq'::regclass) NOT NULL,
  app_name VARCHAR(255) NOT NULL,
  app_code VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  PRIMARY KEY (app_id),
  UNIQUE (app_code),
  UNIQUE (app_name)
);

-- Table: cooperative_allocations
CREATE TABLE IF NOT EXISTS cooperative_allocations (
  allocation_id INTEGER DEFAULT nextval('cooperative_allocations_allocation_id_seq'::regclass) NOT NULL,
  distribution_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  hours_worked DECIMAL(8,2) DEFAULT 0,
  trips_taken INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  usage_percentage DECIMAL(5,2) DEFAULT 0,
  amount DECIMAL(10,2) DEFAULT 0 NOT NULL,
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (allocation_id),
  UNIQUE (distribution_id, member_id)
);
CREATE INDEX idx_allocations_distribution ON public.cooperative_allocations USING btree (distribution_id);
CREATE INDEX idx_allocations_member ON public.cooperative_allocations USING btree (member_id);
CREATE INDEX idx_allocations_paid ON public.cooperative_allocations USING btree (paid);

-- Table: cooperative_board_members
CREATE TABLE IF NOT EXISTS cooperative_board_members (
  board_member_id INTEGER DEFAULT nextval('cooperative_board_members_board_member_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  position VARCHAR(100) NOT NULL,
  role_description TEXT,
  term_start DATE NOT NULL,
  term_end DATE NOT NULL,
  elected_by_vote_id INTEGER,
  status VARCHAR(20) DEFAULT 'active'::character varying,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (board_member_id)
);
CREATE INDEX idx_board_tenant ON public.cooperative_board_members USING btree (tenant_id);
CREATE INDEX idx_board_member ON public.cooperative_board_members USING btree (member_id);
CREATE INDEX idx_board_status ON public.cooperative_board_members USING btree (status);

-- Table: cooperative_governance
CREATE TABLE IF NOT EXISTS cooperative_governance (
  governance_id INTEGER DEFAULT nextval('cooperative_governance_governance_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  model VARCHAR(100) DEFAULT 'One Person, One Vote'::character varying,
  description TEXT,
  worker_ownership INTEGER DEFAULT 50,
  customer_ownership INTEGER DEFAULT 50,
  quorum INTEGER DEFAULT 50,
  passing_threshold INTEGER DEFAULT 66,
  membership_fee DECIMAL(10,2) DEFAULT 0,
  board_size INTEGER DEFAULT 7,
  board_term_years INTEGER DEFAULT 3,
  bylaws_url TEXT,
  policies JSONB DEFAULT '[]'::jsonb,
  board_members JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (governance_id),
  UNIQUE (tenant_id)
);
CREATE INDEX idx_coop_governance_tenant ON public.cooperative_governance USING btree (tenant_id);

-- Table: cooperative_meetings
CREATE TABLE IF NOT EXISTS cooperative_meetings (
  meeting_id INTEGER DEFAULT nextval('cooperative_meetings_meeting_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  meeting_type VARCHAR(50) NOT NULL,
  scheduled_date DATE NOT NULL,
  held_date DATE,
  attendees_count INTEGER,
  quorum_met BOOLEAN,
  minutes_url TEXT,
  notes TEXT,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (meeting_id)
);
CREATE INDEX idx_cooperative_meetings_tenant ON public.cooperative_meetings USING btree (tenant_id);
CREATE INDEX idx_cooperative_meetings_date ON public.cooperative_meetings USING btree (scheduled_date);

-- Table: cooperative_members
CREATE TABLE IF NOT EXISTS cooperative_members (
  member_id INTEGER DEFAULT nextval('cooperative_members_member_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  member_type VARCHAR(20) NOT NULL,
  driver_id INTEGER,
  customer_id INTEGER,
  member_since DATE DEFAULT CURRENT_DATE NOT NULL,
  membership_fee DECIMAL(10,2) DEFAULT 0,
  voting_rights BOOLEAN DEFAULT true,
  ownership_percentage DECIMAL(5,2) DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active'::character varying,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (member_id),
  UNIQUE (tenant_id, customer_id),
  UNIQUE (tenant_id, driver_id)
);
CREATE INDEX idx_coop_members_tenant ON public.cooperative_members USING btree (tenant_id);
CREATE INDEX idx_coop_members_type ON public.cooperative_members USING btree (member_type);
CREATE INDEX idx_coop_members_driver ON public.cooperative_members USING btree (driver_id);
CREATE INDEX idx_coop_members_customer ON public.cooperative_members USING btree (customer_id);

-- Table: cooperative_membership
CREATE TABLE IF NOT EXISTS cooperative_membership (
  membership_id INTEGER DEFAULT nextval('cooperative_membership_membership_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  member_type VARCHAR(20) NOT NULL,
  member_reference_id INTEGER,
  ownership_shares INTEGER DEFAULT 1,
  voting_rights BOOLEAN DEFAULT true,
  joined_date DATE NOT NULL,
  left_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (membership_id)
);
CREATE INDEX idx_cooperative_membership_tenant ON public.cooperative_membership USING btree (tenant_id);
CREATE INDEX idx_cooperative_membership_member ON public.cooperative_membership USING btree (member_type, member_reference_id);

-- Table: cooperative_policies
CREATE TABLE IF NOT EXISTS cooperative_policies (
  policy_id INTEGER DEFAULT nextval('cooperative_policies_policy_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  content TEXT,
  document_url TEXT,
  member_approved BOOLEAN DEFAULT false,
  approved_date DATE,
  approval_vote_id INTEGER,
  status VARCHAR(20) DEFAULT 'active'::character varying,
  version INTEGER DEFAULT 1,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (policy_id)
);
CREATE INDEX idx_policies_tenant ON public.cooperative_policies USING btree (tenant_id);
CREATE INDEX idx_policies_status ON public.cooperative_policies USING btree (status);

-- Table: cooperative_profit_sharing
CREATE TABLE IF NOT EXISTS cooperative_profit_sharing (
  distribution_id INTEGER DEFAULT nextval('cooperative_profit_sharing_distribution_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  fiscal_year INTEGER NOT NULL,
  quarter INTEGER,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_surplus DECIMAL(12,2) DEFAULT 0 NOT NULL,
  total_pool DECIMAL(12,2) DEFAULT 0 NOT NULL,
  model VARCHAR(50) DEFAULT 'Equal Shares'::character varying,
  basis VARCHAR(50) DEFAULT 'Hours Worked'::character varying,
  frequency VARCHAR(20) DEFAULT 'Quarterly'::character varying,
  worker_percentage INTEGER DEFAULT 40,
  customer_percentage INTEGER DEFAULT 40,
  reinvestment_percentage INTEGER DEFAULT 20,
  worker_pool DECIMAL(12,2) DEFAULT 0,
  customer_pool DECIMAL(12,2) DEFAULT 0,
  reinvestment_pool DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending'::character varying,
  calculated_at TIMESTAMP,
  approved_at TIMESTAMP,
  distributed_at TIMESTAMP,
  next_distribution DATE,
  allocations JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (distribution_id),
  UNIQUE (tenant_id, fiscal_year, quarter)
);
CREATE INDEX idx_profit_sharing_tenant ON public.cooperative_profit_sharing USING btree (tenant_id);
CREATE INDEX idx_profit_sharing_period ON public.cooperative_profit_sharing USING btree (fiscal_year, quarter);
CREATE INDEX idx_profit_sharing_status ON public.cooperative_profit_sharing USING btree (status);

-- Table: cooperative_reports
CREATE TABLE IF NOT EXISTS cooperative_reports (
  report_id INTEGER DEFAULT nextval('cooperative_reports_report_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  submitted_date TIMESTAMP,
  report_data JSONB,
  status VARCHAR(20) DEFAULT 'pending'::character varying,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id)
);
CREATE INDEX idx_cooperative_reports_tenant ON public.cooperative_reports USING btree (tenant_id);
CREATE INDEX idx_cooperative_reports_status ON public.cooperative_reports USING btree (status);

-- Table: cooperative_votes_cast
CREATE TABLE IF NOT EXISTS cooperative_votes_cast (
  ballot_id INTEGER DEFAULT nextval('cooperative_votes_cast_ballot_id_seq'::regclass) NOT NULL,
  vote_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  choice VARCHAR(10) NOT NULL,
  cast_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ballot_id),
  UNIQUE (vote_id, member_id)
);
CREATE INDEX idx_votes_cast_vote ON public.cooperative_votes_cast USING btree (vote_id);
CREATE INDEX idx_votes_cast_member ON public.cooperative_votes_cast USING btree (member_id);

-- Table: cooperative_voting
CREATE TABLE IF NOT EXISTS cooperative_voting (
  vote_id INTEGER DEFAULT nextval('cooperative_voting_vote_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general'::character varying,
  requires_both_groups BOOLEAN DEFAULT false,
  quorum_percentage INTEGER DEFAULT 50,
  passing_threshold INTEGER DEFAULT 66,
  open_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  close_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'active'::character varying,
  passed BOOLEAN,
  total_eligible_voters INTEGER DEFAULT 0,
  total_votes_cast INTEGER DEFAULT 0,
  yes_votes INTEGER DEFAULT 0,
  no_votes INTEGER DEFAULT 0,
  abstain_votes INTEGER DEFAULT 0,
  worker_eligible INTEGER DEFAULT 0,
  worker_yes INTEGER DEFAULT 0,
  worker_no INTEGER DEFAULT 0,
  worker_abstain INTEGER DEFAULT 0,
  customer_eligible INTEGER DEFAULT 0,
  customer_yes INTEGER DEFAULT 0,
  customer_no INTEGER DEFAULT 0,
  customer_abstain INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (vote_id)
);
CREATE INDEX idx_coop_voting_tenant ON public.cooperative_voting USING btree (tenant_id);
CREATE INDEX idx_coop_voting_status ON public.cooperative_voting USING btree (status);
CREATE INDEX idx_coop_voting_dates ON public.cooperative_voting USING btree (close_date);

-- Table: credit_notes
CREATE TABLE IF NOT EXISTS credit_notes (
  credit_note_id INTEGER DEFAULT nextval('credit_notes_credit_note_id_seq'::regclass) NOT NULL,
  subscription_id INTEGER,
  invoice_id INTEGER,
  credit_note_number VARCHAR(50) NOT NULL,
  credit_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP'::character varying,
  reason VARCHAR(255),
  status VARCHAR(20) DEFAULT 'issued'::character varying,
  created_by VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (credit_note_id),
  UNIQUE (credit_note_number)
);

-- Table: customer_feedback
CREATE TABLE IF NOT EXISTS customer_feedback (
  id INTEGER DEFAULT nextval('customer_feedback_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  trip_date DATE,
  driver_id INTEGER,
  rating INTEGER NOT NULL,
  comment TEXT,
  category VARCHAR(50) DEFAULT 'general'::character varying,
  status VARCHAR(20) DEFAULT 'new'::character varying,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER,
  admin_notes TEXT,
  PRIMARY KEY (id)
);
CREATE INDEX idx_feedback_rating ON public.customer_feedback USING btree (tenant_id, rating);

-- Table: customer_message_reads
CREATE TABLE IF NOT EXISTS customer_message_reads (
  read_id INTEGER DEFAULT nextval('customer_message_reads_read_id_seq'::regclass) NOT NULL,
  message_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (read_id),
  UNIQUE (message_id, customer_id)
);
CREATE UNIQUE INDEX unique_message_read ON public.customer_message_reads USING btree (message_id, customer_id);
CREATE INDEX idx_message_reads_message ON public.customer_message_reads USING btree (message_id);
CREATE INDEX idx_message_reads_customer ON public.customer_message_reads USING btree (customer_id);

-- Table: customer_messages_to_office
CREATE TABLE IF NOT EXISTS customer_messages_to_office (
  message_id INTEGER DEFAULT nextval('customer_messages_to_office_message_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'unread'::character varying,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  read_by INTEGER,
  reply_message_id INTEGER,
  PRIMARY KEY (message_id)
);
CREATE INDEX idx_customer_messages_tenant ON public.customer_messages_to_office USING btree (tenant_id);
CREATE INDEX idx_customer_messages_customer ON public.customer_messages_to_office USING btree (customer_id);
CREATE INDEX idx_customer_messages_status ON public.customer_messages_to_office USING btree (status);
CREATE INDEX idx_customer_messages_created ON public.customer_messages_to_office USING btree (created_at DESC);

-- Table: driver_message_reads
CREATE TABLE IF NOT EXISTS driver_message_reads (
  read_id INTEGER DEFAULT nextval('driver_message_reads_read_id_seq'::regclass) NOT NULL,
  message_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (read_id),
  UNIQUE (message_id, driver_id)
);
CREATE INDEX idx_driver_message_reads_driver ON public.driver_message_reads USING btree (driver_id);
CREATE INDEX idx_driver_message_reads_message ON public.driver_message_reads USING btree (message_id);

-- Table: driver_messages
CREATE TABLE IF NOT EXISTS driver_messages (
  message_id INTEGER DEFAULT nextval('driver_messages_message_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium'::character varying,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  target_driver_id INTEGER,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (message_id)
);
CREATE INDEX idx_driver_messages_tenant ON public.driver_messages USING btree (tenant_id);
CREATE INDEX idx_driver_messages_target ON public.driver_messages USING btree (target_driver_id);
CREATE INDEX idx_driver_messages_active ON public.driver_messages USING btree (is_active);
CREATE INDEX idx_driver_messages_created ON public.driver_messages USING btree (created_at DESC);

-- Table: driver_to_office_messages
CREATE TABLE IF NOT EXISTS driver_to_office_messages (
  message_id INTEGER DEFAULT nextval('driver_to_office_messages_message_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'::character varying,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  read_by INTEGER,
  resolved_at TIMESTAMP,
  resolved_by INTEGER,
  admin_response TEXT,
  PRIMARY KEY (message_id)
);
CREATE INDEX idx_driver_to_office_messages_tenant ON public.driver_to_office_messages USING btree (tenant_id);
CREATE INDEX idx_driver_to_office_messages_driver ON public.driver_to_office_messages USING btree (driver_id);
CREATE INDEX idx_driver_to_office_messages_status ON public.driver_to_office_messages USING btree (status);
CREATE INDEX idx_driver_to_office_messages_created ON public.driver_to_office_messages USING btree (created_at DESC);

-- Table: incidents
CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER DEFAULT nextval('incidents_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  incident_date DATE NOT NULL,
  incident_time TIME WITHOUT TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  incident_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  category VARCHAR(50) DEFAULT 'general'::character varying,
  description TEXT NOT NULL,
  immediate_actions TEXT,
  customer_id INTEGER,
  driver_id INTEGER,
  other_people_involved TEXT,
  witness_details TEXT,
  vehicle_id INTEGER,
  vehicle_damage_description TEXT,
  police_involved BOOLEAN DEFAULT false,
  police_reference VARCHAR(100),
  ambulance_called BOOLEAN DEFAULT false,
  other_emergency_services TEXT,
  insurance_claim_required BOOLEAN DEFAULT false,
  insurance_reference VARCHAR(100),
  insurance_status VARCHAR(50),
  status VARCHAR(30) DEFAULT 'reported'::character varying,
  priority VARCHAR(20) DEFAULT 'medium'::character varying,
  investigation_notes TEXT,
  root_cause TEXT,
  preventive_measures TEXT,
  reported_by_id INTEGER NOT NULL,
  reported_by_type VARCHAR(20) NOT NULL,
  assigned_to_id INTEGER,
  reviewed_by_id INTEGER,
  reviewed_at TIMESTAMP,
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE INDEX idx_incidents_tenant ON public.incidents USING btree (tenant_id);
CREATE INDEX idx_incidents_date ON public.incidents USING btree (tenant_id, incident_date DESC);
CREATE INDEX idx_incidents_status ON public.incidents USING btree (tenant_id, status);
CREATE INDEX idx_incidents_severity ON public.incidents USING btree (tenant_id, severity);
CREATE INDEX idx_incidents_type ON public.incidents USING btree (tenant_id, incident_type);
CREATE INDEX idx_incidents_customer ON public.incidents USING btree (tenant_id, customer_id);
CREATE INDEX idx_incidents_driver ON public.incidents USING btree (tenant_id, driver_id);
CREATE INDEX idx_incidents_vehicle ON public.incidents USING btree (tenant_id, vehicle_id);

-- Table: invoices
CREATE TABLE IF NOT EXISTS invoices (
  invoice_id INTEGER DEFAULT nextval('invoices_invoice_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  subscription_id INTEGER,
  amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending'::character varying NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  days_overdue INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  invoice_number VARCHAR(50),
  invoice_date DATE,
  amount_gross DECIMAL(10,2),
  amount_net DECIMAL(10,2),
  vat_amount DECIMAL(10,2),
  vat_rate DECIMAL(5,2) DEFAULT 20.00,
  currency VARCHAR(3) DEFAULT 'GBP'::character varying,
  payment_terms_days INTEGER DEFAULT 30,
  line_items JSONB,
  notes TEXT,
  pdf_path VARCHAR(500),
  auto_generated BOOLEAN DEFAULT false,
  PRIMARY KEY (invoice_id)
);
CREATE INDEX idx_invoices_tenant_id ON public.invoices USING btree (tenant_id);
CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);
CREATE INDEX idx_invoices_due_date ON public.invoices USING btree (due_date);
CREATE INDEX idx_invoices_subscription_id ON public.invoices USING btree (subscription_id);
CREATE INDEX idx_invoices_overdue ON public.invoices USING btree (due_date, status) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'overdue'::character varying])::text[]));

-- Table: master_tenant_directory
CREATE TABLE IF NOT EXISTS master_tenant_directory (
  directory_id INTEGER DEFAULT nextval('master_tenant_directory_directory_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) NOT NULL,
  database_type VARCHAR(20) DEFAULT 'shared'::character varying,
  database_host VARCHAR(255),
  database_port INTEGER DEFAULT 5432,
  database_name VARCHAR(255),
  database_user VARCHAR(255),
  connection_pool_size INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (directory_id),
  UNIQUE (subdomain),
  UNIQUE (tenant_id)
);
CREATE INDEX idx_master_directory_subdomain ON public.master_tenant_directory USING btree (subdomain);
CREATE INDEX idx_master_directory_active ON public.master_tenant_directory USING btree (is_active);

-- Table: payment_methods
CREATE TABLE IF NOT EXISTS payment_methods (
  payment_method_id INTEGER DEFAULT nextval('payment_methods_payment_method_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  method_type VARCHAR(50) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  card_last_four VARCHAR(4),
  card_brand VARCHAR(20),
  card_expiry_month INTEGER,
  card_expiry_year INTEGER,
  bank_name VARCHAR(100),
  account_holder_name VARCHAR(255),
  sort_code VARCHAR(10),
  account_number_masked VARCHAR(20),
  stripe_payment_method_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_method_id)
);

-- Table: payments
CREATE TABLE IF NOT EXISTS payments (
  payment_id INTEGER DEFAULT nextval('payments_payment_id_seq'::regclass) NOT NULL,
  invoice_id INTEGER,
  payment_method_id INTEGER,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP'::character varying,
  payment_type VARCHAR(50) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending'::character varying,
  payment_date TIMESTAMP,
  transaction_reference VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  failure_reason TEXT,
  refund_amount DECIMAL(10,2) DEFAULT 0,
  refund_date TIMESTAMP,
  processor_fees DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id)
);

-- Table: platform_admins
CREATE TABLE IF NOT EXISTS platform_admins (
  admin_id INTEGER DEFAULT nextval('platform_admins_admin_id_seq'::regclass) NOT NULL,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin'::character varying,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  PRIMARY KEY (admin_id),
  UNIQUE (email),
  UNIQUE (username)
);

-- Table: risk_assessments
CREATE TABLE IF NOT EXISTS risk_assessments (
  id INTEGER DEFAULT nextval('risk_assessments_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  assessment_date DATE DEFAULT CURRENT_DATE NOT NULL,
  assessed_by_id INTEGER NOT NULL,
  assessed_by_name VARCHAR(200),
  status VARCHAR(30) DEFAULT 'active'::character varying,
  review_date DATE NOT NULL,
  last_reviewed_date DATE,
  overall_risk_level VARCHAR(20) DEFAULT 'medium'::character varying,
  manual_handling_required BOOLEAN DEFAULT false,
  manual_handling_details TEXT,
  manual_handling_likelihood VARCHAR(20),
  manual_handling_impact VARCHAR(20),
  manual_handling_controls TEXT,
  medical_risks_present BOOLEAN DEFAULT false,
  medical_risk_details TEXT,
  medical_likelihood VARCHAR(20),
  medical_impact VARCHAR(20),
  medical_controls TEXT,
  behavioral_risks_present BOOLEAN DEFAULT false,
  behavioral_risk_details TEXT,
  behavioral_likelihood VARCHAR(20),
  behavioral_impact VARCHAR(20),
  behavioral_controls TEXT,
  communication_needs_present BOOLEAN DEFAULT false,
  communication_details TEXT,
  communication_strategies TEXT,
  vehicle_requirements TEXT,
  wheelchair_accessible_required BOOLEAN DEFAULT false,
  additional_space_required BOOLEAN DEFAULT false,
  specialized_equipment TEXT,
  route_considerations TEXT,
  trigger_avoidance TEXT,
  preferred_routes TEXT,
  journey_breaks_required BOOLEAN DEFAULT false,
  emergency_contact_1_name VARCHAR(200),
  emergency_contact_1_phone VARCHAR(50),
  emergency_contact_1_relationship VARCHAR(100),
  emergency_contact_2_name VARCHAR(200),
  emergency_contact_2_phone VARCHAR(50),
  emergency_contact_2_relationship VARCHAR(100),
  emergency_procedures TEXT,
  additional_notes TEXT,
  risk_summary TEXT,
  review_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE INDEX idx_risk_assessments_tenant ON public.risk_assessments USING btree (tenant_id);
CREATE INDEX idx_risk_assessments_customer ON public.risk_assessments USING btree (tenant_id, customer_id);
CREATE INDEX idx_risk_assessments_status ON public.risk_assessments USING btree (tenant_id, status);
CREATE INDEX idx_risk_assessments_review_date ON public.risk_assessments USING btree (tenant_id, review_date);
CREATE INDEX idx_risk_assessments_risk_level ON public.risk_assessments USING btree (tenant_id, overall_risk_level);

-- Table: subscription_history
CREATE TABLE IF NOT EXISTS subscription_history (
  history_id INTEGER DEFAULT nextval('subscription_history_history_id_seq'::regclass) NOT NULL,
  subscription_id INTEGER,
  action VARCHAR(50) NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  old_plan VARCHAR(50),
  new_plan VARCHAR(50),
  changed_by VARCHAR(100),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  PRIMARY KEY (history_id)
);
CREATE INDEX idx_subscription_history_subscription_id ON public.subscription_history USING btree (subscription_id);
CREATE INDEX idx_subscription_history_changed_at ON public.subscription_history USING btree (changed_at);

-- Table: subscription_plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  plan_id INTEGER DEFAULT nextval('subscription_plans_plan_id_seq'::regclass) NOT NULL,
  plan_code VARCHAR(50) NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  included_users INTEGER NOT NULL,
  max_users INTEGER NOT NULL,
  price_per_additional_user DECIMAL(10,2) NOT NULL,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (plan_id),
  UNIQUE (plan_code)
);

-- Table: subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id INTEGER DEFAULT nextval('subscriptions_subscription_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  plan_name VARCHAR(50) NOT NULL,
  base_fee DECIMAL(10,2) NOT NULL,
  monthly_fee DECIMAL(10,2) NOT NULL,
  coop_discount INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'trial'::character varying NOT NULL,
  start_date DATE DEFAULT CURRENT_DATE NOT NULL,
  next_billing_date DATE NOT NULL,
  trial_end_date DATE,
  users_count INTEGER DEFAULT 0,
  customers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_billing_date DATE,
  billing_cycle VARCHAR(20) DEFAULT 'monthly'::character varying,
  auto_billing_enabled BOOLEAN DEFAULT true,
  payment_method_id INTEGER,
  grace_period_days INTEGER DEFAULT 7,
  dunning_level INTEGER DEFAULT 0,
  last_dunning_email DATE,
  cooperative_type VARCHAR(20) DEFAULT NULL::character varying,
  PRIMARY KEY (subscription_id)
);
CREATE INDEX idx_subscriptions_tenant_id ON public.subscriptions USING btree (tenant_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);
CREATE INDEX idx_subscriptions_next_billing ON public.subscriptions USING btree (next_billing_date);
CREATE INDEX idx_subscriptions_plan ON public.subscriptions USING btree (plan_name);
CREATE INDEX idx_subscriptions_billing ON public.subscriptions USING btree (next_billing_date, status) WHERE ((status)::text = ANY ((ARRAY['active'::character varying, 'trial'::character varying])::text[]));

-- Table: support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  ticket_id INTEGER DEFAULT nextval('support_tickets_ticket_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium'::character varying,
  status VARCHAR(20) DEFAULT 'open'::character varying,
  assigned_to VARCHAR(100),
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  PRIMARY KEY (ticket_id)
);
CREATE INDEX idx_support_tickets_tenant_id ON public.support_tickets USING btree (tenant_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);
CREATE INDEX idx_support_tickets_priority ON public.support_tickets USING btree (priority);
CREATE INDEX idx_support_tickets_created ON public.support_tickets USING btree (created_at);

-- Table: system_api_config
CREATE TABLE IF NOT EXISTS system_api_config (
  config_id INTEGER DEFAULT nextval('system_api_config_config_id_seq'::regclass) NOT NULL,
  service_name VARCHAR(50) NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  monthly_limit INTEGER DEFAULT 10000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (config_id)
);

-- Table: system_health
CREATE TABLE IF NOT EXISTS system_health (
  health_id INTEGER DEFAULT nextval('system_health_health_id_seq'::regclass) NOT NULL,
  component VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  response_time INTEGER,
  uptime_percentage DECIMAL(5,2),
  active_connections INTEGER,
  storage_used_percentage INTEGER,
  last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (health_id)
);
CREATE INDEX idx_system_health_component ON public.system_health USING btree (component);
CREATE INDEX idx_system_health_last_check ON public.system_health USING btree (last_check);

-- Table: tenant_adhoc_conflicts_log
CREATE TABLE IF NOT EXISTS tenant_adhoc_conflicts_log (
  conflict_id INTEGER DEFAULT nextval('tenant_adhoc_conflicts_log_conflict_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  conflict_type VARCHAR(30) NOT NULL,
  conflict_date DATE NOT NULL,
  conflict_time TIME WITHOUT TIME ZONE NOT NULL,
  driver_id INTEGER,
  customer_id INTEGER,
  journey_id INTEGER,
  request_id INTEGER,
  conflict_description TEXT NOT NULL,
  resolution_action VARCHAR(50),
  resolved_at TIMESTAMP,
  resolved_by INTEGER,
  detected_by_server BOOLEAN DEFAULT true,
  server_datetime TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (conflict_id)
);
CREATE INDEX idx_conflicts_log_date ON public.tenant_adhoc_conflicts_log USING btree (tenant_id, conflict_date);

-- Table: tenant_adhoc_customer_requests
CREATE TABLE IF NOT EXISTS tenant_adhoc_customer_requests (
  request_id INTEGER DEFAULT nextval('tenant_adhoc_customer_requests_request_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  requested_date DATE NOT NULL,
  requested_time TIME WITHOUT TIME ZONE,
  preferred_time_start TIME WITHOUT TIME ZONE,
  preferred_time_end TIME WITHOUT TIME ZONE,
  flexible_timing BOOLEAN DEFAULT false,
  pickup_location TEXT,
  destination TEXT NOT NULL,
  estimated_duration INTEGER DEFAULT 60,
  journey_type VARCHAR(50) DEFAULT 'other'::character varying,
  urgent BOOLEAN DEFAULT false,
  return_required BOOLEAN DEFAULT false,
  return_time TIME WITHOUT TIME ZONE,
  return_notes TEXT,
  reason_for_request TEXT,
  special_requirements TEXT,
  medical_requirements TEXT,
  customer_notes TEXT,
  price_estimate DECIMAL(10,2),
  price_agreed DECIMAL(10,2),
  request_status VARCHAR(20) DEFAULT 'pending'::character varying,
  priority_level VARCHAR(10) DEFAULT 'normal'::character varying,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  rejection_reason TEXT,
  converted_to_journey_id INTEGER,
  converted_at TIMESTAMP,
  converted_by INTEGER,
  customer_notified BOOLEAN DEFAULT false,
  notification_method VARCHAR(20),
  notification_sent_at TIMESTAMP,
  server_validated BOOLEAN DEFAULT true,
  server_datetime TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (request_id)
);
CREATE INDEX idx_customer_requests_tenant_date ON public.tenant_adhoc_customer_requests USING btree (tenant_id, requested_date);
CREATE INDEX idx_customer_requests_customer_date ON public.tenant_adhoc_customer_requests USING btree (customer_id, requested_date);
CREATE INDEX idx_customer_requests_status ON public.tenant_adhoc_customer_requests USING btree (request_status);

-- Table: tenant_adhoc_driver_availability
CREATE TABLE IF NOT EXISTS tenant_adhoc_driver_availability (
  availability_id INTEGER DEFAULT nextval('tenant_adhoc_driver_availability_availability_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  availability_date DATE NOT NULL,
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  availability_type VARCHAR(20) DEFAULT 'available'::character varying,
  reason TEXT,
  priority_level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (availability_id)
);
CREATE INDEX idx_driver_availability_driver_date ON public.tenant_adhoc_driver_availability USING btree (driver_id, availability_date);

-- Table: tenant_adhoc_journeys
CREATE TABLE IF NOT EXISTS tenant_adhoc_journeys (
  journey_id INTEGER DEFAULT nextval('tenant_adhoc_journeys_journey_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  customer_id INTEGER,
  driver_id INTEGER,
  vehicle_id INTEGER,
  journey_date DATE NOT NULL,
  pickup_time TIME WITHOUT TIME ZONE,
  pickup_address TEXT,
  destination_address TEXT,
  return_time TIME WITHOUT TIME ZONE,
  price DECIMAL(8,2),
  status VARCHAR(50) DEFAULT 'scheduled'::character varying,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estimated_duration INTEGER DEFAULT 60,
  destination TEXT DEFAULT ''::text NOT NULL,
  journey_type VARCHAR(50) DEFAULT 'other'::character varying,
  journey_status VARCHAR(20) DEFAULT 'pending'::character varying,
  urgent BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  return_required BOOLEAN DEFAULT false,
  pickup_location TEXT,
  server_validated BOOLEAN DEFAULT true,
  server_datetime TIMESTAMP,
  booking_source VARCHAR(30) DEFAULT 'staff'::character varying,
  special_requirements TEXT,
  medical_notes TEXT,
  created_by INTEGER,
  updated_by INTEGER,
  PRIMARY KEY (journey_id)
);
CREATE INDEX idx_tenant_adhoc_journeys_date ON public.tenant_adhoc_journeys USING btree (tenant_id, journey_date);
CREATE INDEX idx_adhoc_journeys_tenant_date ON public.tenant_adhoc_journeys USING btree (tenant_id, journey_date);
CREATE INDEX idx_adhoc_journeys_driver_date ON public.tenant_adhoc_journeys USING btree (driver_id, journey_date);
CREATE INDEX idx_adhoc_journeys_customer_date ON public.tenant_adhoc_journeys USING btree (customer_id, journey_date);

-- Table: tenant_admin_audit_log
CREATE TABLE IF NOT EXISTS tenant_admin_audit_log (
  log_id INTEGER DEFAULT nextval('tenant_admin_audit_log_log_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  old_values JSONB,
  new_values JSONB,
  changes_summary TEXT,
  user_id INTEGER,
  user_role VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  risk_level VARCHAR(20) DEFAULT 'low'::character varying,
  requires_approval BOOLEAN DEFAULT false,
  approved_by INTEGER,
  approved_at TIMESTAMP,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_id VARCHAR(255),
  PRIMARY KEY (log_id)
);
CREATE INDEX idx_tenant_audit_log_timestamp ON public.tenant_admin_audit_log USING btree (tenant_id, "timestamp");
CREATE INDEX idx_tenant_audit_log_entity ON public.tenant_admin_audit_log USING btree (tenant_id, entity_type, entity_id);
CREATE INDEX idx_tenant_audit_log_user ON public.tenant_admin_audit_log USING btree (tenant_id, user_id, "timestamp");

-- Table: tenant_admin_notifications
CREATE TABLE IF NOT EXISTS tenant_admin_notifications (
  id INTEGER DEFAULT nextval('tenant_admin_notifications_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  type VARCHAR(50),
  title VARCHAR(200),
  message TEXT,
  priority VARCHAR(20) DEFAULT 'medium'::character varying,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  data JSONB,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: tenant_admin_permissions
CREATE TABLE IF NOT EXISTS tenant_admin_permissions (
  permission_id INTEGER DEFAULT nextval('tenant_admin_permissions_permission_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  financial_access VARCHAR(20) DEFAULT 'none'::character varying,
  staff_access VARCHAR(20) DEFAULT 'none'::character varying,
  compliance_access VARCHAR(20) DEFAULT 'none'::character varying,
  governance_access VARCHAR(20) DEFAULT 'none'::character varying,
  reports_access VARCHAR(20) DEFAULT 'none'::character varying,
  can_approve_budgets BOOLEAN DEFAULT false,
  can_modify_structure BOOLEAN DEFAULT false,
  can_access_audit_logs BOOLEAN DEFAULT false,
  can_manage_board BOOLEAN DEFAULT false,
  spending_limit DECIMAL(10,2),
  approval_required_above DECIMAL(10,2),
  granted_by INTEGER,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (permission_id)
);
CREATE UNIQUE INDEX idx_tenant_admin_permissions_unique ON public.tenant_admin_permissions USING btree (tenant_id, user_id);

-- Table: tenant_announcements
CREATE TABLE IF NOT EXISTS tenant_announcements (
  announcement_id INTEGER DEFAULT nextval('tenant_announcements_announcement_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info'::character varying,
  priority VARCHAR(50) DEFAULT 'medium'::character varying,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (announcement_id)
);

-- Table: tenant_api_usage
CREATE TABLE IF NOT EXISTS tenant_api_usage (
  usage_id INTEGER DEFAULT nextval('tenant_api_usage_usage_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  service VARCHAR(50) NOT NULL,
  usage_date DATE NOT NULL,
  count INTEGER DEFAULT 0,
  monthly_limit INTEGER DEFAULT 1000,
  uses_system_key BOOLEAN DEFAULT true,
  PRIMARY KEY (usage_id),
  UNIQUE (tenant_id, service, usage_date)
);
CREATE INDEX idx_api_usage_tenant_date ON public.tenant_api_usage USING btree (tenant_id, usage_date);

-- Table: tenant_assignment_history
CREATE TABLE IF NOT EXISTS tenant_assignment_history (
  history_id INTEGER DEFAULT nextval('tenant_assignment_history_history_id_seq'::regclass) NOT NULL,
  assignment_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  change_type VARCHAR(50) NOT NULL,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  notes TEXT,
  changed_by INTEGER,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (history_id)
);

-- Table: tenant_audit_log
CREATE TABLE IF NOT EXISTS tenant_audit_log (
  audit_id INTEGER DEFAULT nextval('tenant_audit_log_audit_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL,
  user_id INTEGER,
  username VARCHAR(255),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  reason VARCHAR(500),
  session_id VARCHAR(255),
  PRIMARY KEY (audit_id)
);

-- Table: tenant_bank_accounts
CREATE TABLE IF NOT EXISTS tenant_bank_accounts (
  account_id INTEGER DEFAULT nextval('tenant_bank_accounts_account_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255),
  account_number VARCHAR(50),
  sort_code VARCHAR(10),
  iban VARCHAR(50),
  account_type VARCHAR(50) DEFAULT 'current'::character varying,
  currency VARCHAR(3) DEFAULT 'GBP'::character varying,
  current_balance DECIMAL(12,2) DEFAULT 0,
  available_balance DECIMAL(12,2) DEFAULT 0,
  overdraft_limit DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (account_id)
);

-- Table: tenant_board_meetings
CREATE TABLE IF NOT EXISTS tenant_board_meetings (
  meeting_id INTEGER DEFAULT nextval('tenant_board_meetings_meeting_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_time TIME WITHOUT TIME ZONE,
  meeting_type VARCHAR(50) DEFAULT 'regular'::character varying,
  location VARCHAR(200),
  agenda JSONB DEFAULT '[]'::jsonb,
  minutes JSONB DEFAULT '{}'::jsonb,
  attendees JSONB DEFAULT '[]'::jsonb,
  apologies JSONB DEFAULT '[]'::jsonb,
  quorum_met BOOLEAN DEFAULT false,
  decisions JSONB DEFAULT '[]'::jsonb,
  action_items JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(30) DEFAULT 'scheduled'::character varying,
  minutes_approved BOOLEAN DEFAULT false,
  minutes_approved_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  PRIMARY KEY (meeting_id)
);
CREATE INDEX idx_tenant_board_meetings_date ON public.tenant_board_meetings USING btree (tenant_id, meeting_date);

-- Table: tenant_board_members
CREATE TABLE IF NOT EXISTS tenant_board_members (
  member_id INTEGER DEFAULT nextval('tenant_board_members_member_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  title VARCHAR(20),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  position VARCHAR(100) NOT NULL,
  board_role VARCHAR(100),
  appointed_date DATE NOT NULL,
  term_end_date DATE,
  shareholding DECIMAL(8,4),
  voting_rights BOOLEAN DEFAULT true,
  committee_memberships JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  resignation_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  PRIMARY KEY (member_id)
);
CREATE INDEX idx_tenant_board_members_active ON public.tenant_board_members USING btree (tenant_id, is_active);

-- Table: tenant_budget_categories
CREATE TABLE IF NOT EXISTS tenant_budget_categories (
  budget_id INTEGER DEFAULT nextval('tenant_budget_categories_budget_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  budget_year INTEGER NOT NULL,
  annual_budget DECIMAL(12,2) DEFAULT 0,
  monthly_budget DECIMAL(12,2),
  weekly_budget DECIMAL(12,2),
  actual_spent DECIMAL(12,2) DEFAULT 0,
  auto_alert_threshold DECIMAL(5,2) DEFAULT 90.00,
  hard_limit BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (budget_id),
  UNIQUE (tenant_id, category_name, budget_year)
);
CREATE INDEX idx_budget_categories_tenant_year ON public.tenant_budget_categories USING btree (tenant_id, budget_year);
CREATE INDEX idx_budget_categories_category ON public.tenant_budget_categories USING btree (tenant_id, category_name);

-- Table: tenant_budgets
CREATE TABLE IF NOT EXISTS tenant_budgets (
  budget_id INTEGER DEFAULT nextval('tenant_budgets_budget_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  budget_year INTEGER NOT NULL,
  budget_period VARCHAR(20) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  budget_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  status VARCHAR(20) DEFAULT 'draft'::character varying,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  approved_at TIMESTAMP,
  approved_by INTEGER,
  PRIMARY KEY (budget_id)
);
CREATE UNIQUE INDEX idx_tenant_budgets_unique_period ON public.tenant_budgets USING btree (tenant_id, budget_year, budget_period, period_start);

-- Table: tenant_business_metrics
CREATE TABLE IF NOT EXISTS tenant_business_metrics (
  metric_id INTEGER DEFAULT nextval('tenant_business_metrics_metric_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  metric_date DATE NOT NULL,
  metric_period VARCHAR(20) NOT NULL,
  revenue DECIMAL(12,2) DEFAULT 0,
  expenses DECIMAL(12,2) DEFAULT 0,
  profit DECIMAL(12,2) DEFAULT 0,
  cash_flow DECIMAL(12,2) DEFAULT 0,
  total_journeys INTEGER DEFAULT 0,
  completed_journeys INTEGER DEFAULT 0,
  cancelled_journeys INTEGER DEFAULT 0,
  customer_count INTEGER DEFAULT 0,
  active_drivers INTEGER DEFAULT 0,
  active_vehicles INTEGER DEFAULT 0,
  driver_utilization DECIMAL(5,2) DEFAULT 0,
  vehicle_utilization DECIMAL(5,2) DEFAULT 0,
  on_time_performance DECIMAL(5,2) DEFAULT 0,
  customer_satisfaction DECIMAL(3,2) DEFAULT 0,
  compliance_score DECIMAL(5,2) DEFAULT 0,
  overdue_compliance_items INTEGER DEFAULT 0,
  revenue_per_journey DECIMAL(8,2),
  cost_per_journey DECIMAL(8,2),
  profit_margin DECIMAL(5,2),
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  calculation_version VARCHAR(10) DEFAULT '1.0'::character varying,
  PRIMARY KEY (metric_id)
);
CREATE UNIQUE INDEX idx_tenant_metrics_unique_period ON public.tenant_business_metrics USING btree (tenant_id, metric_date, metric_period);
CREATE INDEX idx_tenant_metrics_time_series ON public.tenant_business_metrics USING btree (tenant_id, metric_period, metric_date);

-- Table: tenant_cash_flow
CREATE TABLE IF NOT EXISTS tenant_cash_flow (
  cash_flow_id INTEGER DEFAULT nextval('tenant_cash_flow_cash_flow_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  transaction_date DATE NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category VARCHAR(100),
  transaction_type VARCHAR(50) NOT NULL,
  reference_type VARCHAR(50),
  reference_id INTEGER,
  bank_account_id INTEGER,
  running_balance DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cash_flow_id)
);

-- Table: tenant_company_settings
CREATE TABLE IF NOT EXISTS tenant_company_settings (
  id INTEGER DEFAULT nextval('tenant_company_settings_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  legal_name VARCHAR(255),
  trading_name VARCHAR(255),
  company_number VARCHAR(50),
  vat_number VARCHAR(50),
  primary_phone VARCHAR(20),
  primary_email VARCHAR(255),
  support_email VARCHAR(255),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  county VARCHAR(100),
  postcode VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United Kingdom'::character varying,
  fiscal_year_start DATE,
  default_timezone VARCHAR(50) DEFAULT 'Europe/London'::character varying,
  default_currency VARCHAR(3) DEFAULT 'GBP'::character varying,
  standard_work_hours_per_week DECIMAL(5,2) DEFAULT 40.00,
  overtime_multiplier DECIMAL(3,2) DEFAULT 1.50,
  timesheet_approval_required BOOLEAN DEFAULT true,
  timesheet_cutoff_day INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (tenant_id)
);
CREATE INDEX idx_company_settings_tenant ON public.tenant_company_settings USING btree (tenant_id);

-- Table: tenant_compliance_incidents
CREATE TABLE IF NOT EXISTS tenant_compliance_incidents (
  incident_id INTEGER DEFAULT nextval('tenant_compliance_incidents_incident_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  incident_date DATE NOT NULL,
  incident_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255),
  reporter_name VARCHAR(255),
  reporter_id INTEGER,
  driver_id INTEGER,
  vehicle_id INTEGER,
  status VARCHAR(50) DEFAULT 'open'::character varying,
  resolution TEXT,
  actions_taken TEXT,
  financial_impact DECIMAL(10,2) DEFAULT 0,
  compliance_impact VARCHAR(255),
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (incident_id)
);

-- Table: tenant_compliance_records
CREATE TABLE IF NOT EXISTS tenant_compliance_records (
  compliance_id INTEGER DEFAULT nextval('tenant_compliance_records_compliance_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  assessment_date DATE NOT NULL,
  assessment_type VARCHAR(50) NOT NULL,
  assessor_name VARCHAR(255),
  overall_score DECIMAL(5,2) DEFAULT 0,
  permits_score DECIMAL(5,2) DEFAULT 0,
  licenses_score DECIMAL(5,2) DEFAULT 0,
  vehicle_compliance_score DECIMAL(5,2) DEFAULT 0,
  safety_score DECIMAL(5,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft'::character varying,
  next_assessment_date DATE,
  findings TEXT,
  recommendations TEXT,
  action_items TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (compliance_id)
);

-- Table: tenant_compliance_tracking
CREATE TABLE IF NOT EXISTS tenant_compliance_tracking (
  compliance_id INTEGER DEFAULT nextval('tenant_compliance_tracking_compliance_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  compliance_type VARCHAR(50) NOT NULL,
  requirement_name VARCHAR(200) NOT NULL,
  description TEXT,
  frequency VARCHAR(30),
  responsible_party VARCHAR(100),
  status VARCHAR(30) DEFAULT 'pending'::character varying,
  last_reviewed_date DATE,
  next_due_date DATE,
  evidence_required BOOLEAN DEFAULT false,
  evidence_location TEXT,
  certificate_number VARCHAR(100),
  issuing_authority VARCHAR(200),
  priority_level VARCHAR(20) DEFAULT 'medium'::character varying,
  automated_reminders BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  PRIMARY KEY (compliance_id)
);
CREATE INDEX idx_tenant_compliance_due_dates ON public.tenant_compliance_tracking USING btree (tenant_id, next_due_date, status);
CREATE INDEX idx_tenant_compliance_type ON public.tenant_compliance_tracking USING btree (tenant_id, compliance_type, status);

-- Table: tenant_cost_center_expenses
CREATE TABLE IF NOT EXISTS tenant_cost_center_expenses (
  id INTEGER DEFAULT nextval('tenant_cost_center_expenses_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  cost_center_id INTEGER NOT NULL,
  expense_date DATE NOT NULL,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(50),
  reference_number VARCHAR(100),
  invoice_number VARCHAR(100),
  payment_method VARCHAR(50),
  paid_date DATE,
  logged_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE INDEX idx_expenses_tenant ON public.tenant_cost_center_expenses USING btree (tenant_id);
CREATE INDEX idx_expenses_cost_center ON public.tenant_cost_center_expenses USING btree (cost_center_id);
CREATE INDEX idx_expenses_date ON public.tenant_cost_center_expenses USING btree (tenant_id, expense_date);

-- Table: tenant_cost_centers
CREATE TABLE IF NOT EXISTS tenant_cost_centers (
  id INTEGER DEFAULT nextval('tenant_cost_centers_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  budget_annual DECIMAL(12,2),
  budget_monthly DECIMAL(12,2),
  owner_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (tenant_id, code)
);
CREATE INDEX idx_cost_centers_tenant ON public.tenant_cost_centers USING btree (tenant_id);
CREATE INDEX idx_cost_centers_active ON public.tenant_cost_centers USING btree (tenant_id, is_active);
CREATE INDEX idx_cost_centers_category ON public.tenant_cost_centers USING btree (tenant_id, category);
CREATE INDEX idx_tenant_cost_centers_tenant_active ON public.tenant_cost_centers USING btree (tenant_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_tenant_cost_centers_category ON public.tenant_cost_centers USING btree (tenant_id, category);

-- Table: tenant_customer_audit
CREATE TABLE IF NOT EXISTS tenant_customer_audit (
  audit_id INTEGER DEFAULT nextval('tenant_customer_audit_audit_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by INTEGER,
  changed_at TIMESTAMP DEFAULT now(),
  change_description TEXT,
  PRIMARY KEY (audit_id)
);
CREATE INDEX idx_customer_audit_tenant_customer ON public.tenant_customer_audit USING btree (tenant_id, customer_id);
CREATE INDEX idx_customer_audit_date ON public.tenant_customer_audit USING btree (changed_at);
CREATE INDEX idx_customer_audit_action ON public.tenant_customer_audit USING btree (action);

-- Table: tenant_customer_feedback
CREATE TABLE IF NOT EXISTS tenant_customer_feedback (
  feedback_id INTEGER DEFAULT nextval('tenant_customer_feedback_feedback_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  submitted_by INTEGER,
  feedback_type VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending'::character varying NOT NULL,
  priority VARCHAR(50) DEFAULT 'medium'::character varying,
  related_driver_id INTEGER,
  related_vehicle_id INTEGER,
  related_trip_id INTEGER,
  incident_date TIMESTAMP,
  assigned_to INTEGER,
  acknowledged_at TIMESTAMP,
  acknowledged_by INTEGER,
  resolved_at TIMESTAMP,
  resolved_by INTEGER,
  resolution_notes TEXT,
  resolution_action TEXT,
  satisfaction_rating INTEGER,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  PRIMARY KEY (feedback_id)
);
CREATE INDEX idx_feedback_tenant ON public.tenant_customer_feedback USING btree (tenant_id);
CREATE INDEX idx_feedback_customer ON public.tenant_customer_feedback USING btree (customer_id);
CREATE INDEX idx_feedback_status ON public.tenant_customer_feedback USING btree (status);
CREATE INDEX idx_feedback_type ON public.tenant_customer_feedback USING btree (feedback_type);
CREATE INDEX idx_feedback_created ON public.tenant_customer_feedback USING btree (created_at);
CREATE INDEX idx_feedback_assigned ON public.tenant_customer_feedback USING btree (assigned_to);

-- Table: tenant_customer_holiday_balances
CREATE TABLE IF NOT EXISTS tenant_customer_holiday_balances (
  balance_id INTEGER DEFAULT nextval('tenant_customer_holiday_balances_balance_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  balance_year INTEGER DEFAULT EXTRACT(year FROM CURRENT_DATE) NOT NULL,
  balance_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by INTEGER,
  PRIMARY KEY (balance_id),
  UNIQUE (tenant_id, customer_id, balance_year)
);
CREATE INDEX idx_customer_holiday_balances_lookup ON public.tenant_customer_holiday_balances USING btree (tenant_id, customer_id, balance_year);

-- Table: tenant_customers
CREATE TABLE IF NOT EXISTS tenant_customers (
  customer_id INTEGER DEFAULT nextval('tenant_customers_customer_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  name VARCHAR(200) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  paying_org VARCHAR(100),
  has_split_payment BOOLEAN DEFAULT false,
  payment_split JSONB,
  provider_split JSONB,
  schedule JSONB,
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(50),
  medical_notes TEXT,
  mobility_requirements TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  medical_info JSONB DEFAULT '{}'::jsonb,
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  communication_preferences JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  customer_status VARCHAR(50) DEFAULT 'active'::character varying,
  availability_calendar JSONB DEFAULT '{}'::jsonb,
  journey_history JSONB DEFAULT '[]'::jsonb,
  holidays JSONB DEFAULT '[]'::jsonb,
  accessibility_needs JSONB DEFAULT '{"mobility_aid": "none", "wheelchair_user": false, "requires_assistance": false, "seating_preferences": "", "special_requirements": "", "vehicle_transfer_notes": ""}'::jsonb,
  social_preferences JSONB DEFAULT '{"interests": [], "communication_needs": "", "activity_limitations": [], "preferred_group_size": "any", "companion_preferences": ""}'::jsonb,
  outing_history JSONB DEFAULT '{"no_shows": 0, "total_bookings": 0, "completed_outings": 0, "cancelled_bookings": 0, "avoided_destinations": [], "preferred_destinations": []}'::jsonb,
  default_price DECIMAL(10,2) DEFAULT 15.00,
  is_login_enabled BOOLEAN DEFAULT false,
  user_id INTEGER,
  special_requirements TEXT,
  postcode VARCHAR(20),
  driver_notes TEXT,
  medication_notes TEXT,
  address_line_2 VARCHAR(255),
  city VARCHAR(100),
  county VARCHAR(100),
  invoice_day INTEGER,
  invoice_email VARCHAR(255),
  auto_send_invoice BOOLEAN DEFAULT false,
  PRIMARY KEY (customer_id)
);
CREATE INDEX idx_tenant_customers_tenant_id ON public.tenant_customers USING btree (tenant_id);
CREATE INDEX idx_tenant_customers_schedule_gin ON public.tenant_customers USING gin (schedule);
CREATE INDEX idx_tenant_customers_provider_split_gin ON public.tenant_customers USING gin (provider_split);
CREATE INDEX idx_tenant_customers_medical_info_gin ON public.tenant_customers USING gin (medical_info);
CREATE INDEX idx_tenant_customers_email ON public.tenant_customers USING btree (tenant_id, email);
CREATE INDEX idx_tenant_customers_status ON public.tenant_customers USING btree (tenant_id, customer_status);
CREATE INDEX idx_tenant_customers_provider ON public.tenant_customers USING btree (tenant_id, paying_org);
CREATE INDEX idx_tenant_customers_split_payment ON public.tenant_customers USING btree (tenant_id, has_split_payment);
CREATE INDEX idx_tenant_customers_user_id ON public.tenant_customers USING btree (user_id);
CREATE INDEX idx_tenant_customers_login_enabled ON public.tenant_customers USING btree (tenant_id, is_login_enabled) WHERE (is_login_enabled = true);
CREATE INDEX idx_tenant_customers_tenant_active ON public.tenant_customers USING btree (tenant_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_tenant_customers_name ON public.tenant_customers USING btree (tenant_id, name);
CREATE INDEX idx_tenant_customers_phone ON public.tenant_customers USING btree (tenant_id, phone);
CREATE INDEX idx_customers_tenant_id ON public.tenant_customers USING btree (tenant_id);
CREATE INDEX idx_customers_user_fk ON public.tenant_customers USING btree (user_id);

-- Table: tenant_daily_metrics
CREATE TABLE IF NOT EXISTS tenant_daily_metrics (
  metric_id INTEGER DEFAULT nextval('tenant_daily_metrics_metric_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  metric_date DATE NOT NULL,
  active_customers INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  lost_customers INTEGER DEFAULT 0,
  active_drivers INTEGER DEFAULT 0,
  drivers_on_leave INTEGER DEFAULT 0,
  driver_utilization_rate DECIMAL(5,2) DEFAULT 0,
  vehicles_active INTEGER DEFAULT 0,
  vehicles_maintenance INTEGER DEFAULT 0,
  fleet_utilization_rate DECIMAL(5,2) DEFAULT 0,
  total_trips INTEGER DEFAULT 0,
  completed_trips INTEGER DEFAULT 0,
  cancelled_trips INTEGER DEFAULT 0,
  no_show_trips INTEGER DEFAULT 0,
  daily_revenue DECIMAL(10,2) DEFAULT 0,
  daily_expenses DECIMAL(10,2) DEFAULT 0,
  daily_profit DECIMAL(10,2),
  total_miles DECIMAL(10,2) DEFAULT 0,
  fuel_consumed DECIMAL(8,3) DEFAULT 0,
  average_mpg DECIMAL(6,2) DEFAULT 0,
  cost_per_mile DECIMAL(6,3) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (metric_id),
  UNIQUE (tenant_id, metric_date)
);

-- Table: tenant_driver_alerts
CREATE TABLE IF NOT EXISTS tenant_driver_alerts (
  alert_id INTEGER DEFAULT nextval('tenant_driver_alerts_alert_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(10) DEFAULT 'medium'::character varying,
  action_required BOOLEAN DEFAULT false,
  due_date DATE,
  category VARCHAR(50) DEFAULT 'general'::character varying,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dismissed_at TIMESTAMP,
  PRIMARY KEY (alert_id)
);
CREATE INDEX idx_driver_alerts_driver_active ON public.tenant_driver_alerts USING btree (driver_id, is_dismissed);

-- Table: tenant_driver_assignments
CREATE TABLE IF NOT EXISTS tenant_driver_assignments (
  assignment_id INTEGER DEFAULT nextval('tenant_driver_assignments_assignment_id_seq'::regclass) NOT NULL,
  employee_id INTEGER,
  vehicle_id INTEGER,
  is_primary_driver BOOLEAN DEFAULT false,
  assigned_date DATE DEFAULT CURRENT_DATE,
  PRIMARY KEY (assignment_id)
);

-- Table: tenant_driver_fuel
CREATE TABLE IF NOT EXISTS tenant_driver_fuel (
  fuel_id INTEGER DEFAULT nextval('tenant_driver_fuel_fuel_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  date DATE NOT NULL,
  station VARCHAR(100) NOT NULL,
  litres DECIMAL(6,2) NOT NULL,
  cost DECIMAL(6,2) NOT NULL,
  price_per_litre DECIMAL(5,3),
  mileage INTEGER,
  receipt_path VARCHAR(500),
  receipt_uploaded_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'submitted'::character varying,
  notes TEXT,
  approved_by INTEGER,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  reimbursed_date DATE,
  reimbursement_reference VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (fuel_id)
);
CREATE INDEX idx_fuel_tenant ON public.tenant_driver_fuel USING btree (tenant_id);
CREATE INDEX idx_fuel_driver ON public.tenant_driver_fuel USING btree (driver_id);
CREATE INDEX idx_fuel_date ON public.tenant_driver_fuel USING btree (date);
CREATE INDEX idx_fuel_status ON public.tenant_driver_fuel USING btree (status);
CREATE INDEX idx_fuel_created ON public.tenant_driver_fuel USING btree (created_at);

-- Table: tenant_driver_fuel_submissions
CREATE TABLE IF NOT EXISTS tenant_driver_fuel_submissions (
  submission_id INTEGER DEFAULT nextval('tenant_driver_fuel_submissions_submission_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  fuel_date DATE NOT NULL,
  station_name VARCHAR(100) NOT NULL,
  litres DECIMAL(6,2) NOT NULL,
  cost DECIMAL(8,2) NOT NULL,
  price_per_litre DECIMAL(5,3) NOT NULL,
  vehicle_mileage INTEGER,
  receipt_uploaded BOOLEAN DEFAULT false,
  receipt_filename VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending'::character varying,
  submitted_date DATE DEFAULT CURRENT_DATE,
  approved_by INTEGER,
  approved_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (submission_id)
);
CREATE INDEX idx_driver_fuel_driver_date ON public.tenant_driver_fuel_submissions USING btree (driver_id, fuel_date);

-- Table: tenant_driver_holiday_balances
CREATE TABLE IF NOT EXISTS tenant_driver_holiday_balances (
  balance_id INTEGER DEFAULT nextval('tenant_driver_holiday_balances_balance_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  balance_year INTEGER DEFAULT EXTRACT(year FROM CURRENT_DATE) NOT NULL,
  balance_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by INTEGER,
  PRIMARY KEY (balance_id),
  UNIQUE (tenant_id, driver_id, balance_year)
);
CREATE INDEX idx_driver_holiday_balances_lookup ON public.tenant_driver_holiday_balances USING btree (tenant_id, driver_id, balance_year);
CREATE INDEX idx_balance_tenant ON public.tenant_driver_holiday_balances USING btree (tenant_id);
CREATE INDEX idx_balance_driver ON public.tenant_driver_holiday_balances USING btree (driver_id);

-- Table: tenant_driver_holidays
CREATE TABLE IF NOT EXISTS tenant_driver_holidays (
  holiday_id INTEGER DEFAULT nextval('tenant_driver_holidays_holiday_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  holiday_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'::character varying,
  approved_by INTEGER,
  approved_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  notes TEXT,
  days_count INTEGER,
  is_paid BOOLEAN DEFAULT true,
  requested_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (holiday_id)
);

-- Table: tenant_driver_hours
CREATE TABLE IF NOT EXISTS tenant_driver_hours (
  submission_id INTEGER DEFAULT nextval('tenant_driver_hours_submission_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  week_ending DATE NOT NULL,
  regular_hours DECIMAL(4,2) NOT NULL,
  overtime_hours DECIMAL(4,2) DEFAULT 0,
  total_hours DECIMAL(4,2) NOT NULL,
  hourly_rate DECIMAL(6,2) NOT NULL,
  overtime_rate DECIMAL(6,2) NOT NULL,
  total_pay DECIMAL(8,2) NOT NULL,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending'::character varying,
  submitted_date DATE DEFAULT CURRENT_DATE,
  approved_by INTEGER,
  approved_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (submission_id)
);
CREATE INDEX idx_driver_hours_driver_week ON public.tenant_driver_hours USING btree (driver_id, week_ending);
CREATE INDEX idx_hours_tenant ON public.tenant_driver_hours USING btree (tenant_id);
CREATE INDEX idx_hours_driver ON public.tenant_driver_hours USING btree (driver_id);
CREATE INDEX idx_hours_week ON public.tenant_driver_hours USING btree (week_ending);
CREATE INDEX idx_hours_status ON public.tenant_driver_hours USING btree (status);
CREATE INDEX idx_hours_created ON public.tenant_driver_hours USING btree (created_at);

-- Table: tenant_driver_performance_metrics
CREATE TABLE IF NOT EXISTS tenant_driver_performance_metrics (
  metric_id INTEGER DEFAULT nextval('tenant_driver_performance_metrics_metric_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  completed_journeys INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  cancellations INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  punctuality_score DECIMAL(5,2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (metric_id)
);
CREATE INDEX idx_driver_performance_driver_tenant ON public.tenant_driver_performance_metrics USING btree (driver_id, tenant_id);

-- Table: tenant_driver_permits
CREATE TABLE IF NOT EXISTS tenant_driver_permits (
  permit_record_id INTEGER DEFAULT nextval('tenant_driver_permits_permit_record_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  permit_type VARCHAR(20) NOT NULL,
  has_permit BOOLEAN DEFAULT false NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  permit_number VARCHAR(50),
  issuing_authority VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (permit_record_id),
  UNIQUE (tenant_id, driver_id, permit_type)
);
CREATE INDEX idx_driver_permits_driver_expiry ON public.tenant_driver_permits USING btree (driver_id, expiry_date);
CREATE INDEX idx_driver_permits_tenant_driver ON public.tenant_driver_permits USING btree (tenant_id, driver_id);
CREATE INDEX idx_driver_permits_expiry ON public.tenant_driver_permits USING btree (expiry_date) WHERE (has_permit = true);
CREATE INDEX idx_driver_permits_type ON public.tenant_driver_permits USING btree (permit_type);

-- Table: tenant_driver_roles
CREATE TABLE IF NOT EXISTS tenant_driver_roles (
  role_record_id INTEGER DEFAULT nextval('tenant_driver_roles_role_record_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  vulnerable_passengers BOOLEAN DEFAULT true NOT NULL,
  section19_driver BOOLEAN DEFAULT false NOT NULL,
  section22_driver BOOLEAN DEFAULT false NOT NULL,
  vehicle_owner BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_record_id),
  UNIQUE (tenant_id, driver_id)
);
CREATE INDEX idx_driver_roles_tenant_driver ON public.tenant_driver_roles USING btree (tenant_id, driver_id);

-- Table: tenant_driver_status_updates
CREATE TABLE IF NOT EXISTS tenant_driver_status_updates (
  update_id INTEGER DEFAULT nextval('tenant_driver_status_updates_update_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  customer_id INTEGER,
  assignment_date DATE NOT NULL,
  time_period VARCHAR(10) NOT NULL,
  old_status VARCHAR(20) NOT NULL,
  new_status VARCHAR(20) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  location_data JSONB,
  device_info JSONB,
  driver_name VARCHAR(255),
  customer_name VARCHAR(255),
  id INTEGER,
  PRIMARY KEY (update_id)
);
CREATE INDEX idx_driver_status_updates_driver_date ON public.tenant_driver_status_updates USING btree (driver_id, assignment_date);

-- Table: tenant_driver_timesheets
CREATE TABLE IF NOT EXISTS tenant_driver_timesheets (
  id INTEGER DEFAULT nextval('tenant_driver_timesheets_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  week_starting DATE NOT NULL,
  week_ending DATE NOT NULL,
  regular_hours DECIMAL(5,2) DEFAULT 0 NOT NULL,
  overtime_hours DECIMAL(5,2) DEFAULT 0 NOT NULL,
  total_hours DECIMAL(5,2) DEFAULT 0 NOT NULL,
  regular_pay DECIMAL(10,2),
  overtime_pay DECIMAL(10,2),
  total_pay DECIMAL(10,2),
  monday_hours DECIMAL(5,2) DEFAULT 0,
  tuesday_hours DECIMAL(5,2) DEFAULT 0,
  wednesday_hours DECIMAL(5,2) DEFAULT 0,
  thursday_hours DECIMAL(5,2) DEFAULT 0,
  friday_hours DECIMAL(5,2) DEFAULT 0,
  saturday_hours DECIMAL(5,2) DEFAULT 0,
  sunday_hours DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  driver_notes TEXT,
  status VARCHAR(20) DEFAULT 'draft'::character varying NOT NULL,
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by INTEGER,
  rejected_at TIMESTAMP,
  rejected_by INTEGER,
  rejection_reason TEXT,
  payroll_period_id INTEGER,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (tenant_id, driver_id, week_starting)
);
CREATE INDEX idx_timesheets_tenant ON public.tenant_driver_timesheets USING btree (tenant_id);
CREATE INDEX idx_timesheets_driver ON public.tenant_driver_timesheets USING btree (driver_id);
CREATE INDEX idx_timesheets_status ON public.tenant_driver_timesheets USING btree (tenant_id, status);
CREATE INDEX idx_timesheets_week ON public.tenant_driver_timesheets USING btree (tenant_id, week_starting);
CREATE INDEX idx_timesheets_approval ON public.tenant_driver_timesheets USING btree (tenant_id, status, approved_by);

-- Table: tenant_driver_training_records
CREATE TABLE IF NOT EXISTS tenant_driver_training_records (
  record_id INTEGER DEFAULT nextval('tenant_driver_training_records_record_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  training_type VARCHAR(100) NOT NULL,
  training_title VARCHAR(200) NOT NULL,
  completed_date DATE NOT NULL,
  expiry_date DATE,
  certificate_number VARCHAR(100),
  training_provider VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (record_id)
);

-- Table: tenant_drivers
CREATE TABLE IF NOT EXISTS tenant_drivers (
  driver_id INTEGER DEFAULT nextval('tenant_drivers_driver_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  license_number VARCHAR(100),
  license_expiry DATE,
  vehicle_type VARCHAR(50),
  weekly_wage DECIMAL(10,2),
  weekly_lease DECIMAL(10,2),
  vehicle_id INTEGER,
  dbs_check_date DATE,
  dbs_expiry_date DATE,
  section19_permit BOOLEAN DEFAULT false,
  section19_expiry DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  employment_type VARCHAR(20) DEFAULT 'contracted'::character varying,
  salary_structure JSONB,
  vehicle_assignment INTEGER,
  section19_driver_auth BOOLEAN DEFAULT false,
  section19_driver_expiry DATE,
  section22_driver_auth BOOLEAN DEFAULT false,
  section22_driver_expiry DATE,
  mot_date DATE,
  mot_expiry_date DATE,
  driver_roles JSONB,
  start_date DATE,
  contract_end_date DATE,
  employment_status VARCHAR(50) DEFAULT 'active'::character varying,
  holidays JSONB DEFAULT '[]'::jsonb,
  availability_restrictions JSONB DEFAULT '{}'::jsonb,
  qualifications JSONB DEFAULT '[]'::jsonb,
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(20),
  notes TEXT,
  assigned_vehicle VARCHAR(50),
  user_id INTEGER,
  is_login_enabled BOOLEAN DEFAULT false,
  license_class VARCHAR(20),
  preferred_hours TEXT,
  deleted_at TIMESTAMP,
  monthly_salary DECIMAL(10,2),
  hourly_rate DECIMAL(10,2),
  bank_account_name VARCHAR(255),
  bank_sort_code VARCHAR(10),
  bank_account_number VARCHAR(20),
  tax_code VARCHAR(20),
  ni_number VARCHAR(20),
  PRIMARY KEY (driver_id),
  UNIQUE (tenant_id, driver_id),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX idx_tenant_drivers_tenant_id ON public.tenant_drivers USING btree (tenant_id);
CREATE INDEX idx_tenant_drivers_tenant ON public.tenant_drivers USING btree (tenant_id);
CREATE INDEX idx_tenant_drivers_status ON public.tenant_drivers USING btree (tenant_id, employment_status);
CREATE INDEX idx_tenant_drivers_user_id ON public.tenant_drivers USING btree (user_id);
CREATE UNIQUE INDEX unique_driver_user_per_tenant ON public.tenant_drivers USING btree (tenant_id, user_id);
CREATE INDEX idx_tenant_drivers_permits ON public.tenant_drivers USING btree (tenant_id) WHERE ((is_active = true) AND ((dbs_expiry_date IS NOT NULL) OR (section19_driver_auth = true) OR (section22_driver_auth = true) OR (mot_expiry_date IS NOT NULL)));
CREATE INDEX idx_tenant_drivers_expiry_dates ON public.tenant_drivers USING btree (dbs_expiry_date, section19_driver_expiry, section22_driver_expiry, mot_expiry_date) WHERE (is_active = true);
CREATE UNIQUE INDEX tenant_drivers_tenant_driver_unique ON public.tenant_drivers USING btree (tenant_id, driver_id);
CREATE INDEX idx_tenant_drivers_tenant_active ON public.tenant_drivers USING btree (tenant_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_tenant_drivers_license ON public.tenant_drivers USING btree (tenant_id, license_number);
CREATE INDEX idx_drivers_user_fk ON public.tenant_drivers USING btree (user_id);
CREATE INDEX idx_drivers_tenant_id ON public.tenant_drivers USING btree (tenant_id);

-- Table: tenant_email_log
CREATE TABLE IF NOT EXISTS tenant_email_log (
  email_log_id INTEGER DEFAULT nextval('tenant_email_log_email_log_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  invoice_id INTEGER,
  to_email VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  template_ref INTEGER,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_by INTEGER,
  delivery_status VARCHAR(50) DEFAULT 'sent'::character varying,
  error_message TEXT,
  PRIMARY KEY (email_log_id)
);
CREATE INDEX idx_tenant_email_log_invoice ON public.tenant_email_log USING btree (tenant_id, invoice_id);

-- Table: tenant_email_templates
CREATE TABLE IF NOT EXISTS tenant_email_templates (
  id INTEGER DEFAULT nextval('tenant_email_templates_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  subject VARCHAR(200),
  body_html TEXT,
  body_text TEXT,
  template_type VARCHAR(50) DEFAULT 'invoice'::character varying,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  template_id INTEGER DEFAULT nextval('tenant_email_templates_template_id_seq'::regclass) NOT NULL,
  template_name VARCHAR(255),
  subject_template TEXT,
  body_template TEXT,
  created_by INTEGER,
  PRIMARY KEY (id)
);
CREATE INDEX idx_tenant_email_templates_active ON public.tenant_email_templates USING btree (tenant_id, is_active);

-- Table: tenant_employee_vehicles
CREATE TABLE IF NOT EXISTS tenant_employee_vehicles (
  assignment_id INTEGER DEFAULT nextval('tenant_employee_vehicles_assignment_id_seq'::regclass) NOT NULL,
  employee_id INTEGER,
  vehicle_id INTEGER,
  is_primary_driver BOOLEAN DEFAULT false,
  assigned_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (assignment_id)
);

-- Table: tenant_employees
CREATE TABLE IF NOT EXISTS tenant_employees (
  employee_id INTEGER DEFAULT nextval('tenant_employees_employee_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  ni_number VARCHAR(15),
  employee_type VARCHAR(20) NOT NULL,
  employment_status VARCHAR(20) NOT NULL,
  position VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  base_wage DECIMAL(10,2),
  wage_type VARCHAR(20),
  tax_code VARCHAR(10) DEFAULT '1257L'::character varying,
  license_number VARCHAR(50),
  license_expiry DATE,
  vehicle_category VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  department VARCHAR(100),
  end_date DATE,
  ni_category CHARACTER DEFAULT 'A'::bpchar,
  pension_contribution_percent DECIMAL(5,2) DEFAULT 0,
  license_type VARCHAR(20),
  gross_annual_salary DECIMAL(10,2),
  ni_employer_contribution DECIMAL(10,2),
  total_employment_cost DECIMAL(10,2),
  address TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (employee_id)
);

-- Table: tenant_financial_periods
CREATE TABLE IF NOT EXISTS tenant_financial_periods (
  period_id INTEGER DEFAULT nextval('tenant_financial_periods_period_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  period_name VARCHAR(100) NOT NULL,
  period_type VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  revenue DECIMAL(12,2) DEFAULT 0,
  expenses DECIMAL(12,2) DEFAULT 0,
  profit DECIMAL(12,2),
  customer_count INTEGER DEFAULT 0,
  trip_count INTEGER DEFAULT 0,
  miles_driven DECIMAL(10,2) DEFAULT 0,
  is_closed BOOLEAN DEFAULT false,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (period_id),
  UNIQUE (tenant_id, period_name)
);

-- Table: tenant_financial_tracking
CREATE TABLE IF NOT EXISTS tenant_financial_tracking (
  tenant_id INTEGER NOT NULL,
  financial_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  created_by INTEGER,
  PRIMARY KEY (tenant_id)
);
CREATE INDEX idx_tenant_financial_jsonb ON public.tenant_financial_tracking USING gin (financial_data);
CREATE INDEX idx_tenant_financial_vat_registered ON public.tenant_financial_tracking USING btree ((((financial_data -> 'taxation'::text) ->> 'vatRegistered'::text)));

-- Table: tenant_financial_transactions
CREATE TABLE IF NOT EXISTS tenant_financial_transactions (
  transaction_id INTEGER DEFAULT nextval('tenant_financial_transactions_transaction_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(50),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_number VARCHAR(100),
  budget_id INTEGER,
  invoice_id INTEGER,
  payment_method VARCHAR(30),
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2),
  reconciled BOOLEAN DEFAULT false,
  reconciled_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  PRIMARY KEY (transaction_id)
);
CREATE INDEX idx_tenant_financial_trans_date ON public.tenant_financial_transactions USING btree (tenant_id, transaction_date);
CREATE INDEX idx_tenant_financial_trans_type ON public.tenant_financial_transactions USING btree (tenant_id, transaction_type, category);

-- Table: tenant_freelance_submissions
CREATE TABLE IF NOT EXISTS tenant_freelance_submissions (
  submission_id INTEGER DEFAULT nextval('tenant_freelance_submissions_submission_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  period_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  invoice_number VARCHAR(100),
  invoice_date DATE NOT NULL,
  invoice_amount DECIMAL(10,2) NOT NULL,
  tax_paid DECIMAL(10,2) DEFAULT 0,
  ni_paid DECIMAL(10,2) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'pending'::character varying,
  payment_date DATE,
  payment_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (submission_id)
);
CREATE INDEX idx_freelance_submissions_tenant ON public.tenant_freelance_submissions USING btree (tenant_id);
CREATE INDEX idx_freelance_submissions_period ON public.tenant_freelance_submissions USING btree (period_id);
CREATE INDEX idx_freelance_submissions_driver ON public.tenant_freelance_submissions USING btree (driver_id);

-- Table: tenant_fuel_cards
CREATE TABLE IF NOT EXISTS tenant_fuel_cards (
  card_id INTEGER DEFAULT nextval('tenant_fuel_cards_card_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  last_four VARCHAR(4) NOT NULL,
  provider VARCHAR(100),
  pin_encrypted VARCHAR(255),
  assigned_driver_id INTEGER,
  assigned_vehicle_id INTEGER,
  monthly_limit DECIMAL(10,2),
  daily_limit DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'active'::character varying,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (card_id)
);

-- Table: tenant_fuel_efficiency
CREATE TABLE IF NOT EXISTS tenant_fuel_efficiency (
  efficiency_id INTEGER DEFAULT nextval('tenant_fuel_efficiency_efficiency_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  vehicle_id INTEGER,
  driver_id INTEGER,
  total_miles DECIMAL(10,2) DEFAULT 0,
  total_litres DECIMAL(10,3) DEFAULT 0,
  average_mpg DECIMAL(6,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  cost_per_mile DECIMAL(6,3) DEFAULT 0,
  target_mpg DECIMAL(6,2) DEFAULT 30,
  target_cost_per_mile DECIMAL(6,3) DEFAULT 0.15,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (efficiency_id)
);

-- Table: tenant_fuel_settings
CREATE TABLE IF NOT EXISTS tenant_fuel_settings (
  setting_id INTEGER DEFAULT nextval('tenant_fuel_settings_setting_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  alert_low_efficiency_mpg DECIMAL(4,1) DEFAULT 25.0,
  alert_high_cost_single DECIMAL(8,2) DEFAULT 100.00,
  monthly_budget DECIMAL(10,2),
  price_per_litre_estimate DECIMAL(6,3) DEFAULT 1.50,
  auto_calculate_mpg BOOLEAN DEFAULT true,
  require_mileage_entry BOOLEAN DEFAULT false,
  default_fuel_type VARCHAR(20) DEFAULT 'Petrol'::character varying,
  notification_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_id),
  UNIQUE (tenant_id)
);
CREATE UNIQUE INDEX uk_fuel_settings_tenant ON public.tenant_fuel_settings USING btree (tenant_id);

-- Table: tenant_fuel_transactions
CREATE TABLE IF NOT EXISTS tenant_fuel_transactions (
  transaction_id INTEGER DEFAULT nextval('tenant_fuel_transactions_transaction_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  card_id INTEGER,
  driver_id INTEGER,
  vehicle_id INTEGER,
  transaction_date DATE NOT NULL,
  transaction_time TIME WITHOUT TIME ZONE,
  station_name VARCHAR(200),
  litres DECIMAL(8,2),
  price_per_litre DECIMAL(6,4),
  total_cost DECIMAL(10,2),
  mileage INTEGER,
  previous_mileage INTEGER,
  mpg DECIMAL(6,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (transaction_id)
);
CREATE INDEX idx_tenant_fuel_transactions_date ON public.tenant_fuel_transactions USING btree (tenant_id, transaction_date);
CREATE INDEX idx_fuel_transactions_card_date_existing ON public.tenant_fuel_transactions USING btree (card_id, transaction_date DESC);
CREATE INDEX idx_fuel_transactions_tenant_date_existing ON public.tenant_fuel_transactions USING btree (tenant_id, transaction_date DESC);
CREATE INDEX idx_fuel_transactions_driver_existing ON public.tenant_fuel_transactions USING btree (tenant_id, driver_id);
CREATE INDEX idx_fuel_transactions_vehicle_existing ON public.tenant_fuel_transactions USING btree (tenant_id, vehicle_id);

-- Table: tenant_fuelcards
CREATE TABLE IF NOT EXISTS tenant_fuelcards (
  fuel_card_id INTEGER DEFAULT nextval('tenant_fuelcards_fuel_card_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  card_number_last_four CHARACTER NOT NULL,
  provider VARCHAR(50) NOT NULL,
  pin VARCHAR(20),
  driver_id INTEGER,
  vehicle_id INTEGER,
  monthly_limit DECIMAL(8,2),
  daily_limit DECIMAL(6,2),
  status VARCHAR(20) DEFAULT 'active'::character varying,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  PRIMARY KEY (fuel_card_id),
  UNIQUE (tenant_id, card_number_last_four)
);
CREATE UNIQUE INDEX uk_tenant_card_number ON public.tenant_fuelcards USING btree (tenant_id, card_number_last_four);
CREATE INDEX idx_fuelcards_tenant_driver_existing ON public.tenant_fuelcards USING btree (tenant_id, driver_id);
CREATE INDEX idx_fuelcards_tenant_status_existing ON public.tenant_fuelcards USING btree (tenant_id, status) WHERE (is_active = true);
CREATE INDEX idx_tenant_fuelcards_tenant_active ON public.tenant_fuelcards USING btree (tenant_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_tenant_fuelcards_driver ON public.tenant_fuelcards USING btree (tenant_id, driver_id);
CREATE INDEX idx_tenant_fuelcards_card_number ON public.tenant_fuelcards USING btree (tenant_id, card_number_last_four);

-- Table: tenant_holiday_balances
CREATE TABLE IF NOT EXISTS tenant_holiday_balances (
  id INTEGER DEFAULT nextval('tenant_holiday_balances_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  driver_id INTEGER,
  annual INTEGER DEFAULT 28,
  used INTEGER DEFAULT 0,
  remaining INTEGER DEFAULT 28,
  carried_over INTEGER DEFAULT 0,
  type VARCHAR(20) DEFAULT 'paid'::character varying,
  year INTEGER DEFAULT EXTRACT(year FROM CURRENT_DATE),
  updated_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (tenant_id, driver_id, year)
);

-- Table: tenant_holiday_blackout_dates
CREATE TABLE IF NOT EXISTS tenant_holiday_blackout_dates (
  blackout_id INTEGER DEFAULT nextval('tenant_holiday_blackout_dates_blackout_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255) NOT NULL,
  description TEXT,
  applies_to VARCHAR(20) DEFAULT 'all'::character varying NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by INTEGER,
  is_active BOOLEAN DEFAULT true NOT NULL,
  PRIMARY KEY (blackout_id)
);
CREATE INDEX idx_holiday_blackout_dates ON public.tenant_holiday_blackout_dates USING btree (tenant_id, start_date, end_date, is_active);

-- Table: tenant_holiday_requests
CREATE TABLE IF NOT EXISTS tenant_holiday_requests (
  request_id INTEGER DEFAULT nextval('tenant_holiday_requests_request_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER,
  customer_id INTEGER,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  type VARCHAR(20) DEFAULT 'annual'::character varying NOT NULL,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending'::character varying NOT NULL,
  requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  requested_by INTEGER,
  approved_date TIMESTAMP,
  approved_by INTEGER,
  rejected_date TIMESTAMP,
  rejected_by INTEGER,
  rejection_reason TEXT,
  cancelled_date TIMESTAMP,
  cancelled_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  employment_type VARCHAR(20),
  admin_notes TEXT,
  PRIMARY KEY (request_id)
);
CREATE INDEX idx_holiday_requests_tenant_driver ON public.tenant_holiday_requests USING btree (tenant_id, driver_id, start_date);
CREATE INDEX idx_holiday_requests_tenant_customer ON public.tenant_holiday_requests USING btree (tenant_id, customer_id, start_date);
CREATE INDEX idx_holiday_requests_status ON public.tenant_holiday_requests USING btree (tenant_id, status);
CREATE INDEX idx_holiday_requests_date_range ON public.tenant_holiday_requests USING btree (tenant_id, start_date, end_date);
CREATE INDEX idx_holiday_requests_type_year ON public.tenant_holiday_requests USING btree (tenant_id, type, EXTRACT(year FROM start_date));
CREATE INDEX idx_holiday_requests_tenant_status ON public.tenant_holiday_requests USING btree (tenant_id, status);
CREATE INDEX idx_holiday_requests_dates ON public.tenant_holiday_requests USING btree (start_date, end_date);
CREATE INDEX idx_holiday_tenant ON public.tenant_holiday_requests USING btree (tenant_id);
CREATE INDEX idx_holiday_driver ON public.tenant_holiday_requests USING btree (driver_id);
CREATE INDEX idx_holiday_customer ON public.tenant_holiday_requests USING btree (customer_id);
CREATE INDEX idx_holiday_status ON public.tenant_holiday_requests USING btree (status);
CREATE INDEX idx_holiday_dates ON public.tenant_holiday_requests USING btree (tenant_id, start_date, end_date);

-- Table: tenant_holidays
CREATE TABLE IF NOT EXISTS tenant_holidays (
  holiday_id INTEGER DEFAULT nextval('tenant_holidays_holiday_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  holiday_type VARCHAR(50) DEFAULT 'annual_leave'::character varying,
  status VARCHAR(20) DEFAULT 'pending'::character varying,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (holiday_id)
);
CREATE INDEX idx_tenant_holidays_tenant_date ON public.tenant_holidays USING btree (tenant_id, start_date, end_date);
CREATE INDEX idx_tenant_holidays_driver ON public.tenant_holidays USING btree (tenant_id, driver_id);
CREATE INDEX idx_tenant_holidays_status ON public.tenant_holidays USING btree (tenant_id, status);

-- Table: tenant_insurance_policies
CREATE TABLE IF NOT EXISTS tenant_insurance_policies (
  policy_id INTEGER DEFAULT nextval('tenant_insurance_policies_policy_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  policy_type VARCHAR(100) NOT NULL,
  policy_number VARCHAR(100) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  cover_amount DECIMAL(12,2) DEFAULT 0,
  excess DECIMAL(10,2) DEFAULT 0,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  renewal_date DATE,
  annual_premium DECIMAL(10,2) DEFAULT 0,
  payment_frequency VARCHAR(20) DEFAULT 'annual'::character varying,
  status VARCHAR(50) DEFAULT 'active'::character varying,
  auto_renew BOOLEAN DEFAULT false,
  document_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (policy_id)
);

-- Table: tenant_invoice_alerts
CREATE TABLE IF NOT EXISTS tenant_invoice_alerts (
  alert_id INTEGER DEFAULT nextval('tenant_invoice_alerts_alert_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  invoice_id INTEGER NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  alert_message TEXT NOT NULL,
  target_user_type VARCHAR(20),
  target_user_id INTEGER,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (alert_id)
);
CREATE INDEX idx_invoice_alerts_tenant ON public.tenant_invoice_alerts USING btree (tenant_id);
CREATE INDEX idx_invoice_alerts_target ON public.tenant_invoice_alerts USING btree (target_user_type, target_user_id);
CREATE INDEX idx_invoice_alerts_unread ON public.tenant_invoice_alerts USING btree (is_read) WHERE (is_read = false);

-- Table: tenant_invoice_emails
CREATE TABLE IF NOT EXISTS tenant_invoice_emails (
  email_log_id INTEGER DEFAULT nextval('tenant_invoice_emails_email_log_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  invoice_id INTEGER,
  recipient_email VARCHAR(255) NOT NULL,
  cc_emails TEXT,
  subject VARCHAR(500),
  body TEXT,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivery_status VARCHAR(50) DEFAULT 'sent'::character varying,
  error_message TEXT,
  email_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (email_log_id)
);
CREATE INDEX idx_invoice_emails_invoice ON public.tenant_invoice_emails USING btree (invoice_id);

-- Table: tenant_invoice_line_items
CREATE TABLE IF NOT EXISTS tenant_invoice_line_items (
  line_item_id INTEGER DEFAULT nextval('tenant_invoice_line_items_line_item_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  invoice_id INTEGER NOT NULL,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1 NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  trip_id INTEGER,
  assignment_id INTEGER,
  service_date DATE,
  provider_name VARCHAR(255),
  provider_percentage INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (line_item_id)
);
CREATE INDEX idx_invoice_line_items_invoice ON public.tenant_invoice_line_items USING btree (invoice_id);
CREATE INDEX idx_invoice_line_items_tenant ON public.tenant_invoice_line_items USING btree (tenant_id);
CREATE INDEX idx_invoice_line_items_trip ON public.tenant_invoice_line_items USING btree (trip_id);
CREATE INDEX idx_invoice_line_items_assignment ON public.tenant_invoice_line_items USING btree (assignment_id);

-- Table: tenant_invoice_reminder_config
CREATE TABLE IF NOT EXISTS tenant_invoice_reminder_config (
  tenant_id INTEGER NOT NULL,
  reminders_enabled BOOLEAN DEFAULT true NOT NULL,
  default_pre_due_days INTEGER DEFAULT 7,
  default_overdue_1st_days INTEGER DEFAULT 7,
  default_overdue_2nd_days INTEGER DEFAULT 14,
  default_overdue_3rd_days INTEGER DEFAULT 21,
  default_final_warning_days INTEGER DEFAULT 28,
  from_email VARCHAR(255),
  from_name VARCHAR(255),
  reply_to_email VARCHAR(255),
  include_company_logo BOOLEAN DEFAULT true,
  include_payment_link BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_by INTEGER,
  PRIMARY KEY (tenant_id)
);

-- Table: tenant_invoice_reminder_log
CREATE TABLE IF NOT EXISTS tenant_invoice_reminder_log (
  log_id INTEGER DEFAULT nextval('tenant_invoice_reminder_log_log_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  invoice_id INTEGER NOT NULL,
  reminder_id INTEGER,
  event_type VARCHAR(50) NOT NULL,
  reminder_type VARCHAR(20) NOT NULL,
  recipient_email VARCHAR(255),
  cc_emails TEXT,
  success BOOLEAN,
  error_message TEXT,
  email_provider_response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  created_by INTEGER,
  PRIMARY KEY (log_id)
);
CREATE INDEX idx_reminder_log_tenant ON public.tenant_invoice_reminder_log USING btree (tenant_id);
CREATE INDEX idx_reminder_log_invoice ON public.tenant_invoice_reminder_log USING btree (tenant_id, invoice_id);
CREATE INDEX idx_reminder_log_created ON public.tenant_invoice_reminder_log USING btree (created_at);
CREATE INDEX idx_reminder_log_event ON public.tenant_invoice_reminder_log USING btree (tenant_id, event_type);

-- Table: tenant_invoice_reminders
CREATE TABLE IF NOT EXISTS tenant_invoice_reminders (
  reminder_id INTEGER DEFAULT nextval('tenant_invoice_reminders_reminder_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  invoice_id INTEGER,
  reminder_type VARCHAR(50) NOT NULL,
  scheduled_date DATE NOT NULL,
  sent_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending'::character varying,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (reminder_id)
);
CREATE INDEX idx_invoice_reminders_scheduled ON public.tenant_invoice_reminders USING btree (scheduled_date, status);
CREATE INDEX idx_invoice_reminders_invoice ON public.tenant_invoice_reminders USING btree (invoice_id);
CREATE INDEX idx_invoice_reminders_tenant ON public.tenant_invoice_reminders USING btree (tenant_id);
CREATE INDEX idx_invoice_reminders_status ON public.tenant_invoice_reminders USING btree (tenant_id, status);

-- Table: tenant_invoice_settings
CREATE TABLE IF NOT EXISTS tenant_invoice_settings (
  tenant_id INTEGER NOT NULL,
  invoice_prefix VARCHAR(10) DEFAULT 'INV'::character varying NOT NULL,
  next_invoice_number INTEGER DEFAULT 1 NOT NULL,
  default_payment_terms_days INTEGER DEFAULT 30 NOT NULL,
  auto_generate_enabled BOOLEAN DEFAULT false NOT NULL,
  auto_send_enabled BOOLEAN DEFAULT false NOT NULL,
  organization_invoice_days JSONB DEFAULT '{}'::jsonb,
  invoice_from_email VARCHAR(255),
  invoice_reply_to VARCHAR(255),
  default_invoice_notes TEXT,
  cancellation_charge_hours INTEGER DEFAULT 24,
  partial_cancellation_hours INTEGER DEFAULT 2,
  partial_cancellation_percentage INTEGER DEFAULT 50,
  no_show_charge_percentage INTEGER DEFAULT 100,
  default_tax_rate DECIMAL(5,2) DEFAULT 0.00,
  tax_inclusive BOOLEAN DEFAULT true,
  currency_code VARCHAR(3) DEFAULT 'GBP'::character varying,
  decimal_places INTEGER DEFAULT 2,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id)
);

-- Table: tenant_invoice_split_payments
CREATE TABLE IF NOT EXISTS tenant_invoice_split_payments (
  split_payment_id INTEGER DEFAULT nextval('tenant_invoice_split_payments_split_payment_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  invoice_id INTEGER NOT NULL,
  provider_name VARCHAR(255) NOT NULL,
  provider_id INTEGER,
  split_percentage DECIMAL(5,2) NOT NULL,
  split_amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0.00,
  payment_status VARCHAR(20) DEFAULT 'unpaid'::character varying,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  PRIMARY KEY (split_payment_id)
);
CREATE INDEX idx_split_payments_tenant ON public.tenant_invoice_split_payments USING btree (tenant_id);
CREATE INDEX idx_split_payments_invoice ON public.tenant_invoice_split_payments USING btree (tenant_id, invoice_id);
CREATE INDEX idx_split_payments_provider ON public.tenant_invoice_split_payments USING btree (provider_name);
CREATE INDEX idx_split_payments_status ON public.tenant_invoice_split_payments USING btree (payment_status);

-- Table: tenant_invoices
CREATE TABLE IF NOT EXISTS tenant_invoices (
  invoice_id INTEGER DEFAULT nextval('tenant_invoices_invoice_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  customer_id INTEGER,
  customer_name VARCHAR(255),
  paying_org VARCHAR(255) NOT NULL,
  invoice_date DATE DEFAULT CURRENT_DATE NOT NULL,
  due_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  subtotal DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  total_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  invoice_status VARCHAR(20) DEFAULT 'draft'::character varying NOT NULL,
  invoice_type VARCHAR(20) DEFAULT 'standard'::character varying NOT NULL,
  is_split_payment BOOLEAN DEFAULT false NOT NULL,
  split_provider VARCHAR(255),
  split_percentage INTEGER,
  parent_customer_id INTEGER,
  notes TEXT,
  payment_terms_days INTEGER DEFAULT 30,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP,
  email_address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMP,
  archived_by INTEGER,
  PRIMARY KEY (invoice_id)
);
CREATE UNIQUE INDEX idx_tenant_invoice_number ON public.tenant_invoices USING btree (tenant_id, invoice_number);
CREATE INDEX idx_tenant_invoices_customer ON public.tenant_invoices USING btree (tenant_id, customer_id);
CREATE INDEX idx_tenant_invoices_status ON public.tenant_invoices USING btree (tenant_id, invoice_status);
CREATE INDEX idx_tenant_invoices_date ON public.tenant_invoices USING btree (tenant_id, invoice_date);
CREATE INDEX idx_tenant_invoices_due_date ON public.tenant_invoices USING btree (tenant_id, due_date);
CREATE INDEX idx_tenant_invoices_split ON public.tenant_invoices USING btree (tenant_id, is_split_payment);
CREATE INDEX idx_tenant_invoices_paying_org ON public.tenant_invoices USING btree (tenant_id, paying_org);
CREATE INDEX idx_tenant_invoices_tenant_status ON public.tenant_invoices USING btree (tenant_id, invoice_status);
CREATE INDEX idx_tenant_invoices_tenant_date ON public.tenant_invoices USING btree (tenant_id, invoice_date DESC);

-- Table: tenant_licenses_permits
CREATE TABLE IF NOT EXISTS tenant_licenses_permits (
  license_id INTEGER DEFAULT nextval('tenant_licenses_permits_license_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  license_type VARCHAR(100) NOT NULL,
  license_number VARCHAR(100),
  issuing_authority VARCHAR(255),
  issue_date DATE,
  expiry_date DATE,
  renewal_date DATE,
  status VARCHAR(50) DEFAULT 'pending'::character varying,
  renewal_notice_days INTEGER DEFAULT 60,
  annual_fee DECIMAL(10,2) DEFAULT 0,
  document_path VARCHAR(500),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (license_id)
);

-- Table: tenant_maintenance
CREATE TABLE IF NOT EXISTS tenant_maintenance (
  maintenance_id INTEGER DEFAULT nextval('tenant_maintenance_maintenance_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  vehicle_id INTEGER,
  maintenance_date DATE NOT NULL,
  maintenance_type VARCHAR(100),
  description TEXT,
  cost DECIMAL(10,2),
  next_service_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (maintenance_id)
);

-- Table: tenant_messages
CREATE TABLE IF NOT EXISTS tenant_messages (
  message_id INTEGER DEFAULT nextval('tenant_messages_message_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  target_customer_id INTEGER,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal'::character varying,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  expires_at TIMESTAMP,
  PRIMARY KEY (message_id)
);
CREATE INDEX idx_tenant_messages_tenant ON public.tenant_messages USING btree (tenant_id);
CREATE INDEX idx_tenant_messages_customer ON public.tenant_messages USING btree (target_customer_id);
CREATE INDEX idx_tenant_messages_created ON public.tenant_messages USING btree (created_at DESC);
CREATE INDEX idx_tenant_messages_tenant_created ON public.tenant_messages USING btree (tenant_id, created_at DESC);
CREATE INDEX idx_tenant_messages_priority ON public.tenant_messages USING btree (tenant_id, priority);

-- Table: tenant_office_staff
CREATE TABLE IF NOT EXISTS tenant_office_staff (
  id INTEGER DEFAULT nextval('tenant_office_staff_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  employee_number VARCHAR(50),
  job_title VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  employment_type VARCHAR(20) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  salary_annual DECIMAL(10,2),
  hourly_rate DECIMAL(10,2),
  manager_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (tenant_id, employee_number)
);
CREATE INDEX idx_office_staff_tenant ON public.tenant_office_staff USING btree (tenant_id);
CREATE INDEX idx_office_staff_active ON public.tenant_office_staff USING btree (tenant_id, is_active);
CREATE INDEX idx_office_staff_department ON public.tenant_office_staff USING btree (tenant_id, department);
CREATE INDEX idx_office_staff_manager ON public.tenant_office_staff USING btree (manager_id);
CREATE INDEX idx_tenant_office_staff_tenant_active ON public.tenant_office_staff USING btree (tenant_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_tenant_office_staff_email ON public.tenant_office_staff USING btree (tenant_id, email);

-- Table: tenant_organization_details
CREATE TABLE IF NOT EXISTS tenant_organization_details (
  organization_id INTEGER DEFAULT nextval('tenant_organization_details_organization_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  company_number VARCHAR(20),
  registered_name VARCHAR(255),
  trading_name VARCHAR(255),
  registered_address TEXT,
  incorporation_date DATE,
  business_type VARCHAR(50) DEFAULT 'limited_company'::character varying,
  primary_email VARCHAR(255),
  primary_phone VARCHAR(50),
  website_url VARCHAR(255),
  decision_making VARCHAR(50) DEFAULT 'board'::character varying,
  meeting_frequency VARCHAR(20) DEFAULT 'monthly'::character varying,
  last_board_meeting DATE,
  next_board_meeting DATE,
  ownership_structure VARCHAR(50) DEFAULT 'private'::character varying,
  member_count INTEGER DEFAULT 0,
  platform_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMP,
  platform_join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_by INTEGER,
  PRIMARY KEY (organization_id),
  UNIQUE (tenant_id)
);

-- Table: tenant_organizational_permits
CREATE TABLE IF NOT EXISTS tenant_organizational_permits (
  permit_id INTEGER DEFAULT nextval('tenant_organizational_permits_permit_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  permit_type VARCHAR(20) NOT NULL,
  organisation_name VARCHAR(200) NOT NULL,
  permit_number VARCHAR(50) NOT NULL,
  issue_date DATE,
  expiry_date DATE NOT NULL,
  issuing_authority VARCHAR(100) DEFAULT 'Traffic Commissioner'::character varying,
  conditions TEXT,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active'::character varying NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (permit_id),
  UNIQUE (tenant_id, permit_type, permit_number)
);
CREATE INDEX idx_org_permits_tenant ON public.tenant_organizational_permits USING btree (tenant_id);
CREATE INDEX idx_org_permits_type ON public.tenant_organizational_permits USING btree (permit_type);
CREATE INDEX idx_org_permits_expiry ON public.tenant_organizational_permits USING btree (expiry_date);
CREATE INDEX idx_org_permits_status ON public.tenant_organizational_permits USING btree (status);

-- Table: tenant_organizational_structure
CREATE TABLE IF NOT EXISTS tenant_organizational_structure (
  tenant_id INTEGER NOT NULL,
  organizational_structure JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  created_by INTEGER,
  PRIMARY KEY (tenant_id)
);
CREATE INDEX idx_tenant_org_structure_jsonb ON public.tenant_organizational_structure USING gin (organizational_structure);
CREATE INDEX idx_tenant_org_structure_type ON public.tenant_organizational_structure USING btree (((organizational_structure ->> 'type'::text)));

-- Table: tenant_outing_bookings
CREATE TABLE IF NOT EXISTS tenant_outing_bookings (
  id INTEGER DEFAULT nextval('tenant_outing_bookings_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  outing_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  customer_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  booking_status VARCHAR(50) DEFAULT 'confirmed'::character varying,
  pickup_location VARCHAR(255),
  special_requirements TEXT,
  dietary_requirements TEXT,
  emergency_contact_override VARCHAR(255),
  emergency_phone_override VARCHAR(20),
  payment_status VARCHAR(50) DEFAULT 'pending'::character varying,
  amount_paid DECIMAL(10,2) DEFAULT 0.00,
  payment_method VARCHAR(50),
  payment_date TIMESTAMP,
  booked_by VARCHAR(255),
  booking_notes TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP,
  cancelled_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (tenant_id, outing_id, customer_id)
);
CREATE UNIQUE INDEX unique_outing_booking ON public.tenant_outing_bookings USING btree (tenant_id, outing_id, customer_id);
CREATE INDEX idx_tenant_outing_bookings_tenant ON public.tenant_outing_bookings USING btree (tenant_id);
CREATE INDEX idx_tenant_outing_bookings_outing ON public.tenant_outing_bookings USING btree (tenant_id, outing_id);
CREATE INDEX idx_tenant_outing_bookings_customer ON public.tenant_outing_bookings USING btree (tenant_id, customer_id);
CREATE INDEX idx_tenant_outing_bookings_status ON public.tenant_outing_bookings USING btree (booking_status);

-- Table: tenant_outing_rotas
CREATE TABLE IF NOT EXISTS tenant_outing_rotas (
  id INTEGER DEFAULT nextval('tenant_outing_rotas_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  outing_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  vehicle_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  role VARCHAR(50) DEFAULT 'driver'::character varying,
  assignment_status VARCHAR(50) DEFAULT 'assigned'::character varying,
  assigned_passengers JSONB DEFAULT '[]'::jsonb,
  pickup_route JSONB DEFAULT '[]'::jsonb,
  estimated_duration_minutes INTEGER,
  actual_start_time TIMESTAMP,
  actual_end_time TIMESTAMP,
  driver_notes TEXT,
  pre_trip_checklist JSONB DEFAULT '{}'::jsonb,
  post_trip_report TEXT,
  schedule_conflicts JSONB DEFAULT '[]'::jsonb,
  conflict_override_reason TEXT,
  conflict_approved_by VARCHAR(255),
  assigned_by VARCHAR(255),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_by_driver BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (tenant_id, outing_id, driver_id)
);
CREATE UNIQUE INDEX unique_outing_driver ON public.tenant_outing_rotas USING btree (tenant_id, outing_id, driver_id);
CREATE INDEX idx_tenant_outing_rotas_tenant ON public.tenant_outing_rotas USING btree (tenant_id);
CREATE INDEX idx_tenant_outing_rotas_outing ON public.tenant_outing_rotas USING btree (tenant_id, outing_id);
CREATE INDEX idx_tenant_outing_rotas_driver ON public.tenant_outing_rotas USING btree (tenant_id, driver_id);
CREATE INDEX idx_tenant_outing_rotas_date ON public.tenant_outing_rotas USING btree (tenant_id, created_at);

-- Table: tenant_payment_records
CREATE TABLE IF NOT EXISTS tenant_payment_records (
  payment_id INTEGER DEFAULT nextval('tenant_payment_records_payment_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  invoice_id INTEGER NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'bank_transfer'::character varying NOT NULL,
  reference_number VARCHAR(100),
  payment_status VARCHAR(20) DEFAULT 'completed'::character varying NOT NULL,
  processed_by INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  split_payment_id INTEGER,
  paid_by_provider VARCHAR(255),
  PRIMARY KEY (payment_id)
);
CREATE INDEX idx_payment_records_tenant ON public.tenant_payment_records USING btree (tenant_id);
CREATE INDEX idx_payment_records_invoice ON public.tenant_payment_records USING btree (invoice_id);
CREATE INDEX idx_payment_records_date ON public.tenant_payment_records USING btree (tenant_id, payment_date);
CREATE INDEX idx_payment_records_status ON public.tenant_payment_records USING btree (tenant_id, payment_status);
CREATE INDEX idx_tenant_payment_records_invoice ON public.tenant_payment_records USING btree (tenant_id, invoice_id);
CREATE INDEX idx_payment_records_split ON public.tenant_payment_records USING btree (split_payment_id);

-- Table: tenant_payroll_audit
CREATE TABLE IF NOT EXISTS tenant_payroll_audit (
  id INTEGER DEFAULT nextval('tenant_payroll_audit_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  table_name VARCHAR(50) NOT NULL,
  record_id INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by VARCHAR(255),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  PRIMARY KEY (id)
);
CREATE INDEX idx_payroll_audit_tenant_table ON public.tenant_payroll_audit USING btree (tenant_id, table_name);
CREATE INDEX idx_payroll_audit_date ON public.tenant_payroll_audit USING btree (changed_at);

-- Table: tenant_payroll_movements
CREATE TABLE IF NOT EXISTS tenant_payroll_movements (
  movement_id INTEGER DEFAULT nextval('tenant_payroll_movements_movement_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  period_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  movement_type VARCHAR(20) NOT NULL,
  movement_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (movement_id)
);
CREATE INDEX idx_payroll_movements_tenant ON public.tenant_payroll_movements USING btree (tenant_id);
CREATE INDEX idx_payroll_movements_period ON public.tenant_payroll_movements USING btree (period_id);
CREATE INDEX idx_payroll_movements_type ON public.tenant_payroll_movements USING btree (movement_type);

-- Table: tenant_payroll_periods
CREATE TABLE IF NOT EXISTS tenant_payroll_periods (
  period_id INTEGER DEFAULT nextval('tenant_payroll_periods_period_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft'::character varying,
  total_gross DECIMAL(12,2) DEFAULT 0,
  total_tax DECIMAL(12,2) DEFAULT 0,
  total_ni DECIMAL(12,2) DEFAULT 0,
  total_pension DECIMAL(12,2) DEFAULT 0,
  total_deductions DECIMAL(12,2) DEFAULT 0,
  total_net DECIMAL(12,2) DEFAULT 0,
  hmrc_payment_due DECIMAL(12,2) DEFAULT 0,
  submitted_date TIMESTAMP,
  submitted_by INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (period_id),
  UNIQUE (tenant_id, period_start, period_end)
);
CREATE INDEX idx_payroll_periods_tenant ON public.tenant_payroll_periods USING btree (tenant_id);
CREATE INDEX idx_payroll_periods_dates ON public.tenant_payroll_periods USING btree (period_start, period_end);
CREATE INDEX idx_payroll_periods_status ON public.tenant_payroll_periods USING btree (status);

-- Table: tenant_payroll_records
CREATE TABLE IF NOT EXISTS tenant_payroll_records (
  record_id INTEGER DEFAULT nextval('tenant_payroll_records_record_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  period_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  employment_type VARCHAR(20) NOT NULL,
  hours_worked DECIMAL(8,2),
  hourly_rate DECIMAL(10,2),
  weekly_wage DECIMAL(10,2),
  monthly_salary DECIMAL(10,2),
  gross_pay DECIMAL(10,2) NOT NULL,
  tax_deducted DECIMAL(10,2) DEFAULT 0,
  ni_deducted DECIMAL(10,2) DEFAULT 0,
  pension_deducted DECIMAL(10,2) DEFAULT 0,
  other_deductions DECIMAL(10,2) DEFAULT 0,
  deduction_notes TEXT,
  net_pay DECIMAL(10,2) NOT NULL,
  is_new_joiner BOOLEAN DEFAULT false,
  is_leaver BOOLEAN DEFAULT false,
  leaving_date DATE,
  payment_status VARCHAR(20) DEFAULT 'pending'::character varying,
  payment_date DATE,
  payment_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (record_id),
  UNIQUE (period_id, driver_id)
);
CREATE INDEX idx_payroll_records_tenant ON public.tenant_payroll_records USING btree (tenant_id);
CREATE INDEX idx_payroll_records_period ON public.tenant_payroll_records USING btree (period_id);
CREATE INDEX idx_payroll_records_driver ON public.tenant_payroll_records USING btree (driver_id);
CREATE INDEX idx_payroll_records_status ON public.tenant_payroll_records USING btree (payment_status);

-- Table: tenant_permit_audit_log
CREATE TABLE IF NOT EXISTS tenant_permit_audit_log (
  audit_id INTEGER DEFAULT nextval('tenant_permit_audit_log_audit_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  record_type VARCHAR(50) NOT NULL,
  record_id INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by INTEGER,
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (audit_id)
);
CREATE INDEX idx_permit_audit_tenant ON public.tenant_permit_audit_log USING btree (tenant_id);
CREATE INDEX idx_permit_audit_date ON public.tenant_permit_audit_log USING btree (created_at);
CREATE INDEX idx_permit_audit_record ON public.tenant_permit_audit_log USING btree (record_type, record_id);

-- Table: tenant_permit_reminders
CREATE TABLE IF NOT EXISTS tenant_permit_reminders (
  reminder_id INTEGER DEFAULT nextval('tenant_permit_reminders_reminder_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  reminder_type VARCHAR(20) NOT NULL,
  record_id INTEGER NOT NULL,
  permit_type VARCHAR(50) NOT NULL,
  expiry_date DATE NOT NULL,
  reminder_days_before INTEGER DEFAULT 30 NOT NULL,
  last_reminder_sent TIMESTAMP WITH TIME ZONE,
  reminder_count INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (reminder_id),
  UNIQUE (tenant_id, reminder_type, record_id, permit_type)
);
CREATE INDEX idx_permit_reminders_tenant ON public.tenant_permit_reminders USING btree (tenant_id);
CREATE INDEX idx_permit_reminders_expiry ON public.tenant_permit_reminders USING btree (expiry_date, is_active);
CREATE UNIQUE INDEX unique_reminder_per_permit ON public.tenant_permit_reminders USING btree (tenant_id, reminder_type, record_id, permit_type);
CREATE INDEX idx_permit_reminders_type ON public.tenant_permit_reminders USING btree (reminder_type, permit_type);

-- Table: tenant_permits
CREATE TABLE IF NOT EXISTS tenant_permits (
  permit_id INTEGER DEFAULT nextval('tenant_permits_permit_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  permit_type VARCHAR(20) NOT NULL,
  organisation_name VARCHAR(255) NOT NULL,
  permit_number VARCHAR(100) NOT NULL,
  issue_date DATE,
  expiry_date DATE NOT NULL,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active'::character varying,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (permit_id),
  UNIQUE (tenant_id, permit_number)
);
CREATE INDEX idx_tenant_permits_tenant_status ON public.tenant_permits USING btree (tenant_id, status);
CREATE INDEX idx_tenant_permits_expiry ON public.tenant_permits USING btree (tenant_id, expiry_date);
CREATE INDEX idx_tenant_permits_type ON public.tenant_permits USING btree (tenant_id, permit_type);

-- Table: tenant_pickup_statuses
CREATE TABLE IF NOT EXISTS tenant_pickup_statuses (
  id INTEGER DEFAULT nextval('tenant_pickup_statuses_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  week_start DATE,
  status_key VARCHAR(50),
  status VARCHAR(20),
  updated_by INTEGER,
  updated_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (tenant_id, week_start, status_key)
);

-- Table: tenant_preference_requests
CREATE TABLE IF NOT EXISTS tenant_preference_requests (
  request_id INTEGER DEFAULT nextval('tenant_preference_requests_request_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  customer_name VARCHAR(255),
  request_type VARCHAR(50) NOT NULL,
  day_of_week VARCHAR(10),
  new_pickup_time TIME WITHOUT TIME ZONE,
  new_dropoff_time TIME WITHOUT TIME ZONE,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending'::character varying,
  requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_date TIMESTAMP,
  reviewed_by INTEGER,
  PRIMARY KEY (request_id)
);

-- Table: tenant_provider_invoice_settings
CREATE TABLE IF NOT EXISTS tenant_provider_invoice_settings (
  setting_id INTEGER DEFAULT nextval('tenant_provider_invoice_settings_setting_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  provider_name VARCHAR(255) NOT NULL,
  billing_day INTEGER DEFAULT 1 NOT NULL,
  billing_frequency VARCHAR(20) DEFAULT 'monthly'::character varying,
  invoice_email VARCHAR(255),
  cc_email VARCHAR(255),
  auto_send BOOLEAN DEFAULT false,
  payment_terms_days INTEGER DEFAULT 30,
  late_payment_fee_percentage DECIMAL(5,2) DEFAULT 0,
  send_reminders BOOLEAN DEFAULT true,
  reminder_days_before_due INTEGER DEFAULT 7,
  reminder_days_after_due_1st INTEGER DEFAULT 3,
  reminder_days_after_due_2nd INTEGER DEFAULT 14,
  reminder_days_after_due_3rd INTEGER DEFAULT 30,
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  invoice_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_id),
  UNIQUE (tenant_id, provider_name)
);
CREATE INDEX idx_provider_settings_tenant ON public.tenant_provider_invoice_settings USING btree (tenant_id);

-- Table: tenant_providers
CREATE TABLE IF NOT EXISTS tenant_providers (
  provider_id INTEGER DEFAULT nextval('tenant_providers_provider_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  billing_day INTEGER DEFAULT 1,
  billing_frequency VARCHAR(20) DEFAULT 'monthly'::character varying,
  invoice_email VARCHAR(255),
  cc_email VARCHAR(255),
  auto_send BOOLEAN DEFAULT false,
  payment_terms_days INTEGER DEFAULT 30,
  late_payment_fee_percentage DECIMAL(5,2) DEFAULT 0,
  send_reminders BOOLEAN DEFAULT true,
  reminder_days_before_due INTEGER DEFAULT 7,
  reminder_days_after_due_1st INTEGER DEFAULT 3,
  reminder_days_after_due_2nd INTEGER DEFAULT 14,
  reminder_days_after_due_3rd INTEGER DEFAULT 30,
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  invoice_notes TEXT,
  PRIMARY KEY (provider_id)
);
CREATE INDEX idx_tenant_providers_billing_day ON public.tenant_providers USING btree (tenant_id, billing_day) WHERE (is_active = true);
CREATE INDEX idx_tenant_providers_tenant_id ON public.tenant_providers USING btree (tenant_id);
CREATE INDEX idx_tenant_providers_tenant_active ON public.tenant_providers USING btree (tenant_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_tenant_providers_type ON public.tenant_providers USING btree (tenant_id, type);

-- Table: tenant_route_optimization_history
CREATE TABLE IF NOT EXISTS tenant_route_optimization_history (
  optimization_id INTEGER DEFAULT nextval('tenant_route_optimization_history_optimization_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  optimization_date DATE NOT NULL,
  driver_id INTEGER,
  time_period VARCHAR(20) NOT NULL,
  assignment_ids INTEGER[] NOT NULL,
  original_order INTEGER[] NOT NULL,
  optimized_order INTEGER[] NOT NULL,
  method VARCHAR(20) NOT NULL,
  distance_saved DECIMAL(10,2),
  time_saved INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (optimization_id)
);
CREATE INDEX idx_optimization_history_date ON public.tenant_route_optimization_history USING btree (tenant_id, optimization_date);

-- Table: tenant_route_templates
CREATE TABLE IF NOT EXISTS tenant_route_templates (
  template_id INTEGER DEFAULT nextval('tenant_route_templates_template_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  route_data JSONB NOT NULL,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (template_id)
);
CREATE INDEX idx_route_templates_tenant ON public.tenant_route_templates USING btree (tenant_id, is_active);

-- Table: tenant_safeguarding_attachments
CREATE TABLE IF NOT EXISTS tenant_safeguarding_attachments (
  attachment_id INTEGER DEFAULT nextval('tenant_safeguarding_attachments_attachment_id_seq'::regclass) NOT NULL,
  report_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER,
  PRIMARY KEY (attachment_id)
);
CREATE INDEX idx_safeguarding_attach_report ON public.tenant_safeguarding_attachments USING btree (report_id);

-- Table: tenant_safeguarding_reports
CREATE TABLE IF NOT EXISTS tenant_safeguarding_reports (
  report_id INTEGER DEFAULT nextval('tenant_safeguarding_reports_report_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  customer_id INTEGER,
  incident_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  incident_date TIMESTAMP NOT NULL,
  location VARCHAR(255),
  description TEXT NOT NULL,
  action_taken TEXT,
  status VARCHAR(20) DEFAULT 'submitted'::character varying,
  confidential BOOLEAN DEFAULT false,
  assigned_to INTEGER,
  investigation_notes TEXT,
  resolution TEXT,
  resolved_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  PRIMARY KEY (report_id)
);
CREATE INDEX idx_safeguarding_tenant ON public.tenant_safeguarding_reports USING btree (tenant_id);
CREATE INDEX idx_safeguarding_driver ON public.tenant_safeguarding_reports USING btree (driver_id);
CREATE INDEX idx_safeguarding_customer ON public.tenant_safeguarding_reports USING btree (customer_id);
CREATE INDEX idx_safeguarding_status ON public.tenant_safeguarding_reports USING btree (status);
CREATE INDEX idx_safeguarding_severity ON public.tenant_safeguarding_reports USING btree (severity);
CREATE INDEX idx_safeguarding_date ON public.tenant_safeguarding_reports USING btree (incident_date);
CREATE INDEX idx_safeguarding_created ON public.tenant_safeguarding_reports USING btree (created_at);

-- Table: tenant_saved_routes
CREATE TABLE IF NOT EXISTS tenant_saved_routes (
  route_id INTEGER DEFAULT nextval('tenant_saved_routes_route_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_location VARCHAR(255),
  end_location VARCHAR(255),
  waypoints JSONB,
  route_data JSONB,
  total_distance DECIMAL(10,2),
  total_duration INTEGER,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_template BOOLEAN DEFAULT false,
  PRIMARY KEY (route_id)
);

-- Table: tenant_schedule_assignments
CREATE TABLE IF NOT EXISTS tenant_schedule_assignments (
  assignment_id INTEGER DEFAULT nextval('tenant_schedule_assignments_assignment_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  assignment_date DATE NOT NULL,
  time_period VARCHAR(20) NOT NULL,
  pickup_time TIME WITHOUT TIME ZONE NOT NULL,
  destination TEXT,
  price DECIMAL(10,2) DEFAULT 0.00,
  assignment_status VARCHAR(20) DEFAULT 'scheduled'::character varying,
  assignment_type VARCHAR(20) DEFAULT 'regular'::character varying,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration INTEGER DEFAULT 60,
  route_order INTEGER DEFAULT 0,
  estimated_distance DECIMAL(10,2),
  estimated_duration INTEGER,
  last_optimized TIMESTAMP,
  optimization_method VARCHAR(20) DEFAULT 'manual'::character varying,
  is_active BOOLEAN DEFAULT true,
  is_return_journey BOOLEAN DEFAULT false,
  linked_assignment_id INTEGER,
  customer_schedule_reference VARCHAR(10),
  journey_type VARCHAR(20) DEFAULT 'single'::character varying,
  pickup_location TEXT,
  PRIMARY KEY (assignment_id)
);
CREATE INDEX idx_schedule_assignments_tenant ON public.tenant_schedule_assignments USING btree (tenant_id);
CREATE INDEX idx_schedule_assignments_driver_date ON public.tenant_schedule_assignments USING btree (driver_id, assignment_date);
CREATE INDEX idx_schedule_assignments_customer ON public.tenant_schedule_assignments USING btree (customer_id);
CREATE INDEX idx_schedule_assignments_date ON public.tenant_schedule_assignments USING btree (assignment_date);
CREATE INDEX idx_schedule_assignments_tenant_safe ON public.tenant_schedule_assignments USING btree (tenant_id);
CREATE INDEX idx_schedule_assignments_driver_safe ON public.tenant_schedule_assignments USING btree (driver_id);
CREATE INDEX idx_schedule_assignments_customer_safe ON public.tenant_schedule_assignments USING btree (customer_id);
CREATE INDEX idx_schedule_assignments_date_safe ON public.tenant_schedule_assignments USING btree (assignment_date);
CREATE INDEX idx_tenant_schedule_assignments_tenant_id ON public.tenant_schedule_assignments USING btree (tenant_id);
CREATE INDEX idx_tenant_schedule_assignments_driver_id ON public.tenant_schedule_assignments USING btree (driver_id);
CREATE INDEX idx_tenant_schedule_assignments_customer_id ON public.tenant_schedule_assignments USING btree (customer_id);
CREATE INDEX idx_tenant_schedule_assignments_date ON public.tenant_schedule_assignments USING btree (assignment_date);
CREATE INDEX idx_tenant_schedule_assignments_week ON public.tenant_schedule_assignments USING btree (tenant_id, assignment_date);
CREATE INDEX idx_schedule_assignments_date_driver ON public.tenant_schedule_assignments USING btree (tenant_id, assignment_date, driver_id);
CREATE INDEX idx_schedule_assignments_optimization ON public.tenant_schedule_assignments USING btree (tenant_id, assignment_date, last_optimized);
CREATE INDEX idx_schedule_tenant ON public.tenant_schedule_assignments USING btree (tenant_id);
CREATE INDEX idx_schedule_driver ON public.tenant_schedule_assignments USING btree (driver_id);
CREATE INDEX idx_schedule_customer ON public.tenant_schedule_assignments USING btree (customer_id);
CREATE INDEX idx_schedule_date ON public.tenant_schedule_assignments USING btree (assignment_date);
CREATE INDEX idx_schedule_active ON public.tenant_schedule_assignments USING btree (is_active);
CREATE INDEX idx_schedule_date_range ON public.tenant_schedule_assignments USING btree (tenant_id, assignment_date);
CREATE INDEX idx_schedule_driver_date ON public.tenant_schedule_assignments USING btree (tenant_id, driver_id, assignment_date);
CREATE INDEX idx_linked_assignments ON public.tenant_schedule_assignments USING btree (linked_assignment_id);
CREATE INDEX idx_customer_schedule_ref ON public.tenant_schedule_assignments USING btree (customer_schedule_reference);

-- Table: tenant_schedule_conflicts
CREATE TABLE IF NOT EXISTS tenant_schedule_conflicts (
  conflict_id INTEGER DEFAULT nextval('tenant_schedule_conflicts_conflict_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  assignment_id_1 INTEGER NOT NULL,
  assignment_id_2 INTEGER NOT NULL,
  conflict_type VARCHAR(50) NOT NULL,
  conflict_details JSONB,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (conflict_id)
);

-- Table: tenant_schedule_templates
CREATE TABLE IF NOT EXISTS tenant_schedule_templates (
  template_id INTEGER DEFAULT nextval('tenant_schedule_templates_template_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  template_data JSONB NOT NULL,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (template_id)
);

-- Table: tenant_schedules
CREATE TABLE IF NOT EXISTS tenant_schedules (
  schedule_id INTEGER DEFAULT nextval('tenant_schedules_schedule_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  week_starting DATE NOT NULL,
  customer_id INTEGER,
  driver_id INTEGER,
  vehicle_id INTEGER,
  monday_destination VARCHAR(200),
  monday_price DECIMAL(8,2),
  tuesday_destination VARCHAR(200),
  tuesday_price DECIMAL(8,2),
  wednesday_destination VARCHAR(200),
  wednesday_price DECIMAL(8,2),
  thursday_destination VARCHAR(200),
  thursday_price DECIMAL(8,2),
  friday_destination VARCHAR(200),
  friday_price DECIMAL(8,2),
  saturday_destination VARCHAR(200),
  saturday_price DECIMAL(8,2),
  sunday_destination VARCHAR(200),
  sunday_price DECIMAL(8,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  monday_pickup_time TIME WITHOUT TIME ZONE,
  tuesday_pickup_time TIME WITHOUT TIME ZONE,
  wednesday_pickup_time TIME WITHOUT TIME ZONE,
  thursday_pickup_time TIME WITHOUT TIME ZONE,
  friday_pickup_time TIME WITHOUT TIME ZONE,
  saturday_pickup_time TIME WITHOUT TIME ZONE,
  sunday_pickup_time TIME WITHOUT TIME ZONE,
  PRIMARY KEY (schedule_id),
  UNIQUE (tenant_id, week_starting, customer_id)
);
CREATE INDEX idx_tenant_schedules_tenant_week ON public.tenant_schedules USING btree (tenant_id, week_starting);
CREATE INDEX idx_schedules_tenant_id ON public.tenant_schedules USING btree (tenant_id);

-- Table: tenant_settings
CREATE TABLE IF NOT EXISTS tenant_settings (
  setting_id INTEGER DEFAULT nextval('tenant_settings_setting_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb NOT NULL,
  updated_by INTEGER,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_id),
  UNIQUE (tenant_id)
);

-- Table: tenant_social_outings
CREATE TABLE IF NOT EXISTS tenant_social_outings (
  id INTEGER DEFAULT nextval('tenant_social_outings_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  outing_date DATE NOT NULL,
  departure_time TIME WITHOUT TIME ZONE NOT NULL,
  return_time TIME WITHOUT TIME ZONE,
  max_passengers INTEGER DEFAULT 16 NOT NULL,
  cost_per_person DECIMAL(10,2) DEFAULT 0.00,
  wheelchair_accessible BOOLEAN DEFAULT false,
  description TEXT,
  meeting_point VARCHAR(255),
  contact_person VARCHAR(255),
  contact_phone VARCHAR(20),
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(20),
  status VARCHAR(50) DEFAULT 'planned'::character varying,
  cancellation_reason TEXT,
  weather_dependent BOOLEAN DEFAULT false,
  minimum_passengers INTEGER DEFAULT 1,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
CREATE INDEX idx_tenant_social_outings_tenant ON public.tenant_social_outings USING btree (tenant_id);
CREATE INDEX idx_tenant_social_outings_date ON public.tenant_social_outings USING btree (tenant_id, outing_date);
CREATE INDEX idx_tenant_social_outings_status ON public.tenant_social_outings USING btree (tenant_id, status);

-- Table: tenant_split_payment_records
CREATE TABLE IF NOT EXISTS tenant_split_payment_records (
  split_payment_record_id INTEGER DEFAULT nextval('tenant_split_payment_records_split_payment_record_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  invoice_id INTEGER NOT NULL,
  split_payment_id INTEGER NOT NULL,
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  paid_by_provider VARCHAR(255) NOT NULL,
  notes TEXT,
  processed_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (split_payment_record_id)
);
CREATE INDEX idx_split_payment_records_invoice ON public.tenant_split_payment_records USING btree (invoice_id);
CREATE INDEX idx_split_payment_records_split ON public.tenant_split_payment_records USING btree (split_payment_id);
CREATE INDEX idx_split_payment_records_date ON public.tenant_split_payment_records USING btree (payment_date);
CREATE INDEX idx_split_payment_records_provider ON public.tenant_split_payment_records USING btree (paid_by_provider);

-- Table: tenant_staff_members
CREATE TABLE IF NOT EXISTS tenant_staff_members (
  staff_id INTEGER DEFAULT nextval('tenant_staff_members_staff_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  employee_number VARCHAR(20),
  driver_id INTEGER,
  user_id INTEGER,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  national_insurance_number VARCHAR(15),
  address JSONB,
  phone VARCHAR(20),
  email VARCHAR(255),
  emergency_contact JSONB,
  department_id INTEGER,
  role_id INTEGER,
  employment_type VARCHAR(30),
  start_date DATE NOT NULL,
  end_date DATE,
  probation_end_date DATE,
  contract_hours DECIMAL(5,2),
  salary_annual DECIMAL(10,2),
  salary_hourly DECIMAL(6,2),
  line_manager_id INTEGER,
  performance_rating VARCHAR(20),
  last_review_date DATE,
  next_review_date DATE,
  training_budget DECIMAL(8,2),
  holiday_entitlement INTEGER,
  sick_days_taken INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  PRIMARY KEY (staff_id),
  UNIQUE (employee_number)
);
CREATE INDEX idx_tenant_staff_members_active ON public.tenant_staff_members USING btree (tenant_id, is_active);
CREATE INDEX idx_tenant_staff_members_department ON public.tenant_staff_members USING btree (tenant_id, department_id, is_active);

-- Table: tenant_staff_structure
CREATE TABLE IF NOT EXISTS tenant_staff_structure (
  tenant_id INTEGER NOT NULL,
  staff_data JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  created_by INTEGER,
  PRIMARY KEY (tenant_id)
);
CREATE INDEX idx_tenant_staff_jsonb ON public.tenant_staff_structure USING gin (staff_data);

-- Table: tenant_subscription_history
CREATE TABLE IF NOT EXISTS tenant_subscription_history (
  history_id INTEGER DEFAULT nextval('tenant_subscription_history_history_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  change_type VARCHAR(50) NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  previous_monthly_cost DECIMAL(10,2),
  new_monthly_cost DECIMAL(10,2),
  changed_by INTEGER,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  PRIMARY KEY (history_id)
);
CREATE INDEX idx_subscription_history_tenant ON public.tenant_subscription_history USING btree (tenant_id);
CREATE INDEX idx_subscription_history_date ON public.tenant_subscription_history USING btree (changed_at);

-- Table: tenant_system_metrics
CREATE TABLE IF NOT EXISTS tenant_system_metrics (
  id INTEGER DEFAULT nextval('tenant_system_metrics_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  total_drivers INTEGER,
  total_customers INTEGER,
  total_journeys INTEGER,
  total_revenue DECIMAL(10,2),
  active_issues INTEGER,
  updated_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (id)
);

-- Table: tenant_training_records
CREATE TABLE IF NOT EXISTS tenant_training_records (
  training_record_id INTEGER DEFAULT nextval('tenant_training_records_training_record_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  training_type_id INTEGER NOT NULL,
  completed_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  provider VARCHAR(150) NOT NULL,
  certificate_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_by INTEGER,
  PRIMARY KEY (training_record_id)
);
CREATE INDEX idx_training_records_tenant_driver ON public.tenant_training_records USING btree (tenant_id, driver_id);
CREATE INDEX idx_training_records_tenant_type ON public.tenant_training_records USING btree (tenant_id, training_type_id);
CREATE INDEX idx_training_records_expiry ON public.tenant_training_records USING btree (expiry_date);
CREATE INDEX idx_training_records_completed ON public.tenant_training_records USING btree (completed_date);
CREATE INDEX idx_training_records_expiry_alerts ON public.tenant_training_records USING btree (tenant_id, expiry_date);
CREATE INDEX idx_training_records_tenant ON public.tenant_training_records USING btree (tenant_id);
CREATE INDEX idx_training_records_driver ON public.tenant_training_records USING btree (driver_id);
CREATE INDEX idx_training_records_type ON public.tenant_training_records USING btree (training_type_id);

-- Table: tenant_training_types
CREATE TABLE IF NOT EXISTS tenant_training_types (
  training_type_id INTEGER DEFAULT nextval('tenant_training_types_training_type_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  validity_period_months INTEGER DEFAULT 12 NOT NULL,
  is_mandatory BOOLEAN DEFAULT false NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_by INTEGER,
  PRIMARY KEY (training_type_id),
  UNIQUE (tenant_id, name),
  UNIQUE (tenant_id, training_type_id)
);
CREATE UNIQUE INDEX tenant_training_types_tenant_type_unique ON public.tenant_training_types USING btree (tenant_id, training_type_id);
CREATE INDEX idx_training_types_tenant ON public.tenant_training_types USING btree (tenant_id) WHERE (is_active = true);
CREATE INDEX idx_training_types_category ON public.tenant_training_types USING btree (category) WHERE (is_active = true);
CREATE INDEX idx_training_types_mandatory ON public.tenant_training_types USING btree (tenant_id, is_mandatory) WHERE (is_active = true);
CREATE INDEX idx_training_types_active ON public.tenant_training_types USING btree (is_active);

-- Table: tenant_trip_records
CREATE TABLE IF NOT EXISTS tenant_trip_records (
  trip_id INTEGER DEFAULT nextval('tenant_trip_records_trip_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  assignment_id INTEGER,
  trip_date DATE NOT NULL,
  scheduled_pickup_time TIME WITHOUT TIME ZONE,
  scheduled_dropoff_time TIME WITHOUT TIME ZONE,
  actual_pickup_time TIME WITHOUT TIME ZONE,
  actual_dropoff_time TIME WITHOUT TIME ZONE,
  trip_status VARCHAR(20) DEFAULT 'scheduled'::character varying NOT NULL,
  cancellation_reason TEXT,
  cancellation_notice_hours INTEGER,
  base_price DECIMAL(10,2) NOT NULL,
  charged_amount DECIMAL(10,2) NOT NULL,
  driver_id INTEGER,
  vehicle_id INTEGER,
  invoice_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  recorded_by INTEGER,
  PRIMARY KEY (trip_id)
);
CREATE INDEX idx_trip_records_tenant ON public.tenant_trip_records USING btree (tenant_id);
CREATE INDEX idx_trip_records_customer ON public.tenant_trip_records USING btree (tenant_id, customer_id);
CREATE INDEX idx_trip_records_date ON public.tenant_trip_records USING btree (tenant_id, trip_date);
CREATE INDEX idx_trip_records_status ON public.tenant_trip_records USING btree (tenant_id, trip_status);
CREATE INDEX idx_trip_records_assignment ON public.tenant_trip_records USING btree (assignment_id);
CREATE INDEX idx_trip_records_invoice ON public.tenant_trip_records USING btree (invoice_id);

-- Table: tenant_trips
CREATE TABLE IF NOT EXISTS tenant_trips (
  trip_id INTEGER DEFAULT nextval('tenant_trips_trip_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  driver_id INTEGER,
  vehicle_id INTEGER,
  trip_date DATE NOT NULL,
  day_of_week VARCHAR(10),
  pickup_time TIME WITHOUT TIME ZONE NOT NULL,
  estimated_duration INTEGER,
  pickup_location VARCHAR(255),
  pickup_address TEXT,
  destination VARCHAR(255) NOT NULL,
  destination_address TEXT,
  trip_type VARCHAR(20) NOT NULL,
  trip_source VARCHAR(50) DEFAULT 'manual'::character varying,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(50),
  status VARCHAR(20) DEFAULT 'scheduled'::character varying,
  confirmed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  price DECIMAL(10,2),
  billing_status VARCHAR(20) DEFAULT 'pending'::character varying,
  invoice_id INTEGER,
  parent_assignment_id INTEGER,
  adhoc_journey_id INTEGER,
  urgent BOOLEAN DEFAULT false,
  requires_wheelchair BOOLEAN DEFAULT false,
  requires_escort BOOLEAN DEFAULT false,
  passenger_count INTEGER DEFAULT 1,
  special_requirements TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_by INTEGER,
  PRIMARY KEY (trip_id)
);
CREATE INDEX idx_tenant_trips_date ON public.tenant_trips USING btree (trip_date);
CREATE INDEX idx_tenant_trips_status ON public.tenant_trips USING btree (status);
CREATE INDEX idx_tenant_trips_type ON public.tenant_trips USING btree (trip_type);
CREATE INDEX idx_tenant_trips_driver_date ON public.tenant_trips USING btree (driver_id, trip_date);
CREATE INDEX idx_tenant_trips_customer_date ON public.tenant_trips USING btree (customer_id, trip_date);
CREATE INDEX idx_tenant_trips_tenant_date ON public.tenant_trips USING btree (tenant_id, trip_date);
CREATE INDEX idx_tenant_trips_tenant ON public.tenant_trips USING btree (tenant_id);
CREATE INDEX idx_tenant_trips_customer ON public.tenant_trips USING btree (customer_id);
CREATE INDEX idx_tenant_trips_driver ON public.tenant_trips USING btree (driver_id);
CREATE INDEX idx_tenant_trips_vehicle ON public.tenant_trips USING btree (vehicle_id);
CREATE INDEX idx_tenant_trips_tenant_status ON public.tenant_trips USING btree (tenant_id, status);
CREATE INDEX idx_tenant_trips_tenant_customer ON public.tenant_trips USING btree (tenant_id, customer_id);
CREATE INDEX idx_tenant_trips_tenant_driver ON public.tenant_trips USING btree (tenant_id, driver_id);
CREATE INDEX idx_tenant_trips_tenant_vehicle ON public.tenant_trips USING btree (tenant_id, vehicle_id);
CREATE INDEX idx_trips_customer_fk ON public.tenant_trips USING btree (customer_id);
CREATE INDEX idx_trips_driver_fk ON public.tenant_trips USING btree (driver_id);
CREATE INDEX idx_trips_vehicle_fk ON public.tenant_trips USING btree (vehicle_id);

-- Table: tenant_user_preferences
CREATE TABLE IF NOT EXISTS tenant_user_preferences (
  preference_id INTEGER DEFAULT nextval('tenant_user_preferences_preference_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  preference_type VARCHAR(50) NOT NULL,
  preference_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (preference_id),
  UNIQUE (tenant_id, user_id, preference_type)
);
CREATE INDEX idx_user_preferences_tenant_user ON public.tenant_user_preferences USING btree (tenant_id, user_id, preference_type);

-- Table: tenant_user_security_log
CREATE TABLE IF NOT EXISTS tenant_user_security_log (
  log_id INTEGER DEFAULT nextval('tenant_user_security_log_log_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  user_id INTEGER,
  event_type VARCHAR(50) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id)
);
CREATE INDEX idx_security_log_user ON public.tenant_user_security_log USING btree (user_id);
CREATE INDEX idx_security_log_tenant ON public.tenant_user_security_log USING btree (tenant_id);
CREATE INDEX idx_security_log_date ON public.tenant_user_security_log USING btree (created_at);
CREATE INDEX idx_security_log_event ON public.tenant_user_security_log USING btree (event_type);

-- Table: tenant_users
CREATE TABLE IF NOT EXISTS tenant_users (
  user_id INTEGER DEFAULT nextval('tenant_users_user_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  navigation_preferences JSONB,
  admin_permissions JSONB DEFAULT '{}'::jsonb,
  dashboard_preferences JSONB DEFAULT '{}'::jsonb,
  notification_preferences JSONB DEFAULT '{}'::jsonb,
  employee_id VARCHAR(50),
  department VARCHAR(100),
  job_title VARCHAR(255),
  employment_type VARCHAR(50) DEFAULT 'permanent'::character varying,
  start_date DATE,
  contract_end_date DATE,
  annual_salary DECIMAL(10,2),
  holiday_entitlement INTEGER DEFAULT 28,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  driver_id INTEGER,
  password_reset_token VARCHAR(255),
  password_reset_expiry TIMESTAMP,
  password_reset_required BOOLEAN DEFAULT false,
  last_password_change TIMESTAMP,
  profile_photo_url TEXT,
  preferences JSONB,
  twofa_enabled BOOLEAN DEFAULT false,
  twofa_secret TEXT,
  temp_2fa_secret TEXT,
  twofa_backup_codes JSONB,
  PRIMARY KEY (user_id),
  UNIQUE (tenant_id, username)
);
CREATE INDEX idx_password_reset_token ON public.tenant_users USING btree (password_reset_token) WHERE (password_reset_token IS NOT NULL);
CREATE INDEX idx_password_reset_expiry ON public.tenant_users USING btree (password_reset_expiry) WHERE (password_reset_expiry IS NOT NULL);
CREATE INDEX idx_tenant_users_tenant_id ON public.tenant_users USING btree (tenant_id);
CREATE INDEX idx_tenant_users_tenant_active ON public.tenant_users USING btree (tenant_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_tenant_users_username ON public.tenant_users USING btree (tenant_id, username);
CREATE INDEX idx_tenant_users_email ON public.tenant_users USING btree (tenant_id, email);

-- Table: tenant_vehicle_incidents
CREATE TABLE IF NOT EXISTS tenant_vehicle_incidents (
  incident_id INTEGER DEFAULT nextval('tenant_vehicle_incidents_incident_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  vehicle_id INTEGER NOT NULL,
  incident_type VARCHAR(50) NOT NULL,
  incident_date TIMESTAMP NOT NULL,
  location VARCHAR(500),
  description TEXT NOT NULL,
  driver_id INTEGER,
  reported_by INTEGER,
  witnesses TEXT,
  severity VARCHAR(50) NOT NULL,
  injuries_occurred BOOLEAN DEFAULT false,
  injury_details TEXT,
  vehicle_driveable BOOLEAN DEFAULT true,
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  damage_description TEXT,
  third_party_involved BOOLEAN DEFAULT false,
  third_party_name VARCHAR(255),
  third_party_contact VARCHAR(255),
  third_party_vehicle_reg VARCHAR(50),
  third_party_insurance VARCHAR(255),
  insurance_claim_number VARCHAR(100),
  insurance_notified_date DATE,
  claim_status VARCHAR(50),
  police_notified BOOLEAN DEFAULT false,
  police_reference VARCHAR(100),
  police_report_file VARCHAR(500),
  status VARCHAR(50) DEFAULT 'reported'::character varying NOT NULL,
  resolution_notes TEXT,
  resolved_date DATE,
  resolved_by INTEGER,
  actions_required TEXT,
  preventive_measures TEXT,
  vehicle_repair_required BOOLEAN DEFAULT false,
  repair_status VARCHAR(50),
  photos_uploaded BOOLEAN DEFAULT false,
  documents_uploaded BOOLEAN DEFAULT false,
  attachment_urls TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  PRIMARY KEY (incident_id)
);

-- Table: tenant_vehicle_maintenance
CREATE TABLE IF NOT EXISTS tenant_vehicle_maintenance (
  maintenance_id INTEGER DEFAULT nextval('tenant_vehicle_maintenance_maintenance_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER NOT NULL,
  vehicle_id INTEGER NOT NULL,
  maintenance_date DATE NOT NULL,
  maintenance_type VARCHAR(50) NOT NULL,
  description TEXT,
  cost DECIMAL(10,2) DEFAULT 0.00,
  mileage_at_service INTEGER,
  service_provider VARCHAR(200),
  provider_contact VARCHAR(100),
  next_service_date DATE,
  next_service_mileage INTEGER,
  parts_replaced JSONB DEFAULT '[]'::jsonb,
  labor_hours DECIMAL(5,2),
  notes TEXT,
  invoice_number VARCHAR(100),
  warranty_until DATE,
  severity VARCHAR(20) DEFAULT 'routine'::character varying,
  completed BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (maintenance_id)
);
CREATE INDEX idx_maintenance_tenant ON public.tenant_vehicle_maintenance USING btree (tenant_id);
CREATE INDEX idx_maintenance_vehicle ON public.tenant_vehicle_maintenance USING btree (vehicle_id);
CREATE INDEX idx_maintenance_date ON public.tenant_vehicle_maintenance USING btree (maintenance_date);
CREATE INDEX idx_maintenance_type ON public.tenant_vehicle_maintenance USING btree (maintenance_type);
CREATE INDEX idx_next_service ON public.tenant_vehicle_maintenance USING btree (next_service_date);

-- Table: tenant_vehicles
CREATE TABLE IF NOT EXISTS tenant_vehicles (
  vehicle_id INTEGER DEFAULT nextval('tenant_vehicles_vehicle_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  registration VARCHAR(20) NOT NULL,
  year INTEGER,
  make VARCHAR(100),
  model VARCHAR(100),
  type VARCHAR(50),
  seats INTEGER,
  fuel_type VARCHAR(50),
  mileage INTEGER,
  ownership VARCHAR(50),
  lease_monthly DECIMAL(10,2),
  insurance_monthly DECIMAL(10,2),
  mot_date DATE,
  insurance_expiry DATE,
  last_service DATE,
  service_interval INTEGER,
  wheelchair_accessible BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  driver_id INTEGER,
  vehicle_type VARCHAR(20) DEFAULT 'Car'::character varying,
  last_service_date DATE,
  service_interval_months INTEGER DEFAULT 12,
  lease_monthly_cost DECIMAL(10,2) DEFAULT 0.00,
  insurance_monthly_cost DECIMAL(10,2) DEFAULT 0.00,
  is_basic_record BOOLEAN DEFAULT false,
  maintenance_budget DECIMAL(10,2) DEFAULT 0,
  lease_start_date DATE,
  lease_end_date DATE,
  mot_expiry DATE,
  vehicle_status VARCHAR(50) DEFAULT 'active'::character varying,
  accessibility_features JSONB DEFAULT '[]'::jsonb,
  maintenance_notes TEXT,
  last_inspection DATE,
  next_inspection DATE,
  PRIMARY KEY (vehicle_id),
  UNIQUE (tenant_id, registration)
);
CREATE INDEX idx_tenant_vehicles_tenant_id ON public.tenant_vehicles USING btree (tenant_id);
CREATE INDEX idx_tenant_vehicles_tenant ON public.tenant_vehicles USING btree (tenant_id);
CREATE INDEX idx_tenant_vehicles_driver ON public.tenant_vehicles USING btree (tenant_id, driver_id);
CREATE INDEX idx_tenant_vehicles_accessible ON public.tenant_vehicles USING btree (tenant_id, wheelchair_accessible);
CREATE INDEX idx_tenant_vehicles_status ON public.tenant_vehicles USING btree (tenant_id, vehicle_status);
CREATE INDEX idx_tenant_vehicles_driver_id ON public.tenant_vehicles USING btree (tenant_id, driver_id);
CREATE INDEX idx_tenant_vehicles_ownership ON public.tenant_vehicles USING btree (tenant_id, ownership);
CREATE INDEX idx_tenant_vehicles_registration ON public.tenant_vehicles USING btree (tenant_id, registration);
CREATE INDEX idx_tenant_vehicles_maintenance ON public.tenant_vehicles USING btree (tenant_id, mot_date, insurance_expiry);
CREATE UNIQUE INDEX unique_tenant_registration ON public.tenant_vehicles USING btree (tenant_id, registration);
CREATE INDEX idx_tenant_vehicles_tenant_active ON public.tenant_vehicles USING btree (tenant_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_tenant_vehicles_type ON public.tenant_vehicles USING btree (tenant_id, vehicle_type);
CREATE INDEX idx_vehicles_tenant_id ON public.tenant_vehicles USING btree (tenant_id);

-- Table: tenants
CREATE TABLE IF NOT EXISTS tenants (
  tenant_id INTEGER DEFAULT nextval('tenants_tenant_id_seq'::regclass) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) NOT NULL,
  domain VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  features JSONB DEFAULT '{}'::jsonb,
  theme JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  organization_type VARCHAR(50) DEFAULT 'charity'::character varying,
  cooperative_model VARCHAR(50),
  discount_percentage DECIMAL(5,2) DEFAULT 0.00,
  governance_requirements JSONB DEFAULT '{}'::jsonb,
  enabled_modules JSONB DEFAULT '{}'::jsonb,
  app_id INTEGER NOT NULL,
  base_price DECIMAL(10,2) DEFAULT 100.00,
  currency VARCHAR(3) DEFAULT 'GBP'::character varying,
  billing_cycle VARCHAR(20) DEFAULT 'monthly'::character varying,
  PRIMARY KEY (tenant_id),
  UNIQUE (domain),
  UNIQUE (subdomain)
);
CREATE INDEX idx_tenants_subdomain ON public.tenants USING btree (subdomain);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER DEFAULT nextval('users_id_seq'::regclass) NOT NULL,
  tenant_id INTEGER,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user'::character varying,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE (tenant_id, email)
);
CREATE INDEX idx_users_tenant_id ON public.users USING btree (tenant_id);

-- ============================================
-- FOREIGN KEYS (added after all tables exist)
-- ============================================

ALTER TABLE billing_events ADD FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE CASCADE;
ALTER TABLE cooperative_allocations ADD FOREIGN KEY (distribution_id) REFERENCES cooperative_profit_sharing(distribution_id) ON DELETE CASCADE;
ALTER TABLE cooperative_allocations ADD FOREIGN KEY (member_id) REFERENCES cooperative_members(member_id) ON DELETE CASCADE;
ALTER TABLE cooperative_board_members ADD FOREIGN KEY (elected_by_vote_id) REFERENCES cooperative_voting(vote_id);
ALTER TABLE cooperative_board_members ADD FOREIGN KEY (member_id) REFERENCES cooperative_members(member_id) ON DELETE CASCADE;
ALTER TABLE cooperative_meetings ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE cooperative_members ADD FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id) ON DELETE CASCADE;
ALTER TABLE cooperative_members ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE;
ALTER TABLE cooperative_membership ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE cooperative_policies ADD FOREIGN KEY (approval_vote_id) REFERENCES cooperative_voting(vote_id);
ALTER TABLE cooperative_policies ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE cooperative_reports ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE cooperative_votes_cast ADD FOREIGN KEY (member_id) REFERENCES cooperative_members(member_id) ON DELETE CASCADE;
ALTER TABLE cooperative_votes_cast ADD FOREIGN KEY (vote_id) REFERENCES cooperative_voting(vote_id) ON DELETE CASCADE;
ALTER TABLE cooperative_voting ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE credit_notes ADD FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id);
ALTER TABLE credit_notes ADD FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE CASCADE;
ALTER TABLE customer_feedback ADD FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id);
ALTER TABLE customer_message_reads ADD FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id) ON DELETE CASCADE;
ALTER TABLE customer_message_reads ADD FOREIGN KEY (message_id) REFERENCES tenant_messages(message_id) ON DELETE CASCADE;
ALTER TABLE customer_messages_to_office ADD FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id) ON DELETE CASCADE;
ALTER TABLE customer_messages_to_office ADD FOREIGN KEY (reply_message_id) REFERENCES tenant_messages(message_id) ON DELETE SET NULL;
ALTER TABLE customer_messages_to_office ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE driver_message_reads ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE;
ALTER TABLE driver_message_reads ADD FOREIGN KEY (message_id) REFERENCES driver_messages(message_id) ON DELETE CASCADE;
ALTER TABLE driver_messages ADD FOREIGN KEY (target_driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE;
ALTER TABLE driver_messages ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE driver_to_office_messages ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE;
ALTER TABLE driver_to_office_messages ADD FOREIGN KEY (read_by) REFERENCES tenant_users(user_id) ON DELETE SET NULL;
ALTER TABLE driver_to_office_messages ADD FOREIGN KEY (resolved_by) REFERENCES tenant_users(user_id) ON DELETE SET NULL;
ALTER TABLE driver_to_office_messages ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE invoices ADD FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE CASCADE;
ALTER TABLE payments ADD FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE CASCADE;
ALTER TABLE payments ADD FOREIGN KEY (payment_method_id) REFERENCES payment_methods(payment_method_id);
ALTER TABLE risk_assessments ADD FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id) ON DELETE CASCADE;
ALTER TABLE subscription_history ADD FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE CASCADE;
ALTER TABLE subscriptions ADD FOREIGN KEY (payment_method_id) REFERENCES payment_methods(payment_method_id);
ALTER TABLE tenant_adhoc_customer_requests ADD FOREIGN KEY (converted_to_journey_id) REFERENCES tenant_adhoc_journeys(journey_id);
ALTER TABLE tenant_adhoc_journeys ADD FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id);
ALTER TABLE tenant_adhoc_journeys ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_adhoc_journeys ADD FOREIGN KEY (vehicle_id) REFERENCES tenant_vehicles(vehicle_id);
ALTER TABLE tenant_admin_audit_log ADD FOREIGN KEY (approved_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_admin_audit_log ADD FOREIGN KEY (user_id) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_admin_permissions ADD FOREIGN KEY (granted_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_admin_permissions ADD FOREIGN KEY (user_id) REFERENCES tenant_users(user_id) ON DELETE CASCADE;
ALTER TABLE tenant_assignment_history ADD FOREIGN KEY (assignment_id) REFERENCES tenant_schedule_assignments(assignment_id) ON DELETE CASCADE;
ALTER TABLE tenant_assignment_history ADD FOREIGN KEY (changed_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_board_meetings ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_board_members ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_budgets ADD FOREIGN KEY (approved_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_budgets ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_company_settings ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_compliance_incidents ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_compliance_incidents ADD FOREIGN KEY (vehicle_id) REFERENCES tenant_vehicles(vehicle_id);
ALTER TABLE tenant_compliance_tracking ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_cost_center_expenses ADD FOREIGN KEY (cost_center_id) REFERENCES tenant_cost_centers(id) ON DELETE CASCADE;
ALTER TABLE tenant_cost_center_expenses ADD FOREIGN KEY (logged_by) REFERENCES tenant_office_staff(id) ON DELETE SET NULL;
ALTER TABLE tenant_cost_center_expenses ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_cost_centers ADD FOREIGN KEY (owner_id) REFERENCES tenant_office_staff(id) ON DELETE SET NULL;
ALTER TABLE tenant_cost_centers ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_customer_feedback ADD FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id);
ALTER TABLE tenant_customer_feedback ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_customer_feedback ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE tenant_customer_holiday_balances ADD FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id) ON DELETE CASCADE;
ALTER TABLE tenant_customer_holiday_balances ADD FOREIGN KEY (updated_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_customers ADD FOREIGN KEY (user_id) REFERENCES tenant_users(user_id) ON DELETE SET NULL;
ALTER TABLE tenant_driver_alerts ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_driver_assignments ADD FOREIGN KEY (employee_id) REFERENCES tenant_employees(employee_id);
ALTER TABLE tenant_driver_assignments ADD FOREIGN KEY (vehicle_id) REFERENCES tenant_vehicles(vehicle_id);
ALTER TABLE tenant_driver_fuel ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE;
ALTER TABLE tenant_driver_fuel ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_driver_fuel_submissions ADD FOREIGN KEY (approved_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_driver_fuel_submissions ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_driver_holiday_balances ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE;
ALTER TABLE tenant_driver_holiday_balances ADD FOREIGN KEY (updated_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_driver_holidays ADD FOREIGN KEY (approved_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_driver_holidays ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE;
ALTER TABLE tenant_driver_holidays ADD FOREIGN KEY (requested_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_driver_hours ADD FOREIGN KEY (approved_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_driver_hours ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_driver_performance_metrics ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_driver_permits ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE;
ALTER TABLE tenant_driver_roles ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE;
ALTER TABLE tenant_driver_status_updates ADD FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id);
ALTER TABLE tenant_driver_status_updates ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_driver_timesheets ADD FOREIGN KEY (approved_by) REFERENCES tenant_office_staff(id) ON DELETE SET NULL;
ALTER TABLE tenant_driver_timesheets ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE;
ALTER TABLE tenant_driver_timesheets ADD FOREIGN KEY (payroll_period_id) REFERENCES tenant_payroll_periods(period_id) ON DELETE SET NULL;
ALTER TABLE tenant_driver_timesheets ADD FOREIGN KEY (rejected_by) REFERENCES tenant_office_staff(id) ON DELETE SET NULL;
ALTER TABLE tenant_driver_timesheets ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_driver_training_records ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_drivers ADD FOREIGN KEY (user_id) REFERENCES tenant_users(user_id) ON DELETE SET NULL;
ALTER TABLE tenant_employee_vehicles ADD FOREIGN KEY (employee_id) REFERENCES tenant_employees(employee_id);
ALTER TABLE tenant_employee_vehicles ADD FOREIGN KEY (vehicle_id) REFERENCES tenant_vehicles(vehicle_id);
ALTER TABLE tenant_employees ADD FOREIGN KEY (user_id) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_financial_tracking ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_financial_tracking ADD FOREIGN KEY (updated_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_financial_transactions ADD FOREIGN KEY (budget_id) REFERENCES tenant_budgets(budget_id);
ALTER TABLE tenant_financial_transactions ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_financial_transactions ADD FOREIGN KEY (invoice_id) REFERENCES tenant_invoices(invoice_id);
ALTER TABLE tenant_freelance_submissions ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_freelance_submissions ADD FOREIGN KEY (period_id) REFERENCES tenant_payroll_periods(period_id) ON DELETE CASCADE;
ALTER TABLE tenant_freelance_submissions ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_fuel_cards ADD FOREIGN KEY (assigned_driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_fuel_cards ADD FOREIGN KEY (assigned_vehicle_id) REFERENCES tenant_vehicles(vehicle_id);
ALTER TABLE tenant_fuel_efficiency ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_fuel_efficiency ADD FOREIGN KEY (vehicle_id) REFERENCES tenant_vehicles(vehicle_id);
ALTER TABLE tenant_fuel_transactions ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE RESTRICT;
ALTER TABLE tenant_fuel_transactions ADD FOREIGN KEY (card_id) REFERENCES tenant_fuelcards(fuel_card_id) ON DELETE CASCADE;
ALTER TABLE tenant_fuel_transactions ADD FOREIGN KEY (card_id) REFERENCES tenant_fuelcards(fuel_card_id) ON DELETE CASCADE;
ALTER TABLE tenant_fuel_transactions ADD FOREIGN KEY (vehicle_id) REFERENCES tenant_vehicles(vehicle_id) ON DELETE RESTRICT;
ALTER TABLE tenant_fuel_transactions ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_fuel_transactions ADD FOREIGN KEY (vehicle_id) REFERENCES tenant_vehicles(vehicle_id);
ALTER TABLE tenant_fuelcards ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id) ON DELETE SET NULL;
ALTER TABLE tenant_fuelcards ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE SET NULL;
ALTER TABLE tenant_fuelcards ADD FOREIGN KEY (vehicle_id) REFERENCES tenant_vehicles(vehicle_id) ON DELETE SET NULL;
ALTER TABLE tenant_holiday_blackout_dates ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_holiday_requests ADD FOREIGN KEY (approved_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_holiday_requests ADD FOREIGN KEY (cancelled_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_holiday_requests ADD FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id) ON DELETE CASCADE;
ALTER TABLE tenant_holiday_requests ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE;
ALTER TABLE tenant_holiday_requests ADD FOREIGN KEY (rejected_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_holiday_requests ADD FOREIGN KEY (requested_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_holidays ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE;
ALTER TABLE tenant_invoice_alerts ADD FOREIGN KEY (invoice_id) REFERENCES tenant_invoices(invoice_id) ON DELETE CASCADE;
ALTER TABLE tenant_invoice_alerts ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_invoice_line_items ADD FOREIGN KEY (trip_id) REFERENCES tenant_trip_records(trip_id) ON DELETE SET NULL;
ALTER TABLE tenant_invoice_line_items ADD FOREIGN KEY (assignment_id) REFERENCES tenant_schedule_assignments(assignment_id) ON DELETE SET NULL;
ALTER TABLE tenant_invoice_line_items ADD FOREIGN KEY (invoice_id) REFERENCES tenant_invoices(invoice_id) ON DELETE CASCADE;
ALTER TABLE tenant_invoice_reminder_log ADD FOREIGN KEY (invoice_id) REFERENCES tenant_invoices(invoice_id) ON DELETE CASCADE;
ALTER TABLE tenant_invoice_reminder_log ADD FOREIGN KEY (reminder_id) REFERENCES tenant_invoice_reminders(reminder_id) ON DELETE SET NULL;
ALTER TABLE tenant_invoice_split_payments ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id) ON DELETE SET NULL;
ALTER TABLE tenant_invoice_split_payments ADD FOREIGN KEY (invoice_id) REFERENCES tenant_invoices(invoice_id) ON DELETE CASCADE;
ALTER TABLE tenant_invoice_split_payments ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_invoices ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id) ON DELETE SET NULL;
ALTER TABLE tenant_invoices ADD FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id) ON DELETE SET NULL;
ALTER TABLE tenant_invoices ADD FOREIGN KEY (parent_customer_id) REFERENCES tenant_customers(customer_id) ON DELETE SET NULL;
ALTER TABLE tenant_maintenance ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_maintenance ADD FOREIGN KEY (vehicle_id) REFERENCES tenant_vehicles(vehicle_id) ON DELETE CASCADE;
ALTER TABLE tenant_messages ADD FOREIGN KEY (target_customer_id) REFERENCES tenant_customers(customer_id) ON DELETE CASCADE;
ALTER TABLE tenant_messages ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_office_staff ADD FOREIGN KEY (manager_id) REFERENCES tenant_office_staff(id) ON DELETE SET NULL;
ALTER TABLE tenant_office_staff ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_organizational_structure ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_organizational_structure ADD FOREIGN KEY (updated_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_payment_records ADD FOREIGN KEY (invoice_id) REFERENCES tenant_invoices(invoice_id) ON DELETE CASCADE;
ALTER TABLE tenant_payment_records ADD FOREIGN KEY (processed_by) REFERENCES tenant_users(user_id) ON DELETE SET NULL;
ALTER TABLE tenant_payment_records ADD FOREIGN KEY (split_payment_id) REFERENCES tenant_invoice_split_payments(split_payment_id) ON DELETE SET NULL;
ALTER TABLE tenant_payroll_movements ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_payroll_movements ADD FOREIGN KEY (period_id) REFERENCES tenant_payroll_periods(period_id) ON DELETE CASCADE;
ALTER TABLE tenant_payroll_movements ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_payroll_periods ADD FOREIGN KEY (submitted_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_payroll_periods ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_payroll_records ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_payroll_records ADD FOREIGN KEY (period_id) REFERENCES tenant_payroll_periods(period_id) ON DELETE CASCADE;
ALTER TABLE tenant_payroll_records ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_permit_audit_log ADD FOREIGN KEY (changed_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_preference_requests ADD FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id);
ALTER TABLE tenant_preference_requests ADD FOREIGN KEY (reviewed_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_route_optimization_history ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_route_templates ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_safeguarding_attachments ADD FOREIGN KEY (report_id) REFERENCES tenant_safeguarding_reports(report_id) ON DELETE CASCADE;
ALTER TABLE tenant_safeguarding_attachments ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_safeguarding_reports ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE;
ALTER TABLE tenant_safeguarding_reports ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_saved_routes ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_schedule_assignments ADD FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id) ON DELETE CASCADE;
ALTER TABLE tenant_schedule_assignments ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE;
ALTER TABLE tenant_schedule_assignments ADD FOREIGN KEY (linked_assignment_id) REFERENCES tenant_schedule_assignments(assignment_id) ON DELETE SET NULL;
ALTER TABLE tenant_schedule_conflicts ADD FOREIGN KEY (assignment_id_1) REFERENCES tenant_schedule_assignments(assignment_id);
ALTER TABLE tenant_schedule_conflicts ADD FOREIGN KEY (assignment_id_2) REFERENCES tenant_schedule_assignments(assignment_id);
ALTER TABLE tenant_schedule_templates ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_schedules ADD FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id) ON DELETE CASCADE;
ALTER TABLE tenant_schedules ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_schedules ADD FOREIGN KEY (vehicle_id) REFERENCES tenant_vehicles(vehicle_id);
ALTER TABLE tenant_settings ADD FOREIGN KEY (updated_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_split_payment_records ADD FOREIGN KEY (invoice_id) REFERENCES tenant_invoices(invoice_id) ON DELETE CASCADE;
ALTER TABLE tenant_split_payment_records ADD FOREIGN KEY (processed_by) REFERENCES tenant_users(user_id) ON DELETE SET NULL;
ALTER TABLE tenant_split_payment_records ADD FOREIGN KEY (split_payment_id) REFERENCES tenant_invoice_split_payments(split_payment_id) ON DELETE CASCADE;
ALTER TABLE tenant_split_payment_records ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_staff_members ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_staff_members ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_staff_members ADD FOREIGN KEY (line_manager_id) REFERENCES tenant_staff_members(staff_id);
ALTER TABLE tenant_staff_members ADD FOREIGN KEY (user_id) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_staff_structure ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_staff_structure ADD FOREIGN KEY (updated_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_subscription_history ADD FOREIGN KEY (changed_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_training_records ADD FOREIGN KEY (tenant_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE;
ALTER TABLE tenant_training_records ADD FOREIGN KEY (tenant_id) REFERENCES tenant_training_types(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_training_records ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_training_records ADD FOREIGN KEY (updated_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_training_types ADD FOREIGN KEY (created_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_training_types ADD FOREIGN KEY (updated_by) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_trip_records ADD FOREIGN KEY (assignment_id) REFERENCES tenant_schedule_assignments(assignment_id) ON DELETE CASCADE;
ALTER TABLE tenant_trip_records ADD FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id) ON DELETE CASCADE;
ALTER TABLE tenant_trip_records ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE SET NULL;
ALTER TABLE tenant_trip_records ADD FOREIGN KEY (invoice_id) REFERENCES tenant_invoices(invoice_id) ON DELETE SET NULL;
ALTER TABLE tenant_trip_records ADD FOREIGN KEY (recorded_by) REFERENCES tenant_users(user_id) ON DELETE SET NULL;
ALTER TABLE tenant_trip_records ADD FOREIGN KEY (vehicle_id) REFERENCES tenant_vehicles(vehicle_id) ON DELETE SET NULL;
ALTER TABLE tenant_trips ADD FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id);
ALTER TABLE tenant_trips ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_trips ADD FOREIGN KEY (vehicle_id) REFERENCES tenant_vehicles(vehicle_id);
ALTER TABLE tenant_user_security_log ADD FOREIGN KEY (user_id) REFERENCES tenant_users(user_id);
ALTER TABLE tenant_users ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_vehicle_incidents ADD FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id);
ALTER TABLE tenant_vehicle_incidents ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_vehicle_incidents ADD FOREIGN KEY (vehicle_id) REFERENCES tenant_vehicles(vehicle_id);
ALTER TABLE tenant_vehicle_incidents ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
ALTER TABLE tenant_vehicle_maintenance ADD FOREIGN KEY (vehicle_id) REFERENCES tenant_vehicles(vehicle_id) ON DELETE CASCADE;
ALTER TABLE tenants ADD FOREIGN KEY (app_id) REFERENCES commonwealth_apps(app_id) ON DELETE RESTRICT;
ALTER TABLE users ADD FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE;
