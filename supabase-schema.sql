-- Vidya Pod Database Schema
-- Run this in your Supabase SQL editor

-- ============================================
-- CORE ENTITY TABLES
-- ============================================

-- Sponsors table - Individuals or organizations sponsoring learners
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  organization TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learners table - Students/learners using the platform
CREATE TABLE IF NOT EXISTS learners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  standard TEXT NOT NULL,
  image_url TEXT,
  sponsor_id UUID REFERENCES sponsors(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teachers table - Instructors teaching learners
CREATE TABLE IF NOT EXISTS teachers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  qualification TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proctors table - Proctors overseeing learner activities
CREATE TABLE IF NOT EXISTS proctors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  qualification TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SponsorOrders table - Orders/records of sponsorship transactions
CREATE TABLE IF NOT EXISTS sponsor_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
  payment_session_id TEXT,
  sponsor_id UUID REFERENCES sponsors(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEGACY TABLES (for backward compatibility)
-- ============================================

-- Students table (legacy - use learners for new development)
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  standard TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE learners ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES - Allow public access (for registration/admin)
-- ============================================

-- Insert policies
CREATE POLICY "Allow public insert" ON sponsors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON learners FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON proctors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON sponsor_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON students FOR INSERT WITH CHECK (true);

-- Read policies
CREATE POLICY "Allow public read" ON sponsors FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON learners FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON teachers FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON proctors FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON sponsor_orders FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON students FOR SELECT USING (true);

-- Update policies
CREATE POLICY "Allow public update" ON sponsors FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON learners FOR UPDATE USING (true);
CREATE POLICY "Allow public update" ON sponsor_orders FOR UPDATE USING (true);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_learners_sponsor_id ON learners(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_orders_sponsor_id ON sponsor_orders(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_orders_status ON sponsor_orders(status);

-- ============================================
-- MIGRATION HELPERS (for existing data)
-- ============================================

-- Add image_url column to existing tables if not exists
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE proctors ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE sponsor_orders ADD COLUMN IF NOT EXISTS image_url TEXT;



-- Pod and RBAC foundation for multi-login system
-- Related to: https://github.com/imsks/vidya-pod/issues/13

CREATE TABLE IF NOT EXISTS pods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'donor', 'proctor')),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pod_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  user_profile_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'donor', 'proctor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pod_id, user_profile_id, role)
);

ALTER TABLE pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_memberships ENABLE ROW LEVEL SECURITY;

-- Temporary permissive policies for early development.
-- These should be tightened once authentication and role-aware access control are implemented.
CREATE POLICY "Allow public read pods" ON pods FOR SELECT USING (true);
CREATE POLICY "Allow public read user profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public read pod memberships" ON pod_memberships FOR SELECT USING (true);

CREATE POLICY "Allow public insert pods" ON pods FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert user profiles" ON user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert pod memberships" ON pod_memberships FOR INSERT WITH CHECK (true);