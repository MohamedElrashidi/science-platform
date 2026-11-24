-- أكواد دخول الطلاب (لإعادة طباعة البطاقات). للخادم فقط: لا يقرؤها الطلاب ولا المتصفح.
create table if not exists public.student_codes (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null,
  updated_at timestamptz not null default now()
);
alter table public.student_codes enable row level security;   -- بلا سياسات عمداً
revoke all on public.student_codes from anon, authenticated;
grant all on public.student_codes to service_role;
