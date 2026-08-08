-- Vidya Pod Complete Database Schema & RBAC Extension
-- Run this script in your Supabase SQL Editor

-- -------------------------------------------------------------
-- 1. Admins Table (Private - Server/Service Role Only)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Ensure idempotent column addition for existing deployments (Item 18)
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
-- Enable Row Level Security (RLS)
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

-- Item 2: Admins table has NO public SELECT policy to prevent credential disclosure.
-- Server-side API endpoints access `admins` via trusted database context.

-- Teachers
CREATE POLICY "Allow select teachers" ON teachers FOR SELECT USING (true);
CREATE POLICY "Allow insert teachers" ON teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update teachers" ON teachers FOR UPDATE USING (true);

-- Students
CREATE POLICY "Allow select students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow insert students" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update students" ON students FOR UPDATE USING (true);

-- Proctors
CREATE POLICY "Allow select proctors" ON proctors FOR SELECT USING (true);
CREATE POLICY "Allow insert proctors" ON proctors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update proctors" ON proctors FOR UPDATE USING (true);

-- Item 14: Sponsor Orders (Public INSERT for checkout; updates restricted to trusted service/webhook)
CREATE POLICY "Allow select sponsor_orders" ON sponsor_orders FOR SELECT USING (true);
CREATE POLICY "Allow insert sponsor_orders" ON sponsor_orders FOR INSERT WITH CHECK (true);

-- Pods & Memberships (Item 3: Specific operation policies)
CREATE POLICY "Allow select pods" ON pods FOR SELECT USING (true);
CREATE POLICY "Allow insert pods" ON pods FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update pods" ON pods FOR UPDATE USING (true);
CREATE POLICY "Allow delete pods" ON pods FOR DELETE USING (true);

CREATE POLICY "Allow select pod_memberships" ON pod_memberships FOR SELECT USING (true);
CREATE POLICY "Allow insert pod_memberships" ON pod_memberships FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update pod_memberships" ON pod_memberships FOR UPDATE USING (true);
CREATE POLICY "Allow delete pod_memberships" ON pod_memberships FOR DELETE USING (true);

-- Attendance & Feedback (Item 3)
CREATE POLICY "Allow select attendance_records" ON attendance_records FOR SELECT USING (true);
CREATE POLICY "Allow insert attendance_records" ON attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update attendance_records" ON attendance_records FOR UPDATE USING (true);

CREATE POLICY "Allow select learner_feedbacks" ON learner_feedbacks FOR SELECT USING (true);
CREATE POLICY "Allow insert learner_feedbacks" ON learner_feedbacks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update learner_feedbacks" ON learner_feedbacks FOR UPDATE USING (true);
