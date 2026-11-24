"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Cls = { id: number; name: string; grade_level: string | null; students: number };

export default function ClassesPage() {
  const [list, setList] = useState<Cls[]>([]);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [err, setErr] = useState("");

  const load = () => api<Cls[]>("/api/classes").then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try { await api("/api/classes", "POST", { name, grade_level: grade }); setName(""); setGrade(""); load(); }
    catch (x: any) { setErr(x.message); }
  }
  async function rename(c: Cls) {
    const n = prompt("اسم الصف", c.name);
    if (n && n.trim()) { await api(`/api/classes/${c.id}`, "PATCH", { name: n, grade_level: c.grade_level }); load(); }
  }
  async function remove(c: Cls) {
    if (confirm(`حذف الصف «${c.name}»؟ سيبقى طلابه بلا صف.`)) { await api(`/api/classes/${c.id}`, "DELETE"); load(); }
  }

  return (
    <div className="card">
      <h1>الصفوف</h1>
      <form className="row" onSubmit={add}>
        <div><label>اسم الصف</label><input value={name} onChange={(e) => setName(e.target.value)} required placeholder="مثال: الخامس / أ" /></div>
        <div><label>المرحلة</label><input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="مثال: 5" /></div>
        <button>إضافة</button>
      </form>
      <p className="err">{err}</p>
      <div className="tbl"><table>
        <thead><tr><th>الصف</th><th>المرحلة</th><th>الطلاب</th><th></th></tr></thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id}><td>{c.name}</td><td>{c.grade_level || "—"}</td><td>{c.students}</td>
              <td><button className="ghost" onClick={() => rename(c)}>تعديل</button>{" "}
                  <button className="ghost" onClick={() => remove(c)}>حذف</button></td></tr>
          ))}
          {!list.length && <tr><td colSpan={4} className="muted">لا توجد صفوف بعد.</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}
