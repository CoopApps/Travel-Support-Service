-- ============================================================================
-- Cost Center Views Migration
-- ============================================================================
-- This migration creates database views for cost center analytics
-- and reporting functionality
-- ============================================================================

-- Drop existing view if exists
DROP VIEW IF EXISTS view_cost_center_utilization;

-- ============================================================================
-- VIEW: view_cost_center_utilization
-- ============================================================================
-- Provides aggregated budget vs actual spend analysis for cost centers
-- Includes YTD and month-to-date spend calculations
-- ============================================================================

CREATE OR REPLACE VIEW view_cost_center_utilization AS
SELECT
  cc.id,
  cc.tenant_id,
  cc.code,
  cc.name,
  cc.category,
  cc.description,
  cc.budget_annual,
  cc.budget_monthly,
  cc.is_active,
  cc.manager_name,
  cc.manager_email,
  cc.created_at,
  cc.updated_at,

  -- Calculate Year-to-Date spend
  COALESCE((
    SELECT SUM(amount)
    FROM tenant_cost_center_expenses
    WHERE cost_center_id = cc.id
      AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  ), 0) AS total_spent_ytd,

  -- Calculate This Month spend
  COALESCE((
    SELECT SUM(amount)
    FROM tenant_cost_center_expenses
    WHERE cost_center_id = cc.id
      AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND EXTRACT(MONTH FROM expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)
  ), 0) AS total_spent_this_month,

  -- Calculate remaining annual budget
  CASE
    WHEN cc.budget_annual IS NOT NULL THEN
      cc.budget_annual - COALESCE((
        SELECT SUM(amount)
        FROM tenant_cost_center_expenses
        WHERE cost_center_id = cc.id
          AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      ), 0)
    ELSE NULL
  END AS remaining_annual,

  -- Calculate remaining monthly budget
  CASE
    WHEN cc.budget_monthly IS NOT NULL THEN
      cc.budget_monthly - COALESCE((
        SELECT SUM(amount)
        FROM tenant_cost_center_expenses
        WHERE cost_center_id = cc.id
          AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND EXTRACT(MONTH FROM expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)
      ), 0)
    ELSE NULL
  END AS remaining_monthly,

  -- Calculate utilization percentage (annual)
  CASE
    WHEN cc.budget_annual IS NOT NULL AND cc.budget_annual > 0 THEN
      ROUND(((COALESCE((
        SELECT SUM(amount)
        FROM tenant_cost_center_expenses
        WHERE cost_center_id = cc.id
          AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      ), 0) / cc.budget_annual) * 100)::numeric, 2)
    ELSE 0
  END AS utilization_percentage_annual,

  -- Calculate utilization percentage (monthly)
  CASE
    WHEN cc.budget_monthly IS NOT NULL AND cc.budget_monthly > 0 THEN
      ROUND(((COALESCE((
        SELECT SUM(amount)
        FROM tenant_cost_center_expenses
        WHERE cost_center_id = cc.id
          AND EXTRACT(YEAR FROM expense_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          AND EXTRACT(MONTH FROM expense_date) = EXTRACT(MONTH FROM CURRENT_DATE)
      ), 0) / cc.budget_monthly) * 100)::numeric, 2)
    ELSE 0
  END AS utilization_percentage_monthly,

  -- Count of expenses
  (
    SELECT COUNT(*)
    FROM tenant_cost_center_expenses
    WHERE cost_center_id = cc.id
  ) AS expense_count

FROM tenant_cost_centers cc
WHERE cc.is_active = true
ORDER BY cc.code;

-- ============================================================================
-- Grant permissions
-- ============================================================================

COMMENT ON VIEW view_cost_center_utilization IS 'Aggregated cost center utilization and budget tracking';
