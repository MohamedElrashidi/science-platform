-- نشر الدرجات (تلقائي/يدوي) + متابعة الطلاب مباشرة + قفل وإعادة. شغّله مرة واحدة في SQL Editor.
alter table public.exams add column if not exists release_mode text not null default 'auto';
alter table public.exams drop constraint if exists exams_release_mode_check;
alter table public.exams add constraint exams_release_mode_check check (release_mode in ('auto','manual'));

alter table public.attempts add column if not exists released_at timestamptz;
alter table public.attempts add column if not exists current_q int;

create table if not exists public.exam_overrides (
  exam_id bigint not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  extra_attempts int not null default 0,
  lock text not null default 'none' check (lock in ('none','temp','final')),
  primary key (exam_id, student_id)
);
alter table public.exam_overrides enable row level security;   -- للخادم فقط
revoke all on public.exam_overrides from anon, authenticated;
grant all on public.exam_overrides to service_role;
