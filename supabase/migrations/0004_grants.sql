-- صلاحيات الأدوار على جداول public (مشاريع Supabase الجديدة لا تمنحها تلقائياً)
-- service_role: يستخدمه الخادم فقط. authenticated: المستخدم المسجل (تحكمه سياسات RLS).
-- anon (الزائر): بلا أي صلاحية على الجداول.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- سجل الدخول للخادم فقط
revoke all on public.login_log from authenticated;

-- ما يُنشأ لاحقاً يرث الصلاحيات نفسها
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
