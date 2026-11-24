"use client";
import { useEffect, useState } from "react";

type C = { id: number; name: string };
type S = { id: string; full_name: string };

/** اختيار الصف ثم اسم الطالب ثم كود الطالب. */
export default function ChildPicker({ onChange }: { onChange: (v: { studentId: string; code: string }) => void }) {
  const [classes, setClasses] = useState<C[]>([]);
  const [studs, setStuds] = useState<S[]>([]);
  const [cls, setCls] = useState("");
  const [sid, setSid] = useState("");
  const [code, setCode] = useState("");
  useEffect(() => { fetch("/api/public/classes").then((r) => r.json()).then(setClasses).catch(() => {}); }, []);
  useEffect(() => {
    setSid(""); setStuds([]);
    if (cls) fetch("/api/public/students?class=" + cls).then((r) => r.json()).then(setStuds).catch(() => {});
  }, [cls]);
  useEffect(() => { onChange({ studentId: sid, code }); }, [sid, code]);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <label>الصف</label>
      <select value={cls} onChange={(e) => setCls(e.target.value)} required>
        <option value="">اختر الصف</option>
        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <label>اسم الابن</label>
      <select value={sid} onChange={(e) => setSid(e.target.value)} required disabled={!cls}>
        <option value="">{cls ? "اختر الاسم" : "اختر الصف أولًا"}</option>
        {studs.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
      </select>
      <label>كود دخول الابن (الموجود في بطاقته)</label>
      <input value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" required autoCapitalize="characters" autoComplete="off" />
    </>
  );
}
