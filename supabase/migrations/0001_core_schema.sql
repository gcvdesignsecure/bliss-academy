create extension if not exists pgcrypto;

create type user_role as enum ('applicant','student','teacher','superadmin');
create type admission_status as enum ('submitted','kyc_pending','under_review','approved','rejected');
create type account_status as enum ('active','suspended','withdrawn');

-- Profiles (one row per auth user)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null default 'applicant',
  full_name text not null,
  email text not null unique,
  whatsapp text,
  country text,
  status account_status not null default 'active',
  created_at timestamptz not null default now()
);

-- Matric numbers: unique, generated server-side only
create sequence matnumber_seq start 1000;
create table students (
  user_id uuid primary key references profiles on delete cascade,
  mat_number text not null unique,
  created_at timestamptz not null default now()
);

create table admins (
  user_id uuid primary key references profiles on delete cascade,
  admin_number int not null unique,
  registered_name text not null,
  is_superadmin boolean not null default false
);

create table admissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles,
  dob date,
  status admission_status not null default 'submitted',
  reviewed_by uuid references profiles,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- KYC: store only status + provider reference, never raw NIN/BVN
create table identity_verifications (
  id uuid primary key default gen_random_uuid(),
  admission_id uuid not null references admissions,
  provider text not null,
  provider_reference text,
  reference_hash text unique,  -- hash of verified identity, blocks duplicates
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Courses
create table courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  duration_months int not null default 6,
  pass_mark int not null default 80,
  is_active boolean not null default true
);

create table course_teachers (
  course_id uuid references courses on delete cascade,
  teacher_id uuid references profiles on delete cascade,
  primary key (course_id, teacher_id)
);

create table enrolments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles,
  course_id uuid not null references courses,
  unlocked boolean not null default false,  -- set only after verified payment
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles,
  provider text not null default 'paystack',
  reference text not null unique,  -- duplicate protection
  amount_kobo bigint not null,
  status text not null default 'pending',
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id bigserial primary key,
  actor uuid references profiles,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Helper functions for RLS
create function is_role(r user_role) returns boolean
language sql stable security definer as
$$ select exists (select 1 from profiles where id = auth.uid() and role = r) $$;

create function teaches_course(cid uuid) returns boolean
language sql stable security definer as
$$ select exists (select 1 from course_teachers where course_id = cid and teacher_id = auth.uid()) $$;

-- RLS
alter table profiles enable row level security;
alter table students enable row level security;
alter table admins enable row level security;
alter table admissions enable row level security;
alter table identity_verifications enable row level security;
alter table courses enable row level security;
alter table course_teachers enable row level security;
alter table enrolments enable row level security;
alter table payments enable row level security;
alter table audit_logs enable row level security;

create policy "own profile" on profiles for select using (id = auth.uid() or is_role('superadmin'));
create policy "own student row" on students for select using (user_id = auth.uid() or is_role('superadmin'));
create policy "superadmin admins" on admins for select using (is_role('superadmin') or user_id = auth.uid());
create policy "own admission" on admissions for select using (user_id = auth.uid() or is_role('superadmin'));
create policy "superadmin kyc" on identity_verifications for select using (is_role('superadmin'));
create policy "public courses" on courses for select using (is_active);
create policy "superadmin manage courses" on courses for all using (is_role('superadmin'));
create policy "assignments visible" on course_teachers for select using (teacher_id = auth.uid() or is_role('superadmin'));
create policy "own or taught enrolments" on enrolments for select
  using (student_id = auth.uid() or teaches_course(course_id) or is_role('superadmin'));
create policy "own payments" on payments for select using (student_id = auth.uid() or is_role('superadmin'));
create policy "superadmin audit" on audit_logs for select using (is_role('superadmin'));
-- No insert/update policies on sensitive tables: writes go through Edge Functions only.