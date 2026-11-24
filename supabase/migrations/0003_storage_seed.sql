-- حاويات التخزين (خاصة بالكامل) وبيانات أولية

insert into storage.buckets (id, name, public, file_size_limit)
values ('content', 'content', false, 52428800),   -- مكتبة المحتوى (50MB للملف في الخطة المجانية)
       ('media',   'media',   false, 10485760)    -- صور وصوت الأسئلة
on conflict (id) do nothing;

-- لا سياسات على storage.objects عمداً: الرفع والتنزيل عبر الخادم برابط موقّع قصير العمر
-- بعد التحقق من صلاحية المستخدم.

insert into public.subjects(name) values ('العلوم'),('الرياضيات'),('اللغة العربية'),('اللغة الإنجليزية')
on conflict do nothing;
