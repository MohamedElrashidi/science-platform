-- منصة الاختبارات والمتابعة — مخطط Postgres (Supabase)
-- شغّل الملفات بالترتيب: 0001 ثم 0002 ثم 0003

create extension if not exists pgcrypto;

-- ملف المستخدم مرتبط بجدول المصادقة auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','teacher','student')),
  full_name text not null,
  username text not null unique,
  phone text,
  guardian_name text,
  grade_level text,
  class_id bigint,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.classes (
  id bigint generated always as identity primary key,
  name text not null,
  grade_level text,
  created_at timestamptz not null default now()
);
alter table public.profiles
  add constraint profiles_class_fk foreign key (class_id) references public.classes(id) on delete set null;

create table public.class_teachers (
  class_id bigint not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  primary key (class_id, teacher_id)
);

create table public.subjects (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table public.lessons (
  id bigint generated always as identity primary key,
  subject_id bigint not null references public.subjects(id) on delete cascade,
  title text not null,
  grade_level text
);

create table public.questions (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  subject_id bigint references public.subjects(id) on delete set null,
  lesson_id bigint references public.lessons(id) on delete set null,
  grade_level text,
  qtype text not null,
  prompt text not null,
  instructions text,
  media_kind text,
  media_url text,
  data jsonb not null,            -- الإجابات الصحيحة: لا يقرؤها الطالب أبداً
  explanation text,
  marks numeric not null default 1,
  difficulty text default 'medium',
  status text not null default 'approved' check (status in ('approved','pending_review')),
  created_at timestamptz not null default now()
);

create table public.exams (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  kind text not null default 'exam',
  subject_id bigint references public.subjects(id) on delete set null,
  lesson_id bigint references public.lessons(id) on delete set null,
  grade_level text,
  description text,
  duration_minutes int,
  starts_at timestamptz,
  ends_at timestamptz,
  max_attempts int not null default 1,
  shuffle_questions boolean not null default false,
  shuffle_options boolean not null default false,
  show_answers boolean not null default false,
  show_score boolean not null default true,
  practice_mode boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published')),
  share_enabled boolean not null default false,
  share_token text unique default encode(gen_random_bytes(12), 'hex'),  -- رابط مشاركة الاختبار
  created_at timestamptz not null default now()
);

create table public.exam_questions (
  exam_id bigint not null references public.exams(id) on delete cascade,
  question_id bigint not null references public.questions(id) on delete cascade,
  position int not null default 0,
  marks numeric not null default 1,
  primary key (exam_id, question_id)
);

create table public.exam_assignments (
  id bigint generated always as identity primary key,
  exam_id bigint not null references public.exams(id) on delete cascade,
  class_id bigint references public.classes(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  check ((class_id is not null)::int + (student_id is not null)::int = 1)
);

create table public.attempts (
  id bigint generated always as identity primary key,
  exam_id bigint not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  attempt_no int not null,
  seed int not null,
  started_at timestamptz not null default now(),
  deadline_at timestamptz,
  submitted_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','graded')),
  score numeric, total numeric, percent numeric,
  unique (exam_id, student_id, attempt_no)
);

create table public.attempt_answers (
  attempt_id bigint not null references public.attempts(id) on delete cascade,
  question_id bigint not null references public.questions(id) on delete cascade,
  answer jsonb,
  is_correct boolean,             -- null = بانتظار التصحيح اليدوي
  marks_awarded numeric,
  max_marks numeric not null default 0,
  needs_manual boolean not null default false,
  feedback text,
  updated_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

create table public.resources (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  kind text not null default 'worksheet',
  subject_id bigint references public.subjects(id) on delete set null,
  lesson_id bigint references public.lessons(id) on delete set null,
  grade_level text,
  description text,
  source text not null check (source in ('file','zip','html','link')),
  storage_path text,              -- المسار داخل bucket الخاص content
  entry text,
  filename text,
  external_url text,
  size bigint default 0,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now()
);

create table public.resource_assignments (
  id bigint generated always as identity primary key,
  resource_id bigint not null references public.resources(id) on delete cascade,
  class_id bigint references public.classes(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  check ((class_id is not null)::int + (student_id is not null)::int = 1)
);

create table public.resource_results (
  id bigint generated always as identity primary key,
  resource_id bigint not null references public.resources(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  score numeric not null, max_score numeric not null,
  at timestamptz not null default now()
);

create table public.login_log (
  id bigint generated always as identity primary key,
  username text, ip text, ok boolean, at timestamptz not null default now()
);

create index on public.attempts(student_id);
create index on public.attempts(exam_id);
create index on public.profiles(class_id);
create index on public.questions(owner_id, subject_id, lesson_id);
create index on public.login_log(username, at);
create index on public.exam_assignments(exam_id);
create index on public.resource_assignments(resource_id);
