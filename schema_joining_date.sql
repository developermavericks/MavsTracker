-- 1. Add joining_date field to employee records (Users Table)
ALTER TABLE users ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE;

-- 2. Backfill existing employees to November 1, 2025 so they show in all reports
UPDATE users SET joining_date = '2025-11-01' WHERE joining_date IS NULL;

-- 3. Create index on joining_date for fast query performance
CREATE INDEX IF NOT EXISTS idx_users_joining_date ON users(joining_date);
