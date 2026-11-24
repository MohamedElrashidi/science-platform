"use client";
import { useState } from "react";
import ChildPicker from "@/components/ChildPicker";

export default function Register() {
  const [f, setF] = useState({ full_name: "", username: "", password: "", phone: "" });
  const [c, setC] = useState({ studentId: "", code: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/parents/register", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, student_id: c.studentId, code: c.code }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || "تعذر التسجيل"); setBusy(false); return; }
      // دخول مباشر بالحساب الجديد
      const l = await fetch("/api/auth/student-login", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: f.username, code: f.password }) });
      window.location.assign(l.ok ? "/dashboard" : "/login");
    } catch { setErr("تعذر الاتصال بالخادم"); setBusy(false); }
  }

  return (
    <div className="center">
      <form className="card" style={{ width: "100%", maxWidth: 440 }} onSubmit={submit}>
        <h1>تسجيل ولي أمر</h1>
        <p className="muted" style={{ marginTop: 0 }}>ELRASHIDI - PLATFORM — أنشئ اسم المستخدم وكلمة المرور، واكتب رقمك، ثم اختر الصف والابن واكتب كود دخول ابنك. لا يكتمل التسجيل إلا بذلك.</p>
        <label>اسم ولي الأمر</label>
        <input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required />
        <label>اسم مستخدم (إنجليزي)</label>
        <input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} dir="ltr" required autoCapitalize="none" autoCorrect="off" />
        <label>كلمة مرور (8 أحرف على الأقل)</label>
        <input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} dir="ltr" required minLength={8} autoComplete="new-password" />
        <label>رقم واتساب للتواصل</label>
        <input type="tel" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} dir="ltr" required placeholder="05xxxxxxxx" />
        <hr style={{ margin: "14px 0", border: 0, borderTop: "1px solid var(--line)" }} />
        <ChildPicker onChange={setC} />
        <p className="err" role="alert">{err}</p>
        <button disabled={busy} style={{ width: "100%" }}>{busy ? "جارٍ التسجيل…" : "تسجيل"}</button>
        <p className="muted"><a href="/login">لدي حساب بالفعل</a></p>
      </form>
    </div>
  );
}
