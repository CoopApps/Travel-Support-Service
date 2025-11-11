-- Migration: Add No-Show Tracking to Customers
-- Date: 2025-01-10
-- Description: Adds fields to track customer reliability and no-show history

-- Add no-show tracking columns to tenant_customers
ALTER TABLE tenant_customers
ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_completed_trips INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_trips_attempted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reliability_percentage DECIMAL(5,2) DEFAULT 100.0,
ADD COLUMN IF NOT EXISTS last_no_show_date DATE,
ADD COLUMN IF NOT EXISTS last_completed_trip_date DATE;

-- Add comment to explain the fields
COMMENT ON COLUMN tenant_customers.no_show_count IS 'Total number of times customer did not show up for pickup';
COMMENT ON COLUMN tenant_customers.total_completed_trips IS 'Total number of successfully completed trips';
COMMENT ON COLUMN tenant_customers.total_trips_attempted IS 'Total number of trips attempted (completed + no_show + cancelled by customer)';
COMMENT ON COLUMN tenant_customers.reliability_percentage IS 'Calculated as (total_completed_trips / total_trips_attempted) * 100';
COMMENT ON COLUMN tenant_customers.last_no_show_date IS 'Date of most recent no-show incident';
COMMENT ON COLUMN tenant_customers.last_completed_trip_date IS 'Date of most recent completed trip';

-- Create function to automatically update customer no-show statistics
CREATE OR REPLACE FUNCTION update_customer_no_show_stats()
RETURNS TRIGGER AS $$
DECLARE
  old_status TEXT;
  new_status TEXT;
BEGIN
  -- Get old and new status
  IF TG_OP = 'UPDATE' THEN
    old_status := OLD.status;
    new_status := NEW.status;

    -- Only process if status actually changed
    IF old_status = new_status THEN
      RETURN NEW;
    END IF;

    -- Handle status change from non-terminal to no_show
    IF new_status = 'no_show' AND old_status NOT IN ('no_show', 'completed', 'cancelled') THEN
      UPDATE tenant_customers
      SET
        no_show_count = no_show_count + 1,
        total_trips_attempted = total_trips_attempted + 1,
        last_no_show_date = NEW.trip_date,
        reliability_percentage = CASE
          WHEN total_trips_attempted + 1 > 0
          THEN ROUND((total_completed_trips::DECIMAL / (total_trips_attempted + 1)) * 100, 2)
          ELSE 100.0
        END
      WHERE customer_id = NEW.customer_id AND tenant_id = NEW.tenant_id;
    END IF;

    -- Handle status change from non-terminal to completed
    IF new_status = 'completed' AND old_status NOT IN ('no_show', 'completed', 'cancelled') THEN
      UPDATE tenant_customers
      SET
        total_completed_trips = total_completed_trips + 1,
        total_trips_attempted = total_trips_attempted + 1,
        last_completed_trip_date = NEW.trip_date,
        reliability_percentage = CASE
          WHEN total_trips_attempted + 1 > 0
          THEN ROUND(((total_completed_trips + 1)::DECIMAL / (total_trips_attempted + 1)) * 100, 2)
          ELSE 100.0
        END
      WHERE customer_id = NEW.customer_id AND tenant_id = NEW.tenant_id;
    END IF;

    -- Handle status change FROM no_show or completed (reversing previous count)
    IF old_status = 'no_show' AND new_status NOT IN ('no_show') THEN
      UPDATE tenant_customers
      SET
        no_show_count = GREATEST(no_show_count - 1, 0),
        total_trips_attempted = GREATEST(total_trips_attempted - 1, 0),
        reliability_percentage = CASE
          WHEN total_trips_attempted - 1 > 0
          THEN ROUND((total_completed_trips::DECIMAL / (total_trips_attempted - 1)) * 100, 2)
          ELSE 100.0
        END
      WHERE customer_id = NEW.customer_id AND tenant_id = NEW.tenant_id;
    END IF;

    IF old_status = 'completed' AND new_status NOT IN ('completed') THEN
      UPDATE tenant_customers
      SET
        total_completed_trips = GREATEST(total_completed_trips - 1, 0),
        total_trips_attempted = GREATEST(total_trips_attempted - 1, 0),
        reliability_percentage = CASE
          WHEN total_trips_attempted - 1 > 0
          THEN ROUND(((total_completed_trips - 1)::DECIMAL / (total_trips_attempted - 1)) * 100, 2)
          ELSE 100.0
        END
      WHERE customer_id = NEW.customer_id AND tenant_id = NEW.tenant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on tenant_trips table
DROP TRIGGER IF EXISTS trigger_update_no_show_stats ON tenant_trips;
CREATE TRIGGER trigger_update_no_show_stats
AFTER UPDATE OF status ON tenant_trips
FOR EACH ROW
EXECUTE FUNCTION update_customer_no_show_stats();

-- Create index for faster queries on no-show stats
CREATE INDEX IF NOT EXISTS idx_customers_reliability ON tenant_customers(tenant_id, reliability_percentage);
CREATE INDEX IF NOT EXISTS idx_customers_no_show_count ON tenant_customers(tenant_id, no_show_count) WHERE no_show_count > 0;

-- Backfill existing data (calculate stats from historical trips)
-- This is optional and can be run separately
UPDATE tenant_customers c
SET
  no_show_count = (
    SELECT COUNT(*)
    FROM tenant_trips t
    WHERE t.customer_id = c.customer_id
      AND t.tenant_id = c.tenant_id
      AND t.status = 'no_show'
  ),
  total_completed_trips = (
    SELECT COUNT(*)
    FROM tenant_trips t
    WHERE t.customer_id = c.customer_id
      AND t.tenant_id = c.tenant_id
      AND t.status = 'completed'
  ),
  total_trips_attempted = (
    SELECT COUNT(*)
    FROM tenant_trips t
    WHERE t.customer_id = c.customer_id
      AND t.tenant_id = c.tenant_id
      AND t.status IN ('completed', 'no_show')
  ),
  last_no_show_date = (
    SELECT MAX(trip_date)
    FROM tenant_trips t
    WHERE t.customer_id = c.customer_id
      AND t.tenant_id = c.tenant_id
      AND t.status = 'no_show'
  ),
  last_completed_trip_date = (
    SELECT MAX(trip_date)
    FROM tenant_trips t
    WHERE t.customer_id = c.customer_id
      AND t.tenant_id = c.tenant_id
      AND t.status = 'completed'
  ),
  reliability_percentage = CASE
    WHEN (SELECT COUNT(*) FROM tenant_trips t WHERE t.customer_id = c.customer_id AND t.tenant_id = c.tenant_id AND t.status IN ('completed', 'no_show')) > 0
    THEN ROUND(
      (SELECT COUNT(*)::DECIMAL FROM tenant_trips t WHERE t.customer_id = c.customer_id AND t.tenant_id = c.tenant_id AND t.status = 'completed') /
      (SELECT COUNT(*)::DECIMAL FROM tenant_trips t WHERE t.customer_id = c.customer_id AND t.tenant_id = c.tenant_id AND t.status IN ('completed', 'no_show')) * 100,
      2
    )
    ELSE 100.0
  END;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ No-show tracking migration completed successfully';
  RAISE NOTICE 'ℹ️  Customer reliability stats have been backfilled from historical data';
END $$;
