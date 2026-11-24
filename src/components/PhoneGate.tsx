"use client";
import { useState } from "react";

export default function PhoneGate({ role, name }: { role: "student" | "parent"; name: string }) {
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const r = await fetch("/api/account/phone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || "تعذر الحفظ"); setBusy(false); return; }
    window.location.reload();
  }
  return (
    <div className="center">
      <form className="card" style={{ width: "100%", maxWidth: 420 }} onSubmit={submit}>
        <h1>أهلاً {name}</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          {role === "student" ? "قبل البدء، اكتب رقم واتساب ولي أمرك لنتواصل معه بشأن مستواك ونتائجك." : "قبل البدء، اكتب رقم واتساب للتواصل معك بشأن مستوى أبنائك ونتائجهم."}
        </p>
        <label>{role === "student" ? "رقم واتساب ولي الأمر" : "رقم واتساب للتواصل"}</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" inputMode="tel" placeholder="05xxxxxxxx" required autoComplete="tel" />
        <p className="err" role="alert">{err}</p>
        <button disabled={busy} style={{ width: "100%" }}>{busy ? "جارٍ الحفظ…" : "حفظ ومتابعة"}</button>
        <p className="muted" style={{ marginTop: 10 }}>هذا الرقم يُستخدم للتواصل التعليمي فقط.</p>
      </form>
    </div>
  );
}
