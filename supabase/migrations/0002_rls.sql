-- أمان على مستوى الصف (RLS)
-- المبدأ: الطالب لا يقرأ بنك الأسئلة ولا إجاباته الصحيحة ولا يكتب الدرجات مباشرة.
-- كل تفاعل الطالب مع الاختبار (بدء/حفظ/تسليم/تصحيح) يمر عبر مسارات الخادم في Next.js
-- بمفتاح service_role، ولا يُكشف هذا المفتاح للمتصفح أبداً.

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() and active $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.my_role() = 'admin', false) $$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(public.my_role() in ('admin','teacher'), false) $$;

create or replace function public.teaches_class(cid bigint) returns boolean
language sql stable security definer set search_path = public as
$$ select public.is_admin() or exists (
     select 1 from public.class_teachers where class_id = cid and teacher_id = auth.uid()) $$;

create or replace function public.can_see_student(sid uuid) returns boolean
language sql stable security definer set search_path = public as
$$ select public.is_admin() or sid = auth.uid() or exists (
     select 1 from public.profiles s
     where s.id = sid and s.role = 'student'
       and (s.created_by = auth.uid()
            or (s.class_id is not null and exists (
                  select 1 from public.class_teachers ct
                  where ct.class_id = s.class_id and ct.teacher_id = auth.uid())))) $$;

create or replace function public.owns_exam(eid bigint) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.exams where id = eid and owner_id = auth.uid()) $$;

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_teachers enable row level security;
alter table public.subjects enable row level security;
alter table public.lessons enable row level security;
alter table public.questions enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_assignments enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.resources enable row level security;
alter table public.resource_assignments enable row level security;
alter table public.resource_results enable row level security;
alter table public.login_log enable row level security;   -- بلا سياسات: للخادم فقط

-- profiles
create policy profiles_read on public.profiles for select
  using (public.can_see_student(id) or id = auth.uid() or public.is_staff());
create policy profiles_admin_write on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- classes
create policy classes_read on public.classes for select
  using (public.teaches_class(id) or id = (select class_id from public.profiles where id = auth.uid()));
create policy classes_admin_write on public.classes for all
  using (public.is_admin()) with check (public.is_admin());
create policy ct_read on public.class_teachers for select
  using (public.is_admin() or teacher_id = auth.uid());
create policy ct_admin_write on public.class_teachers for all
  using (public.is_admin()) with check (public.is_admin());

-- المواد والدروس: قراءة للجميع المسجلين، كتابة للمعلمين
create policy subjects_read on public.subjects for select using (auth.uid() is not null);
create policy subjects_write on public.subjects for all using (public.is_staff()) with check (public.is_staff());
create policy lessons_read on public.lessons for select using (auth.uid() is not null);
create policy lessons_write on public.lessons for all using (public.is_staff()) with check (public.is_staff());

-- بنك الأسئلة: المعلم صاحب السؤال فقط (والمدير). الطالب: لا شيء.
create policy q_owner on public.questions for all
  using (public.is_staff() and (owner_id = auth.uid() or public.is_admin()))
  with check (public.is_staff() and (owner_id = auth.uid() or public.is_admin()));

-- الاختبارات: صاحب الاختبار. الطالب يرى المنشور المسند إليه (بدون أسئلة).
create policy exams_owner on public.exams for all
  using (public.is_staff() and (owner_id = auth.uid() or public.is_admin()))
  with check (public.is_staff() and (owner_id = auth.uid() or public.is_admin()));
create policy exams_student_read on public.exams for select
  using (status = 'published' and exists (
    select 1 from public.exam_assignments a
    where a.exam_id = exams.id
      and (a.student_id = auth.uid()
           or a.class_id = (select class_id from public.profiles where id = auth.uid()))));

create policy eq_owner on public.exam_questions for all
  using (public.owns_exam(exam_id) or public.is_admin())
  with check (public.owns_exam(exam_id) or public.is_admin());
create policy ea_owner on public.exam_assignments for all
  using (public.owns_exam(exam_id) or public.is_admin())
  with check (public.owns_exam(exam_id) or public.is_admin());

-- المحاولات: الطالب يقرأ محاولاته؛ المعلم صاحب الاختبار يقرأ ويصحح. الكتابة للطالب عبر الخادم فقط.
create policy att_student_read on public.attempts for select using (student_id = auth.uid());
create policy att_owner on public.attempts for all
  using (public.owns_exam(exam_id) or public.is_admin())
  with check (public.owns_exam(exam_id) or public.is_admin());
create policy ans_owner on public.attempt_answers for all
  using (exists (select 1 from public.attempts a where a.id = attempt_id
                 and (public.owns_exam(a.exam_id) or public.is_admin())))
  with check (exists (select 1 from public.attempts a where a.id = attempt_id
                 and (public.owns_exam(a.exam_id) or public.is_admin())));
-- لا توجد سياسة قراءة للطالب على attempt_answers عمداً (تحوي الدرجات قبل السماح بإظهارها)

-- مكتبة المحتوى
create policy res_owner on public.resources for all
  using (public.is_staff() and (owner_id = auth.uid() or public.is_admin()))
  with check (public.is_staff() and (owner_id = auth.uid() or public.is_admin()));
create policy res_student_read on public.resources for select
  using (status = 'published' and exists (
    select 1 from public.resource_assignments a
    where a.resource_id = resources.id
      and (a.student_id = auth.uid()
           or a.class_id = (select class_id from public.profiles where id = auth.uid()))));
create policy ra_owner on public.resource_assignments for all
  using (exists (select 1 from public.resources r where r.id = resource_id
                 and (r.owner_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.resources r where r.id = resource_id
                 and (r.owner_id = auth.uid() or public.is_admin())));
create policy rr_student_insert on public.resource_results for insert
  with check (student_id = auth.uid());
create policy rr_read on public.resource_results for select
  using (student_id = auth.uid() or exists (select 1 from public.resources r
        where r.id = resource_id and (r.owner_id = auth.uid() or public.is_admin())));
