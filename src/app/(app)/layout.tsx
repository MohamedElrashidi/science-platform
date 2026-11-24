import { redirect } from "next/navigation";
import Link from "next/link";
import { authState } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/dashboard", label: "الرئيسية", roles: ["admin", "teacher", "student"] },
  { href: "/classes", label: "الصفوف", roles: ["admin", "teacher"] },
  { href: "/students", label: "الطلاب", roles: ["admin", "teacher"] },
  { href: "/subjects", label: "المواد والدروس", roles: ["admin", "teacher"] },
  { href: "/teachers", label: "المعلمون", roles: ["admin"] },
];

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
  return (
    <>
      <header className="topbar no-print">
        <strong>منصة العلوم</strong>
        <nav className="nav">
          {NAV.filter((n) => n.roles.includes(me.role)).map((n) => (
            <Link key={n.href} href={n.href}>{n.label}</Link>
          ))}
        </nav>
        <form action="/api/auth/logout" method="post"><button className="ghost">خروج</button></form>
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}
