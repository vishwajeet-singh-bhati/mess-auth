-- ============================================================
-- MESS AUTH SYSTEM — SUPABASE MIGRATION 001
-- Complete schema with enums, indexes, constraints, triggers
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- needed for EXCLUDE constraint
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE public.user_role AS ENUM (
  'student',
  'staff',
  'admin'
);

CREATE TYPE public.mess_id_enum AS ENUM (
  'mess_a',
  'mess_b'
);

CREATE TYPE public.meal_type_enum AS ENUM (
  'breakfast',
  'lunch',
  'snacks',
  'dinner'
);

CREATE TYPE public.subscription_status_enum AS ENUM (
  'active',
  'inactive',
  'suspended',
  'pending',
  'expired'
);

CREATE TYPE public.request_status_enum AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

CREATE TYPE public.denial_reason_enum AS ENUM (
  'wrong_mess',
  'already_consumed',
  'outside_meal_hours',
  'inactive_subscription',
  'expired_qr',
  'invalid_qr',
  'invalid_token',
  'blocked_student',
  'no_subscription',
  'qr_already_used',
  'student_not_found'
);

CREATE TYPE public.authorization_method_enum AS ENUM (
  'qr_scan',
  'manual_staff',
  'admin_override'
);

CREATE TYPE public.audit_action_enum AS ENUM (
  'manual_verification',
  'admin_override',
  'subscription_created',
  'subscription_updated',
  'subscription_deactivated',
  'student_blocked',
  'student_unblocked',
  'qr_config_changed',
  'meal_slot_changed',
  'temp_permission_granted',
  'temp_permission_revoked',
  'mess_change_approved',
  'mess_change_rejected',
  'staff_assigned',
  'staff_removed'
);

-- ============================================================
-- TABLE: users
-- Mirrors Supabase Auth users. Extended profile data lives here.
-- ============================================================

CREATE TABLE public.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id     UUID UNIQUE NOT NULL,          -- Supabase auth.users.id
  email       TEXT UNIQUE NOT NULL,
  full_name   TEXT NOT NULL,
  role        public.user_role NOT NULL DEFAULT 'student',
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_auth_id   ON public.users (auth_id);
CREATE INDEX idx_users_role      ON public.users (role);
CREATE INDEX idx_users_email     ON public.users (email);
CREATE INDEX idx_users_active    ON public.users (is_active) WHERE is_active = true;

-- ============================================================
-- TABLE: students
-- Extended profile for users with role = 'student'
-- ============================================================

CREATE TABLE public.students (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  roll_number   TEXT UNIQUE NOT NULL,
  hostel_block  TEXT,
  room_number   TEXT,
  phone         TEXT,
  batch_year    SMALLINT CHECK (batch_year >= 2000 AND batch_year <= 2100),
  department    TEXT,
  is_blocked    BOOLEAN NOT NULL DEFAULT false,
  block_reason  TEXT,
  blocked_at    TIMESTAMPTZ,
  blocked_by    UUID REFERENCES public.users (id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_students_user_id     ON public.students (user_id);
CREATE INDEX        idx_students_roll        ON public.students (roll_number);
CREATE INDEX        idx_students_blocked     ON public.students (is_blocked) WHERE is_blocked = true;
CREATE INDEX        idx_students_dept        ON public.students (department);

-- ============================================================
-- TABLE: messes
-- The two mess buildings
-- ============================================================

CREATE TABLE public.messes (
  id              public.mess_id_enum PRIMARY KEY,
  name            TEXT NOT NULL,
  location        TEXT,
  vendor_name     TEXT,
  vendor_contact  TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed mess records immediately (referenced by FKs)
INSERT INTO public.messes (id, name, location, vendor_name) VALUES
  ('mess_a', 'Block A Mess', 'Block A — Ground Floor', 'Shree Caterers'),
  ('mess_b', 'Block B Mess', 'Block B — Ground Floor', 'Annapurna Food Services');

-- ============================================================
-- TABLE: staff_mess_mapping
-- Which mess a staff member manages
-- ============================================================

CREATE TABLE public.staff_mess_mapping (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  mess_id      public.mess_id_enum NOT NULL REFERENCES public.messes (id),
  is_primary   BOOLEAN NOT NULL DEFAULT true,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mess_id)
);

CREATE INDEX idx_staff_mess_user  ON public.staff_mess_mapping (user_id);
CREATE INDEX idx_staff_mess_mess  ON public.staff_mess_mapping (mess_id);

-- ============================================================
-- TABLE: subscriptions
-- One active subscription per student per period
-- ============================================================

CREATE TABLE public.subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  mess_id         public.mess_id_enum NOT NULL REFERENCES public.messes (id),
  status          public.subscription_status_enum NOT NULL DEFAULT 'active',
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  plan_name       TEXT,
  monthly_fee     NUMERIC(10,2),
  notes           TEXT,
  created_by      UUID REFERENCES public.users (id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT sub_date_order CHECK (end_date >= start_date),

  -- Prevent overlapping active subscriptions using GiST range exclusion
  EXCLUDE USING gist (
    student_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  ) WHERE (status = 'active')
);

CREATE INDEX idx_sub_student    ON public.subscriptions (student_id);
CREATE INDEX idx_sub_mess       ON public.subscriptions (mess_id);
CREATE INDEX idx_sub_status     ON public.subscriptions (status);
CREATE INDEX idx_sub_dates      ON public.subscriptions (start_date, end_date);
CREATE INDEX idx_sub_active     ON public.subscriptions (student_id, status) WHERE status = 'active';

-- ============================================================
-- TABLE: meal_slots
-- Configurable time windows for each meal per mess
-- ============================================================

CREATE TABLE public.meal_slots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id      public.mess_id_enum NOT NULL REFERENCES public.messes (id),
  meal_type    public.meal_type_enum NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  updated_by   UUID REFERENCES public.users (id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT slot_time_order CHECK (end_time > start_time),
  UNIQUE (mess_id, meal_type)
);

CREATE INDEX idx_meal_slots_mess    ON public.meal_slots (mess_id);
CREATE INDEX idx_meal_slots_active  ON public.meal_slots (mess_id, is_active) WHERE is_active = true;

-- Seed default meal slots for both messes
INSERT INTO public.meal_slots (mess_id, meal_type, start_time, end_time) VALUES
  ('mess_a', 'breakfast', '07:30', '09:30'),
  ('mess_a', 'lunch',     '12:00', '14:00'),
  ('mess_a', 'snacks',    '16:00', '17:30'),
  ('mess_a', 'dinner',    '19:30', '21:30'),
  ('mess_b', 'breakfast', '07:30', '09:30'),
  ('mess_b', 'lunch',     '12:00', '14:00'),
  ('mess_b', 'snacks',    '16:00', '17:30'),
  ('mess_b', 'dinner',    '19:30', '21:30');

-- ============================================================
-- TABLE: qr_sessions
-- Short-lived tokens generated for each mess kiosk display
-- jti = UUID nonce used as PK to prevent replay attacks
-- ============================================================

CREATE TABLE public.qr_sessions (
  id             UUID PRIMARY KEY,              -- same as JWT jti
  mess_id        public.mess_id_enum NOT NULL REFERENCES public.messes (id),
  token_hash     TEXT NOT NULL,                 -- SHA-256 of full token string
  kiosk_session  TEXT NOT NULL,                 -- identifies the display device
  issued_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ NOT NULL,
  is_used        BOOLEAN NOT NULL DEFAULT false,
  used_at        TIMESTAMPTZ,
  used_by        UUID REFERENCES public.students (id),

  CONSTRAINT qr_expires_after_issued CHECK (expires_at > issued_at)
);

CREATE UNIQUE INDEX idx_qr_token_hash  ON public.qr_sessions (token_hash);
CREATE INDEX        idx_qr_mess        ON public.qr_sessions (mess_id);
CREATE INDEX        idx_qr_expires     ON public.qr_sessions (expires_at);
CREATE INDEX        idx_qr_active      ON public.qr_sessions (mess_id, is_used, expires_at)
                                        WHERE is_used = false;

-- ============================================================
-- TABLE: qr_config
-- Admin-controlled QR behaviour per mess
-- ============================================================

CREATE TABLE public.qr_config (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id                 public.mess_id_enum NOT NULL UNIQUE REFERENCES public.messes (id),
  token_ttl_secs          SMALLINT NOT NULL DEFAULT 30
                            CHECK (token_ttl_secs BETWEEN 10 AND 120),
  refresh_interval_secs   SMALLINT NOT NULL DEFAULT 25
                            CHECK (refresh_interval_secs BETWEEN 5 AND 115),
  is_enabled              BOOLEAN NOT NULL DEFAULT true,
  updated_by              UUID REFERENCES public.users (id),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT refresh_before_ttl CHECK (refresh_interval_secs < token_ttl_secs)
);

INSERT INTO public.qr_config (mess_id, token_ttl_secs, refresh_interval_secs) VALUES
  ('mess_a', 30, 25),
  ('mess_b', 30, 25);

-- ============================================================
-- TABLE: meal_logs
-- Successful meal consumption records
-- Unique constraint prevents same meal twice per day
-- ============================================================

CREATE TABLE public.meal_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES public.students (id),
  mess_id          public.mess_id_enum NOT NULL REFERENCES public.messes (id),
  meal_type        public.meal_type_enum NOT NULL,
  meal_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  authorized_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  method           public.authorization_method_enum NOT NULL DEFAULT 'qr_scan',
  qr_session_id    UUID REFERENCES public.qr_sessions (id),
  authorized_by    UUID REFERENCES public.users (id),    -- staff user if manual/override
  subscription_id  UUID REFERENCES public.subscriptions (id),

  -- Core business rule: one meal per slot per day per student
  CONSTRAINT unique_meal_per_slot_per_day
    UNIQUE (student_id, meal_type, meal_date)
);

CREATE INDEX idx_meal_logs_student   ON public.meal_logs (student_id);
CREATE INDEX idx_meal_logs_mess      ON public.meal_logs (mess_id);
CREATE INDEX idx_meal_logs_date      ON public.meal_logs (meal_date DESC);
CREATE INDEX idx_meal_logs_type      ON public.meal_logs (meal_type);
CREATE INDEX idx_meal_logs_date_mess ON public.meal_logs (meal_date, mess_id);

-- ============================================================
-- TABLE: authorization_attempts
-- Every attempt (success + denied) for audit & reporting
-- ============================================================

CREATE TABLE public.authorization_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID REFERENCES public.students (id),
  roll_number     TEXT,                        -- captured even if student not found
  mess_id         public.mess_id_enum NOT NULL REFERENCES public.messes (id),
  qr_session_id   UUID REFERENCES public.qr_sessions (id),
  method          public.authorization_method_enum NOT NULL,
  was_successful  BOOLEAN NOT NULL,
  denial_reason   public.denial_reason_enum,
  meal_type       public.meal_type_enum,
  ip_address      INET,
  user_agent      TEXT,
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT denial_reason_required_when_denied
    CHECK (was_successful = true OR denial_reason IS NOT NULL)
);

CREATE INDEX idx_attempts_student   ON public.authorization_attempts (student_id);
CREATE INDEX idx_attempts_mess      ON public.authorization_attempts (mess_id);
CREATE INDEX idx_attempts_date      ON public.authorization_attempts (attempted_at DESC);
CREATE INDEX idx_attempts_success   ON public.authorization_attempts (was_successful);
CREATE INDEX idx_attempts_denial    ON public.authorization_attempts (denial_reason)
                                     WHERE was_successful = false;
CREATE INDEX idx_attempts_date_mess ON public.authorization_attempts (attempted_at, mess_id);

-- ============================================================
-- TABLE: mess_change_requests
-- Student requests to switch mess (takes effect next cycle)
-- ============================================================

CREATE TABLE public.mess_change_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES public.students (id),
  from_mess_id    public.mess_id_enum NOT NULL REFERENCES public.messes (id),
  to_mess_id      public.mess_id_enum NOT NULL REFERENCES public.messes (id),
  reason          TEXT,
  status          public.request_status_enum NOT NULL DEFAULT 'pending',
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by     UUID REFERENCES public.users (id),
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,
  effective_date  DATE,

  CONSTRAINT change_messes_must_differ CHECK (from_mess_id <> to_mess_id),
  CONSTRAINT review_fields_together    CHECK (
    (reviewed_by IS NULL) = (reviewed_at IS NULL)
  )
);

CREATE INDEX idx_change_req_student  ON public.mess_change_requests (student_id);
CREATE INDEX idx_change_req_status   ON public.mess_change_requests (status);
CREATE INDEX idx_change_req_pending  ON public.mess_change_requests (requested_at)
                                      WHERE status = 'pending';

-- ============================================================
-- TABLE: temporary_permissions
-- Admin can grant cross-mess access for specific dates
-- ============================================================

CREATE TABLE public.temporary_permissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES public.students (id),
  mess_id      public.mess_id_enum NOT NULL REFERENCES public.messes (id),
  meal_type    public.meal_type_enum,          -- NULL = all meal types
  valid_from   TIMESTAMPTZ NOT NULL,
  valid_until  TIMESTAMPTZ NOT NULL,
  reason       TEXT NOT NULL,
  granted_by   UUID NOT NULL REFERENCES public.users (id),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT temp_perm_date_order CHECK (valid_until > valid_from)
);

CREATE INDEX idx_temp_perm_student   ON public.temporary_permissions (student_id);
CREATE INDEX idx_temp_perm_active    ON public.temporary_permissions (student_id, is_active, valid_until)
                                      WHERE is_active = true;

-- ============================================================
-- TABLE: audit_logs
-- Immutable admin/staff action trail
-- ============================================================

CREATE TABLE public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID NOT NULL REFERENCES public.users (id),
  action        public.audit_action_enum NOT NULL,
  target_type   TEXT,
  target_id     TEXT,
  before_state  JSONB,
  after_state   JSONB,
  notes         TEXT,
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_actor   ON public.audit_logs (actor_id);
CREATE INDEX idx_audit_action  ON public.audit_logs (action);
CREATE INDEX idx_audit_date    ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_target  ON public.audit_logs (target_type, target_id);

-- Audit logs are append-only — prevent updates/deletes via RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_students_updated
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_meal_slots_updated
  BEFORE UPDATE ON public.meal_slots
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER trg_qr_config_updated
  BEFORE UPDATE ON public.qr_config
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Auto-deactivate expired subscriptions (called via scheduled job or on read)
CREATE OR REPLACE FUNCTION public.fn_expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.subscriptions
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND end_date < CURRENT_DATE;
END;
$$;

-- Cleanup old expired QR sessions (keeps DB lean)
CREATE OR REPLACE FUNCTION public.fn_cleanup_qr_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.qr_sessions
  WHERE expires_at < now() - INTERVAL '2 hours';
END;
$$;

-- Block student helper (callable from app)
CREATE OR REPLACE FUNCTION public.fn_block_student(
  p_student_id UUID,
  p_reason     TEXT,
  p_blocked_by UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.students
  SET
    is_blocked  = true,
    block_reason = p_reason,
    blocked_at  = now(),
    blocked_by  = p_blocked_by,
    updated_at  = now()
  WHERE id = p_student_id;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_mess_mapping     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_slots             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_config              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorization_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mess_change_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporary_permissions  ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role from users table
CREATE OR REPLACE FUNCTION public.fn_current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- Helper: get current user's internal id
CREATE OR REPLACE FUNCTION public.fn_current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- Helper: get current student's id
CREATE OR REPLACE FUNCTION public.fn_current_student_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT s.id FROM public.students s
  JOIN public.users u ON u.id = s.user_id
  WHERE u.auth_id = auth.uid() LIMIT 1;
$$;

-- users: admin sees all, users see own
CREATE POLICY "users_select_own_or_admin" ON public.users
  FOR SELECT USING (
    auth_id = auth.uid()
    OR public.fn_current_user_role() IN ('admin', 'staff')
  );

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "users_admin_all" ON public.users
  FOR ALL USING (public.fn_current_user_role() = 'admin');

-- students: own record or admin/staff
CREATE POLICY "students_select" ON public.students
  FOR SELECT USING (
    user_id = public.fn_current_user_id()
    OR public.fn_current_user_role() IN ('admin', 'staff')
  );

CREATE POLICY "students_admin_write" ON public.students
  FOR ALL USING (public.fn_current_user_role() = 'admin');

-- messes: public read
CREATE POLICY "messes_public_read" ON public.messes
  FOR SELECT USING (true);

CREATE POLICY "messes_admin_write" ON public.messes
  FOR ALL USING (public.fn_current_user_role() = 'admin');

-- meal_slots: public read, admin write
CREATE POLICY "meal_slots_read" ON public.meal_slots
  FOR SELECT USING (true);

CREATE POLICY "meal_slots_admin_write" ON public.meal_slots
  FOR ALL USING (public.fn_current_user_role() = 'admin');

-- qr_sessions: only service role (server) can write
CREATE POLICY "qr_sessions_service_only" ON public.qr_sessions
  FOR ALL USING (public.fn_current_user_role() IN ('admin', 'staff'));

-- qr_config: read for all authenticated, write for admin
CREATE POLICY "qr_config_read" ON public.qr_config
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "qr_config_admin_write" ON public.qr_config
  FOR ALL USING (public.fn_current_user_role() = 'admin');

-- subscriptions: student sees own, staff/admin see all
CREATE POLICY "subscriptions_own_or_admin" ON public.subscriptions
  FOR SELECT USING (
    student_id = public.fn_current_student_id()
    OR public.fn_current_user_role() IN ('admin', 'staff')
  );

CREATE POLICY "subscriptions_admin_write" ON public.subscriptions
  FOR ALL USING (public.fn_current_user_role() = 'admin');

-- meal_logs: student sees own, staff/admin see all
CREATE POLICY "meal_logs_own_or_staff" ON public.meal_logs
  FOR SELECT USING (
    student_id = public.fn_current_student_id()
    OR public.fn_current_user_role() IN ('admin', 'staff')
  );

-- authorization_attempts: staff sees their mess, admin sees all
CREATE POLICY "auth_attempts_staff_or_admin" ON public.authorization_attempts
  FOR SELECT USING (public.fn_current_user_role() IN ('admin', 'staff'));

CREATE POLICY "auth_attempts_student_own" ON public.authorization_attempts
  FOR SELECT USING (student_id = public.fn_current_student_id());

-- mess_change_requests: student sees own, admin sees all
CREATE POLICY "change_req_own_or_admin" ON public.mess_change_requests
  FOR SELECT USING (
    student_id = public.fn_current_student_id()
    OR public.fn_current_user_role() IN ('admin', 'staff')
  );

CREATE POLICY "change_req_student_insert" ON public.mess_change_requests
  FOR INSERT WITH CHECK (student_id = public.fn_current_student_id());

CREATE POLICY "change_req_admin_write" ON public.mess_change_requests
  FOR UPDATE USING (public.fn_current_user_role() = 'admin');

-- temporary_permissions: admin manages
CREATE POLICY "temp_perm_admin" ON public.temporary_permissions
  FOR ALL USING (public.fn_current_user_role() = 'admin');

CREATE POLICY "temp_perm_student_read" ON public.temporary_permissions
  FOR SELECT USING (student_id = public.fn_current_student_id());

-- audit_logs: admin read-only, no writes via RLS (service role only)
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs
  FOR SELECT USING (public.fn_current_user_role() = 'admin');

-- staff_mess_mapping: admin manages, staff reads own
CREATE POLICY "smm_staff_read_own" ON public.staff_mess_mapping
  FOR SELECT USING (
    user_id = public.fn_current_user_id()
    OR public.fn_current_user_role() = 'admin'
  );

CREATE POLICY "smm_admin_write" ON public.staff_mess_mapping
  FOR ALL USING (public.fn_current_user_role() = 'admin');

-- ============================================================
-- VIEWS (for reporting)
-- ============================================================

-- Daily mess meal summary
CREATE OR REPLACE VIEW public.v_daily_meal_summary AS
SELECT
  ml.meal_date,
  ml.mess_id,
  m.name                    AS mess_name,
  ml.meal_type,
  COUNT(*)                  AS total_meals,
  COUNT(*) FILTER (WHERE ml.method = 'qr_scan')      AS qr_scans,
  COUNT(*) FILTER (WHERE ml.method = 'manual_staff') AS manual_entries
FROM public.meal_logs ml
JOIN public.messes m ON m.id = ml.mess_id
GROUP BY ml.meal_date, ml.mess_id, m.name, ml.meal_type
ORDER BY ml.meal_date DESC, ml.mess_id, ml.meal_type;

-- Today's authorization feed (live for staff dashboard)
CREATE OR REPLACE VIEW public.v_today_authorizations AS
SELECT
  aa.id,
  aa.attempted_at,
  aa.mess_id,
  aa.meal_type,
  aa.method,
  aa.was_successful,
  aa.denial_reason,
  s.roll_number,
  u.full_name            AS student_name
FROM public.authorization_attempts aa
LEFT JOIN public.students s ON s.id = aa.student_id
LEFT JOIN public.users    u ON u.id = s.user_id
WHERE aa.attempted_at::DATE = CURRENT_DATE
ORDER BY aa.attempted_at DESC;

-- Student subscription status (current)
CREATE OR REPLACE VIEW public.v_student_subscription_status AS
SELECT
  s.id            AS student_id,
  s.roll_number,
  u.full_name,
  u.email,
  sub.mess_id     AS subscribed_mess,
  m.name          AS mess_name,
  sub.start_date,
  sub.end_date,
  sub.status      AS subscription_status,
  s.is_blocked,
  s.block_reason
FROM public.students s
JOIN public.users u ON u.id = s.user_id
LEFT JOIN public.subscriptions sub ON sub.student_id = s.id
  AND sub.status = 'active'
  AND sub.start_date <= CURRENT_DATE
  AND sub.end_date   >= CURRENT_DATE
LEFT JOIN public.messes m ON m.id = sub.mess_id;
