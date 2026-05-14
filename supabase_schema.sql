-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub TEXT UNIQUE, -- Google sub ID
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    picture TEXT,
    role TEXT DEFAULT 'team', -- 'team', 'manager', 'core'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Teams Table (Manager-Member relationship)
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID REFERENCES users(id),
    member_id UUID REFERENCES users(id),
    UNIQUE(manager_id, member_id)
);

-- Clients Table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    core_owner TEXT, -- Name or ID of the core team member responsible
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Allocations Monthly (Projected)
CREATE TABLE allocations_monthly (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- YYYY-MM
    client_id UUID REFERENCES clients(id),
    category TEXT,
    hours DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Allocations Weekly (Actuals)
CREATE TABLE allocations_weekly (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- YYYY-MM
    client_id UUID REFERENCES clients(id),
    category TEXT,
    hours DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    week_code TEXT, -- e.g., 2024-05-Wk1
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations_weekly ENABLE ROW LEVEL SECURITY;

-- Users Policies
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own record" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Enable insert for authenticated users" ON users FOR INSERT WITH CHECK (true); -- Simplified for migration

-- Clients Policies
CREATE POLICY "Clients are viewable by everyone" ON clients FOR SELECT USING (true);
CREATE POLICY "Only Core/Admin can manage clients" ON clients FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'core')
);

-- Teams Policies
CREATE POLICY "Teams viewable by everyone" ON teams FOR SELECT USING (true);
CREATE POLICY "Only Core/Admin can manage teams" ON teams FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'core')
);

-- Allocations Policies
CREATE POLICY "Users can manage own allocations" ON allocations_monthly
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own weekly allocations" ON allocations_weekly
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Managers can view team allocations" ON allocations_weekly
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM teams WHERE teams.manager_id = auth.uid() AND teams.member_id = allocations_weekly.user_id)
    );

CREATE POLICY "Core can view all allocations" ON allocations_weekly
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'core')
    );
