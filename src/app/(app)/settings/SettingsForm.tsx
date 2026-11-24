"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { tr, type LangCode } from "@/lib/i18n";

const setCookie = (k: string, v: string) => { document.cookie = `${k}=${v}; path=/; max-age=31536000; samesite=lax`; };

export default function SettingsForm({ staff, lang, theme, name: n0 }: { staff: boolean; lang: LangCode; theme: string; name: string }) {
  const router = useRouter();
  const t = (s: string) => tr(lang, s);
  const [name, setName] = useState(n0), [pw, setPw] = useState(""), [pw2, setPw2] = useState("");
  const [m1, setM1] = useState(""), [m2, setM2] = useState("");

  function pickTheme(v: string) { setCookie("theme", v); document.documentElement.dataset.theme = v; router.refresh(); }
  function pickLang(v: LangCode) { setCookie("lang", v); document.documentElement.lang = v; document.documentElement.dir = v === "en" ? "ltr" : "rtl"; router.refresh(); }
  async function saveName(e: React.FormEvent) { e.preventDefault(); setM1(""); try { await api("/api/account", "PATCH", { full_name: name }); setM1(t("تم الحفظ")); router.refresh(); } catch (x: any) { setM1(x.message); } }
  async function savePw(e: React.FormEvent) {
    e.preventDefault(); setM2("");
    if (pw !== pw2) { setM2(t("كلمتا المرور غير متطابقتين")); return; }
    try { await api("/api/account", "PATCH", { password: pw }); setM2(t("تم تغيير كلمة المرور")); setPw(""); setPw2(""); } catch (x: any) { setM2(x.message); }
  }
  const ok = (m: string) => (m === t("تم الحفظ") || m === t("تم تغيير كلمة المرور") ? "ok" : "err");

  return (
    <>
      <div className="panels">
        <div className="card"><h1>{t("المظهر")}</h1>
          <div className="theme-opts" role="group">
            {[["light", "فاتح"], ["dark", "داكن"], ["auto", "تلقائي"]].map(([v, l]) =>
              <button key={v} type="button" className={"ghost" + (theme === v ? " on" : "")} aria-pressed={theme === v} onClick={() => pickTheme(v)}>{t(l)}</button>)}
          </div></div>
        <div className="card"><h1>{t("اللغة")}</h1>
          <div className="theme-opts" role="group">
            <button type="button" className={"ghost" + (lang === "ar" ? " on" : "")} aria-pressed={lang === "ar"} onClick={() => pickLang("ar")}>العربية</button>
            <button type="button" className={"ghost" + (lang === "en" ? " on" : "")} aria-pressed={lang === "en"} onClick={() => pickLang("en")}>English</button>
          </div>
          {lang === "en" && <p className="muted">{t("ملاحظة: الترجمة الإنجليزية تشمل القوائم والصفحة الرئيسية وتسجيل الدخول والإعدادات حاليًا، وباقي الصفحات تبقى بالعربية.")}</p>}
        </div>
      </div>
      {staff && (
        <div className="panels" style={{ marginTop: 16 }}>
          <form className="card" onSubmit={saveName}><h1>{t("الاسم")}</h1>
            <label>{t("الاسم الظاهر")}</label><input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            <p className={ok(m1)}>{m1}</p><button>{t("حفظ")}</button></form>
          <form className="card" onSubmit={savePw}><h1>{t("كلمة المرور")}</h1>
            <label>{t("كلمة المرور الجديدة (8 أحرف على الأقل)")}</label><input type="password" dir="ltr" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} autoComplete="new-password" />
            <label>{t("إعادة الكتابة")}</label><input type="password" dir="ltr" value={pw2} onChange={(e) => setPw2(e.target.value)} required autoComplete="new-password" />
            <p className={ok(m2)}>{m2}</p><button>{t("تغيير")}</button></form>
        </div>
      )}
    </>
  );
}
