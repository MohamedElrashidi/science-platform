import { currentProfile } from "@/lib/auth";

const ROLE_AR = { admin: "مدير", teacher: "معلم", student: "طالب" } as const;

export default async function Dashboard() {
  const me = await currentProfile();
  if (!me) return null;   // الـ layout يعالج الحالتين (غير مسجل / بلا ملف)
  return (
    <div className="card">
      <h1>أهلاً، {me.full_name}</h1>
      <p className="muted">الدور: {ROLE_AR[me.role]}</p>
      {me.role !== "student" ? (
        <p>ابدأ بإنشاء <a href="/classes">صف</a> ثم أضف <a href="/students">الطلاب</a> واطبع بطاقات الدخول.</p>
      ) : (
        <p>ستظهر هنا اختباراتك وأنشطتك عند إضافتها.</p>
      )}
    </div>
  );
}
