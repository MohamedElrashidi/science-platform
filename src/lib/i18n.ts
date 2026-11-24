// ترجمة واجهة التنقل والصفحات الرئيسية. أي نص غير موجود هنا يبقى بالعربية.
const EN: Record<string, string> = {
  "لوحة التحكم": "Dashboard", "الصفوف": "Classes", "الطلاب": "Students", "الامتحانات": "Exams", "استيراد الامتحانات": "Import exams",
  "المواد والدروس": "Subjects & lessons", "أوراق العمل": "Worksheets", "الأنشطة التفاعلية": "Interactive activities", "الفيديوهات": "Videos",
  "بنك الأسئلة": "Question bank", "التقارير والتحليلات": "Reports & analytics", "المعلمون": "Teachers", "الإعدادات": "Settings", "الرئيسية": "Home",
  "مدير": "Admin", "معلم": "Teacher", "طالب": "Student", "طالب / ولي أمر": "Student / Parent", "ولي أمر": "Parent", "أولياء الأمور": "Parents", "المكافآت والشهادات": "Awards & certificates", "قريباً": "Soon", "منصة العلوم التعليمية": "Science learning platform",
  "تسجيل الخروج": "Sign out", "القائمة": "Menu", "إغلاق": "Close",
  "أهلاً،": "Welcome,", "مختبرك الذكي للتعلّم: تابع طلابك وامتحاناتك ونتائجهم من مكان واحد.": "Your smart learning lab: follow your students, exams and results in one place.",
  "مرحباً بك في مختبر العلوم. اكتشف، تعلّم، وتابع تقدّمك خطوة بخطوة.": "Welcome to the science lab. Discover, learn and track your progress step by step.",
  "استيراد امتحان": "Import an exam", "إضافة طلاب": "Add students", "إضافة طالب": "Add a student",
  "إجمالي الطلاب": "Total students", "الصفوف النشطة": "Active classes", "امتحانات منشورة": "Published exams", "تسليمات مكتملة": "Completed submissions",
  "متوسط أداء الطلاب": "Average performance", "النشاط الأسبوعي": "Weekly activity", "آخر 8 أسابيع": "Last 8 weeks", "أداء الامتحانات": "Exam performance",
  "متوسط الدرجات": "Average score", "مقارنة الصفوف": "Class comparison", "حالة الامتحانات": "Exam status", "أحدث التسليمات": "Latest submissions",
  "طلاب جدد": "New students", "كل الطلاب": "All students", "إجراءات سريعة": "Quick actions", "إنشاء ورقة عمل": "Create a worksheet", "نشاط تفاعلي": "Interactive activity",
  "امتحانات متاحة": "Available exams", "امتحانات مكتملة": "Completed exams", "متوسط درجاتي": "My average", "الامتحانات المتاحة": "Available exams",
  "إنجازاتي": "My achievements", "نتائجي الأخيرة": "My recent results", "أوراق العمل والأنشطة": "Worksheets & activities", "ابدأ": "Start", "متابعة": "Continue", "فتح": "Open",
  "تسجيل الدخول": "Sign in", "اسم المستخدم": "Username", "كود الدخول": "Access code", "البريد الإلكتروني": "Email", "كلمة المرور": "Password", "دخول": "Sign in", "جارٍ الدخول…": "Signing in…",
  "معلم / مدير": "Teacher / Admin", "تجربة التعلّم الذكية: امتحانات وأنشطة ومتابعة لتقدّم كل طالب.": "The smart learning experience: exams, activities and progress tracking for every student.",
  "الاسم": "Name", "الاسم الظاهر": "Display name", "حفظ": "Save", "تغيير": "Change", "المظهر": "Appearance", "فاتح": "Light", "داكن": "Dark", "تلقائي": "Automatic", "اللغة": "Language",
  "العربية": "العربية", "كلمة المرور الجديدة (8 أحرف على الأقل)": "New password (at least 8 characters)", "إعادة الكتابة": "Retype",
  "تم الحفظ": "Saved", "تم تغيير كلمة المرور": "Password changed", "كلمتا المرور غير متطابقتين": "Passwords do not match",
  "ملاحظة: الترجمة الإنجليزية تشمل القوائم والصفحة الرئيسية وتسجيل الدخول والإعدادات حاليًا، وباقي الصفحات تبقى بالعربية.": "Note: English currently covers menus, the home page, sign-in and settings. Other pages remain in Arabic.",
};
export type LangCode = "ar" | "en";
export const tr = (lang: LangCode, s: string) => (lang === "en" ? EN[s] ?? s : s);
