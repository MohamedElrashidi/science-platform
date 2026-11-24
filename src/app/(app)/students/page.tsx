"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

type Stu = { id: string; full_name: string; username: string; class_id: number | null; active: boolean };
type Cls = { id: number; name: string };
type Card = { full_name: string; username: string; access_code: string };

export default function StudentsPage() {
  const [students, setStudents] = useState<Stu[]>([]);
  const [classes, setClasses] = useState<Cls[]>([]);
  const [classId, setClassId] = useState("");
  const [bulk, setBulk] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => {
    api<Stu[]>("/api/students").then(setStudents).catch((e) => setMsg(e.message));
    api<Cls[]>("/api/classes").then(setClasses).catch(() => {});
  };
  useEffect(load, []);
  const clsName = (id: number | null) => classes.find((c) => c.id === id)?.name || "—";

  // كل سطر: الاسم الكامل، اسم المستخدم (إنجليزي)
  async function addBulk(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    const out: Card[] = []; const failed: string[] = [];
    for (const line of bulk.split("\n").map((l) => l.trim()).filter(Boolean)) {
      const [full_name, username] = line.split(/[,،;\t]/).map((x) => x.trim());
      try {
        const r = await api<{ username: string; access_code: string }>("/api/students", "POST",
          { full_name, username, class_id: classId ? Number(classId) : null });
        out.push({ full_name, username: r.username, access_code: r.access_code });
      } catch (x: any) { failed.push(`${line} ← ${x.message}`); }
    }
    setCards((c) => [...out, ...c]); setBulk(""); setBusy(false);
    setMsg(`تمت إضافة ${out.length} طالب.` + (failed.length ? ` تعذر: ${failed.join(" | ")}` : ""));
    load();
  }
  async function reset(s: Stu) {
    if (!confirm(`إنشاء كود جديد للطالب ${s.full_name}؟ سيتوقف الكود القديم.`)) return;
    try {
      const r = await api<Card>("/api/students/" + s.id + "/reset-code", "POST");
      setCards((c) => [r, ...c]);
    } catch (x: any) { setMsg(x.message); }
  }
  async function setClass(s: Stu, v: string) {
    await api("/api/students/" + s.id, "PATCH", { class_id: v ? Number(v) : null }); load();
  }
  async function toggle(s: Stu) {
    await api("/api/students/" + s.id, "PATCH", { active: !s.active }); load();
  }

  return (
    <>
      <div className="card no-print">
        <h1>الطلاب</h1>
        <form onSubmit={addBulk}>
          <label>الصف</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">بدون صف</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <label>الطلاب (سطر لكل طالب: الاسم، اسم المستخدم بالإنجليزية)</label>
          <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} dir="auto"
            placeholder={"أحمد علي، ahmed.ali\nسارة محمد، sara.m"} required />
          <button disabled={busy} style={{ marginTop: 10 }}>{busy ? "جارٍ الإضافة…" : "إضافة الطلاب"}</button>
        </form>
        <p className={msg.includes("تعذر") ? "err" : "ok"}>{msg}</p>
      </div>

      {cards.length > 0 && (
        <div className="card grid">
          <div className="no-print">
            <h2 style={{ marginTop: 0 }}>بطاقات الدخول</h2>
            <p className="muted">الأكواد تظهر هنا مرة واحدة فقط ولا تُحفظ. اطبعها الآن وسلّمها للطلاب.</p>
            <button onClick={() => window.print()}>طباعة البطاقات</button>{" "}
            <button className="ghost" onClick={() => setCards([])}>إخفاء</button>
          </div>
          <div className="cards">
            {cards.map((c, i) => (
              <div className="idcard" key={i}>
                <strong>{c.full_name}</strong>
                <div className="muted">اسم المستخدم</div><b dir="ltr">{c.username}</b>
                <div className="muted">كود الدخول</div><b className="code">{c.access_code}</b>
                <div className="muted" dir="ltr" style={{ fontSize: ".8rem" }}>{typeof location !== "undefined" ? location.origin : ""}/login</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card no-print" style={{ marginTop: 14 }}>
        <div className="tbl"><table>
          <thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الصف</th><th>الحالة</th><th></th></tr></thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.full_name}</td><td dir="ltr">{s.username}</td>
                <td><select value={s.class_id ?? ""} onChange={(e) => setClass(s, e.target.value)} aria-label="الصف">
                  <option value="">—</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></td>
                <td>{s.active ? "نشط" : "موقوف"}</td>
                <td><button className="ghost" onClick={() => reset(s)}>كود جديد</button>{" "}
                    <button className="ghost" onClick={() => toggle(s)}>{s.active ? "إيقاف" : "تفعيل"}</button></td>
              </tr>
            ))}
            {!students.length && <tr><td colSpan={5} className="muted">لا يوجد طلاب بعد.</td></tr>}
          </tbody>
        </table></div>
      </div>
    </>
  );
}
