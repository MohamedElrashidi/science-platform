"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import AtomArt, { Logo } from "@/components/AtomArt";

function LoginForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"student" | "teacher">("student");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const url = mode === "student" ? "/api/auth/student-login" : "/api/auth/login";
      const body = mode === "student" ? { username: a, code: b } : { email: a, password: b };
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { setErr((await r.json().catch(() => ({}))).error || "تعذر الدخول"); setBusy(false); return; }
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
        <h1>SCIENCE LAB</h1>
        <p>تجربة التعلّم الذكية: امتحانات وأنشطة ومتابعة لتقدّم كل طالب.</p>
      </aside>
      <div className="login-form">
        <form className="card" style={{ width: "100%", maxWidth: 420 }} onSubmit={submit}>
          <h1>تسجيل الدخول</h1>
          <p className="muted" style={{ marginTop: 0 }}>منصة العلوم التعليمية</p>
          <div className="tabs" role="tablist">
            <button type="button" className={mode === "student" ? "on" : ""} onClick={() => { setMode("student"); setA(""); setB(""); setErr(""); }}>طالب</button>
            <button type="button" className={mode === "teacher" ? "on" : ""} onClick={() => { setMode("teacher"); setA(""); setB(""); setErr(""); }}>معلم / مدير</button>
          </div>
          <label htmlFor="a">{mode === "student" ? "اسم المستخدم" : "البريد الإلكتروني"}</label>
          <input id="a" value={a} onChange={(e) => setA(e.target.value)} dir="ltr" required
                 autoCapitalize="none" autoCorrect="off" autoComplete="username"
                 inputMode={mode === "teacher" ? "email" : "text"} />
          <label htmlFor="b">{mode === "student" ? "كود الدخول" : "كلمة المرور"}</label>
          <input id="b" type={mode === "student" ? "text" : "password"} value={b}
                 onChange={(e) => setB(e.target.value)} dir="ltr" required
                 autoCapitalize={mode === "student" ? "characters" : "none"} autoComplete="current-password" />
          <p className="err" role="alert">{err}</p>
          <button disabled={busy} style={{ width: "100%" }}>{busy ? "جارٍ الدخول…" : "دخول"}</button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
