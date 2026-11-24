"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import { Logo } from "./AtomArt";
import { tr, type LangCode } from "@/lib/i18n";

export type NavItem = { href: string; label: string; icon: string; soon?: boolean };

export default function AppShell({ items, name, roleLabel, lang = "ar", children }: {
  items: NavItem[]; name: string; roleLabel: string; lang?: LangCode; children: React.ReactNode;
}) {
  const t = (s: string) => tr(lang, s);
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);

  return (
    <div className="shell">
      <header className="mbar no-print">
        <button className="iconbtn" aria-label={t("القائمة")} onClick={() => setOpen(true)}><Icon name="menu" /></button>
        <Link href="/dashboard" className="home-link" aria-label={t("الرئيسية")}><strong>ELRASHIDI - PLATFORM</strong></Link>
        <span style={{ width: 44 }} />
      </header>
      {open && <div className="scrim no-print" onClick={() => setOpen(false)} />}

      <aside className={"side no-print" + (open ? " open" : "")}>
        <div className="brand">
          <Link href="/dashboard" className="home-link brand-link" aria-label={t("الرئيسية")}>
            <Logo />
            <div><div className="brand-t">ELRASHIDI - PLATFORM</div><div className="brand-s">{t("منصة العلوم التعليمية")}</div></div>
          </Link>
          <button className="iconbtn close" aria-label={t("إغلاق")} onClick={() => setOpen(false)}><Icon name="close" /></button>
        </div>

        <div className="me">
          <div className="avatar">{name.trim().charAt(0)}</div>
          <div><div className="me-n">{name}</div><div className="me-r">{roleLabel}</div></div>
        </div>

        <nav className="snav">
          {items.map((n) => n.soon ? (
            <span key={n.href} className="sitem soon" aria-disabled="true"><Icon name={n.icon} /><span>{n.label}</span><em>{t("قريباً")}</em></span>
          ) : (
            <Link key={n.href} href={n.href} className={"sitem" + (path === n.href || (n.href !== "/dashboard" && path.startsWith(n.href)) ? " on" : "")}>
              <Icon name={n.icon} /><span>{n.label}</span>
            </Link>
          ))}
        </nav>

        <form action="/api/auth/logout" method="post" className="sout">
          <button className="sitem" style={{ width: "100%" }}><Icon name="logout" /><span>{t("تسجيل الخروج")}</span></button>
        </form>
      </aside>

      <main className="main"><div className="wrap">{children}</div></main>
    </div>
  );
}
