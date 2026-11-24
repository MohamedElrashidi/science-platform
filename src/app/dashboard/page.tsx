import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ROLE_AR = { admin: "مدير", teacher: "معلم", student: "طالب" } as const;

export default async function Dashboard() {
  const me = await currentProfile();
  if (!me) redirect("/login");
  return (
    <>
      <div className="topbar">
        <strong>منصة العلوم</strong>
        <form action="/api/auth/logout" method="post"><button className="ghost">خروج</button></form>
      </div>
      <main className="wrap">
        <div className="card">
          <h1>أهلاً، {me.full_name}</h1>
          <p className="muted">الدور: {ROLE_AR[me.role]}</p>
          <p>تم تجهيز الأساس: الدخول والصلاحيات وقاعدة البيانات. الصفحات التالية تُضاف في المراحل القادمة.</p>
        </div>
      </main>
    </>
  );
}
