/**
 * Bus Communications & Notifications Schema
 *
 * Tables for managing passenger communications:
 * - bus_communications: Main communication records
 * - bus_communication_recipients: Individual recipients and delivery status
 */

-- Bus Communications Table
CREATE TABLE IF NOT EXISTS bus_communications (
  message_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

  -- Message Classification
  message_type VARCHAR(50) NOT NULL CHECK (message_type IN (
    'booking_confirmation',
    'cancellation',
    'delay',
    'service_alert',
    'announcement'
  )),

  -- Delivery Configuration
  delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('sms', 'email', 'both')),

  -- Recipient Targeting
  recipient_type VARCHAR(30) NOT NULL CHECK (recipient_type IN (
    'individual',      -- Single booking
    'route',          -- All passengers on a route
    'service',        -- All passengers on a specific timetable
    'all_passengers'  -- Broadcast to all active passengers
  )),
  recipient_id INTEGER,  -- booking_id, route_id, or timetable_id depending on recipient_type

  -- Message Content
  subject TEXT,
  message_body TEXT NOT NULL,

  -- Scheduling
  scheduled_send TIMESTAMP,
  sent_at TIMESTAMP,

  -- Status Tracking
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER,  -- User who created the communication
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bus Communication Recipients Table
CREATE TABLE IF NOT EXISTS bus_communication_recipients (
  recipient_id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES bus_communications(message_id) ON DELETE CASCADE,

  -- Recipient Information
  booking_id INTEGER,  -- Reference to bus_bookings (soft reference)
  recipient_name VARCHAR(255),
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),

  -- Delivery Status
  delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN (
    'pending',
    'sent',
    'failed',
    'bounced'
  )),
  delivery_error TEXT,

  -- Delivery Timestamps
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,  -- For email tracking
  clicked_at TIMESTAMP, -- For link tracking

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_bus_communications_tenant ON bus_communications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bus_communications_status ON bus_communications(status);
CREATE INDEX IF NOT EXISTS idx_bus_communications_type ON bus_communications(message_type);
CREATE INDEX IF NOT EXISTS idx_bus_communications_scheduled ON bus_communications(scheduled_send) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_bus_comm_recipients_message ON bus_communication_recipients(message_id);
CREATE INDEX IF NOT EXISTS idx_bus_comm_recipients_booking ON bus_communication_recipients(booking_id);
CREATE INDEX IF NOT EXISTS idx_bus_comm_recipients_status ON bus_communication_recipients(delivery_status);

-- Comments
COMMENT ON TABLE bus_communications IS 'Communication messages sent to bus passengers (SMS/Email)';
COMMENT ON TABLE bus_communication_recipients IS 'Individual recipients and delivery status for bus communications';

COMMENT ON COLUMN bus_communications.message_type IS 'Type of communication: booking_confirmation, cancellation, delay, service_alert, announcement';
COMMENT ON COLUMN bus_communications.delivery_method IS 'Delivery channel: sms, email, or both';
COMMENT ON COLUMN bus_communications.recipient_type IS 'Target audience: individual (single booking), route (all on route), service (all on timetable), all_passengers (broadcast)';
COMMENT ON COLUMN bus_communications.recipient_id IS 'ID reference based on recipient_type (booking_id, route_id, timetable_id)';
COMMENT ON COLUMN bus_communication_recipients.delivery_status IS 'Delivery status: pending, sent, failed, bounced';
