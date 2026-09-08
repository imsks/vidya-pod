-- Vidya Pod Supabase Storage setup
-- Run in Supabase SQL Editor after creating the project.

-- ============================================
-- BUCKET
-- ============================================

-- Create the shared photos bucket (public read for profile images).
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Public read access for profile photos (required for getPublicUrl).
CREATE POLICY "Public read photos bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'photos');

-- Server-side uploads use SUPABASE_SECRET_KEY (bypasses RLS).
-- Do NOT add broad INSERT policies for anon/authenticated unless you
-- intentionally want client-side uploads.

-- Optional: restrict uploads to entity folders when using authenticated users later.
-- CREATE POLICY "Authenticated upload to entity folders"
-- ON storage.objects
-- FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'photos'
--   AND (
--     (storage.foldername(name))[1] = 'learners'
--     OR (storage.foldername(name))[1] = 'teachers'
--     OR (storage.foldername(name))[1] = 'proctors'
--     OR (storage.foldername(name))[1] = 'donors'
--   )
-- );
