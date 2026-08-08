-- Vidya Pod Complete Database Schema & RBAC Extension
-- Run this script in your Supabase SQL Editor

-- -------------------------------------------------------------
-- 1. Admins Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default admin if not existing
INSERT INTO admins (username, password, name)
VALUES ('sachin', 'sachin', 'Sachin Admin')
ON CONFLICT (username) DO NOTHING;

-- -------------------------------------------------------------
-- 2. Teachers Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teachers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  qualification TEXT NOT NULL,
  image_url TEXT,
  email TEXT,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 3. Students / Learners Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  standard TEXT NOT NULL,
  image_url TEXT,
  email TEXT,
  password TEXT,
  has_app_access BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure idempotent column addition for existing deployments
ALTER TABLE students ADD COLUMN IF NOT EXISTS has_app_access BOOLEAN DEFAULT TRUE;

-- -------------------------------------------------------------
-- 4. Proctors Table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proctors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  qualification TEXT NOT NULL,
  image_url TEXT,
  email TEXT,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 5. Sponsors / Donors Orders Table
-- -------------------------------------------------------------
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
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 6. PODs Table (Created & Managed strictly by Admins)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PAUSED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 7. POD Memberships Table (Mapping users & roles to PODs)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pod_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'proctor', 'donor')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pod_id, member_id, role)
);

-- -------------------------------------------------------------
-- 8. Attendance Records Table (Managed by Proctors & Admins)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  proctor_id UUID REFERENCES proctors(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'EXCUSED')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pod_id, student_id, date)
);

-- -------------------------------------------------------------
-- 9. Learner Feedbacks Table (Managed by Teachers, Proctors & Admins)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learner_feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pod_id UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('teacher', 'proctor', 'admin')),
  feedback_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Enable RLS & Set Policies
-- -------------------------------------------------------------
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_feedbacks ENABLE ROW LEVEL SECURITY;

-- Note: In production with server-side API routes, RLS policies allow server-side operations via Supabase client.
CREATE POLICY "Allow public select admins" ON admins FOR SELECT USING (true);
CREATE POLICY "Allow public insert teachers" ON teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select teachers" ON teachers FOR SELECT USING (true);
CREATE POLICY "Allow public update teachers" ON teachers FOR UPDATE USING (true);

CREATE POLICY "Allow public insert students" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public update students" ON students FOR UPDATE USING (true);

CREATE POLICY "Allow public insert proctors" ON proctors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select proctors" ON proctors FOR SELECT USING (true);
CREATE POLICY "Allow public update proctors" ON proctors FOR UPDATE USING (true);

CREATE POLICY "Allow public insert sponsor_orders" ON sponsor_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select sponsor_orders" ON sponsor_orders FOR SELECT USING (true);
CREATE POLICY "Allow public update sponsor_orders" ON sponsor_orders FOR UPDATE USING (true);

CREATE POLICY "Allow public all pods" ON pods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all pod_memberships" ON pod_memberships FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all attendance_records" ON attendance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all learner_feedbacks" ON learner_feedbacks FOR ALL USING (true) WITH CHECK (true);
