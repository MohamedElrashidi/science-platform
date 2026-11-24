-- أولياء الأمور: دور جديد + جدول ربط ولي الأمر بأبنائه. شغّله مرة واحدة في SQL Editor.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin','teacher','student','parent'));

create table if not exists public.parent_students (
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  primary key (parent_id, student_id)
);
alter table public.parent_students enable row level security;   -- بلا سياسات عمداً: للخادم فقط
revoke all on public.parent_students from anon, authenticated;
grant all on public.parent_students to service_role;
