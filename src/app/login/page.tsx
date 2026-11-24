"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
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
      if (mode === "student") {
        const r = await fetch("/api/auth/student-login", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: a, code: b }),
        });
        if (!r.ok) { setErr((await r.json().catch(() => ({}))).error || "تعذر الدخول"); return; }
      } else {
        const { error } = await createClient().auth.signInWithPassword({ email: a.trim(), password: b });
        if (error) { setErr("البريد أو كلمة المرور غير صحيحة"); return; }
      }
      const next = params.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="center">
      <form className="card" style={{ width: "100%", maxWidth: 400 }} onSubmit={submit}>
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
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
