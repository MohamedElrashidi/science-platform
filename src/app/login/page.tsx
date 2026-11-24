"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AtomArt, { Logo } from "@/components/AtomArt";
import { tr, type LangCode } from "@/lib/i18n";

function LoginForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"student" | "parent" | "teacher">("student");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [lang, setLang] = useState<LangCode>("ar");
  useEffect(() => { setLang(document.documentElement.lang === "en" ? "en" : "ar"); }, []);
  const t = (s: string) => tr(lang, s);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const url = mode !== "teacher" ? "/api/auth/student-login" : "/api/auth/login";
      const body = mode !== "teacher" ? { username: a, code: b } : { email: a, password: b };
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { setErr((await r.json().catch(() => ({}))).error || "تعذر الدخول"); setBusy(false); return; }
      // اطلب من المتصفح حفظ بيانات الدخول (Chrome/Edge)
      try { const PC = (window as any).PasswordCredential; if (PC && navigator.credentials) await navigator.credentials.store(new PC({ id: a, password: b, name: a })); } catch {}
      const next = params.get("next");
      // تحويل كامل للصفحة بعد ضبط الجلسة (أوثق من التنقل الداخلي)
      window.location.assign(next && next.startsWith("/") ? next : "/dashboard");
    } catch {
      setErr("تعذر الاتصال بالخادم. تحقق من الإنترنت وأعد المحاولة.");
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <aside className="login-brand">
        <AtomArt className="art" size={340} />
        <Logo size={56} />
        <h1>ELRASHIDI - PLATFORM</h1>
        <p>{t("تجربة التعلّم الذكية: امتحانات وأنشطة ومتابعة لتقدّم كل طالب.")}</p>
      </aside>
      <div className="login-form">
        <form className="card" style={{ width: "100%", maxWidth: 420 }} onSubmit={submit}>
          <h1>{t("تسجيل الدخول")}</h1>
          <p className="muted" style={{ marginTop: 0 }}>{t("منصة العلوم التعليمية")}</p>
          <div className="tabs" role="tablist">
            <button type="button" className={mode === "student" ? "on" : ""} onClick={() => { setMode("student"); setA(""); setB(""); setErr(""); }}>{t("طالب")}</button>
            <button type="button" className={mode === "parent" ? "on" : ""} onClick={() => { setMode("parent"); setA(""); setB(""); setErr(""); }}>{t("ولي أمر")}</button>
            <button type="button" className={mode === "teacher" ? "on" : ""} onClick={() => { setMode("teacher"); setA(""); setB(""); setErr(""); }}>{t("معلم / مدير")}</button>
          </div>
          <label htmlFor="a">{mode !== "teacher" ? t("اسم المستخدم") : t("البريد الإلكتروني")}</label>
          <input id="a" name="username" value={a} onChange={(e) => setA(e.target.value)} dir="ltr" required
                 autoCapitalize="none" autoCorrect="off" autoComplete="username"
                 inputMode={mode === "teacher" ? "email" : "text"} />
          <label htmlFor="b">{mode !== "teacher" ? t("كود الدخول") : t("كلمة المرور")}</label>
          <input id="b" name="password" type={show ? "text" : "password"} value={b}
                 onChange={(e) => setB(e.target.value)} dir="ltr" required
                 autoCapitalize={mode !== "teacher" ? "characters" : "none"} autoComplete="current-password" />
          <label style={{ display: "flex", gap: 6, alignItems: "center", margin: "6px 0" }}><input type="checkbox" style={{ width: "auto" }} checked={show} onChange={(e) => setShow(e.target.checked)} />{t("إظهار")}</label>
          <p className="err" role="alert">{err}</p>
          {mode === "parent" && <p className="muted" style={{ marginTop: 0 }}><a href="/register">{t("ولي أمر جديد؟ سجّل حسابك")}</a></p>}
          <button disabled={busy} style={{ width: "100%" }}>{busy ? t("جارٍ الدخول…") : t("دخول")}</button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
