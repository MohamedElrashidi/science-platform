"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type S = { id: string; full_name: string };
type P = { id: string; full_name: string; username: string; children: S[] };
type Cred = { name: string; username: string; code: string };

export default function ParentsPage() {
  const [list, setList] = useState<P[]>([]);
  const [studs, setStuds] = useState<S[]>([]);
  const [name, setName] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [cred, setCred] = useState<Cred | null>(null);

  const load = () => {
    api<P[]>("/api/parents").then(setList).catch((e) => setMsg(e.message));
    api<S[]>("/api/students").then(setStuds).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    try {
      const r = await api<{ username: string; access_code: string }>("/api/parents", "POST", { full_name: name, student_ids: sel });
      setCred({ name, username: r.username, code: r.access_code });
      setName(""); setSel([]); load();
    } catch (x: any) { setMsg(x.message); }
  }
  async function patch(id: string, body: object, nm: string) {
    setMsg("");
    try {
      const r: any = await api(`/api/parents/${id}`, "PATCH", body);
      if (r.access_code) setCred({ name: nm, username: r.username, code: r.access_code });
      load();
    } catch (x: any) { setMsg(x.message); }
  }
  const shown = studs.filter((s) => !q || s.full_name.includes(q));

  return (
    <>
      <div className="card">
        <h1>أولياء الأمور</h1>
        <p className="muted">ولي الأمر يرى نتائج أبنائه ومستواهم وترتيبهم ونقاط القوة والضعف فقط، ولا يستطيع تعديل أي شيء. يدخل من صفحة الدخول (تبويب «ولي أمر») باسم المستخدم والكود الذي تسلّمه له، ثم يختار الصف والاسم ويكتب كود ابنه لإضافته.</p>
        <form onSubmit={add}>
          <div className="row"><div><label>اسم ولي الأمر</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div></div>
          <label style={{ marginTop: 10 }}>اختر الأبناء — اختياري ({sel.length}). يستطيع ولي الأمر إضافة ابنه بنفسه بعد الدخول بكود ابنه</label>
          <input placeholder="بحث باسم الطالب…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid var(--line)", borderRadius: 10, padding: 8, marginTop: 6 }}>
            {shown.map((s) => (
              <label key={s.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 2px", margin: 0 }}>
                <input type="checkbox" style={{ width: "auto" }} checked={sel.includes(s.id)}
                  onChange={(e) => setSel(e.target.checked ? [...sel, s.id] : sel.filter((x) => x !== s.id))} />{s.full_name}
              </label>))}
            {!shown.length && <p className="muted">لا يوجد طلاب.</p>}
          </div>
          <button style={{ marginTop: 10 }}>إنشاء حساب ولي أمر</button>
        </form>
        {msg && <p className="err">{msg}</p>}
        {cred && (
          <div className="card" style={{ marginTop: 12, background: "var(--mint)" }}>
            <b>بيانات دخول {cred.name}</b> — سلّمها له الآن (الكود لا يظهر مرة أخرى إلا بتوليد كود جديد):
            <p dir="ltr" style={{ fontSize: "1.2rem", margin: "8px 0" }}>اسم المستخدم: <b>{cred.username}</b> &nbsp; الكود: <b>{cred.code}</b></p>
            <button className="ghost" onClick={() => setCred(null)}>إخفاء</button>
          </div>)}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>الحسابات الحالية</h2>
        {!list.length ? <p className="muted">لا يوجد أولياء أمور بعد.</p> : (
          <div className="tbl"><table>
            <thead><tr><th>ولي الأمر</th><th>اسم المستخدم</th><th>الأبناء</th><th></th></tr></thead>
            <tbody>{list.map((p) => (
              <tr key={p.id}>
                <td>{p.full_name}</td><td dir="ltr">{p.username}</td>
                <td>{p.children.map((c) => (
                  <span key={c.id} className="badge" style={{ marginInlineEnd: 4 }}>{c.full_name}
                    <a href="#" style={{ marginInlineStart: 6 }} title="فك الارتباط" onClick={(e) => { e.preventDefault(); if (confirm("فك ارتباط هذا الابن؟")) patch(p.id, { remove: [c.id] }, p.full_name); }}>×</a></span>))}
                  <select defaultValue="" onChange={(e) => { if (e.target.value) { patch(p.id, { add: [e.target.value] }, p.full_name); e.target.value = ""; } }} style={{ width: 130, marginInlineStart: 6 }}>
                    <option value="">+ إضافة ابن</option>
                    {studs.filter((s) => !p.children.some((c) => c.id === s.id)).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select></td>
                <td><button className="ghost" onClick={() => { if (confirm("توليد كود جديد؟ سيتوقف الكود القديم.")) patch(p.id, { reset: true }, p.full_name); }}>كود جديد</button></td>
              </tr>))}</tbody></table></div>)}
      </div>
    </>
  );
}
