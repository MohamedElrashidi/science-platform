"use client";
import { useState } from "react";
import ChildPicker from "@/components/ChildPicker";

export default function AddChild() {
  const [open, setOpen] = useState(false);
  const [c, setC] = useState({ studentId: "", code: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const r = await fetch("/api/parent/children", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ student_id: c.studentId, code: c.code }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || "تعذر الإضافة"); setBusy(false); return; }
    window.location.assign("/dashboard?child=" + c.studentId);
  }
  return (
    <div className="card" style={{ marginTop: 16 }}>
      {!open ? <button className="ghost" onClick={() => setOpen(true)}>+ إضافة ابن آخر</button> : (
        <form onSubmit={submit}>
          <h2>إضافة ابن آخر</h2>
          <ChildPicker onChange={setC} />
          <p className="err">{err}</p>
          <button disabled={busy}>{busy ? "جارٍ الإضافة…" : "إضافة"}</button>{" "}
          <button type="button" className="ghost" onClick={() => setOpen(false)}>إلغاء</button>
        </form>)}
    </div>
  );
}
