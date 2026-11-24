"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type T = { id: string; full_name: string; username: string; role: string; active: boolean };

export default function TeachersPage() {
  const [list, setList] = useState<T[]>([]);
  const [f, setF] = useState({ full_name: "", email: "", password: "" });
  const [msg, setMsg] = useState("");

  const load = () => api<T[]>("/api/teachers").then(setList).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    try { await api("/api/teachers", "POST", f); setF({ full_name: "", email: "", password: "" }); setMsg("تمت الإضافة. سلّم المعلم بريده وكلمة المرور."); load(); }
    catch (x: any) { setMsg(x.message); }
  }
  return (
    <div className="card">
      <h1>المعلمون</h1>
      <form className="row" onSubmit={add}>
        <div><label>الاسم</label><input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required /></div>
        <div><label>البريد</label><input type="email" dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
        <div><label>كلمة المرور (8+)</label><input dir="ltr" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={8} /></div>
        <button>إضافة معلم</button>
      </form>
      <p className={msg.startsWith("تمت") ? "ok" : "err"}>{msg}</p>
      <div className="tbl"><table>
        <thead><tr><th>الاسم</th><th>الدور</th></tr></thead>
        <tbody>{list.map((t) => <tr key={t.id}><td>{t.full_name}</td><td>{t.role === "admin" ? "مدير" : "معلم"}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}
