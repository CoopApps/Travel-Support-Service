-- Create admin user for Sheffield Transport (tenant_id: 2)
-- Password: admin123 (hashed with bcrypt)
INSERT INTO tenant_users (
  tenant_id,
  username,
  email,
  full_name,
  password_hash,
  role,
  is_active
) VALUES (
  2,
  'admin',
  'admin@sheffieldtransport.co.uk',
  'Sheffield Administrator',
  '$2a$10$8YfQS8ZqNVZ0r7z3R5YQAO9kJ5bH6gF.QL2Y3Xb8LbQVQJQZLxXqK',  -- This is bcrypt hash of "admin123"
  'admin',
  true
) ON CONFLICT DO NOTHING;
