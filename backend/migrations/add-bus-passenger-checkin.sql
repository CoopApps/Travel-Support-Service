-- Add passenger check-in and boarding tracking to bus bookings
-- Allows staff/drivers to mark passengers as boarded or no-show

-- Add check-in related columns to section22_bus_bookings
ALTER TABLE section22_bus_bookings
ADD COLUMN IF NOT EXISTS boarded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS checked_in_by INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS no_show_reason TEXT,
ADD COLUMN IF NOT EXISTS boarding_notes TEXT;

-- Update booking_status constraint to include boarding states
-- First drop the old constraint if it exists
ALTER TABLE section22_bus_bookings
DROP CONSTRAINT IF EXISTS section22_bus_bookings_booking_status_check;

-- Add new constraint with boarding statuses
ALTER TABLE section22_bus_bookings
ADD CONSTRAINT section22_bus_bookings_booking_status_check
CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'boarded', 'no_show'));

-- Create index for quick lookup of boarded passengers
CREATE INDEX IF NOT EXISTS idx_section22_bookings_boarded
ON section22_bus_bookings(timetable_id, booking_status)
WHERE booking_status = 'boarded';

-- Create index for check-in queries
CREATE INDEX IF NOT EXISTS idx_section22_bookings_checkin
ON section22_bus_bookings(timetable_id, boarded_at)
WHERE boarded_at IS NOT NULL;

-- Add comment explaining the check-in workflow
COMMENT ON COLUMN section22_bus_bookings.boarded_at IS
'Timestamp when passenger was marked as boarded. NULL means not yet boarded.';

COMMENT ON COLUMN section22_bus_bookings.checked_in_by IS
'User ID of staff member who checked in the passenger (driver, conductor, or dispatch).';

COMMENT ON COLUMN section22_bus_bookings.no_show_reason IS
'Optional reason if passenger was marked as no-show (e.g., "Called to cancel", "Did not arrive").';

COMMENT ON COLUMN section22_bus_bookings.boarding_notes IS
'Optional notes from boarding process (e.g., "Boarded with wheelchair", "Needed assistance").';

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'section22_bus_bookings'
AND column_name IN ('boarded_at', 'checked_in_by', 'no_show_reason', 'boarding_notes', 'booking_status')
ORDER BY ordinal_position;
