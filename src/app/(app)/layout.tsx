import { redirect } from "next/navigation";
import Link from "next/link";
import { currentProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/dashboard", label: "الرئيسية", roles: ["admin", "teacher", "student"] },
  { href: "/classes", label: "الصفوف", roles: ["admin", "teacher"] },
  { href: "/students", label: "الطلاب", roles: ["admin", "teacher"] },
  { href: "/subjects", label: "المواد والدروس", roles: ["admin", "teacher"] },
  { href: "/teachers", label: "المعلمون", roles: ["admin"] },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await currentProfile();
  if (!me) redirect("/login");
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
