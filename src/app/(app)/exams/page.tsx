"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { TYPE_LABELS } from "@/lib/qtypes";

type Ex = { id: number; title: string; kind: string; grade_level: string | null; status: string; total: number; pending: number };
type Cls = { id: number; name: string };

function keyText(q: any): string {
  const d = q.data || {};
  switch (q.qtype) {
    case "mcq": return (d.options || []).map((o: any) => ((d.correct || []).map(String).includes(String(o.id)) ? "✓ " : "") + o.text).join(" | ");
    case "tf": return d.correct ? "صح" : "خطأ";
    case "fill": return (d.blanks || []).map((b: string[]) => b.join(" / ")).join(" ، ");
    case "short": return (d.accepted || []).join(" / ") || "تصحيح يدوي";
    case "matching": return (d.pairs || []).map((p: any) => `${p.left} ← ${p.right}`).join(" | ");
    case "dragdrop": return (d.items || []).map((it: any) => `${it.text} ← ${(d.targets || [])[it.target]}`).join(" | ");
    case "ordering": return (d.items || []).join(" ← ");
    default: return "تصحيح يدوي";
  }
}

export default function ExamsPage() {
  const [list, setList] = useState<Ex[]>([]);
  const [classes, setClasses] = useState<Cls[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [cls, setCls] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => api<Ex[]>("/api/exams").then(setList).catch((e) => setMsg(e.message));
  const loadDetail = (id: number) => api("/api/exams/" + id).then(setDetail).catch((e) => setMsg(e.message));
  useEffect(() => { load(); api<Cls[]>("/api/classes").then(setClasses).catch(() => {}); }, []);

  function toggle(id: number) {
    if (open === id) { setOpen(null); setDetail(null); return; }
    setOpen(id); setDetail(null); setMsg(""); loadDetail(id);
  }
  async function act(id: number, body: object) {
    setMsg("");
    try { await api("/api/exams/" + id, "POST", body); await loadDetail(id); load(); }
    catch (x: any) { setMsg(x.message); }
  }
  async function del(id: number) {
    if (!confirm("حذف هذا الامتحان؟ تبقى أسئلته في البنك.")) return;
    try { await api("/api/exams/" + id, "DELETE"); setOpen(null); setDetail(null); load(); }
    catch (x: any) { setMsg(x.message); }
  }

  return (
    <div className="card">
      <h1>الامتحانات</h1>
      <p className="muted">استورد امتحاناً من <a href="/import">صفحة الاستيراد</a>، ثم اعتمد أسئلته وانشره وأسنده لصف.</p>
      <p className="err">{msg}</p>
      {!list.length && <p className="muted">لا توجد امتحانات بعد.</p>}
      {list.map((e) => (
        <div key={e.id} style={{ borderTop: "1px solid var(--line)", padding: "10px 0" }}>
          <div className="row" style={{ alignItems: "center" }}>
            <div style={{ flex: "3 1 260px" }}><b>{e.title}</b>
              <div className="muted">{e.total} سؤال{e.grade_level ? ` — المرحلة ${e.grade_level}` : ""}</div></div>
            <div>{e.status === "published" ? <span className="ok">منشور</span> : <span className="muted">مسودة</span>}
              {e.pending > 0 && <div className="err">{e.pending} بانتظار الاعتماد</div>}</div>
            <button className="ghost" onClick={() => toggle(e.id)}>{open === e.id ? "إغلاق" : "فتح"}</button>
          </div>

          {open === e.id && detail && (
            <div style={{ marginTop: 10 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                {detail.questions.some((q: any) => q.status === "pending_review") &&
                  <button onClick={() => act(e.id, { action: "approve" })}>اعتماد كل الأسئلة</button>}
                {detail.exam.status === "published"
                  ? <button className="ghost" onClick={() => act(e.id, { action: "unpublish" })}>إلغاء النشر</button>
                  : <button onClick={() => act(e.id, { action: "publish" })}>نشر الامتحان</button>}
                <a className="btn ghost" style={{ textDecoration: "none", display: "inline-grid", placeItems: "center", background: "#fff", color: "var(--teal)", border: "1.5px solid var(--line)", boxShadow: "none" }} href={`/exams/${e.id}/results`}>النتائج</a>
                <button className="ghost" onClick={() => del(e.id)}>حذف</button>
              </div>

              <b>الصفوف المسند إليها</b>
              <div className="row" style={{ margin: "6px 0 10px" }}>
                <select value={cls} onChange={(x) => setCls(x.target.value)} aria-label="الصف">
                  <option value="">اختر صفاً</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button disabled={!cls} onClick={() => act(e.id, { action: "assign", class_id: Number(cls) })}>إسناد</button>
              </div>
              {detail.assignments.length === 0 && <p className="muted">لم يُسند لأي صف بعد، فلن يظهر للطلاب.</p>}
              {detail.assignments.map((a: any) => (
                <span key={a.id} className="idcard" style={{ display: "inline-block", margin: "0 0 6px 6px", padding: "4px 10px" }}>
                  {a.name} <button className="ghost" style={{ minHeight: 28, padding: "0 8px" }} onClick={() => act(e.id, { action: "unassign", assignment_id: a.id })}>×</button>
                </span>
              ))}

              <div className="tbl" style={{ marginTop: 10 }}><table>
                <thead><tr><th>#</th><th>السؤال</th><th>النوع</th><th>الإجابة</th><th>الدرجة</th><th>الحالة</th></tr></thead>
                <tbody>{detail.questions.map((q: any, i: number) => (
                  <tr key={q.id}><td>{i + 1}</td><td>{q.prompt}</td><td>{TYPE_LABELS[q.qtype] || q.qtype}</td>
                    <td className="muted">{keyText(q)}</td><td>{q.marks}</td>
                    <td>{q.status === "approved" ? <span className="ok">معتمد</span> : <span className="err">بانتظار الاعتماد</span>}</td></tr>
                ))}</tbody>
              </table></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
