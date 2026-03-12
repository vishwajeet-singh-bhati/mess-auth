-- ============================================================
-- MESS AUTH SYSTEM — SEED DATA (Migration 002)
-- Demo users for development and testing
-- Run AFTER 001_initial_schema.sql
-- NOTE: In production, auth users are created via Supabase Auth.
--       This seed creates the public.users records and profiles.
--       Passwords for all demo users: MessAuth@2024
-- ============================================================

-- ============================================================
-- STEP 1: Insert auth.users via Supabase Auth admin API
-- (In practice use: supabase auth admin createuser)
-- For local dev, we use the known UUIDs and insert directly.
-- ============================================================

-- We use fixed UUIDs so foreign keys are predictable in dev.

-- ============================================================
-- STEP 2: Insert public.users records
-- auth_id values are placeholders — replace with real Supabase Auth UIDs
-- after running: supabase auth admin createuser for each
-- ============================================================

INSERT INTO public.users (id, auth_id, email, full_name, role) VALUES

  -- ADMIN
  ('00000000-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   'admin@messsystem.in',
   'Dr. Ramesh Kumar',
   'admin'),

  -- STAFF: Block A Mess
  ('00000000-0000-0000-0000-000000000010',
   '11111111-0000-0000-0000-000000000010',
   'staff.a@messsystem.in',
   'Suresh Naidu',
   'staff'),

  -- STAFF: Block B Mess
  ('00000000-0000-0000-0000-000000000011',
   '11111111-0000-0000-0000-000000000011',
   'staff.b@messsystem.in',
   'Ganesh Iyer',
   'staff'),

  -- STUDENTS (20 demo students)
  ('00000000-0000-0000-0000-000000000101',
   '11111111-0000-0000-0000-000000000101',
   'cs21b001@student.in', 'Arjun Sharma', 'student'),

  ('00000000-0000-0000-0000-000000000102',
   '11111111-0000-0000-0000-000000000102',
   'ee21b042@student.in', 'Priya Patel', 'student'),

  ('00000000-0000-0000-0000-000000000103',
   '11111111-0000-0000-0000-000000000103',
   'me22b015@student.in', 'Rahul Verma', 'student'),

  ('00000000-0000-0000-0000-000000000104',
   '11111111-0000-0000-0000-000000000104',
   'cs21b078@student.in', 'Sneha Rao', 'student'),

  ('00000000-0000-0000-0000-000000000105',
   '11111111-0000-0000-0000-000000000105',
   'it22b033@student.in', 'Kiran Nair', 'student'),

  ('00000000-0000-0000-0000-000000000106',
   '11111111-0000-0000-0000-000000000106',
   'ec21b056@student.in', 'Deepak Mishra', 'student'),

  ('00000000-0000-0000-0000-000000000107',
   '11111111-0000-0000-0000-000000000107',
   'ce22b009@student.in', 'Anjali Singh', 'student'),

  ('00000000-0000-0000-0000-000000000108',
   '11111111-0000-0000-0000-000000000108',
   'cs22b024@student.in', 'Vikram Reddy', 'student'),

  ('00000000-0000-0000-0000-000000000109',
   '11111111-0000-0000-0000-000000000109',
   'ee22b061@student.in', 'Meera Krishnan', 'student'),

  ('00000000-0000-0000-0000-000000000110',
   '11111111-0000-0000-0000-000000000110',
   'me21b038@student.in', 'Rohan Gupta', 'student'),

  ('00000000-0000-0000-0000-000000000111',
   '11111111-0000-0000-0000-000000000111',
   'it21b019@student.in', 'Fatima Sheikh', 'student'),

  ('00000000-0000-0000-0000-000000000112',
   '11111111-0000-0000-0000-000000000112',
   'cs23b005@student.in', 'Aarav Joshi', 'student'),

  ('00000000-0000-0000-0000-000000000113',
   '11111111-0000-0000-0000-000000000113',
   'ec23b017@student.in', 'Nandini Pillai', 'student'),

  ('00000000-0000-0000-0000-000000000114',
   '11111111-0000-0000-0000-000000000114',
   'ce21b047@student.in', 'Siddharth Menon', 'student'),

  ('00000000-0000-0000-0000-000000000115',
   '11111111-0000-0000-0000-000000000115',
   'me23b031@student.in', 'Pooja Agarwal', 'student'),

  ('00000000-0000-0000-0000-000000000116',
   '11111111-0000-0000-0000-000000000116',
   'cs21b093@student.in', 'Tanmay Kulkarni', 'student'),

  ('00000000-0000-0000-0000-000000000117',
   '11111111-0000-0000-0000-000000000117',
   'ee23b055@student.in', 'Divya Nair', 'student'),

  ('00000000-0000-0000-0000-000000000118',
   '11111111-0000-0000-0000-000000000118',
   'it23b042@student.in', 'Harsh Trivedi', 'student'),

  ('00000000-0000-0000-0000-000000000119',
   '11111111-0000-0000-0000-000000000119',
   'cs22b067@student.in', 'Riya Desai', 'student'),

  ('00000000-0000-0000-0000-000000000120',
   '11111111-0000-0000-0000-000000000120',
   'me22b088@student.in', 'Aditya Bhatt', 'student');

-- ============================================================
-- STEP 3: Staff mess mapping
-- ============================================================

INSERT INTO public.staff_mess_mapping (user_id, mess_id, is_primary) VALUES
  ('00000000-0000-0000-0000-000000000010', 'mess_a', true),
  ('00000000-0000-0000-0000-000000000011', 'mess_b', true);

-- ============================================================
-- STEP 4: Students profiles
-- ============================================================

INSERT INTO public.students (id, user_id, roll_number, hostel_block, room_number, phone, batch_year, department, is_blocked) VALUES
  ('10000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000101', 'CS21B001', 'A', 'A-203', '9876543201', 2021, 'Computer Science',     false),
  ('10000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000102', 'EE21B042', 'B', 'B-115', '9876543202', 2021, 'Electrical Engineering', false),
  ('10000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000103', 'ME22B015', 'A', 'A-307', '9876543203', 2022, 'Mechanical Engineering', false),
  ('10000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000104', 'CS21B078', 'B', 'B-208', '9876543204', 2021, 'Computer Science',       true),  -- blocked student
  ('10000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000105', 'IT22B033', 'A', 'A-112', '9876543205', 2022, 'Information Technology', false),
  ('10000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000106', 'EC21B056', 'B', 'B-321', '9876543206', 2021, 'Electronics',            false),
  ('10000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000107', 'CE22B009', 'A', 'A-419', '9876543207', 2022, 'Civil Engineering',      false),
  ('10000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000000108', 'CS22B024', 'B', 'B-104', '9876543208', 2022, 'Computer Science',       false),
  ('10000000-0000-0000-0000-000000000109', '00000000-0000-0000-0000-000000000109', 'EE22B061', 'A', 'A-215', '9876543209', 2022, 'Electrical Engineering', false),
  ('10000000-0000-0000-0000-000000000110', '00000000-0000-0000-0000-000000000110', 'ME21B038', 'B', 'B-317', '9876543210', 2021, 'Mechanical Engineering', false),
  ('10000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000000111', 'IT21B019', 'A', 'A-118', '9876543211', 2021, 'Information Technology', false),
  ('10000000-0000-0000-0000-000000000112', '00000000-0000-0000-0000-000000000112', 'CS23B005', 'B', 'B-211', '9876543212', 2023, 'Computer Science',       false),
  ('10000000-0000-0000-0000-000000000113', '00000000-0000-0000-0000-000000000113', 'EC23B017', 'A', 'A-323', '9876543213', 2023, 'Electronics',            false),
  ('10000000-0000-0000-0000-000000000114', '00000000-0000-0000-0000-000000000114', 'CE21B047', 'B', 'B-109', '9876543214', 2021, 'Civil Engineering',      false),
  ('10000000-0000-0000-0000-000000000115', '00000000-0000-0000-0000-000000000115', 'ME23B031', 'A', 'A-412', '9876543215', 2023, 'Mechanical Engineering', false),
  ('10000000-0000-0000-0000-000000000116', '00000000-0000-0000-0000-000000000116', 'CS21B093', 'B', 'B-223', '9876543216', 2021, 'Computer Science',       false),
  ('10000000-0000-0000-0000-000000000117', '00000000-0000-0000-0000-000000000117', 'EE23B055', 'A', 'A-116', '9876543217', 2023, 'Electrical Engineering', false),
  ('10000000-0000-0000-0000-000000000118', '00000000-0000-0000-0000-000000000118', 'IT23B042', 'B', 'B-315', '9876543218', 2023, 'Information Technology', false),
  ('10000000-0000-0000-0000-000000000119', '00000000-0000-0000-0000-000000000119', 'CS22B067', 'A', 'A-221', '9876543219', 2022, 'Computer Science',       false),
  ('10000000-0000-0000-0000-000000000120', '00000000-0000-0000-0000-000000000120', 'ME22B088', 'B', 'B-418', '9876543220', 2022, 'Mechanical Engineering', false);

-- Set blocked status for student 104
UPDATE public.students
SET block_reason = 'Repeated mess misuse — administrative block', blocked_at = now()
WHERE id = '10000000-0000-0000-0000-000000000104';

-- ============================================================
-- STEP 5: Subscriptions
-- Students 101–110 → Mess A (active)
-- Students 111–120 → Mess B (active)
-- Student 103 → no subscription (to test denial)
-- ============================================================

INSERT INTO public.subscriptions (student_id, mess_id, status, start_date, end_date, plan_name, monthly_fee, created_by) VALUES

  -- Mess A subscribers
  ('10000000-0000-0000-0000-000000000101', 'mess_a', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000102', 'mess_a', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  -- 103 intentionally has no subscription
  ('10000000-0000-0000-0000-000000000104', 'mess_a', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000105', 'mess_a', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000106', 'mess_a', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000107', 'mess_a', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000108', 'mess_a', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000109', 'mess_a', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000110', 'mess_a', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),

  -- Mess B subscribers
  ('10000000-0000-0000-0000-000000000111', 'mess_b', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000112', 'mess_b', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000113', 'mess_b', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000114', 'mess_b', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000115', 'mess_b', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000116', 'mess_b', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000117', 'mess_b', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000118', 'mess_b', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000119', 'mess_b', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000120', 'mess_b', 'active', '2025-01-01', '2025-12-31', 'Annual Plan', 3500.00, '00000000-0000-0000-0000-000000000001');

-- ============================================================
-- STEP 6: Sample historical meal logs (last 7 days)
-- ============================================================

INSERT INTO public.meal_logs (student_id, mess_id, meal_type, meal_date, method, subscription_id)
SELECT
  s.student_id,
  s.mess_id,
  m.meal_type,
  CURRENT_DATE - (n || ' days')::INTERVAL,
  CASE WHEN random() > 0.1 THEN 'qr_scan' ELSE 'manual_staff' END,
  sub.id
FROM (
  VALUES
    ('10000000-0000-0000-0000-000000000101'::UUID, 'mess_a'::public.mess_id_enum),
    ('10000000-0000-0000-0000-000000000102'::UUID, 'mess_a'::public.mess_id_enum),
    ('10000000-0000-0000-0000-000000000105'::UUID, 'mess_a'::public.mess_id_enum),
    ('10000000-0000-0000-0000-000000000111'::UUID, 'mess_b'::public.mess_id_enum),
    ('10000000-0000-0000-0000-000000000112'::UUID, 'mess_b'::public.mess_id_enum)
) AS s(student_id, mess_id)
CROSS JOIN (
  SELECT unnest(ARRAY['breakfast','lunch','dinner']::public.meal_type_enum[]) AS meal_type
) AS m
CROSS JOIN generate_series(1, 6) AS n
JOIN public.subscriptions sub
  ON sub.student_id = s.student_id
  AND sub.status = 'active'
ON CONFLICT (student_id, meal_type, meal_date) DO NOTHING;

-- ============================================================
-- STEP 7: Sample mess change requests
-- ============================================================

INSERT INTO public.mess_change_requests (student_id, from_mess_id, to_mess_id, reason, status) VALUES
  ('10000000-0000-0000-0000-000000000101', 'mess_a', 'mess_b', 'Block B mess food quality is better', 'pending'),
  ('10000000-0000-0000-0000-000000000112', 'mess_b', 'mess_a', 'Friends are in Block A mess', 'approved');

-- ============================================================
-- STEP 8: Sample denied authorization attempts (for reports)
-- ============================================================

INSERT INTO public.authorization_attempts (student_id, roll_number, mess_id, method, was_successful, denial_reason, meal_type, attempted_at)
VALUES
  ('10000000-0000-0000-0000-000000000102', 'EE21B042', 'mess_b', 'qr_scan', false, 'wrong_mess',      'lunch',     now() - INTERVAL '2 hours'),
  ('10000000-0000-0000-0000-000000000104', 'CS21B078', 'mess_a', 'qr_scan', false, 'blocked_student', 'breakfast', now() - INTERVAL '5 hours'),
  (NULL,                                   'XX00X000', 'mess_a', 'qr_scan', false, 'student_not_found','dinner',   now() - INTERVAL '1 day'),
  ('10000000-0000-0000-0000-000000000101', 'CS21B001', 'mess_a', 'qr_scan', false, 'already_consumed','lunch',     now() - INTERVAL '3 hours');

-- ============================================================
-- DEMO CREDENTIALS SUMMARY
-- ============================================================
-- admin@messsystem.in    / MessAuth@2024  — Admin dashboard
-- staff.a@messsystem.in  / MessAuth@2024  — Block A mess staff
-- staff.b@messsystem.in  / MessAuth@2024  — Block B mess staff
-- cs21b001@student.in    / MessAuth@2024  — Student (Mess A subscriber)
-- ee21b042@student.in    / MessAuth@2024  — Student (Mess A subscriber)
-- me22b015@student.in    / MessAuth@2024  — Student (NO subscription)
-- cs21b078@student.in    / MessAuth@2024  — Student (BLOCKED)
-- it22b033@student.in    / MessAuth@2024  — Student (Mess A subscriber)
-- it21b019@student.in    / MessAuth@2024  — Student (Mess B subscriber)
-- ============================================================
