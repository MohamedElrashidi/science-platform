import { redirect } from "next/navigation";
import { authState } from "@/lib/auth";
import AppShell, { type NavItem } from "@/components/AppShell";

export const dynamic = "force-dynamic";

const STAFF: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", icon: "home" },
  { href: "/classes", label: "الصفوف", icon: "layers" },
  { href: "/students", label: "الطلاب", icon: "users" },
  { href: "/exams", label: "الامتحانات", icon: "exam" },
  { href: "/import", label: "استيراد الامتحانات", icon: "upload" },
  { href: "/subjects", label: "المواد والدروس", icon: "book" },
  { href: "/worksheets", label: "أوراق العمل", icon: "file", soon: true },
  { href: "/activities", label: "الأنشطة التفاعلية", icon: "spark", soon: true },
  { href: "/bank", label: "بنك الأسئلة", icon: "bank" },
  { href: "/reports", label: "التقارير والتحليلات", icon: "chart" },
];
const ADMIN_EXTRA: NavItem[] = [{ href: "/teachers", label: "المعلمون", icon: "shield" }];
const SETTINGS: NavItem = { href: "/settings", label: "الإعدادات", icon: "settings", soon: true };
const STUDENT: NavItem[] = [{ href: "/dashboard", label: "الرئيسية", icon: "home" }];
const ROLE_AR = { admin: "مدير", teacher: "معلم", student: "طالب" } as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await authState();
  if (s.status === "anonymous") redirect("/login");

  // مسجّل دخول بلا ملف صالح: نعرض السبب ولا نحوّل (تفادي حلقة التحويل)
  if (s.status === "no-profile") {
    return (
      <div className="center">
        <div className="card" style={{ maxWidth: 520 }}>
          <h1>تعذر تحميل حسابك</h1>
          <p className="err" dir="auto">{s.reason}</p>
          <form action="/api/auth/logout" method="post"><button>تسجيل الخروج</button></form>
        </div>
      </div>
    );
  }

  const me = s.profile;
  const items = me.role === "student" ? STUDENT
    : [...STAFF, ...(me.role === "admin" ? ADMIN_EXTRA : []), SETTINGS];
  return <AppShell items={items} name={me.full_name} roleLabel={ROLE_AR[me.role]}>{children}</AppShell>;
}
