"use client";
import { useState } from "react";

export type Cls = { id: number; name: string };
export type Stu = { id: string; full_name: string; class_id: number | null };
export type Target = { classIds: number[]; studentIds: string[] };

/** اختيار الإسناد: صف أو عدة صفوف، و/أو طالب معين أو عدة طلاب. */
export default function AssignBox({ classes, students, value, onChange }: { classes: Cls[]; students: Stu[]; value: Target; onChange: (t: Target) => void }) {
  const [q, setQ] = useState("");
  const [cf, setCf] = useState("");
  const toggleC = (id: number) => onChange({ ...value, classIds: value.classIds.includes(id) ? value.classIds.filter((x) => x !== id) : [...value.classIds, id] });
  const toggleS = (id: string) => onChange({ ...value, studentIds: value.studentIds.includes(id) ? value.studentIds.filter((x) => x !== id) : [...value.studentIds, id] });
  const shown = students.filter((s) => (!cf || String(s.class_id) === cf) && (!q || s.full_name.includes(q)));
  return (
    <div>
      <label>الصفوف (يمكن اختيار أكثر من صف)</label>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        {classes.map((c) => (
          <label key={c.id} style={{ display: "flex", gap: 6, alignItems: "center", margin: 0 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={value.classIds.includes(c.id)} onChange={() => toggleC(c.id)} />{c.name}</label>))}
        {!classes.length && <span className="muted">لا توجد صفوف.</span>}
      </div>
      <label>أو طلاب معيّنون ({value.studentIds.length})</label>
      <div className="row">
        <select value={cf} onChange={(e) => setCf(e.target.value)} aria-label="تصفية بالصف"><option value="">كل الصفوف</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <input placeholder="بحث باسم الطالب…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div style={{ maxHeight: 180, overflow: "auto", border: "1px solid var(--line)", borderRadius: 10, padding: 8, marginTop: 6 }}>
        {shown.map((s) => (
          <label key={s.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 2px", margin: 0 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={value.studentIds.includes(s.id)} onChange={() => toggleS(s.id)} />{s.full_name}</label>))}
        {!shown.length && <span className="muted">لا يوجد طلاب.</span>}
      </div>
    </div>
  );
}
