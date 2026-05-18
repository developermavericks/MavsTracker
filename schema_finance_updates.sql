-- ==========================================
-- MAVSTRACKER FINANCE PORTAL SCHEMA MIGRATIONS
-- Run this block inside your Supabase SQL Editor
-- ==========================================

-- 1. Add salary field to employee records (Users Table)
ALTER TABLE users ADD COLUMN IF NOT EXISTS salary DECIMAL(12, 2) DEFAULT 0.00;

-- 2. Add client budgets and core vertical categories to client records (Clients Table)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS budget DECIMAL(12, 2) DEFAULT 0.00;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS core TEXT DEFAULT '';

-- 3. Optionally update existing users/clients with some sample seed data for illustration
-- (Uncomment and edit as needed)
/*
UPDATE users SET salary = 150000.00 WHERE email = 'tech@themavericksindia.com';
UPDATE users SET salary = 85000.00 WHERE email = 'pooja@themavericksindia.com';

UPDATE clients SET budget = 120000.00, core = 'PR' WHERE name = 'Angara';
UPDATE clients SET budget = 250000.00, core = 'Digital' WHERE name = 'Mavericks Corporate';
*/
