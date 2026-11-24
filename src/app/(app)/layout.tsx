import { redirect } from "next/navigation";
import { authState } from "@/lib/auth";
import { getPrefs } from "@/lib/prefs";
import { tr } from "@/lib/i18n";
import AppShell, { type NavItem } from "@/components/AppShell";

export const dynamic = "force-dynamic";

const STAFF: NavItem[] = [
  { href: "/dashboard", label: "لوحة التحكم", icon: "home" },
  { href: "/classes", label: "الصفوف", icon: "layers" },
  { href: "/students", label: "الطلاب", icon: "users" },
  { href: "/exams", label: "الامتحانات", icon: "exam" },
  { href: "/import", label: "استيراد الامتحانات", icon: "upload" },
  { href: "/subjects", label: "المواد والدروس", icon: "book" },
  { href: "/worksheets", label: "أوراق العمل", icon: "file" },
  { href: "/activities", label: "الأنشطة التفاعلية", icon: "spark" },
  { href: "/videos", label: "الفيديوهات", icon: "play" },
  { href: "/bank", label: "بنك الأسئلة", icon: "bank" },
  { href: "/awards", label: "المكافآت والشهادات", icon: "award" },
  { href: "/reports", label: "التقارير والتحليلات", icon: "chart" },
];
const ADMIN_EXTRA: NavItem[] = [{ href: "/teachers", label: "المعلمون", icon: "shield" }];
const SETTINGS: NavItem = { href: "/settings", label: "الإعدادات", icon: "settings" };
const STUDENT: NavItem[] = [{ href: "/dashboard", label: "الرئيسية", icon: "home" }, SETTINGS];
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
  const { lang } = await getPrefs();
  const shown = items.map((n) => ({ ...n, label: tr(lang, n.label) }));
  return <AppShell items={shown} name={me.full_name} roleLabel={tr(lang, ROLE_AR[me.role])} lang={lang}>{children}</AppShell>;
}
