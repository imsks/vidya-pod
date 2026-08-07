-- Vidya Pod Database Schema
-- Run this in your Supabase SQL editor

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  qualification TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  standard TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proctors table
CREATE TABLE IF NOT EXISTS proctors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  qualification TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sponsors / Orders table (tracks payments)
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users table (for authorized admin access)
-- This tracks which users are authorized to access the admin panel
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anon (registration)
CREATE POLICY "Allow public insert" ON teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON proctors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert" ON sponsor_orders FOR INSERT WITH CHECK (true);

-- Allow reads from anon (admin panel uses anon key for simplicity)
CREATE POLICY "Allow public read" ON teachers FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON proctors FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON sponsor_orders FOR SELECT USING (true);

-- Admin users policies (authenticated users can only read their own row)
CREATE POLICY "Allow user to read own admin record" ON admin_users FOR SELECT TO authenticated 
  USING (user_id = auth.uid());
CREATE POLICY "Allow super_admin to read all" ON admin_users FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );
CREATE POLICY "Allow super_admin insert" ON admin_users FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Allow updates on sponsor_orders (for webhook status updates)
CREATE POLICY "Allow public update" ON sponsor_orders FOR UPDATE USING (true);

-- Add image_url column to existing tables
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE proctors ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE sponsor_orders ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for faster admin user lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
