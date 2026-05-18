-- ==========================================
-- MAVSTRACKER EXIT DATE SCHEMA MIGRATION
-- Run this block inside your Supabase SQL Editor
-- ==========================================

-- 1. Add exit_date field to employee records (Users Table)
ALTER TABLE users ADD COLUMN IF NOT EXISTS exit_date DATE DEFAULT NULL;

-- 2. Create index on exit_date for fast query performance
CREATE INDEX IF NOT EXISTS idx_users_exit_date ON users(exit_date);
