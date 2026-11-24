# منصة العلوم التعليمية

اختبارات وأوراق عمل وأنشطة تفاعلية ومتابعة تقدم الطلاب. واجهة عربية RTL، تطبيق PWA قابل للتثبيت.
المكدس: Next.js 15 + Supabase (Postgres / Auth / Storage) + Vercel.

## الحالة
المرحلة A (الأساس): الهيكل، قاعدة البيانات مع RLS، الدخول (معلم بالبريد، طالب باسم مستخدم + كود)، إنشاء الطلاب، PWA.
باقي الصفحات (الصفوف، بنك الأسئلة، الاختبارات، حل الطالب، التحليلات، التصدير) تُضاف في المراحل التالية.
لم يُنشر التطبيق بعد، ولم يُبنَ أو يُختبر على أجهزة حقيقية.

## 1) إعداد Supabase
1. أنشئ مشروعاً على https://supabase.com (الخطة المجانية).
2. من **SQL Editor** شغّل بالترتيب: `supabase/migrations/0001_schema.sql` ثم `0002_rls.sql` ثم `0003_storage_seed.sql`.
3. من **Project Settings → API** انسخ: Project URL، anon key، service_role key.
4. من **Authentication → Providers** اترك Email مفعلاً، وعطّل "Confirm email" لتسهيل الاختبار.
5. أنشئ أول مدير: من **Authentication → Users → Add user** (بريدك وكلمة مرور قوية)، ثم في SQL Editor:
```sql
insert into public.profiles (id, role, full_name, username)
select id, 'admin', 'اسم المدير', 'admin' from auth.users where email = 'بريدك@example.com';
```

## 2) التشغيل محلياً
```bash
cp .env.example .env.local   # عبّئ القيم
npm install
npm run dev                  # http://localhost:3000
```

## 3) النشر على Vercel
1. ادفع المشروع إلى GitHub.
2. في https://vercel.com اختر **Add New → Project** واستورد المستودع.
3. أضف متغيرات البيئة نفسها من `.env.example` (الأربعة الأولى).
4. اضغط **Deploy**. تحصل على رابط `https://اسم-المشروع.vercel.app` بـ HTTPS تلقائياً.
5. في Supabase → Authentication → URL Configuration ضع رابط Vercel في **Site URL**.

## 4) نطاق خاص (مثل www.myschool.com)
1. اشترِ النطاق من أي مسجّل (نحو 10–15 دولاراً سنوياً).
2. Vercel → المشروع → **Settings → Domains → Add** وأدخل `www.myschool.com`.
3. عند المسجّل أضف سجل **CNAME** للاسم `www` يشير إلى القيمة التي تعرضها Vercel (غالباً `cname.vercel-dns.com`).
4. انتظر من دقائق إلى ساعات؛ تصدر شهادة HTTPS تلقائياً.
5. حدّث Site URL في Supabase إلى النطاق الجديد.

## 5) تثبيت التطبيق (PWA)
- **Android (Chrome):** القائمة ⋮ ← "تثبيت التطبيق".
- **iPhone (Safari):** زر المشاركة ← "إضافة إلى الشاشة الرئيسية".
- **الكمبيوتر (Chrome/Edge):** أيقونة التثبيت في شريط العنوان.

## الحدود المجانية (قد تتغير، راجع صفحات الأسعار)
- **Supabase Free:** قاعدة بيانات 500MB، تخزين 1GB، يُوقَف المشروع بعد نحو أسبوع بلا نشاط (يُستأنف يدوياً). لا نسخ احتياطي يومي مضمون.
- **Vercel Hobby:** للاستخدام غير التجاري فقط. المدرسة الخاصة أو الاستخدام المدفوع يتطلب خطة Pro (نحو 20$/شهر للمقعد).
- عند التوسع: Supabase Pro نحو 25$/شهر (لا إيقاف تلقائي، نسخ احتياطي يومي).

## الأمان
- مفتاح `service_role` سري ويُستخدم في مسارات الخادم فقط. لا ترفعه إلى GitHub.
- الطالب لا يقرأ بنك الأسئلة ولا الإجابات الصحيحة؛ التصحيح على الخادم فقط.
- كود دخول الطالب 8 خانات يظهر مرة واحدة عند الإنشاء ولا يُخزَّن نصاً.
- حد 8 محاولات دخول فاشلة خلال 10 دقائق للطالب.
- الملفات في Storage خاصة وتُخدم برابط موقّع قصير العمر.
